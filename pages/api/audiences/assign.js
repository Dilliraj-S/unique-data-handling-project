import { authMiddleware } from '../../../src/server/Http/Middleware/auth';
import { getCollection } from '../../../src/lib/mongodb';
import { Long } from 'mongodb';
import { v4 as uuidv4 } from 'uuid';
import audienceQueue from '../../../queues/audienceQueue';

const toLong = (value) => {
  if (value instanceof Long) return value;
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Long.fromNumber(value);
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isNaN(parsed)) {
      throw new Error('Invalid numeric identifier');
    }
    return Long.fromNumber(parsed);
  }
  throw new Error('Invalid identifier provided');
};

const getNextNumericValue = async (collection) => {
  const lastDoc = await collection.findOne(
    {},
    { sort: { id: -1 }, projection: { id: 1 } }
  );

  if (!lastDoc || lastDoc.id === undefined || lastDoc.id === null) {
    return 1;
  }

  const lastId =
    lastDoc.id instanceof Long
      ? lastDoc.id.toNumber()
      : Number(lastDoc.id);

  return (Number.isNaN(lastId) ? 0 : lastId) + 1;
};

const sanitizeValue = (record, keys = []) => {
  for (const key of keys) {
    if (record && record[key] !== undefined && record[key] !== null) {
      const value = record[key];
      if (typeof value === 'string') return value.trim();
      if (typeof value === 'number') return String(value);
      if (typeof value === 'boolean') return value ? 'true' : 'false';
      if (value && typeof value.toString === 'function') {
        return value.toString().trim();
      }
    }
  }
  return '';
};

const formatRecords = (records, splitFullName) => {
  return records
    .map((record) => {
      const sourceId = sanitizeValue(record, ['id', '_id', 'ID', 'original_id']);
      // Check for LinkedIn fields first (master_leads), then standard fields
      const firstName = sanitizeValue(record, [
        'li_first_name', 'liFirstName', // LinkedIn fields (master_leads)
        'first_name', 'firstName'        // Standard fields
      ]);
      const lastName = sanitizeValue(record, [
        'li_last_name', 'liLastName',   // LinkedIn fields (master_leads)
        'last_name', 'lastName'         // Standard fields
      ]);
      const fullName = sanitizeValue(record, [
        'li_full_name', 'liFullName',    // LinkedIn full name (master_leads)
        'ap_full_name', 'apFullName',    // Alternative full name
        'full_name', 'fullName', 'name'  // Standard fields
      ]);
      const email = sanitizeValue(record, [
        'email', 'Email', 
        'li_email', 'liEmail', 
        'li_smtp', 'liSmtp',            // LinkedIn SMTP (master_accounts)
        'gs_smtp', 'gsSmtp',             // Google SMTP
        'ap_company_smtp', 'apCompanySmtp' // Alternative SMTP
      ]).toLowerCase();
      const status = sanitizeValue(record, ['status', 'Status']) || 'active';

      let finalFirstName = firstName;
      let finalLastName = lastName;

      if (splitFullName && !finalFirstName && !finalLastName && fullName) {
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        if (nameParts.length === 1) {
          finalFirstName = nameParts[0];
        } else if (nameParts.length > 1) {
          finalLastName = nameParts.pop();
          finalFirstName = nameParts.join(' ');
        }
      }

      return {
        source_id: sourceId || null,
        first_name: finalFirstName,
        last_name: finalLastName,
        email,
        status,
        full_name: fullName
      };
    })
    .filter((record) => !!record.email);
};

const normalizeResponseId = (id) => {
  if (id instanceof Long) return id.toNumber();
  if (typeof id === 'number') return id;
  if (typeof id === 'string') {
    const parsed = Number(id);
    return Number.isNaN(parsed) ? id : parsed;
  }
  return id;
};

export default async function handler(req, res) {
  let user;
  try {
    user = await authMiddleware(req);
  } catch (error) {
    return res.status(401).json({
      status: false,
      message: error.message || 'Authentication required'
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      status: false,
      message: 'Method not allowed'
    });
  }

  try {
    const {
      mode = 'existing',
      audienceId,
      audienceName,
      records = [],
      recordIds = [],
      splitFullName = true,
      source = {},
      // Server-side Select All fields
      selectAll = false,
      filters: tableFilters,
      excludedIds = [],
      totalCount = 0
    } = req.body || {};

    // ============================================================
    // SERVER-SIDE SELECT ALL: Build query from filters, fetch server-side
    // ============================================================
    if (selectAll === true && tableFilters) {
      console.log(`🚀 Server-side Select All: ~${totalCount} records, ${excludedIds.length} excluded`);

      const sourceTable = source.table || 'master_leads';
      const sourceSystem = source.system || 'sun';

      // Validate audience mode
      if (mode === 'existing' && !audienceId) {
        return res.status(400).json({ status: false, message: 'Existing mode requires an audience ID.' });
      }
      if (mode === 'new' && !audienceName?.trim()) {
        return res.status(400).json({ status: false, message: 'New mode requires an audience name.' });
      }

      // Build MongoDB query from table filters (mirrors DataService.filter logic)
      const queryConditions = [];

      // Soft delete filter
      queryConditions.push({
        $or: [
          { deleted_at: null },
          { deleted_at: { $exists: false } }
        ]
      });

      // Exclude specific IDs (user unchecked these after Select All)
      if (excludedIds.length > 0) {
        const excludeNumeric = excludedIds.map(id => {
          const num = Number(id);
          return !isNaN(num) ? Long.fromNumber(num) : null;
        }).filter(Boolean);
        if (excludeNumeric.length > 0) {
          queryConditions.push({ id: { $nin: excludeNumeric } });
        }
      }

      // Apply search filter (global search across text fields)
      if (tableFilters.search && typeof tableFilters.search === 'string' && tableFilters.search.trim()) {
        const searchRegex = new RegExp(tableFilters.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        queryConditions.push({
          $or: [
            { email: searchRegex },
            { first_name: searchRegex },
            { last_name: searchRegex },
            { full_name: searchRegex },
            { li_full_name: searchRegex },
            { li_first_name: searchRegex },
            { li_last_name: searchRegex },
            { li_email: searchRegex },
            { name: searchRegex },
            { company_name: searchRegex }
          ]
        });
      }

      // Apply column filters
      if (tableFilters.columns && typeof tableFilters.columns === 'object') {
        const filterType = tableFilters.filterType || tableFilters.FilterType || {};
        Object.keys(tableFilters.columns).forEach(column => {
          const filter = tableFilters.columns[column];
          const values = Array.isArray(filter?.search?.value)
            ? filter.search.value
            : (filter?.search?.value ? String(filter.search.value).split(',').map(v => v.trim()) : []);

          if (values.length > 0 && values.some(v => v !== '')) {
            const isIdField = column === 'id' || column === '_id' || column.endsWith('_id');
            const type = filterType[column] || (isIdField ? 'strict' : 'partial');

            if (type === 'partial') {
              // Partial match with regex
              if (values.length === 1) {
                queryConditions.push({
                  [column]: { $regex: values[0].replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
                });
              } else {
                queryConditions.push({
                  $or: values.filter(v => v).map(v => ({
                    [column]: { $regex: v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
                  }))
                });
              }
            } else {
              // Strict / exact match
              if (isIdField) {
                const numValues = values.map(v => {
                  const num = Number(v);
                  return !isNaN(num) ? Long.fromNumber(num) : v;
                });
                queryConditions.push({ [column]: numValues.length === 1 ? numValues[0] : { $in: numValues } });
              } else {
                queryConditions.push({ [column]: values.length === 1 ? values[0] : { $in: values } });
              }
            }
          }
        });
      }

      // Apply date range filter
      if (tableFilters.dateRange && typeof tableFilters.dateRange === 'object') {
        const { column: dateCol, from, to } = tableFilters.dateRange;
        if (dateCol && (from || to)) {
          const dateCondition = {};
          if (from) dateCondition.$gte = new Date(from);
          if (to) dateCondition.$lte = new Date(to);
          queryConditions.push({ [dateCol]: dateCondition });
        }
      }

      const mongoQuery = queryConditions.length > 0 ? { $and: queryConditions } : {};
      console.log(`🔍 Server-side Select All query:`, JSON.stringify(mongoQuery).substring(0, 500));

      try {
        const sourceCollection = await getCollection(sourceTable, sourceSystem);

        // Get count first for progress tracking
        const matchCount = await sourceCollection.countDocuments(mongoQuery, { maxTimeMS: 30000 });
        console.log(`📊 Server-side Select All: ${matchCount} records match the query`);

        if (matchCount === 0) {
          return res.status(400).json({
            status: false,
            message: 'No records match the current filters.'
          });
        }

        // Create/find the audience first
        const audiencesCollection = await getCollection('audiences', 'pluto');
        let targetAudience;

        if (mode === 'new') {
          const nextAudienceId = await getNextNumericValue(audiencesCollection);
          targetAudience = {
            id: Long.fromNumber(nextAudienceId),
            name: audienceName.trim(),
            created_at: new Date(),
            updated_at: new Date(),
            deleted_at: null,
            created_by: user?.user_id || user?.id || null,
          };
          await audiencesCollection.insertOne(targetAudience);
        } else {
          const audienceIdLong = toLong(audienceId);
          targetAudience = await audiencesCollection.findOne({
            id: audienceIdLong,
            $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
          });
          if (!targetAudience) {
            return res.status(404).json({ status: false, message: 'Audience not found.' });
          }
        }

        const audienceIdentifier = targetAudience.id instanceof Long
          ? targetAudience.id
          : toLong(targetAudience.id);

        // For very large datasets (100K+), always use queue
        if (matchCount >= 100000) {
          const jobId = uuidv4();
          await audienceQueue.add('bulk-audience-assignment-selectall', {
            jobId,
            audienceId: audienceIdentifier.toNumber(),
            mongoQuery: JSON.parse(JSON.stringify(mongoQuery)), // Serialize for queue
            sourceTable,
            sourceSystem,
            splitFullName,
            userId: user?.user_id || user?.id || null,
            matchCount,
            chunkSize: 10000
          }, {
            jobId,
            priority: 3,
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: 10,
            removeOnFail: 50
          });

          return res.status(202).json({
            status: true,
            message: `Bulk assignment queued: ${matchCount.toLocaleString()} records will be processed in the background.`,
            audience: {
              id: normalizeResponseId(audienceIdentifier),
              name: targetAudience.name
            },
            queued: true,
            jobId,
            totalRecords: matchCount
          });
        }

        // Direct processing for <100K records using streaming cursor
        const STREAM_BATCH_SIZE = 5000;
        const cursor = sourceCollection.find(mongoQuery).batchSize(STREAM_BATCH_SIZE);
        const subscribersCollection = await getCollection('subscribers', 'pluto');

        // Get existing emails in audience to avoid duplicates
        const existingEmailsDocs = await subscribersCollection
          .find(
            { audience_id: audienceIdentifier },
            { projection: { email: 1 } }
          )
          .toArray();
        const existingEmailSet = new Set(existingEmailsDocs.map(d => (d.email || '').toLowerCase()));

        let nextSubscriberId = await getNextNumericValue(subscribersCollection);
        const now = new Date();
        let totalInserted = 0;
        let totalSkipped = 0;
        let batch = [];

        // Stream records, format, and insert in batches
        for await (const record of cursor) {
          const formatted = formatRecords([record], splitFullName);
          if (formatted.length === 0) {
            totalSkipped++;
            continue;
          }
          const rec = formatted[0];
          if (!rec.email || existingEmailSet.has(rec.email.toLowerCase())) {
            totalSkipped++;
            continue;
          }
          existingEmailSet.add(rec.email.toLowerCase());

          batch.push({
            id: Long.fromNumber(nextSubscriberId++),
            audience_id: audienceIdentifier,
            first_name: rec.first_name || '',
            last_name: rec.last_name || '',
            email: rec.email,
            status: rec.status || 'active',
            created_at: now,
            updated_at: now,
            deleted_at: null,
            source_id: rec.source_id || null,
            source_table: sourceTable,
            source_system: sourceSystem
          });

          if (batch.length >= STREAM_BATCH_SIZE) {
            await subscribersCollection.insertMany(batch, { ordered: false });
            totalInserted += batch.length;
            console.log(`📦 Server-side Select All: inserted ${totalInserted} subscribers so far...`);
            batch = [];
          }
        }

        // Insert remaining batch
        if (batch.length > 0) {
          await subscribersCollection.insertMany(batch, { ordered: false });
          totalInserted += batch.length;
        }

        console.log(`✅ Server-side Select All complete: ${totalInserted} inserted, ${totalSkipped} skipped`);

        return res.status(200).json({
          status: true,
          message: `Added ${totalInserted.toLocaleString()} subscriber${totalInserted === 1 ? '' : 's'} to "${targetAudience.name}".`,
          audience: {
            id: normalizeResponseId(audienceIdentifier),
            name: targetAudience.name
          },
          inserted: totalInserted,
          skipped: totalSkipped,
          splitApplied: splitFullName
        });
      } catch (error) {
        console.error('Server-side Select All failed:', error);
        return res.status(500).json({
          status: false,
          message: error.message || 'Server-side Select All failed'
        });
      }
    }

    // ============================================================
    // STANDARD FLOW: Client sends records directly (existing behavior)
    // ============================================================

    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'At least one record must be selected.'
      });
    }

    if (mode === 'existing' && !audienceId) {
      return res.status(400).json({
        status: false,
        message: 'Existing mode requires an audience ID.'
      });
    }

    if (mode === 'new' && !audienceName?.trim()) {
      return res.status(400).json({
        status: false,
        message: 'New mode requires an audience name.'
      });
    }

    let sanitizedRecords = formatRecords(records, splitFullName);

    // Fallback: When "Select All" is used, DynamicTable only stores {id, _id} per row
    // (no email/name data). Detect this and fetch full records from MongoDB using IDs.
    // Support both: explicit recordIds from frontend, or auto-extract from records.
    let effectiveRecordIds = recordIds;
    if (sanitizedRecords.length === 0 && effectiveRecordIds.length === 0 && records.length > 0) {
      // Auto-extract IDs from records that have id but no email
      effectiveRecordIds = records
        .map(r => r.id || r._id)
        .filter(Boolean);
      if (effectiveRecordIds.length > 0) {
        console.log(`📦 Auto-extracted ${effectiveRecordIds.length} IDs from records (Select All mode, recordIds not provided)`);
      }
    }

    if (sanitizedRecords.length === 0 && effectiveRecordIds.length > 0) {
      console.log(`📦 Records missing email data (Select All mode). Fetching ${effectiveRecordIds.length} full records from MongoDB...`);
      
      const sourceTable = source.table || 'master_leads';
      const sourceSystem = source.system || 'sun';
      
      try {
        const sourceCollection = await getCollection(sourceTable, sourceSystem);
        
        // Convert IDs to proper format for query
        const idValues = effectiveRecordIds.map(id => {
          if (typeof id === 'string' && /^\d+$/.test(id)) return Long.fromString(id);
          if (typeof id === 'number') return Long.fromNumber(id);
          return id;
        });

        // Fetch full records from MongoDB in batches
        const FETCH_BATCH_SIZE = 5000;
        const fullRecords = [];
        
        for (let i = 0; i < idValues.length; i += FETCH_BATCH_SIZE) {
          const idBatch = idValues.slice(i, i + FETCH_BATCH_SIZE);
          const batchRecords = await sourceCollection.find({
            id: { $in: idBatch }
          }).toArray();
          fullRecords.push(...batchRecords);
        }

        console.log(`✅ Fetched ${fullRecords.length} full records from ${sourceSystem}.${sourceTable}`);
        sanitizedRecords = formatRecords(fullRecords, splitFullName);
      } catch (fetchError) {
        console.error('Failed to fetch full records from MongoDB:', fetchError);
      }
    }

    if (sanitizedRecords.length === 0) {
      return res.status(400).json({
        status: false,
        message: 'Selected records are missing email addresses.'
      });
    }

    // Determine if we should use queue-based processing
    // Use queue for large datasets (100,000+ records) to avoid timeouts and memory issues
    const LARGE_DATASET_THRESHOLD = 100000; // 1 lakh records
    const useQueue = sanitizedRecords.length >= LARGE_DATASET_THRESHOLD;

    const audiencesCollection = await getCollection('audiences', 'pluto');
    const subscribersCollection = await getCollection('subscribers', 'pluto');

    let targetAudience;

    if (mode === 'new') {
      const nextAudienceId = await getNextNumericValue(audiencesCollection);
      targetAudience = {
        id: Long.fromNumber(nextAudienceId),
        name: audienceName.trim(),
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        created_by: user?.user_id || user?.id || null,
      };
      await audiencesCollection.insertOne(targetAudience);
    } else {
      const audienceIdLong = toLong(audienceId);
      targetAudience = await audiencesCollection.findOne({
        id: audienceIdLong,
        $or: [{ deleted_at: null }, { deleted_at: { $exists: false } }]
      });

      if (!targetAudience) {
        return res.status(404).json({
          status: false,
          message: 'Audience not found.'
        });
      }
    }

    const audienceIdentifier = targetAudience.id instanceof Long
      ? targetAudience.id
      : toLong(targetAudience.id);

    // For large datasets, use queue-based processing (audience queue)
    if (useQueue) {
      try {
        const jobId = uuidv4();
        await audienceQueue.add('bulk-audience-assignment', {
          jobId,
          audienceId: audienceIdentifier.toNumber(),
          records: sanitizedRecords,
          source,
          splitFullName,
          userId: user?.user_id || user?.id || null,
          chunkSize: 10000 // Process 10,000 records per chunk
        }, {
          jobId,
          priority: 3, // Lower priority than CSV imports (5), higher than maintenance (1)
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          },
          removeOnComplete: 10,
          removeOnFail: 50
        });

        return res.status(202).json({
          status: true,
          message: `Bulk assignment queued for processing. ${sanitizedRecords.length} records will be processed in the background.`,
          audience: {
            id: normalizeResponseId(audienceIdentifier),
            name: targetAudience.name
          },
          queued: true,
          jobId,
          totalRecords: sanitizedRecords.length
        });
      } catch (error) {
        console.error('Failed to queue bulk assignment:', error);
        // Fall back to direct processing if queue fails
        console.log('⚠️ Queue failed, falling back to direct processing...');
      }
    }

    // Direct processing for small datasets or if queue fails
    const existingEmails = await subscribersCollection
      .find(
        {
          audience_id: audienceIdentifier,
          email: { $in: sanitizedRecords.map((record) => record.email) }
        },
        { projection: { email: 1 } }
      )
      .toArray();

    const existingEmailSet = new Set(
      existingEmails.map((record) => (record.email || '').toLowerCase())
    );

    let nextSubscriberId = await getNextNumericValue(subscribersCollection);
    const now = new Date();
    const preparedSubscribers = [];

    sanitizedRecords.forEach((record) => {
      if (!record.email || existingEmailSet.has(record.email.toLowerCase())) {
        return;
      }

      preparedSubscribers.push({
        id: Long.fromNumber(nextSubscriberId++),
        audience_id: audienceIdentifier,
        first_name: record.first_name || '',
        last_name: record.last_name || '',
        email: record.email,
        status: record.status || 'active',
        created_at: now,
        updated_at: now,
        deleted_at: null,
        source_id: record.source_id || null,
        source_table: source.table || null,
        source_system: source.system || null
      });
    });

    if (preparedSubscribers.length === 0) {
      return res.status(200).json({
        status: true,
        message: 'All selected records already exist in the chosen audience.',
        audience: {
          id: normalizeResponseId(audienceIdentifier),
          name: targetAudience.name
        },
        inserted: 0,
        skipped: sanitizedRecords.length
      });
    }

    // For direct processing, batch insertMany if needed (MongoDB limit is 100,000)
    const BATCH_SIZE = 50000;
    if (preparedSubscribers.length > BATCH_SIZE) {
      // Process in batches
      let inserted = 0;
      for (let i = 0; i < preparedSubscribers.length; i += BATCH_SIZE) {
        const batch = preparedSubscribers.slice(i, i + BATCH_SIZE);
        await subscribersCollection.insertMany(batch, { ordered: false });
        inserted += batch.length;
      }
      
      return res.status(200).json({
        status: true,
        message: `Added ${inserted} subscriber${inserted === 1 ? '' : 's'} to "${targetAudience.name}".`,
        audience: {
          id: normalizeResponseId(audienceIdentifier),
          name: targetAudience.name
        },
        inserted,
        skipped: sanitizedRecords.length - inserted,
        splitApplied: splitFullName
      });
    } else {
      await subscribersCollection.insertMany(preparedSubscribers);

      return res.status(200).json({
        status: true,
        message: `Added ${preparedSubscribers.length} subscriber${preparedSubscribers.length === 1 ? '' : 's'} to "${targetAudience.name}".`,
        audience: {
          id: normalizeResponseId(audienceIdentifier),
          name: targetAudience.name
        },
        inserted: preparedSubscribers.length,
        skipped: sanitizedRecords.length - preparedSubscribers.length,
        splitApplied: splitFullName
      });
    }
  } catch (error) {
    console.error('Failed to assign audience subscribers:', error);
    return res.status(500).json({
      status: false,
      message: error.message || 'Failed to assign audience subscribers'
    });
  }
}


