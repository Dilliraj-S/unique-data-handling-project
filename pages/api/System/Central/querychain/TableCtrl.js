import SkeletonService from '../../../../../src/services/SkeletonService';
import { getCollection } from '../../../../../src/lib/mongodb';
import { MongoClient } from 'mongodb';
import { getConnectionConfig } from '../../../../../src/config/database.js';
import DataService from '../../../../../src/services/DataService.js';

/**
 * TableCtrl - Laravel TableCtrl.php equivalent
 * Handles AJAX table data requests
 */
export default class TableCtrl {
  /**
   * index method - Main handler
   */
  async index(req, res) {
    try {
      console.log('🎯 TableCtrl::index() called');

      const token = req.params?.token || req.body?.skeleton_token;

      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.',
        });
      }

      const reqSet = await SkeletonService.resolveToken(token);

      if (!reqSet || !reqSet.status || !reqSet.key || !reqSet.table) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid or lacks required configuration.',
        });
      }

      const draw = parseInt(req.body.draw || 1);
      const filters = req.body.skeleton_filters || {};
      const pagination = filters.pagination || { page: 1, limit: 10 };
      const search = filters.search || [];
      const sort = filters.sort || [];

      let title = 'Data Retrieved';
      let message = 'QueryChain data retrieved successfully.';
      let data = [];
      let recordsTotal = 0;
      let recordsFiltered = 0;

      // Handle different configuration keys
      switch (reqSet.key) {
        case 'central_unique_database': {
          const result = await DataService.filter(reqSet.table, {
            where: { deleted_at: null },
            sort: sort.length > 0 ? sort : [['created_at', 'desc']],
            pagination: pagination,
            search: search,
          });

          data = result.data || [];
          recordsTotal = result.total || 0;
          recordsFiltered = result.filtered || 0;
          title = 'Entities Retrieved';
          message = 'QueryChain entity data retrieved successfully.';
          break;
        }

        case 'central_unique_workflows': {
          const moonConfig = getConnectionConfig('moon');
          const client = new MongoClient(moonConfig.uri, moonConfig.options);
          await client.connect();
          const db = client.db(moonConfig.database);

          const query = { deleted_at: null };
          
          // Apply search filters
          if (search && search.length > 0) {
            const searchConditions = [];
            search.forEach((s) => {
              if (s.field && s.value) {
                searchConditions.push({
                  [s.field]: { $regex: s.value, $options: 'i' },
                });
              }
            });
            if (searchConditions.length > 0) {
              query.$or = searchConditions;
            }
          }

          recordsTotal = await db.collection('workflows').countDocuments({ deleted_at: null });
          recordsFiltered = await db.collection('workflows').countDocuments(query);

          let cursor = db.collection('workflows').find(query);

          // Apply sorting
          const sortObj = {};
          if (sort && sort.length > 0) {
            sort.forEach((s) => {
              sortObj[s.field || s[0]] = s.direction === 'desc' || s[1] === 'desc' ? -1 : 1;
            });
          } else {
            sortObj.created_at = -1;
          }
          cursor = cursor.sort(sortObj);

          // Apply pagination
          const skip = (pagination.page - 1) * pagination.limit;
          cursor = cursor.skip(skip).limit(pagination.limit);

          const workflows = await cursor.toArray();

          data = workflows.map((wf) => {
            const requiredHeaders = Array.isArray(wf.required_headers)
              ? wf.required_headers
              : wf.required_headers
              ? JSON.parse(wf.required_headers)
              : [];
            const updateHeaders = Array.isArray(wf.update_headers)
              ? wf.update_headers
              : wf.update_headers
              ? JSON.parse(wf.update_headers)
              : [];
            const mappingHeaders = Array.isArray(wf.mapping_headers)
              ? wf.mapping_headers
              : wf.mapping_headers
              ? JSON.parse(wf.mapping_headers)
              : [];

            return {
              id: wf._id?.toString() || wf.id,
              name: wf.name,
              type: wf.type,
              required_headers: requiredHeaders,
              update_headers: updateHeaders,
              mapping_headers: mappingHeaders,
              mandatory: wf.mandatory ?? 1,
              support_table: wf.support_table || null,
              created_at: wf.created_at,
              updated_at: wf.updated_at,
            };
          });

          await client.close();
          title = 'Workflows Retrieved';
          message = 'Workflows data retrieved successfully.';
          break;
        }

        case 'central_unique_processes': {
          const moonConfig = getConnectionConfig('moon');
          const client = new MongoClient(moonConfig.uri, moonConfig.options);
          await client.connect();
          const db = client.db(moonConfig.database);

          const query = { deleted_at: null };

          recordsTotal = await db.collection('processes').countDocuments({ deleted_at: null });
          recordsFiltered = await db.collection('processes').countDocuments(query);

          let cursor = db.collection('processes').find(query).sort({ created_at: -1 });

          const skip = (pagination.page - 1) * pagination.limit;
          cursor = cursor.skip(skip).limit(pagination.limit);

          const processes = await cursor.toArray();

          data = processes.map((proc) => ({
            process_id: proc.process_id,
            name: proc.name,
            flows: Array.isArray(proc.flows) ? proc.flows : proc.flows ? JSON.parse(proc.flows) : [],
            mode: proc.mode,
            input_source: proc.input_source,
            output_target: proc.output_target,
            created_at: proc.created_at,
            updated_at: proc.updated_at,
          }));

          await client.close();
          title = 'Processes Retrieved';
          message = 'Processes data retrieved successfully.';
          break;
        }

        case 'unique_process_logs': {
          const moonConfig = getConnectionConfig('moon');
          const client = new MongoClient(moonConfig.uri, moonConfig.options);
          await client.connect();
          const db = client.db(moonConfig.database);

          const query = { deleted_at: null };

          recordsTotal = await db.collection('process_logs').countDocuments({ deleted_at: null });
          recordsFiltered = await db.collection('process_logs').countDocuments(query);

          let cursor = db.collection('process_logs').find(query).sort({ created_at: -1 });

          const skip = (pagination.page - 1) * pagination.limit;
          cursor = cursor.skip(skip).limit(pagination.limit);

          const logs = await cursor.toArray();

          data = logs.map((log) => {
            const traceDetails = log.trace_details ? JSON.parse(log.trace_details) : null;
            return {
              id: log._id?.toString(),
              process_id: log.process_id,
              process_name: log.process_name,
              process_mode: log.process_mode,
              mode: log.mode,
              status: log.status,
              input_location: log.input_location,
              output_location: log.output_location,
              total: log.total || 0,
              processed: log.processed || 0,
              rejected: log.rejected || 0,
              skipped: log.skipped || 0,
              trace_details: traceDetails,
              created_by: log.created_by,
              created_at: log.created_at,
              updated_at: log.updated_at,
            };
          });

          await client.close();
          title = 'Process Logs Retrieved';
          message = 'Process logs data retrieved successfully.';
          break;
        }

        default:
          return res.status(400).json({
            status: false,
            title: 'Invalid Configuration',
            message: 'The configuration key is not supported.',
          });
      }

      return res.status(200).json({
        status: true,
        draw: draw,
        data: data,
        recordsTotal: recordsTotal,
        recordsFiltered: recordsFiltered,
        title: title,
        message: message,
      });
    } catch (error) {
      console.error('❌ TableCtrl error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: error.message || 'An error occurred while processing the request.',
      });
    }
  }
}
