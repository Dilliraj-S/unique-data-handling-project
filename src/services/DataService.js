import { getCollection } from '../lib/mongodb';
import { ObjectId, Long } from 'mongodb';
import getOpenSearchService, { transformDocForOpenSearch } from './OpenSearchService.js';

// ─── OpenSearch real-time sync configuration ───
const OPENSEARCH_COLLECTIONS = ['master_leads', 'temp_master_leads', 'master_accounts'];
function shouldSyncToOpenSearch(collectionName) {
  return process.env.OPENSEARCH_ENABLED === 'true'
    && OPENSEARCH_COLLECTIONS.includes(collectionName);
}

/**
 * DataService - MongoDB implementation
 * Handles CRUD operations with MongoDB
 */
class DataService {
  /**
   * Get records from collection
   * @param {string} system - Database system (central, business, etc.)
   * @param {string} table - Collection name
   * @param {object} params - Query parameters
   * @param {string} limit - Optional limit
   * @returns {Promise<object>} Response with status, message, and data
   */
  static async get(system, table, params = {}, limit = '') {
    try {
      // Use system parameter to select database connection (default: 'central')
      const connectionName = system || 'central';
      const collection = await getCollection(table, connectionName);
      
      // Build query
      let query = {};
      
      // Handle where clause
      if (params.where && typeof params.where === 'object') {
        Object.keys(params.where).forEach(key => {
          let value = params.where[key];
          
          // Convert id to ObjectId if needed
          if (key === '_id' || key.endsWith('_id')) {
            try {
              if (typeof value === 'string' && ObjectId.isValid(value)) {
                value = new ObjectId(value);
              }
            } catch (e) {
              // Keep original value if conversion fails
            }
          }
          
          query[key] = value;
        });
      }
      
      // Apply soft delete filter (unless explicitly queried)
      if (!query.deleted_at && !query.deleted_on) {
        query.deleted_at = null;
      }
      
      // Build cursor
      let cursor = collection.find(query);
      
      // Apply sorting
      if (params.sort && Array.isArray(params.sort)) {
        const sortObj = {};
        params.sort.forEach(s => {
          if (typeof s === 'string') {
            sortObj[s] = 1;
          } else if (Array.isArray(s)) {
            sortObj[s[0]] = s[1] === 'desc' ? -1 : 1;
          }
        });
        cursor = cursor.sort(sortObj);
      }
      
      // Apply limit
      if (limit) {
        const limitNum = parseInt(limit);
        if (!isNaN(limitNum)) {
          cursor = cursor.limit(limitNum);
        }
      }
      
      // Execute query
      const data = await cursor.toArray();
      
      // Convert ObjectId to string for serialization
      const serializedData = data.map(doc => {
        const serialized = { ...doc };
        if (serialized._id) {
          serialized.id = serialized._id.toString();
        }
        return serialized;
      });
      
      return {
        status: true,
        message: serializedData.length > 0 ? 'Records fetched successfully' : 'No records found',
        data: serializedData
      };
      
    } catch (error) {
      console.error(`DataService.get error for ${table}:`, error);
      return {
        status: false,
        message: error.message || 'Failed to fetch records',
        data: []
      };
    }
  }
  
  /**
   * Create a new record
   * @param {string} system - Database system
   * @param {string} table - Collection name
   * @param {object} data - Record data
   * @param {string} tokenKey - Optional token key
   * @returns {Promise<object>} Response with status, message, and data
   */
  static async create(system, table, data, tokenKey = '') {
    try {
      // Use system parameter to select database connection (default: 'central')
      const connectionName = system || 'central';
      const collection = await getCollection(table, connectionName);
      
      // Add timestamps if not present
      const now = new Date();
      if (!data.created_at) data.created_at = now;
      if (!data.updated_at) data.updated_at = now;
      
      // Insert document
      const result = await collection.insertOne(data);
      
      // ─── OpenSearch sync (fire-and-forget) ───
      if (shouldSyncToOpenSearch(table)) {
        const osService = getOpenSearchService();
        osService.upsertDoc(table, result.insertedId.toString(), { ...data, _id: result.insertedId })
          .catch(e => console.error('[OpenSearch] insert sync failed:', e.message));
      }
      
      return {
        status: true,
        message: 'Record added successfully',
        data: {
          id: result.insertedId.toString(),
          _id: result.insertedId
        }
      };
      
    } catch (error) {
      console.error(`DataService.create error for ${table}:`, error);
      return {
        status: false,
        message: error.message || 'Failed to create record',
        data: null
      };
    }
  }
  
  /**
   * Update records
   * @param {string} system - Database system
   * @param {string} table - Collection name
   * @param {object} data - Update data
   * @param {object} where - Where conditions
   * @param {string} tokenKey - Optional token key
   * @returns {Promise<object>} Response with status and message
   */
  static async update(system, table, data, where, tokenKey = '') {
    try {
      // Use system parameter to select database connection (default: 'central')
      const connectionName = system || 'central';
      const collection = await getCollection(table, connectionName);
      
      // Build query
      let query = { ...where };
      
      // Convert id to ObjectId if needed
      Object.keys(query).forEach(key => {
        if (key === '_id' || key.endsWith('_id')) {
          try {
            if (typeof query[key] === 'string' && ObjectId.isValid(query[key])) {
              query[key] = new ObjectId(query[key]);
            }
          } catch (e) {
            // Keep original value
          }
        }
      });
      
      // Add updated_at
      const updateData = {
        $set: {
          ...data,
          updated_at: new Date()
        }
      };
      
      // Execute update
      const result = await collection.updateMany(query, updateData);
      
      // ─── OpenSearch sync (fire-and-forget) ───
      if (shouldSyncToOpenSearch(table) && result.modifiedCount > 0) {
        try {
          const osService = getOpenSearchService();
          // Fetch updated docs to get their full current state
          const updatedDocs = await collection.find(query).limit(1000).toArray();
          if (updatedDocs.length > 0) {
            const bulkBody = [];
            for (const doc of updatedDocs) {
              const docId = (doc.id !== undefined && doc.id !== null)
                ? String(doc.id)
                : doc._id.toString();
              bulkBody.push({ index: { _id: docId } });
              bulkBody.push(transformDocForOpenSearch(doc));
            }
            osService.bulkIndex(table, bulkBody)
              .catch(e => console.error('[OpenSearch] update sync failed:', e.message));
          }
        } catch (e) {
          console.error('[OpenSearch] update sync error:', e.message);
        }
      }
      
      return {
        status: true,
        message: 'Records updated successfully',
        data: {
          affected_rows: result.modifiedCount
        }
      };
      
    } catch (error) {
      console.error(`DataService.update error for ${table}:`, error);
      return {
        status: false,
        message: error.message || 'Failed to update records',
        data: { affected_rows: 0 }
      };
    }
  }
  
  /**
   * Apply filter based on filter type (strict, partial, starts_with, etc.)
   * @param {string} column - Column name
   * @param {Array} values - Filter values
   * @param {string} filterType - Type of filter
   * @returns {Object} MongoDB query condition
   */
  static applyFilter(column, values, filterType) {
    if (!values || values.length === 0) return null;

    // PERFORMANCE: For strict filters with multiple values, use $in (single index scan)
    // instead of $or with individual conditions (N separate index scans)
    if (filterType === 'strict') {
      const trimmedValues = values.map(v => String(v).trim()).filter(Boolean);
      if (trimmedValues.length === 0) return null;
      if (trimmedValues.length === 1) {
        return { [column]: trimmedValues[0] };
      }
      return { [column]: { $in: trimmedValues } };
    }

    const conditions = [];
    values.forEach(value => {
      const trimmedValue = String(value).trim();
      if (!trimmedValue) return;

      switch (filterType) {
        case 'partial':
          conditions.push({ [column]: { $regex: trimmedValue, $options: 'i' } });
          break;
        case 'starts_with':
          conditions.push({ [column]: { $regex: `^${trimmedValue}`, $options: 'i' } });
          break;
        case 'ends_with':
          conditions.push({ [column]: { $regex: `${trimmedValue}$`, $options: 'i' } });
          break;
        case 'greater_than':
          const numValue = Number(trimmedValue);
          if (!isNaN(numValue)) {
            conditions.push({ [column]: { $gt: numValue } });
          }
          break;
        case 'less_than':
          const numValue2 = Number(trimmedValue);
          if (!isNaN(numValue2)) {
            conditions.push({ [column]: { $lt: numValue2 } });
          }
          break;
        case 'not':
          conditions.push({ [column]: { $ne: trimmedValue } });
          break;
        default:
          conditions.push({ [column]: trimmedValue });
      }
    });

    return conditions.length > 0 ? { $or: conditions } : null;
  }

  /**
   * Filter records with pagination and advanced search
   * @param {string} system - Database system
   * @param {string} table - Collection name
   * @param {object} params - Filter parameters
   * @returns {Promise<object>} Response with status, data, recordsTotal, recordsFiltered
   */
  static async filter(system, table, params) {
    try {
      // Use system parameter to select database connection (default: 'central')
      const connectionName = system || 'central';
      const collection = await getCollection(table, connectionName);
      
      const draw = parseInt(params.draw || 1);
      const filters = params.filters || {};
      
      // Build base query
      let query = {};
      const queryConditions = [];
      
      // Apply soft delete filter (unless explicitly queried)
      queryConditions.push({
        $or: [
          { deleted_at: null },
          { deleted_at: { $exists: false } }
        ]
      });
      
      // Handle custom companyIds filter (for productlist page)
      // This filter MUST be applied to restrict results to only the specified company IDs
      if (params.customCompanyIds && Array.isArray(params.customCompanyIds) && params.customCompanyIds.length > 0) {
        const companyIds = params.customCompanyIds.map(id => String(id).trim()).filter(id => id.length > 0);
        
        console.log(`🔍 DataService.filter - Applying customCompanyIds filter:`, {
          table,
          companyIdsCount: companyIds.length,
          companyIds: companyIds.slice(0, 5) // Log first 5
        });
        
        const objectIds = companyIds
          .map(id => {
            try {
              if (ObjectId.isValid(String(id)) && String(id).length === 24) {
                return new ObjectId(String(id));
              }
            } catch (e) {}
            return null;
          })
          .filter(id => id !== null);
        
        const numericIds = companyIds
          .map(id => {
            const num = parseInt(id);
            return isNaN(num) ? null : num;
          })
          .filter(id => id !== null);
        
        console.log(`🔍 DataService.filter - Parsed IDs:`, {
          objectIdsCount: objectIds.length,
          numericIdsCount: numericIds.length,
          numericIds: numericIds.slice(0, 5)
        });
        
        // Build query to match by either _id (ObjectId) or id (numeric)
        // For master_accounts, use numeric 'id' field as primary key
        const idConditions = [];
        if (objectIds.length > 0) {
          idConditions.push({ _id: { $in: objectIds } });
        }
        if (numericIds.length > 0) {
          // For master_accounts, the primary key is numeric 'id' field
          idConditions.push({ id: { $in: numericIds } });
        }
        
        if (idConditions.length > 0) {
          // Use $or to match either _id or id field
          const companyFilter = idConditions.length === 1 ? idConditions[0] : { $or: idConditions };
          queryConditions.push(companyFilter);
          console.log(`✅ DataService.filter - Added company filter:`, JSON.stringify(companyFilter));
        } else {
          console.warn(`⚠️ DataService.filter - No valid IDs found in customCompanyIds:`, companyIds);
        }
      }
      
      // Apply where conditions from params
      if (params.where && typeof params.where === 'object') {
        Object.keys(params.where).forEach(key => {
          let value = params.where[key];
          
          // Convert id to ObjectId if needed
          if (key === '_id' || key.endsWith('_id')) {
            try {
              if (typeof value === 'string' && ObjectId.isValid(value)) {
                value = new ObjectId(value);
              }
            } catch (e) {
              // Keep original value
            }
          }
          
          queryConditions.push({ [key]: value });
        });
      }
      
      // Apply filters.where
      if (filters.where && Array.isArray(filters.where)) {
        filters.where.forEach(condition => {
          if (condition.column && condition.value !== undefined) {
            let value = condition.value;
            const column = condition.column;
            
            // Convert id to ObjectId if needed
            if (column === '_id' || column.endsWith('_id')) {
              try {
                if (typeof value === 'string' && ObjectId.isValid(value)) {
                  value = new ObjectId(value);
                } else if (Array.isArray(value)) {
                  value = value.map(v => {
                    if (typeof v === 'string' && ObjectId.isValid(v)) {
                      return new ObjectId(v);
                    }
                    return v;
                  });
                }
              } catch (e) {
                // Keep original value
              }
            }
            
            const operator = condition.operator || '=';
            if (operator === 'IN' || operator === 'NOT IN') {
              const arr = Array.isArray(value) ? value : String(value).split(',').map(v => v.trim());
              if (operator === 'IN') {
                queryConditions.push({ [column]: { $in: arr } });
              } else {
                queryConditions.push({ [column]: { $nin: arr } });
              }
            } else {
              queryConditions.push({ [column]: value });
            }
          }
        });
      }
      
      // Apply column filters with filter types
      if (filters.columns && typeof filters.columns === 'object') {
        // Handle both lowercase and uppercase FilterType (for consistency)
        const filterType = filters.FilterType || filters.filterType || {};
        console.log('📋 FilterType received:', filterType);
        Object.keys(filters.columns).forEach(column => {
          const filter = filters.columns[column];
          const values = Array.isArray(filter.search?.value) 
            ? filter.search.value 
            : (filter.search?.value ? String(filter.search.value).split(',').map(v => v.trim()) : []);
          
          if (values.length > 0) {
            // CRITICAL: Default to 'partial' for text fields (allows substring matching)
            // Use 'strict' only for ID fields (exact match required)
            const isIdField = column === 'id' || column === '_id' || column.endsWith('_id');
            const isTextField = !isIdField && (
              column.includes('name') || 
              column.includes('title') || 
              column.includes('designation') ||
              column.includes('jobfunction') ||
              column.includes('description') ||
              column.includes('email') ||
              column.includes('smtp') ||
              column.includes('duration') ||
              column.includes('location') ||
              column.includes('industry') ||
              column.includes('address') ||
              column.includes('city') ||
              column.includes('state') ||
              column.includes('country')
            );
            
            // Default to 'partial' for text fields, 'strict' for IDs
            const defaultType = isIdField ? 'strict' : (isTextField ? 'partial' : 'strict');
            const type = filterType[column] || defaultType;
            console.log(`🔍 Applying filter for column "${column}": type="${type}" (default: "${defaultType}", isTextField: ${isTextField}), values=`, values);
            
            // Special handling for audience_id: convert to Long for proper matching
            // audience_id is stored as MongoDB Long type, so we need to convert to Long instances
            if (column === 'audience_id' && type === 'strict') {
              const longValues = values.map(v => {
                try {
                  const num = Number(String(v).trim());
                  if (!isNaN(num) && Number.isFinite(num)) {
                    return Long.fromNumber(num);
                  }
                } catch (e) {
                  console.warn(`⚠️ Failed to convert audience_id value to Long: ${v}`, e);
                }
                return null;
              }).filter(v => v !== null);
              
              if (longValues.length === 1) {
                queryConditions.push({ [column]: longValues[0] });
                console.log(`✅ Applied audience_id filter with Long: ${longValues[0].toString()}`);
              } else if (longValues.length > 1) {
                queryConditions.push({ [column]: { $in: longValues } });
                console.log(`✅ Applied audience_id filter with Long array: ${longValues.map(l => l.toString()).join(', ')}`);
              } else {
                console.warn(`⚠️ No valid Long values found for audience_id filter:`, values);
              }
            } 
            // Special handling for status column with "other_status" filter type (for "Other" category)
            // This handles emails with null, undefined, or "other" status
            else if (column === 'status' && type === 'other_status') {
              const conditions = [];
              
              // Check for null/undefined markers
              const hasNull = values.includes('__NULL__') || values.includes('null');
              const hasUndefined = values.includes('__UNDEFINED__') || values.includes('undefined');
              const otherValues = values.filter(v => 
                v !== '__NULL__' && 
                v !== '__UNDEFINED__' && 
                v !== 'null' && 
                v !== 'undefined' &&
                String(v).trim() !== ''
              );
              
              if (hasNull || hasUndefined) {
                conditions.push(
                  { [column]: null },
                  { [column]: { $exists: false } }
                );
              }
              
              if (otherValues.length > 0) {
                conditions.push({ [column]: { $in: otherValues } });
              }
              
              if (conditions.length > 0) {
                queryConditions.push(conditions.length === 1 ? conditions[0] : { $or: conditions });
                console.log(`✅ Applied "other" status filter for column "${column}"`);
              }
            } 
            else {
              const condition = this.applyFilter(column, values, type);
              if (condition) {
                queryConditions.push(condition);
              }
            }
          }
        });
      }
      
      // Apply date range filters
      if (filters.dateRange && typeof filters.dateRange === 'object') {
        Object.keys(filters.dateRange).forEach(column => {
          if (column === 'column') return; // Skip metadata
          const range = filters.dateRange[column];
          if (range && range.from && range.to) {
            // CRITICAL FIX: Parse dates in local timezone to avoid UTC conversion issues
            // HTML date inputs return YYYY-MM-DD format, which needs proper local timezone handling
            
            // Parse "from" date - start of day in local timezone
            let fromDate;
            if (typeof range.from === 'string' && range.from.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // YYYY-MM-DD format from HTML date input
              const [year, month, day] = range.from.split('-').map(Number);
              fromDate = new Date(year, month - 1, day, 0, 0, 0, 0); // Local timezone, start of day
            } else {
              fromDate = new Date(range.from);
              // If it's a date string that might be in UTC, convert to local
              if (isNaN(fromDate.getTime())) {
                // Try ISO format
                fromDate = new Date(range.from);
              }
              // Ensure start of day in local timezone
              fromDate.setHours(0, 0, 0, 0);
            }
            
            // Parse "to" date - end of day in local timezone
            let toDate;
            if (typeof range.to === 'string' && range.to.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // YYYY-MM-DD format from HTML date input
              const [year, month, day] = range.to.split('-').map(Number);
              toDate = new Date(year, month - 1, day, 23, 59, 59, 999); // Local timezone, end of day
            } else {
              toDate = new Date(range.to);
              // If it's a date string that might be in UTC, convert to local
              if (isNaN(toDate.getTime())) {
                // Try ISO format
                toDate = new Date(range.to);
              }
              // Ensure end of day in local timezone
              toDate.setHours(23, 59, 59, 999);
            }
            
            // Validate dates
            if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
              console.warn(`⚠️ Invalid date range for column "${column}": from="${range.from}", to="${range.to}"`);
              return;
            }
            
            // Ensure from <= to
            if (fromDate > toDate) {
              console.warn(`⚠️ Invalid date range for column "${column}": from date is after to date`);
              return;
            }
            
            console.log(`📅 Date range filter for "${column}":`, {
              from: fromDate.toISOString(),
              to: toDate.toISOString(),
              fromLocal: fromDate.toLocaleString(),
              toLocal: toDate.toLocaleString()
            });
            
            queryConditions.push({
              [column]: {
                $gte: fromDate,
                $lte: toDate
              }
            });
          } else if (range && range.from) {
            // Only "from" date provided - filter from that date onwards
            let fromDate;
            if (typeof range.from === 'string' && range.from.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = range.from.split('-').map(Number);
              fromDate = new Date(year, month - 1, day, 0, 0, 0, 0);
            } else {
              fromDate = new Date(range.from);
              fromDate.setHours(0, 0, 0, 0);
            }
            
            if (!isNaN(fromDate.getTime())) {
              queryConditions.push({
                [column]: {
                  $gte: fromDate
                }
              });
            }
          } else if (range && range.to) {
            // Only "to" date provided - filter up to that date
            let toDate;
            if (typeof range.to === 'string' && range.to.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = range.to.split('-').map(Number);
              toDate = new Date(year, month - 1, day, 23, 59, 59, 999);
            } else {
              toDate = new Date(range.to);
              toDate.setHours(23, 59, 59, 999);
            }
            
            if (!isNaN(toDate.getTime())) {
              queryConditions.push({
                [column]: {
                  $lte: toDate
                }
              });
            }
          }
        });
      }
      
      // Apply global search
      if (filters.search && filters.search.value) {
        const searchValue = String(filters.search.value).trim();
        if (searchValue) {
          // PERFORMANCE: For large collections, prioritize indexed fields for search
          // This prevents full collection scans
          const searchRegex = { $regex: searchValue, $options: 'i' };
          const searchConditions = [];
          
          // Get searchable columns from params
          const allColumns = params.columns || {};
          const columnNames = Object.keys(allColumns).length > 0 
            ? Object.keys(allColumns)
            : Object.values(allColumns).map(col => typeof col === 'string' ? col : col.name || col);
          
          // PERFORMANCE: Only search on commonly indexed fields for large collections
          // This prevents scanning all documents and uses indexes efficiently
          const indexedFields = [
            'li_company_name', 'li_full_name', 'email', 'li_smtp', 
            'li_job_title', 'dls_designation', 'ap_company_name', 'zm_company',
            'li_first_name', 'li_last_name', 'ap_full_name'
          ];
          
          // Build search conditions (prioritize indexed fields)
          columnNames.forEach(col => {
            const colName = typeof col === 'string' ? col : (col.name || col);
            // Only search on indexed fields to ensure fast queries
            if (colName && 
                !colName.endsWith('_id') && 
                !colName.includes('status') && 
                !colName.startsWith('is_') &&
                (indexedFields.includes(colName) || 
                 colName.includes('name') || 
                 colName.includes('email') ||
                 colName.includes('smtp'))) {
              searchConditions.push({ [colName]: searchRegex });
            }
          });
          
          if (searchConditions.length > 0) {
            queryConditions.push({ $or: searchConditions });
          }
        }
      }
      
      // Combine all conditions
      if (queryConditions.length > 0) {
        query = { $and: queryConditions };
        console.log(`🔍 DataService.filter - Final query for ${table}:`, {
          conditionsCount: queryConditions.length,
          hasCustomCompanyIds: !!params.customCompanyIds,
          query: JSON.stringify(query).substring(0, 500) // Log first 500 chars
        });
      } else {
        console.log(`⚠️ DataService.filter - No query conditions for ${table}, returning all records`);
      }
      
      // Pagination - CRITICAL: Default to small page size for large collections
      const page = Math.max(1, parseInt(filters.pagination?.page || 1));
      // For select-all operations, allow larger batch sizes (up to 10,000)
      // Check if this is a select-all operation by looking for a special flag or large limit request
      const requestedLimit = parseInt(filters.pagination?.limit || 10);
      const isSelectAll = requestedLimit > 1000 || filters.selectAll === true;
      const isExport = filters.export?.export === true;

      // IMPORTANT:
      // - For most tables, keep a conservative per-page limit (100) for performance.
      // - For product-style collections, allow higher cap. For export, allow up to 500k.
      const largeDatasetTables = ['products', 'apolloproducts', 'g2products', 'linkedinproducts'];
      const isLargeDatasetTable = largeDatasetTables.includes(table);
      const defaultMaxLimit = isLargeDatasetTable ? 50000 : 100;

      let maxLimit = isSelectAll ? 10000 : defaultMaxLimit;
      if (isExport && requestedLimit > maxLimit) {
        maxLimit = Math.min(requestedLimit, 500000); // Allow full export up to 500k records
      }
      const limit = Math.min(Math.max(1, requestedLimit), maxLimit);
      const skip = (page - 1) * limit;
      
      // PERFORMANCE OPTIMIZATION: For large collections, use estimatedDocumentCount when no filters
      // This is 1000x faster than countDocuments for collections with millions of records
      const hasFilters = queryConditions.length > 1 || // More than just deleted_at filter
                        (filters.columns && Object.keys(filters.columns).length > 0) ||
                        (filters.search && filters.search.value) ||
                        (filters.dateRange && Object.keys(filters.dateRange).filter(k => k !== 'column').length > 0);
      
      let recordsTotal = 0;
      let recordsFiltered = 0;
      
      // Get total count (without filters, only non-deleted)
      // For large collections without filters, use estimatedDocumentCount (much faster)
      if (!hasFilters) {
        try {
          // Use estimatedDocumentCount for total - it's instant for large collections
          recordsTotal = await collection.estimatedDocumentCount();
          
          // For filtered count when no filters, it's the same as total
          recordsFiltered = recordsTotal;
        } catch (error) {
          console.warn('⚠️ estimatedDocumentCount failed, falling back to countDocuments:', error);
          // Fallback to countDocuments
          const totalQuery = {
            $or: [
              { deleted_at: null },
              { deleted_at: { $exists: false } }
            ]
          };
          recordsTotal = await collection.countDocuments(totalQuery);
          recordsFiltered = recordsTotal;
        }
      } else {
        // When filters are applied, we need accurate counts
        // Use 30s timeout to match the data query timeout (line 821)
        const countOptions = { maxTimeMS: 30000 }; // 30 second timeout for count
        
        const totalQuery = {
          $or: [
            { deleted_at: null },
            { deleted_at: { $exists: false } }
          ]
        };
        
        // For very large collections, use estimatedDocumentCount for total if no specific filters
        // Only use exact count if we have specific column filters
        const hasSpecificFilters = (filters.columns && Object.keys(filters.columns).length > 0) ||
                                  (filters.dateRange && Object.keys(filters.dateRange).filter(k => k !== 'column').length > 0);
        
        // --- Get recordsTotal (unfiltered count) ---
        try {
          if (hasSpecificFilters) {
            recordsTotal = await collection.countDocuments(totalQuery, countOptions);
          } else {
            recordsTotal = await collection.estimatedDocumentCount();
          }
        } catch (totalError) {
          console.error('⚠️ Total count failed, using estimated:', totalError.message);
          try {
            recordsTotal = await collection.estimatedDocumentCount();
          } catch (estError) {
            console.error('⚠️ Even estimatedDocumentCount failed:', estError.message);
            recordsTotal = 0;
          }
        }
        
        // --- Get recordsFiltered (filtered count) — SEPARATE try/catch ---
        // CRITICAL FIX: Never fall back to estimatedDocumentCount for filtered count
        // because estimated count = full collection size (e.g. 16M), which is WRONG
        // when filters should narrow it to e.g. 29K records.
        try {
          recordsFiltered = await collection.countDocuments(query, countOptions);
        } catch (filteredError) {
          console.error('⚠️ Filtered count failed or timed out:', filteredError.message);
          // Use -1 sentinel so frontend knows the count is unknown
          // (instead of lying with 16M estimated count)
          recordsFiltered = -1;
        }
      }
      
      // Build cursor with optimized query
      // For large datasets, ensure indexes are used by structuring query efficiently
      let cursor = collection.find(query);
      
      // For select-all operations (idsOnly), use projection to fetch only IDs
      // This dramatically reduces data transfer and improves performance
      const isIdsOnly = filters.idsOnly === true || filters.selectAll === true;
      // Get act field from params (passed from TableHelper.generateParams)
      const actField = params.act || 'id';
      const projection = isIdsOnly ? { 
        _id: 1, 
        id: 1,
        [actField]: 1 // Include the act field (usually 'id')
      } : {}; // Empty projection = fetch all fields
      
      if (isIdsOnly && Object.keys(projection).length > 0) {
        cursor = cursor.project(projection);
        console.log(`🔍 DataService.filter - Using ID-only projection for select-all operation (act: ${actField})`);
      }
      // PERF: Automatic projection from requested columns
      // Only fetch the fields that DynamicTable actually displays (e.g. 8 instead of 50+)
      // This reduces response size by ~80% for large collections like master_leads
      else if (!isIdsOnly && params.columns && typeof params.columns === 'object') {
        const colKeys = Object.keys(params.columns);
        if (colKeys.length > 0) {
          const autoProjection = { _id: 1, id: 1 };
          colKeys.forEach(col => {
            // Include the column and its sortable name
            const colDef = params.columns[col];
            const colName = Array.isArray(colDef) ? colDef[0] : (typeof colDef === 'string' ? colDef : col);
            autoProjection[col] = 1;
            if (colName !== col) autoProjection[colName] = 1;
          });
          // Always include act field and common identity fields
          autoProjection[actField] = 1;
          autoProjection['deleted_at'] = 1;
          cursor = cursor.project(autoProjection);
          console.log(`🔍 DataService.filter - Auto projection: ${Object.keys(autoProjection).length} fields (from ${colKeys.length} columns)`);
        }
      }
      
      // Apply sorting (use indexes for better performance)
      const sortObj = {};
      if (filters.sort && typeof filters.sort === 'object') {
        // Handle object format: { column: 'asc' | 'desc' }
        Object.keys(filters.sort).forEach(column => {
          const direction = filters.sort[column];
          sortObj[column] = direction === 'desc' ? -1 : 1;
        });
      } else if (Array.isArray(filters.sort)) {
        // Handle array format: [{ column: 'name', direction: 'asc' }]
        filters.sort.forEach(s => {
          if (s.column && s.direction) {
            sortObj[s.column] = s.direction === 'desc' ? -1 : 1;
          } else if (Array.isArray(s) && s.length >= 2) {
            sortObj[s[0]] = s[1] === 'desc' ? -1 : 1;
          }
        });
      }
      
      if (Object.keys(sortObj).length > 0) {
        cursor = cursor.sort(sortObj);
      } else {
        // Default sort: for product tables, prioritize companies_count > 0, then newest id
        const productTables = ['products', 'apolloproduct', 'g2product', 'linkedinprodcut', 'MSPsproduct', 'MSSPsproduct'];
        if (productTables.includes(table)) {
          // NOTE: uses existing indexes on deleted_at/category/vendor + id.
          // companies_count is not indexed but is bounded and only used for sort priority.
          cursor = cursor.sort({ companies_count: -1, id: -1 });
        } else {
          // Default sort by _id descending (indexed field for fast sorting)
          cursor = cursor.sort({ _id: -1 });
        }
      }
      
      // Apply pagination (critical for large datasets - only fetch what's needed)
      cursor = cursor.skip(skip).limit(limit);
      
      // PERFORMANCE: Add maxTimeMS to prevent query timeout (30 seconds)
      cursor = cursor.maxTimeMS(30000);
      
      // PERFORMANCE: For large datasets, MongoDB will automatically choose the best index
      // We don't need to hint - MongoDB's query planner is smart enough to use:
      // - deleted_at_id_idx or idx_deleted_id_desc for queries with deleted_at + _id sort
      // - Other compound indexes we created for specific filter combinations
      // 
      // Hints can cause errors when query structure doesn't exactly match the index,
      // especially with $or conditions. Let MongoDB choose automatically.
      console.log('ℹ️ Letting MongoDB query planner choose optimal index automatically');
      
      // Execute query with timeout protection
      let data = [];
      try {
        data = await cursor.toArray();
      } catch (queryError) {
        // If query times out or fails, return empty with error message
        console.error(`⚠️ Query execution failed for ${table}:`, queryError);
        if (queryError.message.includes('timeout') || queryError.message.includes('maxTimeMS')) {
          return {
            status: false,
            message: 'Query timeout - please try with more specific filters or reduce the page size',
            draw: draw,
            data: [],
            recordsTotal: recordsTotal,
            recordsFiltered: recordsFiltered,
            query: params,
            company_queries: null
          };
        }
        // For other errors, still return partial results if we have counts
        console.warn(`⚠️ Query error but continuing with available data:`, queryError.message);
        data = []; // Return empty data on error
      }
      
      // Serialize data (convert ObjectId to string and handle nested objects)
      const serializedData = data.map(doc => {
        const serialized = {};
        Object.keys(doc).forEach(key => {
          if (key === '_id') {
            serialized.id = doc._id.toString();
            serialized._id = doc._id.toString();
          } else if (doc[key] instanceof ObjectId) {
            serialized[key] = doc[key].toString();
          } else if (doc[key] instanceof Date) {
            serialized[key] = doc[key].toISOString();
          } else {
            serialized[key] = doc[key];
          }
        });
        return serialized;
      });
      
      return {
        status: true,
        message: serializedData.length > 0 ? 'Records filtered successfully' : 'No records found',
        draw: draw,
        data: serializedData,
        recordsTotal: recordsTotal,
        recordsFiltered: recordsFiltered,
        query: params,
        company_queries: null
      };
      
    } catch (error) {
      console.error(`DataService.filter error for ${table}:`, error);
      return {
        status: false,
        message: error.message || 'Failed to filter records',
        draw: parseInt(params.draw || 1),
        data: [],
        recordsTotal: 0,
        recordsFiltered: 0,
        query: params,
        company_queries: null
      };
    }
  }
  
  /**
   * Delete records (soft delete)
   * @param {string} system - Database system
   * @param {string} table - Collection name
   * @param {object} where - Where conditions
   * @returns {Promise<object>} Response with status and message
   */
  static async delete(system, table, where) {
    try {
      // Use system parameter to select database connection (default: 'central')
      const connectionName = system || 'central';
      const collection = await getCollection(table, connectionName);
      
      // Build query
      let query = { ...where };
      
      // Convert id to ObjectId if needed
      Object.keys(query).forEach(key => {
        if (key === '_id' || key.endsWith('_id')) {
          try {
            if (typeof query[key] === 'string' && ObjectId.isValid(query[key])) {
              query[key] = new ObjectId(query[key]);
            }
          } catch (e) {
            // Keep original value
          }
        }
      });
     
      // ─── OpenSearch: collect IDs BEFORE deleting ───
      let deletedIds = [];
      if (shouldSyncToOpenSearch(table)) {
        try {
          const docsToDelete = await collection.find(query).project({ _id: 1, id: 1 }).limit(10000).toArray();
          deletedIds = docsToDelete.map(d => (d.id !== undefined && d.id !== null) ? String(d.id) : d._id.toString());
        } catch (e) {
          console.error('[OpenSearch] pre-delete ID fetch failed:', e.message);
        }
      }
      
      // Hard delete: remove documents permanently
      const result = await collection.deleteMany(query);
      
      // ─── OpenSearch sync: delete mirrored docs (fire-and-forget) ───
      if (deletedIds.length > 0) {
        try {
          const osService = getOpenSearchService();
          for (const docId of deletedIds) {
            osService.deleteDoc(table, docId)
              .catch(e => console.error('[OpenSearch] delete sync failed:', e.message));
          }
        } catch (e) {
          console.error('[OpenSearch] delete sync error:', e.message);
        }
      }
      
      return {
        status: true,
        message: 'Records deleted successfully',
        data: {
          affected_rows: result.deletedCount
        }
      };
      
    } catch (error) {
      console.error(`DataService.delete error for ${table}:`, error);
      return {
        status: false,
        message: error.message || 'Failed to delete records',
        data: { affected_rows: 0 }
      };
    }
  }
}

export default DataService;

