import SkeletonService from '../../../../src/services/SkeletonService';
import { getCollection } from '../../../../src/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * Delete Controller - Laravel Delete.php equivalent
 * Handles single and bulk record deletions
 */
export default class Delete {
  constructor() {
    this.excludedColumns = [
      'id',
      '_id',
      'unique_id',
      'content',
      'password',
      'created_by',
      'updated_by',
      'deleted_at',
      'deleted_on',
    ];
  }

  /**
   * Renders popup to confirm single record deletion
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async single(req, res) {
    try {
      // Get token from multiple possible locations
      const token = req.params?.token || req.body?.skeleton_token || req.body?.delete_token || req.query?.token || '';
      
      console.log('🗑️ Delete.single() called:', { 
        token,
        hasParamsToken: !!req.params?.token,
        hasBodySkeletonToken: !!req.body?.skeleton_token,
        hasBodyId: !!req.body?.id,
        bodyKeys: Object.keys(req.body || {}),
        paramsKeys: Object.keys(req.params || {})
      });
      
      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      // Resolve token first
      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.status || !reqSet.system || !reqSet.table) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid or missing required data.'
        });
      }

      // Get ID from request body, query, or from token resolution (Laravel style)
      // Laravel passes ID in token resolution result: $reqSet['id']
      const recordId = req.body?.id || req.query?.id || reqSet.id;
      
      console.log('🗑️ Delete record ID:', recordId, 'from token:', reqSet.id);
      
      // If ID is provided in body/query, perform immediate deletion (frontend direct delete)
      if (recordId) {
        console.log('🗑️ Performing immediate deletion (ID provided)');
        // Prepare req for delete_single by setting required fields
        req.body.delete_token = token;
        req.body.id = recordId;
        req.body.delete_type = req.body.delete_type || 0;
        return await this.delete_single(req, res);
      }

      // No ID provided - show confirmation popup (original Laravel behavior)
      // This requires ID to be in URL or token resolution
      if (!reqSet.id) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Data',
          message: 'Record ID is required. Provide ID in request body or URL.'
        });
      }

      // Use the ID from token resolution for popup
      const popupRecordId = reqSet.id;

      // Fetch record details for popup
      const collection = await getCollection(reqSet.table);
      
      // Build query - always use _id for MongoDB
      let query = {};
      try {
        // Convert popupRecordId to ObjectId if it's a valid MongoDB ObjectId string
        if (ObjectId.isValid(popupRecordId)) {
          query._id = new ObjectId(popupRecordId);
        } else {
          query._id = popupRecordId;
        }
      } catch {
        query._id = popupRecordId;
      }

      const record = await collection.findOne(query);

      if (!record) {
        return res.status(404).json({
          status: false,
          title: 'Record Not Found',
          message: 'The requested record was not found.'
        });
      }

      // Generate details table
      let detailsHtml = '<table class="table table-sm table-bordered mb-0">';
      const filteredRecord = {};
      
      Object.keys(record).forEach(key => {
        if (!this.excludedColumns.includes(key)) {
          filteredRecord[key] = record[key];
        }
      });

      if (Object.keys(filteredRecord).length === 0) {
        detailsHtml += '<tr><td colspan="2">No displayable details available</td></tr>';
      } else {
        Object.entries(filteredRecord).forEach(([key, value]) => {
          const label = key.replace(/_/g, ' ').split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
          detailsHtml += `<tr><td>${label}</td><td class="text-wrap"><b>${value}</b></td></tr>`;
        });
      }
      
      detailsHtml += '</table>';

      // Build checkbox for permanent delete
      const checkboxHtml = '';

      const content = `
        <div class="alert alert-transparent mb-0" role="alert">
          <div class="accordion" id="deleteAccordion-${token}">
            <div class="accordion-item border-0">
              <h2 class="accordion-header py-2 my-0">
                <button class="accordion-button bg-transparent collapsed py-2 text-dark" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${token}">
                  <h4 class="m-0">Are you sure you want to delete this record?</h4>
                </button>
              </h2>
              <div id="collapse-${token}" class="accordion-collapse collapse">
                <div class="accordion-body p-2">
                  <input type="hidden" name="delete_token" value="${token}">
                  <input type="hidden" name="id" value="${popupRecordId}">
                  ${checkboxHtml}
                  ${detailsHtml}
                  <div class="mt-2"><i class="sf-10"><span class="text-danger">Warning: </span>Permanent deletion schedules the data for removal after 30 days. Temporary deleted data can be retrieved before then.</i></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      return res.status(200).json({
        token: token,
        type: 'modal',
        size: 'modal-md',
        position: 'end',
        label: '<i class="fa-regular fa-trash-can me-1"></i> Delete Record',
        content: content,
        script: '',
        button_class: 'btn-danger',
        button: 'Confirm Delete',
        validate: reqSet.validate || '0',
        status: true
      });

    } catch (error) {
      console.error('❌ Delete single error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: 'An error occurred while processing the request.'
      });
    }
  }

  /**
   * Processes confirmed single record deletion
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async delete_single(req, res) {
    try {
      const token = req.body.delete_token || '';
      
      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.table) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid.'
        });
      }

      // Get ID from request body
      const recordId = req.body.id || req.body.delete_id;
      
      if (!recordId) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Data',
          message: 'Record ID is required for deletion.'
        });
      }

      const deleteType = req.body.delete_type || 0;

      // MongoDB always uses _id as primary key (migrated from Prisma)
      // Ignore reqSet.act and always use _id for MongoDB
      console.log('🗑️ Deleting record:', { 
        table: reqSet.table, 
        recordId, 
        deleteType 
      });

      const collection = await getCollection(reqSet.table);

      // Build query - always use _id for MongoDB
      let query = {};
      try {
        // Convert recordId to ObjectId if it's a valid MongoDB ObjectId string
        if (ObjectId.isValid(recordId)) {
          query._id = new ObjectId(recordId);
        } else {
          query._id = recordId;
        }
      } catch {
        query._id = recordId;
      }

      // Check if record exists
      const existingRecord = await collection.findOne(query);

      if (!existingRecord) {
        console.error('❌ Record not found:', query);
        return res.status(404).json({
          status: false,
          title: 'Record Not Found',
          message: `Record with _id="${recordId}" not found.`
        });
      }

      console.log('✅ Record found:', { id: existingRecord._id, current_deleted_at: existingRecord.deleted_at });

      // Update with soft delete
      const updateData = {
         $set: {
           updated_by: req.user?.user_id || req.user?.id || 'SYSTEM',
        updated_at: new Date()
         }
      };

      if (deleteType === 1) {
        updateData.$set.deleted_on = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      } else {
        updateData.$set.deleted_at = new Date();
      }

      // Perform update
      const result = await collection.updateOne(query, updateData);

      if (result.matchedCount === 0) {
        return res.status(404).json({
          status: false,
          title: 'Record Not Found',
          message: 'Record not found.'
        });
      }

      console.log('✅ Delete successful:', { 
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      });

      // Verify the update (check for deleted_at or deleted_on depending on deleteType)
      const verifyRecord = await collection.findOne(query);

      const isDeleted = deleteType === 1 
        ? verifyRecord?.deleted_on 
        : verifyRecord?.deleted_at;

      if (!verifyRecord || !isDeleted) {
        console.error('❌ Delete verification failed!', { 
          hasRecord: !!verifyRecord, 
          deleted_at: verifyRecord?.deleted_at,
          deleted_on: verifyRecord?.deleted_on,
          deleteType 
        });
        return res.status(500).json({
          status: false,
          title: 'Delete Failed',
          message: 'Delete operation completed but verification failed.'
        });
      }

      console.log('✅ Delete verified:', { 
        id: verifyRecord._id, 
        deleted_at: verifyRecord.deleted_at,
        deleted_on: verifyRecord.deleted_on 
      });

      return res.status(200).json({
        status: true,
        reload_table: true,
        reload_card: true,
        title: 'Success',
        message: deleteType ? 'Record permanently deleted.' : 'Record temporarily deleted.'
      });

    } catch (error) {
      console.error('❌ Delete single execution error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: error.message || 'An error occurred while deleting the record.'
      });
    }
  }

  /**
   * Renders popup to confirm bulk deletion
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async bulk(req, res) {
    try {
      const token = req.params?.token || req.body?.skeleton_token || '';
      
      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.system || !reqSet.table) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid.'
        });
      }

      const idsString = req.body.id || req.body.ids || '';
      const ids = idsString.split('@').filter(Boolean);
      
      if (ids.length === 0) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Data',
          message: 'No records specified for deletion.'
        });
      }

      console.log('🗑️ Bulk delete - IDs received:', { idsString, ids, count: ids.length });

      const collection = await getCollection(reqSet.table);

      // Build query - try ObjectId for MongoDB _id
      const query = {
        _id: {
          $in: ids.map(id => {
            try {
              return new ObjectId(id);
            } catch {
              return id;
            }
          })
        }
      };

      // Fetch records
      const records = await collection.find(query).toArray();

      if (records.length === 0) {
        return res.status(404).json({
          status: false,
          title: 'Records Not Found',
          message: 'The requested records were not found.'
        });
      }

      // Generate details
      let detailsHtml = '<table class="table table-sm table-bordered mb-0">';
      const recordCount = records.length;
      const maxDisplay = 10;
      const displayRecords = recordCount > maxDisplay ? records.slice(0, 5) : records;

      displayRecords.forEach((record, index) => {
        detailsHtml += `<tr><td colspan="2" class="bg-light"><b>Record ${index + 1}</b></td></tr>`;
        Object.keys(record).forEach(key => {
          if (!this.excludedColumns.includes(key)) {
            const label = key.replace(/_/g, ' ').split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
            detailsHtml += `<tr><td>${label}</td><td><b>${record[key] || ''}</b></td></tr>`;
          }
        });
      });

      if (recordCount > maxDisplay) {
        detailsHtml += `<tr><td colspan="2" class="text-muted">... and ${recordCount - 5} more records</td></tr>`;
      }
      
      detailsHtml += '</table>';

      const content = `
        <div class="alert alert-warning bg-transparent mb-0">
          <div class="accordion" id="deleteAccordion-${token}">
            <div class="accordion-item border-0">
              <h2 class="accordion-header py-2 my-0">
                <button class="accordion-button bg-transparent collapsed" type="button" data-bs-toggle="collapse" data-bs-target="#collapse-${token}">
                  <h4 class="m-0">Confirm Bulk Deletion of ${recordCount} Record(s)</h4>
                </button>
              </h2>
              <div id="collapse-${token}" class="accordion-collapse collapse">
                <div class="accordion-body p-1">
                  <input type="hidden" name="delete_token" value="${token}">
                  <input type="hidden" name="delete_ids" value="${ids.join('@')}">
                  ${detailsHtml}
                  <div class="mt-2">
                    <i class="sf-10">
                      <span class="text-danger">Warning: </span>
                      This action will affect <b>${recordCount}</b> records.
                    </i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;

      return res.status(200).json({
        token: token,
        type: 'modal',
        size: 'modal-lg',
        position: 'end',
        label: '<i class="fa-solid fa-trash-can-arrow-up me-1"></i> Bulk Delete Records',
        content: content,
        button_class: 'btn-outline-danger',
        button: 'Confirm Bulk Delete',
        validate: reqSet.validate || '0',
        status: true
      });

    } catch (error) {
      console.error('❌ Delete bulk error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: 'An error occurred while processing the request.'
      });
    }
  }

  /**
   * Processes confirmed bulk deletion
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async delete_bulk(req, res) {
    try {
      const token = req.body.delete_token || '';
      
      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.table || !reqSet.act) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid.'
        });
      }

      const idsString = req.body.delete_ids || '';
      const ids = idsString.split('@').filter(Boolean);
      
      if (ids.length === 0) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Data',
          message: 'No valid IDs provided.'
        });
      }

      console.log('🗑️ delete_bulk - IDs received:', { idsString, ids, count: ids.length });

      const collection = await getCollection(reqSet.table);

      // Build query
      const query = {
        _id: {
          $in: ids.map(id => {
            try {
              return new ObjectId(id);
            } catch {
              return id;
            }
          })
        }
      };

      // Bulk update with soft delete
      const updateData = {
        $set: {
        deleted_at: new Date(),
        updated_by: req.user.user_id,
        updated_at: new Date()
        }
      };

      console.log('📝 Bulk delete update:', { query, updateData });

      const result = await collection.updateMany(query, updateData);

      console.log('✅ Bulk delete successful:', { 
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount
      });

      return res.status(200).json({
        status: true,
        reload_table: true,
        title: 'Success',
        message: `Records temporarily deleted (${result.modifiedCount}).`
      });

    } catch (error) {
      console.error('❌ Delete bulk execution error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: error.message || 'An error occurred while deleting records.'
      });
    }
  }
}
