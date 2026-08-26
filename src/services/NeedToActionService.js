import { ObjectId } from 'mongodb';
import { getCollection } from '../lib/mongodb';

/**
 * NeedToActionService
 * Handles dynamic Need-To-Action workspace operations for any collection.
 */
class NeedToActionService {
  /**
   * Copy records from source collection into need_to_action workspace.
   * @param {object} options
   * @param {string} options.sourceSystem - Mongo connection name
   * @param {string} options.sourceCollection - Collection name
   * @param {string[]} options.recordIds - Array of record identifiers
   * @param {object} options.user - Authenticated user (optional)
   * @returns {Promise<object>}
   */
  static async captureRecords({ sourceSystem = 'central', sourceCollection, recordIds = [], user }) {
    if (!sourceCollection || !Array.isArray(recordIds) || recordIds.length === 0) {
      throw new Error('Source collection and recordIds are required');
    }

    const sourceCol = await getCollection(sourceCollection, sourceSystem);
    const workspaceCol = await getCollection('need_to_action', 'central');

    const normalizedIds = recordIds
      .filter(Boolean)
      .map(id => {
        if (ObjectId.isValid(id)) {
          return new ObjectId(id);
        }
        return id;
      });

    const queryIds = normalizedIds.filter(id => id instanceof ObjectId);

    const numericIds = [];
    const stringIds = [];
    const objectIdStrings = [];

    recordIds.forEach(id => {
      if (typeof id === 'number') {
        numericIds.push(id);
      } else if (typeof id === 'string') {
        const trimmed = id.trim();
        if (trimmed && ObjectId.isValid(trimmed)) {
          objectIdStrings.push(trimmed);
          return;
        }
        if (trimmed && !Number.isNaN(Number(trimmed)) && trimmed.length < 16) {
          numericIds.push(Number(trimmed));
        } else if (trimmed) {
          stringIds.push(trimmed);
        }
      }
    });

    const orConditions = [];
    
    // Check ObjectIds (both as ObjectId instances and as strings)
    if (normalizedIds.some(id => id instanceof ObjectId)) {
      orConditions.push({ _id: { $in: normalizedIds.filter(id => id instanceof ObjectId) } });
    }
    if (objectIdStrings.length) {
      orConditions.push({ _id: { $in: objectIdStrings.map(id => new ObjectId(id)) } });
    }
    
    // Check string IDs in both _id and id fields
    if (stringIds.length) {
      orConditions.push({ _id: { $in: stringIds } });
      orConditions.push({ id: { $in: stringIds } });
    }
    
    // Check numeric IDs in id field (for collections like master_accounts)
    if (numericIds.length) {
      orConditions.push({ id: { $in: numericIds } });
      // Also try as strings in case they're stored as string numbers
      orConditions.push({ id: { $in: numericIds.map(n => String(n)) } });
    }

    console.log(`🔍 NeedToActionService.captureRecords - Querying ${sourceCollection} with:`, {
      recordIdsCount: recordIds.length,
      recordIds: recordIds.slice(0, 5), // Log first 5
      numericIdsCount: numericIds.length,
      numericIds: numericIds.slice(0, 5),
      stringIdsCount: stringIds.length,
      objectIdStringsCount: objectIdStrings.length,
      orConditionsCount: orConditions.length
    });

    const sourceDocs = await sourceCol
      .find(orConditions.length > 0 ? { $or: orConditions } : { _id: { $in: normalizedIds } })
      .toArray();

    console.log(`📊 NeedToActionService.captureRecords - Found ${sourceDocs.length} documents from ${sourceCollection}`);

    const now = new Date();
    let inserted = 0;
    let updated = 0;

    for (const doc of sourceDocs) {
      // Determine the actual business identifier for this collection
      // Some collections use numeric 'id' field (like master_accounts), others use '_id' (ObjectId)
      let originalId;
      let idType;
      
      // For master_accounts, prioritize 'id' field (numeric)
      // For master_leads and other collections, prioritize '_id' (ObjectId)
      if (sourceCollection === 'master_accounts') {
        if (doc.id !== undefined && doc.id !== null) {
          originalId = String(doc.id);
          idType = 'id';
        } else {
          // Fallback to _id if id is not present
          originalId = doc._id ? doc._id.toString() : String(doc._id);
          idType = '_id';
        }
      } else {
        // For master_leads and other collections, prioritize '_id' (ObjectId)
        if (doc._id) {
          originalId = doc._id.toString();
          idType = '_id';
        } else if (doc.id !== undefined && doc.id !== null) {
          // Fallback to id if _id is not present
          originalId = String(doc.id);
          idType = 'id';
        } else {
          throw new Error(`Cannot determine identifier for document in ${sourceCollection}`);
        }
      }

      const existing = await workspaceCol.findOne({
        original_collection: sourceCollection,
        original_id: originalId,
        original_system: sourceSystem
      });

      const serializedData = NeedToActionService.serializeDocument(doc);

      const payload = {
        original_collection: sourceCollection,
        original_system: sourceSystem,
        original_id: originalId,
        original_id_type: idType, // Store which field was used ('id' or '_id')
        data: serializedData,
        original_data: serializedData,
        modified_fields: [],
        status: 'pending',
        created_at: existing?.created_at || now,
        updated_at: now,
        created_by: user?.user_id || null,
        updated_by: user?.user_id || null
      };

      if (existing) {
        await workspaceCol.updateOne(
          { _id: existing._id },
          {
            $set: {
              data: serializedData,
              original_data: serializedData,
              status: 'pending',
              modified_fields: [],
              updated_at: now,
              updated_by: user?.user_id || null
            }
          }
        );
        updated += 1;
      } else {
        await workspaceCol.insertOne(payload);
        inserted += 1;
      }
    }

    return {
      status: true,
      message: `${inserted} record(s) moved to Need-To-Action workspace, ${updated} existing record(s) refreshed.`,
      data: { inserted, updated }
    };
  }

  /**
   * Update a single Need-To-Action record with new data.
   * @param {object} options
   * @param {string} options.recordId
   * @param {object} options.data
   * @param {object} options.user
   * @returns {Promise<object>}
   */
  static async updateRecord({ recordId, data, user }) {
    if (!recordId) {
      throw new Error('recordId is required');
    }

    const workspaceCol = await getCollection('need_to_action', 'central');
    const _id = NeedToActionService.toObjectId(recordId);

    const existing = await workspaceCol.findOne({ _id });
    if (!existing) {
      throw new Error('Need-To-Action record not found');
    }

    const serializedData = NeedToActionService.normalizePayloadData(data);

    // Compare and log what we're updating
    const existingKeys = Object.keys(existing.data || {});
    const newKeys = Object.keys(serializedData || {});
    const allKeys = new Set([...existingKeys, ...newKeys]);
    const changes = [];
    
    allKeys.forEach(key => {
      if (key === '_id' || key === 'id') return;
      const oldVal = existing.data?.[key];
      const newVal = serializedData?.[key];
      if (!NeedToActionService.isEqual(oldVal, newVal)) {
        changes.push({
          field: key,
          old: typeof oldVal === 'object' ? JSON.stringify(oldVal).substring(0, 50) : String(oldVal || 'null'),
          new: typeof newVal === 'object' ? JSON.stringify(newVal).substring(0, 50) : String(newVal || 'null')
        });
      }
    });

    console.log(`📝 Updating Need-To-Action record ${recordId}:`, JSON.stringify({
      existing_data_keys_count: existingKeys.length,
      new_data_keys_count: newKeys.length,
      detected_changes: changes.slice(0, 10),
      total_changes: changes.length
    }, null, 2));

    const diff = NeedToActionService.calculateDiff(existing.data || {}, serializedData);

    console.log(`📊 Calculated diff for update:`, JSON.stringify({
      changed_fields: diff.changed,
      changed_count: diff.changed.length
    }, null, 2));

    await workspaceCol.updateOne(
      { _id },
      {
          $set: {
          data: serializedData,
          modified_fields: Array.from(new Set([...(existing.modified_fields || []), ...diff.changed])),
          status: 'updated',
          updated_at: new Date(),
          updated_by: user?.user_id || null
        }
      }
    );

    return {
      status: true,
      message: 'Need-To-Action record updated',
      data: {
        modified_fields: diff.changed
      }
    };
  }

  /**
   * Bulk update Need-To-Action records by applying operations.
   * Supports find & replace, regex replace, and field updates.
   * @param {object} options
   * @returns {Promise<object>}
   */
  static async bulkUpdate({ recordIds = [], operation, payload = {}, user }) {
    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      throw new Error('recordIds are required for bulk update');
    }

    if (!operation) {
      throw new Error('operation is required');
    }

    const workspaceCol = await getCollection('need_to_action', 'central');
    const objectIds = recordIds.map(id => NeedToActionService.toObjectId(id));

    const records = await workspaceCol.find({ _id: { $in: objectIds } }).toArray();

    const results = [];
    const now = new Date();

    console.log(`🔄 Starting bulk update for ${records.length} records with operation: ${operation}`, {
      payload,
      recordIds: recordIds.slice(0, 5)
    });

    for (const record of records) {
      try {
        let updatedData = { ...(record.data || {}) };
        const originalData = JSON.parse(JSON.stringify(updatedData));

        console.log(`📝 Processing record ${record._id} (${record.original_collection}):`, {
          operation,
          payload,
          dataKeys: Object.keys(updatedData)
        });

        switch (operation) {
          case 'find_replace':
            updatedData = NeedToActionService.applyFindReplace(updatedData, payload);
            break;
          case 'regex_replace':
            updatedData = NeedToActionService.applyRegexReplace(updatedData, payload);
            break;
          case 'update_field':
            updatedData = NeedToActionService.applyFieldUpdate(updatedData, payload);
            break;
          case 'update_fields':
            updatedData = NeedToActionService.applyMultiFieldUpdate(updatedData, payload);
            break;
          default:
            throw new Error(`Unsupported bulk operation: ${operation}`);
        }

        const diff = NeedToActionService.calculateDiff(originalData, updatedData);
        
        console.log(`📊 Record ${record._id} diff:`, {
          changedFields: diff.changed,
          hasChanges: diff.changed.length > 0
        });

        if (diff.changed.length === 0) {
          console.warn(`⚠️ No changes detected for record ${record._id} with operation ${operation}`);
        }

        await workspaceCol.updateOne(
          { _id: record._id },
          {
            $set: {
              data: updatedData,
              modified_fields: Array.from(new Set([...(record.modified_fields || []), ...diff.changed])),
              status: 'updated',
              updated_at: now,
              updated_by: user?.user_id || null
            }
          }
        );

        results.push({
          record_id: record._id.toString(),
          changed_fields: diff.changed
        });
      } catch (error) {
        console.error(`❌ Error processing record ${record._id}:`, error);
        throw error;
      }
    }

    return {
      status: true,
      message: `${results.length} Need-To-Action record(s) updated`,
      data: results
    };
  }

  /**
   * Push data back to original collections and remove from workspace.
   * @param {object} options
   * @returns {Promise<object>}
   */
  static async pushBack({ recordIds = [], user }) {
    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      throw new Error('recordIds are required for push back');
    }

    const workspaceCol = await getCollection('need_to_action', 'central');
    const objectIds = recordIds.map(id => NeedToActionService.toObjectId(id));
    const records = await workspaceCol.find({ _id: { $in: objectIds } }).toArray();

    if (records.length === 0) {
      throw new Error('No Need-To-Action records found to push back');
    }

    let success = 0;
    const failures = [];

    for (const record of records) {
      try {
        const sourceCol = await getCollection(record.original_collection, record.original_system || 'central');
        
        // Determine which field to use for querying: 'id' (numeric) or '_id' (ObjectId)
        // Collections like master_accounts use 'id', master_leads use '_id'
        let queryFilter;
        let idType;
        
        // Prioritize collection-based detection over stored original_id_type
        // This ensures correct behavior even if old records have incorrect original_id_type
        if (record.original_collection === 'master_accounts') {
          idType = 'id';
        } else if (record.original_collection === 'master_leads') {
          idType = '_id';
        } else if (record.original_id_type) {
          // Use stored type for other collections
          idType = record.original_id_type;
        } else {
          // Fallback: try to infer from original_id format
          idType = ObjectId.isValid(record.original_id) ? '_id' : 'id';
        }
        
        console.log(`🔍 Push-back debug for ${record.original_collection}:`, {
          original_id: record.original_id,
          original_id_type: record.original_id_type || 'not set',
          inferred_id_type: idType,
          has_original_data: !!record.original_data,
          has_data: !!record.data,
          original_data_has_id: !!(record.original_data?._id),
          original_data_has_numeric_id: !!(record.original_data?.id)
        });
        
        if (idType === 'id') {
          // Collections like master_accounts use numeric 'id' field
          // Try both numeric and string formats
          const numericId = Number(record.original_id);
          if (!isNaN(numericId) && numericId.toString() === String(record.original_id).trim()) {
            queryFilter = { $or: [{ id: numericId }, { id: String(record.original_id) }] };
          } else {
            queryFilter = { id: record.original_id };
          }
        } else {
          // Collections like master_leads use '_id' (ObjectId)
          // For old records that were captured with numeric 'id', extract _id from original_data
          if (record.original_collection === 'master_leads' && record.original_data?._id) {
            // Use the _id from the original document (most reliable)
            try {
              let originalObjectId;
              const originalIdValue = record.original_data._id;
              
              // Handle both ObjectId instance and string formats
              if (originalIdValue instanceof ObjectId) {
                originalObjectId = originalIdValue;
              } else if (typeof originalIdValue === 'string' && ObjectId.isValid(originalIdValue)) {
                originalObjectId = new ObjectId(originalIdValue);
              } else if (originalIdValue && originalIdValue.$oid) {
                // Handle BSON format { $oid: "..." }
                originalObjectId = new ObjectId(originalIdValue.$oid);
              } else {
                throw new Error(`Invalid _id format: ${typeof originalIdValue}`);
              }
              
              queryFilter = { _id: originalObjectId };
              console.log(`✅ Using _id from original_data: ${originalObjectId.toString()}`);
            } catch (e) {
              console.warn(`⚠️ Failed to use _id from original_data (${e.message}), trying original_id as fallback`);
              // Fallback to trying original_id as ObjectId (might work if it's actually an ObjectId string)
              try {
                if (ObjectId.isValid(record.original_id)) {
                  const originalObjectId = new ObjectId(record.original_id);
                  queryFilter = { _id: originalObjectId };
                  console.log(`✅ Using original_id as ObjectId: ${originalObjectId.toString()}`);
                } else {
                  throw new Error(`original_id is not a valid ObjectId: ${record.original_id}`);
                }
              } catch (e2) {
                console.error(`❌ Cannot construct query filter: ${e2.message}`);
                throw new Error(`Failed to construct query filter for master_leads. original_id: ${record.original_id}, original_data._id: ${record.original_data?._id}`);
              }
            }
          } else {
            // Normal case: try to convert original_id to ObjectId
            try {
              const originalObjectId = NeedToActionService.toObjectId(record.original_id);
              queryFilter = { _id: originalObjectId };
            } catch (e) {
              // If conversion fails, try as string
              queryFilter = { _id: record.original_id };
            }
          }
        }

        if (!queryFilter || Object.keys(queryFilter).length === 0) {
          throw new Error(`Failed to construct query filter for ${record.original_collection} with original_id: ${record.original_id}`);
        }

        console.log(`🔄 Pushing back record ${record._id} to ${record.original_collection} using filter:`, JSON.stringify(queryFilter));

        // Log original and updated data for debugging
        // Compare original_data with data to detect changes
        const originalKeys = Object.keys(record.original_data || {});
        const dataKeys = Object.keys(record.data || {});
        const allKeys = new Set([...originalKeys, ...dataKeys]);
        const changes = [];
        
        allKeys.forEach(key => {
          if (key === '_id' || key === 'id') return;
          const origVal = record.original_data?.[key];
          const newVal = record.data?.[key];
          if (!NeedToActionService.isEqual(origVal, newVal)) {
            changes.push({
              field: key,
              original: typeof origVal === 'object' ? JSON.stringify(origVal).substring(0, 50) : String(origVal || 'null'),
              updated: typeof newVal === 'object' ? JSON.stringify(newVal).substring(0, 50) : String(newVal || 'null')
            });
          }
        });

        console.log(`🔍 Push-back data comparison:`, JSON.stringify({
          original_data_keys_count: originalKeys.length,
          data_keys_count: dataKeys.length,
          detected_changes: changes.slice(0, 10),
          total_changes: changes.length
        }, null, 2));

        const { set, unset } = NeedToActionService.diffForUpdate(record.original_data || {}, record.data || {});

        const setFields = Object.keys(set);
        const unsetFields = Object.keys(unset);
        const sampleSet = setFields.slice(0, 10).reduce((acc, key) => {
          const val = set[key];
          acc[key] = typeof val === 'object' ? JSON.stringify(val).substring(0, 100) : String(val);
          return acc;
        }, {});

        console.log(`📊 Push-back diff calculation:`, JSON.stringify({
          set_fields: setFields,
          unset_fields: unsetFields,
          set_count: setFields.length,
          unset_count: unsetFields.length,
          sample_set: sampleSet
        }, null, 2));

        // Explicitly remove _id and id from set/unset operations (immutable fields)
        delete set._id;
        delete set.id;
        delete unset._id;
        delete unset.id;

        // Ensure required fields are preserved for schema validation
        // master_accounts requires 'need_to_action' to be '0' or '1'
        if (record.original_collection === 'master_accounts') {
          // Get the current value from data (modified) or original_data (unchanged)
          let needToActionValue = record.data?.need_to_action ?? record.original_data?.need_to_action;
          
          // Ensure need_to_action is present and valid
          if (needToActionValue !== undefined && needToActionValue !== null) {
            set.need_to_action = String(needToActionValue);
          } else {
            // Default to '0' if not present
            set.need_to_action = '0';
          }
          
          // Ensure it's either '0' or '1' (schema validation requirement)
          if (set.need_to_action !== '0' && set.need_to_action !== '1') {
            console.warn(`⚠️ Invalid need_to_action value: ${set.need_to_action}, defaulting to '0'`);
            set.need_to_action = '0';
          }
          
          // Also ensure we don't unset it if it was in the original
          if (unset.need_to_action) {
            delete unset.need_to_action;
          }
        }

        const updateOperators = {};
        if (Object.keys(set).length > 0) updateOperators.$set = set;
        if (Object.keys(unset).length > 0) updateOperators.$unset = unset;

        if (!updateOperators.$set) {
          updateOperators.$set = {};
        }
        updateOperators.$set.updated_at = new Date();

        const setKeys = Object.keys(updateOperators.$set || {});
        const unsetKeys = Object.keys(updateOperators.$unset || {});
        const sampleSetValues = setKeys.slice(0, 5).reduce((acc, key) => {
          const val = updateOperators.$set[key];
          acc[key] = typeof val === 'object' ? JSON.stringify(val).substring(0, 100) : String(val);
          return acc;
        }, {});

        console.log(`📝 Update operators for ${record.original_collection}:`, JSON.stringify({
          $set_keys: setKeys,
          $unset_keys: unsetKeys,
          $set_count: setKeys.length,
          $unset_count: unsetKeys.length,
          sample_set_values: sampleSetValues
        }, null, 2));

        console.log(`📝 Executing update for ${record.original_collection}:`, JSON.stringify({
          queryFilter: queryFilter,
          updateOperators_summary: {
            $set_keys: Object.keys(updateOperators.$set || {}),
            $unset_keys: Object.keys(updateOperators.$unset || {}),
            $set_count: Object.keys(updateOperators.$set || {}).length
          }
        }, null, 2));

        const updateResult = await sourceCol.updateOne(
          queryFilter,
          updateOperators
        );

        console.log(`📊 Update result for ${record.original_collection}:`, JSON.stringify({
          matchedCount: updateResult.matchedCount,
          modifiedCount: updateResult.modifiedCount,
          upsertedCount: updateResult.upsertedCount,
          original_id: record.original_id,
          had_changes_to_apply: Object.keys(set).length > 0
        }, null, 2));

        if (updateResult.matchedCount === 0) {
          throw new Error(`No document found in ${record.original_collection} with ${idType}: ${record.original_id}`);
        }

        if (updateResult.modifiedCount === 0 && Object.keys(set).length > 0) {
          console.warn(`⚠️ Document matched but no changes were applied for ${record.original_id}. This might indicate:`);
          console.warn(`   - Values are already the same in the database`);
          console.warn(`   - Field names don't match the schema`);
          console.warn(`   - Data types don't match (e.g., string vs number)`);
          
          // Log a sample of what we're trying to set vs what's in the database
          try {
            const currentDoc = await sourceCol.findOne(queryFilter);
            if (currentDoc) {
              console.warn(`   Current document sample:`, {
                sample_fields: Object.keys(currentDoc).slice(0, 10),
                sample_values: Object.keys(set).slice(0, 3).reduce((acc, key) => {
                  acc[key] = {
                    trying_to_set: set[key],
                    current_value: currentDoc[key],
                    types_match: typeof set[key] === typeof currentDoc[key]
                  };
                  return acc;
                }, {})
              });
            }
          } catch (e) {
            console.warn(`   Could not fetch current document for comparison:`, e.message);
          }
        }

        // Sync to OpenSearch if enabled and document was actually modified
        if (process.env.OPENSEARCH_ENABLED === 'true' && updateResult.modifiedCount > 0) {
          try {
            const { default: getOpenSearchService } = await import('../services/OpenSearchService.js');
            const osService = getOpenSearchService();
            
            if (osService.isEnabledFor(record.original_collection)) {
              // Fetch the updated document to sync to OpenSearch
              const updatedDoc = await sourceCol.findOne(queryFilter);
              if (updatedDoc) {
                // Normalize the document for OpenSearch
                const normalizedDoc = NeedToActionService.normalizeDocumentForOpenSearch(updatedDoc);
                
                // Match the ID format used by opensearch-sync.js: prefer numeric 'id' over '_id'
                // This ensures we UPDATE the existing document instead of creating a duplicate
                // opensearch-sync.js uses: doc.id !== undefined && doc.id !== null ? String(doc.id) : String(doc._id)
                const docId = (updatedDoc.id !== undefined && updatedDoc.id !== null)
                  ? String(updatedDoc.id)
                  : updatedDoc._id
                  ? String(updatedDoc._id)
                  : null;
                
                console.log(`🔍 OpenSearch sync - Document ID selection:`, JSON.stringify({
                  collection: record.original_collection,
                  has_numeric_id: updatedDoc.id !== undefined && updatedDoc.id !== null,
                  numeric_id: updatedDoc.id,
                  has_objectid: updatedDoc._id !== undefined,
                  objectid: updatedDoc._id?.toString(),
                  selected_docId: docId,
                  id_selection_logic: 'prefer_numeric_id_over_objectid'
                }, null, 2));
                
                if (!docId) {
                  console.warn(`⚠️ Cannot determine document ID for OpenSearch sync. Document:`, {
                    has_id: updatedDoc.id !== undefined,
                    has__id: updatedDoc._id !== undefined
                  });
                } else {
                  // Use bulkIndex with single document and wait_for refresh to ensure immediate visibility
                  // The 'index' operation will UPDATE if _id exists, or CREATE if it doesn't
                  // By using the same ID format as opensearch-sync.js, we ensure we UPDATE the existing document
                  await osService.bulkIndex(record.original_collection, [
                    { index: { _id: docId } },
                    normalizedDoc
                  ], { refresh: 'wait_for' });
                  console.log(`✅ Synced updated document to OpenSearch for ${record.original_collection} (ID: ${docId}) - index refreshed (this will UPDATE existing document, not create duplicate)`);
                }
              }
            }
          } catch (osError) {
            console.warn(`⚠️ Failed to sync to OpenSearch (non-fatal):`, osError.message);
            // Don't fail the push-back if OpenSearch sync fails
          }
        }

        await workspaceCol.deleteOne({ _id: record._id });

        success += 1;
        console.log(`✅ Successfully pushed back record ${record._id} to ${record.original_collection}`);
      } catch (error) {
        console.error(`❌ Failed to push back record ${record._id}:`, error);
        failures.push({
          record_id: record._id.toString(),
          original_id: record.original_id,
          original_collection: record.original_collection,
          error: error.message
        });
      }
    }

    return {
      status: failures.length === 0,
      message: `${success} record(s) pushed back${failures.length ? `, ${failures.length} failed` : ''}`,
      data: {
        success,
        failures
      }
    };
  }

  /**
   * Delete Need-To-Action records without touching originals.
   * @param {object} options
   * @returns {Promise<object>}
   */
  static async deleteRecords({ recordIds = [] }) {
    if (!Array.isArray(recordIds) || recordIds.length === 0) {
      throw new Error('recordIds are required for deletion');
    }

    const workspaceCol = await getCollection('need_to_action', 'central');
    const objectIds = recordIds.map(id => NeedToActionService.toObjectId(id));

    const result = await workspaceCol.deleteMany({ _id: { $in: objectIds } });

    return {
      status: true,
      message: `${result.deletedCount} Need-To-Action record(s) removed from workspace`,
      data: {
        deleted: result.deletedCount
      }
    };
  }

  // Utilities ---------------------------------------------------------------

  static toObjectId(value) {
    if (value instanceof ObjectId) return value;
    if (ObjectId.isValid(value)) return new ObjectId(value);
    throw new Error('Invalid identifier');
  }

  static serializeDocument(doc) {
    if (doc === null || doc === undefined) return doc;
    if (doc instanceof ObjectId) return doc.toString();
    if (doc instanceof Date) return doc.toISOString();
    if (Array.isArray(doc)) {
      return doc.map(item => NeedToActionService.serializeDocument(item));
    }
    if (typeof doc === 'object') {
      return Object.keys(doc).reduce((acc, key) => {
        if (key === '_id') {
          acc._id = doc[key] instanceof ObjectId ? doc[key].toString() : doc[key];
          return acc;
        }
        acc[key] = NeedToActionService.serializeDocument(doc[key]);
        return acc;
      }, {});
    }
    return doc;
  }

  static normalizePayloadData(data) {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) {
      return data.map(item => NeedToActionService.normalizePayloadData(item));
    }
    if (typeof data === 'object') {
      const normalized = {};
      Object.keys(data).forEach(key => {
        normalized[key] = NeedToActionService.normalizePayloadData(data[key]);
      });
      return normalized;
    }
    return data;
  }

  /**
   * Normalize a MongoDB document for OpenSearch indexing
   * Similar to opensearch-sync.js normalization logic
   */
  static normalizeDocumentForOpenSearch(doc) {
    if (!doc || typeof doc !== 'object') return doc;

    const DATE_FIELDS = [
      'created_at', 'updated_at', 'deleted_at', 'last_contact_date',
      'dls_lead_generated_date', 'dls_lead_response', 'dls_mail_send_status',
      'dls_lead_generated_at', 'dls_lead_response_at', 'li_timestamp'
    ];

    const normalizeDate = (val) => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString();
      if (typeof val === 'number') return new Date(val).toISOString();
      if (typeof val === 'string') {
        const cleaned = val.trim().replace(/\//g, '-');
        const d = new Date(cleaned);
        if (!isNaN(d.getTime())) return d.toISOString();
      }
      return null;
    };

    const normalizeObjectFields = (obj, depth = 0) => {
      if (depth > 10) return String(obj);
      if (obj === null || obj === undefined) return obj;
      
      if (Array.isArray(obj)) {
        return JSON.stringify(obj.map(item => normalizeObjectFields(item, depth + 1)));
      }
      
      if (typeof obj === 'object') {
        if (obj instanceof Date) return obj.toISOString();
        if (obj instanceof RegExp) return String(obj);
        if (obj instanceof Buffer) return obj.toString('base64');
        
        if (obj.constructor) {
          const constructorName = obj.constructor.name;
          if (['ObjectId', 'BSONRegExp', 'Binary', 'Decimal128', 'Long', 'Timestamp'].includes(constructorName)) {
            return String(obj);
          }
        }
        
        if (typeof obj.toJSON === 'function') {
          try {
            return normalizeObjectFields(obj.toJSON(), depth + 1);
          } catch (e) {
            return String(obj);
          }
        }
        
        const isPlainObject = obj.constructor === Object || Object.getPrototypeOf(obj) === null;
        if (isPlainObject) {
          const normalized = {};
          for (const [k, v] of Object.entries(obj)) {
            normalized[k] = normalizeObjectFields(v, depth + 1);
          }
          try {
            return JSON.stringify(normalized);
          } catch (e) {
            return String(obj);
          }
        } else {
          try {
            return JSON.stringify(obj);
          } catch (e) {
            return String(obj);
          }
        }
      }
      
      return obj;
    };

    const normalized = {};
    for (const [key, value] of Object.entries(doc)) {
      // Skip _id - OpenSearch uses it as metadata only, not as a document field
      if (key === '_id') {
        continue;
      }
      
      if (DATE_FIELDS.includes(key)) {
        const norm = normalizeDate(value);
        if (norm) {
          normalized[key] = norm;
        } else if (value !== undefined && value !== null && value !== '') {
          normalized[key] = normalizeObjectFields(value);
        } else {
          normalized[key] = value;
        }
        continue;
      }
      
      if (value === null || value === undefined) {
        normalized[key] = value;
      } else if (value === '') {
        normalized[key] = '';
      } else if (Array.isArray(value)) {
        normalized[key] = normalizeObjectFields(value);
      } else if (typeof value === 'object') {
        normalized[key] = normalizeObjectFields(value);
      } else {
        normalized[key] = value;
      }
    }
    
    return normalized;
  }

  static calculateDiff(original = {}, updated = {}, basePath = '') {
    const changed = new Set();

    const keys = new Set([
      ...Object.keys(original || {}),
      ...Object.keys(updated || {})
    ]);

    keys.forEach(key => {
      if (key === '_id') {
        return;
      }
      const path = basePath ? `${basePath}.${key}` : key;
      const origVal = original ? original[key] : undefined;
      const newVal = updated ? updated[key] : undefined;

      if (NeedToActionService.isEqual(origVal, newVal)) {
        return;
      }

      if (NeedToActionService.isObject(origVal) && NeedToActionService.isObject(newVal)) {
        const nested = NeedToActionService.calculateDiff(origVal, newVal, path);
        nested.changed.forEach(p => changed.add(p));
      } else {
        changed.add(path);
      }
    });

    return { changed: Array.from(changed) };
  }

  static isObject(val) {
    return val && typeof val === 'object' && !Array.isArray(val);
  }

  static isEqual(a, b) {
    if (a === b) return true;
    
    // Handle null/undefined
    if ((a === null || a === undefined) && (b === null || b === undefined)) return true;
    if ((a === null || a === undefined) || (b === null || b === undefined)) return false;
    
    // Handle Date objects
    if (a instanceof Date && b instanceof Date) {
      return a.getTime() === b.getTime();
    }
    if (a instanceof Date || b instanceof Date) return false;
    
    // Handle ObjectId
    if (a && a.toString && b && b.toString) {
      try {
        if (a.toString() === b.toString()) return true;
      } catch {}
    }
    
    // Handle different types - convert to string for comparison
    if (typeof a !== typeof b) {
      // Try string comparison for primitive types
      if ((typeof a === 'string' || typeof a === 'number') && (typeof b === 'string' || typeof b === 'number')) {
        return String(a) === String(b);
      }
      return false;
    }
    
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      // Fallback: string comparison
      return String(a) === String(b);
    }
  }

  static applyFindReplace(data = {}, payload = {}) {
    const { targetField, searchValue, replaceValue } = payload;
    if (!targetField) {
      console.warn('⚠️ applyFindReplace: targetField is required');
      return data;
    }

    const cloned = JSON.parse(JSON.stringify(data));
    
    // Try exact match first, then case-insensitive match
    let actualFieldPath = targetField;
    const currentValue = NeedToActionService.getValueByPath(cloned, targetField);
    
    // If not found with exact match, try case-insensitive search
    if (currentValue === undefined) {
      const fieldParts = targetField.split('.');
      const lastPart = fieldParts[fieldParts.length - 1];
      const parentPath = fieldParts.slice(0, -1).join('.');
      const parent = parentPath ? NeedToActionService.getValueByPath(cloned, parentPath) : cloned;
      
      if (parent && typeof parent === 'object') {
        const matchingKey = Object.keys(parent).find(key => 
          key.toLowerCase() === lastPart.toLowerCase()
        );
        if (matchingKey) {
          actualFieldPath = parentPath ? `${parentPath}.${matchingKey}` : matchingKey;
          const foundValue = NeedToActionService.getValueByPath(cloned, actualFieldPath);
          if (foundValue !== undefined) {
            console.log(`🔍 Found field with case-insensitive match: "${targetField}" -> "${actualFieldPath}"`);
          }
        }
      }
    }
    
    const finalValue = NeedToActionService.getValueByPath(cloned, actualFieldPath);

    if (finalValue === undefined || finalValue === null) {
      console.warn(`⚠️ applyFindReplace: Field "${targetField}" not found in data`);
      return cloned;
    }

    if (typeof finalValue === 'string' && searchValue !== undefined && searchValue !== null && searchValue !== '') {
      const newValue = finalValue.split(String(searchValue)).join(replaceValue ?? '');
      NeedToActionService.setValueByPath(cloned, actualFieldPath, newValue);
      console.log(`✅ applyFindReplace: Replaced "${searchValue}" with "${replaceValue ?? ''}" in field "${actualFieldPath}"`);
    } else {
      console.warn(`⚠️ applyFindReplace: Field "${actualFieldPath}" is not a string or searchValue is empty. Current value type: ${typeof finalValue}`);
    }

    return cloned;
  }

  static applyRegexReplace(data = {}, payload = {}) {
    const { targetField, pattern, flags = 'g', replaceValue = '' } = payload;
    if (!targetField || !pattern) return data;

    const cloned = JSON.parse(JSON.stringify(data));
    const currentValue = NeedToActionService.getValueByPath(cloned, targetField);

    if (typeof currentValue === 'string') {
      const regex = new RegExp(pattern, flags);
      NeedToActionService.setValueByPath(cloned, targetField, currentValue.replace(regex, replaceValue));
    }

    return cloned;
  }

  static applyFieldUpdate(data = {}, payload = {}) {
    const { fieldName, fieldValue } = payload;
    if (!fieldName) {
      console.warn('⚠️ applyFieldUpdate: fieldName is required');
      return data;
    }

    const cloned = JSON.parse(JSON.stringify(data));
    
    // Try exact match first, then case-insensitive match
    let actualFieldPath = fieldName;
    const existingValue = NeedToActionService.getValueByPath(cloned, fieldName);
    
    // If not found with exact match, try case-insensitive search
    if (existingValue === undefined) {
      const fieldParts = fieldName.split('.');
      const lastPart = fieldParts[fieldParts.length - 1];
      const parentPath = fieldParts.slice(0, -1).join('.');
      const parent = parentPath ? NeedToActionService.getValueByPath(cloned, parentPath) : cloned;
      
      if (parent && typeof parent === 'object') {
        const matchingKey = Object.keys(parent).find(key => 
          key.toLowerCase() === lastPart.toLowerCase()
        );
        if (matchingKey) {
          actualFieldPath = parentPath ? `${parentPath}.${matchingKey}` : matchingKey;
          console.log(`🔍 Found field with case-insensitive match: "${fieldName}" -> "${actualFieldPath}"`);
        }
      }
    }
    
    NeedToActionService.setValueByPath(cloned, actualFieldPath, fieldValue);
    console.log(`✅ applyFieldUpdate: Updated field "${actualFieldPath}" with value:`, fieldValue);
    return cloned;
  }

  static applyMultiFieldUpdate(data = {}, payload = {}) {
    const { updates } = payload;
    if (!updates || typeof updates !== 'object') return data;

    const cloned = JSON.parse(JSON.stringify(data));
    Object.keys(updates).forEach(path => {
      NeedToActionService.setValueByPath(cloned, path, updates[path]);
    });
    return cloned;
  }

  static getValueByPath(obj, path) {
    if (!obj || !path) return undefined;
    return path.split('.').reduce((acc, key) => {
      if (acc === undefined || acc === null) return undefined;
      return acc[key];
    }, obj);
  }

  static setValueByPath(obj, path, value) {
    const keys = path.split('.');
    let current = obj;
    keys.forEach((key, index) => {
      if (index === keys.length - 1) {
        current[key] = value;
      } else {
        if (!current[key] || typeof current[key] !== 'object') {
          current[key] = {};
        }
        current = current[key];
      }
    });
  }

  static diffForUpdate(original = {}, updated = {}, basePath = '') {
    const set = {};
    const unset = {};

    const keys = new Set([
      ...Object.keys(original || {}),
      ...Object.keys(updated || {})
    ]);

    keys.forEach(key => {
      // Skip immutable MongoDB fields - these cannot be updated
      // Skip _id at any level and id at root level
      if (key === '_id' || (basePath === '' && key === 'id')) {
        return;
      }

      const path = basePath ? `${basePath}.${key}` : key;
      const origVal = original ? original[key] : undefined;
      const newVal = updated ? updated[key] : undefined;

      // Skip if trying to set _id or id at root level (double check)
      if (basePath === '' && (key === '_id' || key === 'id')) {
        return;
      }

      // Skip if path contains _id anywhere (e.g., "some.nested._id")
      if (path.includes('._id') || path === '_id') {
        return;
      }

      if (newVal === undefined) {
        // Don't unset _id or id fields
        if (path !== '_id' && path !== 'id' && !path.includes('._id')) {
          unset[path] = '';
        }
        return;
      }

      // Log comparison for debugging (especially for smtp fields)
      const isEqualResult = NeedToActionService.isEqual(origVal, newVal);
      if (isEqualResult) {
        // Only skip if values are truly equal
        return;
      }

      // Log detected change for smtp-related fields
      if (basePath === '' && (key === 'li_smtp' || key.includes('smtp'))) {
        console.log(`🔍 Change detected for ${path}:`, {
          original: origVal,
          updated: newVal,
          originalType: typeof origVal,
          updatedType: typeof newVal,
          isEqual: isEqualResult
        });
      }

      if (NeedToActionService.isObject(origVal) && NeedToActionService.isObject(newVal)) {
        const nested = NeedToActionService.diffForUpdate(origVal, newVal, path);
        // Filter out _id and id from nested results
        Object.keys(nested.set).forEach(k => {
          if (k !== '_id' && k !== 'id' && !k.includes('._id')) {
            set[k] = nested.set[k];
          }
        });
        Object.keys(nested.unset).forEach(k => {
          if (k !== '_id' && k !== 'id' && !k.includes('._id')) {
            unset[k] = nested.unset[k];
          }
        });
        return;
      }

      if (Array.isArray(newVal)) {
        set[path] = newVal;
        return;
      }

      set[path] = newVal;
    });

    return { set, unset };
  }
}

export default NeedToActionService;

