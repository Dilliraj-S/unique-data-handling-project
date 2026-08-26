import getOpenSearchClient from './OpenSearchClient.js';

/**
 * SearchService - translates existing filter model to OpenSearch queries.
 * Focused for master_leads, temp_master_leads (contacts) and master_accounts (companies).
 */

// ─── Shared document transformer (used by sync script and upsertDoc) ───
// Fields that must be cast to String for keyword mapping
const KEYWORD_ID_FIELDS = new Set(['id', 'li_company_id', 'gs_zipcode', 'gs_country_code']);

// Date fields to normalize into ISO 8601
const DATE_FIELD_SUFFIXES = ['_at', '_date'];
const EXPLICIT_DATE_FIELDS = new Set([
  'created_at', 'updated_at', 'deleted_at', 'last_contact_date',
  'dls_lead_generated_date', 'dls_bounce_last_date', 'dls_mail_send_last_date',
  'li_timestamp'
]);

function isDateField(key) {
  if (EXPLICIT_DATE_FIELDS.has(key)) return true;
  return DATE_FIELD_SUFFIXES.some(suffix => key.endsWith(suffix));
}

function normalizeDateValue(val) {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString();
  if (typeof val === 'number') return new Date(val).toISOString();
  if (typeof val === 'string') {
    const cleaned = val.trim().replace(/\//g, '-');
    // Handle dd-MM-yyyy
    const ddMMyyyy = /^(\d{2})-(\d{2})-(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?$/;
    const m = cleaned.match(ddMMyyyy);
    if (m) {
      const [, dd, mm, yyyy, hh = '00', min = '00', ss = '00'] = m;
      return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(min), Number(ss))).toISOString();
    }
    const d = new Date(cleaned);
    if (!isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

/**
 * Transform a MongoDB document into an OpenSearch-safe document.
 * - Skips _id (handled as OpenSearch document _id externally)
 * - Skips null/undefined values
 * - Casts ID fields to string (keyword mapping)
 * - Normalizes dates to ISO 8601
 * - JSON.stringifies arrays and objects (CRITICAL for dls_bounce_history etc.)
 */
export function transformDocForOpenSearch(doc) {
  if (!doc || typeof doc !== 'object') return {};
  const transformed = {};

  for (const [key, val] of Object.entries(doc)) {
    if (key === '_id') continue;
    if (val === null || val === undefined) continue;

    // Date fields
    if (isDateField(key)) {
      const normalized = normalizeDateValue(val);
      if (normalized) {
        transformed[key] = normalized;
      }
      continue;
    }

    // BSON types (ObjectId, Long, Decimal128, etc.)
    if (val && typeof val === 'object' && val.constructor) {
      const cn = val.constructor.name;
      if (['ObjectId', 'Long', 'Decimal128', 'Timestamp', 'Binary', 'BSONRegExp'].includes(cn)) {
        transformed[key] = String(val);
        continue;
      }
    }

    // Date instances not caught by isDateField
    if (val instanceof Date) {
      transformed[key] = val.toISOString();
      continue;
    }

    // Arrays — MUST be stringified (dls_bounce_history, dls_mail_send_history)
    if (Array.isArray(val)) {
      transformed[key] = JSON.stringify(val);
      continue;
    }

    // Plain objects — stringify
    if (typeof val === 'object') {
      try {
        transformed[key] = JSON.stringify(val);
      } catch {
        transformed[key] = String(val);
      }
      continue;
    }

    // Numeric IDs that must be keyword strings
    if (KEYWORD_ID_FIELDS.has(key)) {
      transformed[key] = String(val);
      continue;
    }

    // Primitives (string, number, boolean)
    transformed[key] = val;
  }

  return transformed;
}


class OpenSearchService {
  constructor() {
    this.client = getOpenSearchClient();

    // Allowlisted collections -> index names
    this.indexMap = {
      // Leads & Accounts (sun database)
      master_leads: process.env.OPENSEARCH_INDEX_LEADS || 'sun_master_leads',
      temp_master_leads: process.env.OPENSEARCH_INDEX_TEMP_LEADS || 'sun_temp_master_leads',
      master_accounts: process.env.OPENSEARCH_INDEX_ACCOUNTS || 'sun_master_accounts',
      // Products (central database)
      products:        process.env.OPENSEARCH_INDEX_PRODUCTS || 'central_products',
      apolloproduct:   process.env.OPENSEARCH_INDEX_APOLLO || 'central_apolloproduct',
      g2product:       process.env.OPENSEARCH_INDEX_G2 || 'central_g2product',
      linkedinprodcut: process.env.OPENSEARCH_INDEX_LINKEDIN || 'central_linkedinprodcut',
      MSPsproduct:     process.env.OPENSEARCH_INDEX_MSPS || 'central_mspsproduct',
      MSSPsproduct:    process.env.OPENSEARCH_INDEX_MSSPS || 'central_msspsproduct',
    };

    // Text fields per collection for global search (weighted)
    this.searchFields = {
      master_leads: [
        'li_full_name^5', 'email^5', 'li_smtp^5',
        'li_company_name^4', 'li_job_title^3',
        'dls_designation^3', 'li_first_name^2', 'li_last_name^2',
        'gs_company_name^2', 'ap_full_name^2', 'ap_company_name^2',
        'industry^2', 'gs_city', 'gs_state', 'gs_country',
        'li_contact_location', 'li_contact_country',
        '*^1'
      ],
      temp_master_leads: [
        'li_full_name^5', 'email^5', 'li_smtp^5',
        'li_company_name^4', 'li_job_title^3',
        'dls_designation^3', 'li_first_name^2', 'li_last_name^2',
        'gs_company_name^2', 'ap_full_name^2', 'ap_company_name^2',
        'industry^2', 'gs_city', 'gs_state', 'gs_country',
        'li_contact_location', 'li_contact_country',
        '*^1'
      ],
      master_accounts: [
        'li_company_name^5', 'li_smtp^5',
        'ap_company_name^4', 'ap_company_smtp^3',
        'li_company_industry^3', 'ap_industry^2',
        'zm_company^2', 'zm_industry^2', 'zm_smtp^2',
        'li_company_headquarters', 'ap_company_city', 'ap_company_country',
        'gs_city', 'gs_state', 'gs_country',
        '*^1'
      ]
    };

    // Product search fields (shared by all 6 product collections)
    const productFields = [
      'product_name^5', 'pp_name^4', 'category^3',
      'vendor^3', 'description^2', 'product_id^2',
      'source_description', 'Category^2', 'Companyname^2'
    ];
    this.searchFields.products = productFields;
    this.searchFields.apolloproduct = productFields;
    this.searchFields.g2product = productFields;
    this.searchFields.linkedinprodcut = productFields;
    this.searchFields.MSPsproduct = productFields;
    this.searchFields.MSSPsproduct = productFields;
  }

  /** Check if OpenSearch is globally enabled */
  isEnabled() {
    return process.env.OPENSEARCH_ENABLED === 'true';
  }

  /** Check if OpenSearch is enabled for a specific collection */
  isEnabledFor(collection) {
    return this.isEnabled() && !!this.indexMap[collection];
  }

  /** Get the index name for a collection, or null if not mapped */
  getIndexName(collection) {
    return this.indexMap[collection] || null;
  }

  /**
   * Upsert a single document — called by DataService and background workers.
   * Fire-and-forget: NEVER throws, NEVER blocks the caller.
   */
  async upsertDoc(collectionName, mongoId, doc) {
    if (!this.isEnabled()) return;
    try {
      const indexName = this.getIndexName(collectionName);
      if (!indexName) return; // not an indexed collection — skip silently
      const body = transformDocForOpenSearch(doc);
      await this.client.update({
        index: indexName,
        id: String(mongoId),
        body: { doc: body, doc_as_upsert: true },
        refresh: 'false'
      });
    } catch (err) {
      console.error(`[OpenSearch] upsertDoc failed for ${collectionName}/${mongoId}:`, err.message);
      // NEVER throw — OpenSearch failure must not crash MongoDB write
    }
  }

  /**
   * Delete a single document — called by DataService on hard delete.
   */
  async deleteDoc(collectionName, mongoId) {
    if (!this.isEnabled()) return;
    try {
      const indexName = this.getIndexName(collectionName);
      if (!indexName) return;
      await this.client.delete({
        index: indexName,
        id: String(mongoId),
        refresh: 'false'
      });
    } catch (err) {
      if (err.statusCode !== 404) {
        console.error(`[OpenSearch] deleteDoc failed for ${collectionName}/${mongoId}:`, err.message);
      }
    }
  }

  /**
   * Run search
   * @param {string} collection - e.g., master_leads
   * @param {object} params - generated by TableHelper.generateParams (filters, pagination, sort, etc.)
   * @param {Array<string>} columnList - list of fields used for mapping
   */
  async search(collection, params, columnList) {
    const index = this.indexMap[collection];
    if (!index) {
      throw new Error(`No OpenSearch index mapped for collection ${collection}`);
    }

    const filters = params.filters || {};
    const page = Math.max(1, parseInt(filters.pagination?.page || 1));
    const requestedLimit = parseInt(filters.pagination?.limit || 25);
    const isSelectAll = requestedLimit > 1000 || filters.selectAll === true;
    const isIdsOnly = filters.idsOnly === true || filters.selectAll === true;
    
    // OpenSearch has a hard limit: from + size <= 10000
    let maxLimit;
    if (isSelectAll) {
      const maxSafeBatch = Math.floor(10000 / page);
      maxLimit = Math.min(maxSafeBatch, 5000);
    } else {
      maxLimit = 200;
    }
    
    const limit = Math.min(Math.max(1, requestedLimit), maxLimit);
    const from = (page - 1) * limit;
    
    // Validate OpenSearch limit
    let finalLimit = limit;
    let finalFrom = from;
    if (from + limit > 10000) {
      console.warn(`⚠️ OpenSearch limit exceeded: from=${from}, size=${limit}. Reducing.`);
      finalLimit = Math.max(1, 10000 - from);
      finalFrom = from;
    }

    const must = [];
    const mustNot = [];
    const filterClauses = [];

    // NOTE: No automatic soft-delete exclusion here.
    // MongoDB's DataService.filter() does NOT exclude deleted_at records,
    // so OpenSearch must match that behavior for identical record counts.

    // Handle custom companyIds filter (for productlist page)
    if (params.customCompanyIds && Array.isArray(params.customCompanyIds) && params.customCompanyIds.length > 0) {
      // id is mapped as keyword — use string terms
      const companyIds = params.customCompanyIds.map(id => String(id).trim()).filter(id => id.length > 0);
      
      console.log(`🔍 OpenSearchService.search - Applying customCompanyIds filter:`, {
        collection,
        companyIdsCount: companyIds.length,
        companyIds: companyIds.slice(0, 5)
      });
      
      if (companyIds.length > 0) {
        filterClauses.push({ terms: { id: companyIds } });
        console.log(`✅ OpenSearchService.search - Added id filter with ${companyIds.length} string IDs`);
      }
    }

    const filterType = filters.filterType || filters.FilterType || {};
    const columnFilters = filters.columns || {};

    // Column filters
    Object.keys(columnFilters).forEach((col) => {
      const entry = columnFilters[col];
      const values = Array.isArray(entry?.search?.value)
        ? entry.search.value
        : entry?.search?.value
        ? String(entry.search.value).split(',').map((v) => v.trim()).filter(Boolean)
        : [];

      if (values.length === 0) return;
      const type = filterType[col] || 'strict';

      const clauses = values.map((val) => this.buildClauseForFilter(col, val, type));
      if (clauses.length > 0) {
        if (type === 'not') {
          mustNot.push(...clauses);
        } else {
          filterClauses.push({ bool: { should: clauses, minimum_should_match: 1 } });
        }
      }
    });

    // Date range
    if (filters.dateRange) {
      Object.keys(filters.dateRange).forEach((col) => {
        if (col === 'column') return;
        const range = filters.dateRange[col];
        if (range?.from && range?.to) {
          filterClauses.push({
            range: {
              [col]: {
                gte: range.from,
                lte: range.to
              }
            }
          });
        } else if (range?.from) {
          filterClauses.push({ range: { [col]: { gte: range.from } } });
        } else if (range?.to) {
          filterClauses.push({ range: { [col]: { lte: range.to } } });
        }
      });
    }

    // Where (from params.where if any)
    if (params.where && Array.isArray(params.where)) {
      params.where.forEach((w) => {
        if (w.column && w.value !== undefined) {
          filterClauses.push({ term: { [w.column]: w.value } });
        } else if (w.condition) {
          const m = w.condition.match(/([\w\.]+)\s*=\s*'?([^']+)'?/);
          if (m) {
            filterClauses.push({ term: { [m[1]]: m[2] } });
          }
        }
      });
    }

    // ─── Global search — uses query_string with wildcard for ALL fields ───
    const searchTerm =
      typeof filters.search?.value === 'string'
        ? filters.search.value
        : typeof filters.search === 'string'
        ? filters.search
        : '';
    if (searchTerm && searchTerm.trim()) {
      const escapedTerm = searchTerm.trim();
      const fields = this.searchFields[collection] || ['*'];
      must.push({
        query_string: {
          query: escapedTerm.includes(' ') ? `"${escapedTerm}"` : `*${escapedTerm}*`,
          fields,
          default_operator: 'AND',
          allow_leading_wildcard: true,
          lenient: true
        }
      });
    }

    const body = {
      track_total_hits: true,
      from: finalFrom,
      size: finalLimit,
      _source: isIdsOnly ? false : true,
      query: {
        bool: {
          must: must,
          must_not: mustNot,
          filter: filterClauses
        }
      }
    };
    
    if (isIdsOnly) {
      console.log(`🔍 OpenSearchService.search - Using ID-only mode (no _source)`);
    }

    // Sorting
    if (filters.sort && Object.keys(filters.sort).length > 0) {
      body.sort = Object.entries(filters.sort).map(([field, dir]) => ({
        [field]: dir === 'desc' ? 'desc' : 'asc'
      }));
    } else {
      body.sort = [{ _id: 'desc' }];
    }

    const result = await this.client.search({
      index,
      body
    });

    const hits = result?.body?.hits;
    const total = typeof hits?.total === 'object' ? hits.total.value : hits?.total || 0;
    const rows = (hits?.hits || []).map((hit) => {
      if (isIdsOnly) {
        const id = hit._id || hit._source?._id || hit._source?.id;
        return {
          id: String(id),
          _id: String(id)
        };
      }
      const doc = hit._source || {};
      const id = hit._id || doc._id || doc.id;
      return {
        ...doc,
        id: String(id),
        _id: String(id)
      };
    });

    return {
      status: true,
      data: rows,
      recordsTotal: total,
      recordsFiltered: total,
      draw: params.draw || 1,
      message: 'OpenSearch results'
    };
  }

  buildClauseForFilter(field, value, type) {
    switch (type) {
      case 'partial':
        return { match: { [field]: value } };
      case 'starts_with':
        return { prefix: { [field]: value.toLowerCase ? value.toLowerCase() : value } };
      case 'ends_with':
        return { wildcard: { [field]: `*${value}` } };
      case 'greater_than':
        return { range: { [field]: { gt: this.toNumberOrValue(value) } } };
      case 'less_than':
        return { range: { [field]: { lt: this.toNumberOrValue(value) } } };
      case 'not':
        return { term: { [field]: value } };
      case 'strict':
      default:
        return { term: { [field]: value } };
    }
  }

  toNumberOrValue(value) {
    const num = Number(value);
    return isNaN(num) ? value : num;
  }

  /**
   * Bulk index helper used by sync script and batch operations.
   * @param {string} collection
   * @param {Array} body - bulk body [{ index: {_id}}, doc, ...]
   */
  async bulkIndex(collection, body, options = {}) {
    const index = this.indexMap[collection];
    if (!index) throw new Error(`No OpenSearch index mapped for collection ${collection}`);
    if (!Array.isArray(body) || body.length === 0) return;

    const refresh = options.refresh !== undefined 
      ? options.refresh 
      : (body.length <= 2 ? 'wait_for' : false);

    const res = await this.client.bulk({
      index,
      refresh,
      body
    });

    if (res.body?.errors) {
      const items = res.body.items || [];
      const failures = items.filter((i) => {
        const op = i.index || i.update || i.create;
        return op && op.error;
      });
      if (failures.length > 0) {
        const sample = failures[0].index?.error || failures[0].update?.error || failures[0].create?.error;
        throw new Error(`Bulk index had failures. Sample: ${JSON.stringify(sample)}`);
      }
    }
    return res;
  }

  // ═══════════════════════════════════════════════════════════════
  // PRODUCT-SPECIFIC METHODS
  // ═══════════════════════════════════════════════════════════════

  /**
   * Check which values from a list exist in a collection's field.
   * Uses OpenSearch terms aggregation on the inverted index — O(1) per term.
   * Used by companies-products.js classification to replace slow MongoDB $in scans.
   *
   * @param {string} collectionName - e.g., 'master_accounts' or 'master_leads'
   * @param {string} field - e.g., 'li_smtp.keyword'
   * @param {string[]} values - list of values to check existence for
   * @returns {Set<string>} - set of values that exist in the index
   */
  async termsExists(collectionName, field, values) {
    if (!this.isEnabled() || !values || values.length === 0) return new Set();
    const indexName = this.getIndexName(collectionName);
    if (!indexName) return new Set();

    try {
      // Process in chunks of 10000 to avoid massive single requests
      const CHUNK_SIZE = 10000;
      const existingValues = new Set();

      for (let i = 0; i < values.length; i += CHUNK_SIZE) {
        const chunk = values.slice(i, i + CHUNK_SIZE);
        const result = await this.client.search({
          index: indexName,
          body: {
            size: 0,
            query: {
              terms: { [field]: chunk }
            },
            aggs: {
              existing_values: {
                terms: {
                  field: field,
                  size: chunk.length,
                  include: chunk
                }
              }
            }
          }
        });

        const buckets = result?.body?.aggregations?.existing_values?.buckets || [];
        for (const b of buckets) {
          existingValues.add(b.key);
        }
      }

      return existingValues;
    } catch (err) {
      console.error(`[OpenSearch] termsExists failed for ${collectionName}/${field}:`, err.message);
      return new Set(); // Fallback: caller should use MongoDB
    }
  }

  /**
   * Search products — used by product listing API GET handlers.
   * Replaces MongoDB $regex search with OpenSearch multi_match.
   *
   * @param {string} collectionName - e.g., 'apolloproduct'
   * @param {object} opts - { search, category, vendor, page, limit, exactId, sort }
   * @returns {{ data: Array, recordsTotal: number, recordsFiltered: number, totalPages: number }}
   */
  async searchProducts(collectionName, { search, category, vendor, page = 1, limit = 24, exactId, sort } = {}) {
    const indexName = this.getIndexName(collectionName);
    if (!indexName) throw new Error(`No OpenSearch index for ${collectionName}`);

    const must = [];
    const filterClauses = [];

    // Exact product_id lookup
    if (exactId) {
      filterClauses.push({ term: { product_id: exactId } });
    } else if (search && search.trim()) {
      const fields = this.searchFields[collectionName] || ['product_name^5', 'description^2', '*'];
      must.push({
        query_string: {
          query: search.includes(' ') ? `"${search.trim()}"` : `*${search.trim()}*`,
          fields,
          default_operator: 'AND',
          allow_leading_wildcard: true,
          lenient: true
        }
      });
    }

    // Category filter
    if (category) {
      filterClauses.push({ term: { 'category.keyword': category } });
    }
    // Vendor filter
    if (vendor) {
      filterClauses.push({ term: { 'vendor.keyword': vendor } });
    }
    // Exclude soft-deleted
    filterClauses.push({ bool: { must_not: { exists: { field: 'deleted_at' } } } });

    const from = (page - 1) * limit;
    const safeFrom = Math.min(from, 9900);
    const safeLimit = Math.min(limit, 10000 - safeFrom);

    // Build sort
    const sortArr = [];
    if (sort && typeof sort === 'object') {
      for (const [field, dir] of Object.entries(sort)) {
        sortArr.push({ [field]: { order: dir === -1 || dir === 'desc' ? 'desc' : 'asc', missing: '_last' } });
      }
    } else {
      sortArr.push({ companies_count: { order: 'desc', missing: '_last' } });
      sortArr.push({ id: { order: 'desc', missing: '_last' } });
    }

    const body = {
      track_total_hits: true,
      from: safeFrom,
      size: safeLimit,
      query: {
        bool: {
          must,
          filter: filterClauses
        }
      },
      sort: sortArr
    };

    const result = await this.client.search({ index: indexName, body });
    const hits = result?.body?.hits;
    const total = typeof hits?.total === 'object' ? hits.total.value : hits?.total || 0;

    // Get total count (without filters) for recordsTotal
    let recordsTotal = total;
    const hasFilters = !!(search || category || vendor);
    if (hasFilters) {
      try {
        const countResult = await this.client.count({
          index: indexName,
          body: {
            query: {
              bool: {
                filter: [{ bool: { must_not: { exists: { field: 'deleted_at' } } } }]
              }
            }
          }
        });
        recordsTotal = countResult?.body?.count || total;
      } catch {
        recordsTotal = total;
      }
    }

    const docs = (hits?.hits || []).map(hit => {
      const doc = hit._source || {};
      return { _id: hit._id, ...doc };
    });

    return {
      data: docs,
      recordsTotal,
      recordsFiltered: total,
      totalPages: Math.max(1, Math.ceil(total / limit))
    };
  }

  /**
   * Get filter aggregations (categories/vendors) for product collections.
   * Replaces MongoDB distinct() calls with a single OpenSearch request.
   *
   * @param {string} collectionName - e.g., 'apolloproduct'
   * @param {object} aggs - aggregation definitions
   * @returns {object} - aggregation results
   */
  async getFilterAggregations(collectionName, aggs) {
    const indexName = this.getIndexName(collectionName);
    if (!indexName) return {};

    try {
      const result = await this.client.search({
        index: indexName,
        body: {
          size: 0,
          query: {
            bool: {
              filter: [{ bool: { must_not: { exists: { field: 'deleted_at' } } } }]
            }
          },
          aggs
        }
      });
      return result?.body?.aggregations || {};
    } catch (err) {
      console.error(`[OpenSearch] getFilterAggregations failed for ${collectionName}:`, err.message);
      return {};
    }
  }
}

let instance = null;
export default function getOpenSearchService() {
  if (!instance) instance = new OpenSearchService();
  return instance;
}
