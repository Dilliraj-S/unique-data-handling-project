import SkeletonService from '../../../../../src/services/SkeletonService';
import DataService from '../../../../../src/services/DataService';

/**
 * CardCtrl - Laravel CardCtrl.php equivalent
 * Handles AJAX card data requests
 */
export default class CardCtrl {
  /**
   * index method - Main handler
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async index(req, res) {
    try {
      console.log('🎯 CardCtrl::index() called');

      const token = req.params?.token || req.body?.skeleton_token || req.query?.token;
      
      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      // Resolve token
      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.status || !reqSet.key || !reqSet.table) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid or lacks required configuration.'
        });
      }

      // Set view to card and parse filters
      reqSet.view = 'card';
      reqSet.draw = parseInt(req.body.draw || req.query.draw || 1);
      const filters = req.body.skeleton_filters || {};
      
      reqSet.filters = {
        search: filters.search || {},
        dateRange: filters.dateRange || {},
        sort: filters.sort || {},
        pagination: filters.pagination || { page: 1, limit: 12 }
      };

      // Initialize configuration arrays
      let columns = {};
      let conditions = [];
      let joins = [];
      let custom = [];
      let view = '';
      let title = 'Success';
      let message = 'Card data retrieved successfully.';

      // Handle different configuration keys
      switch (reqSet.key) {
        case 'central_skeleton_modules':
          columns = {
            id: 'skeleton_modules.id',
            name: 'skeleton_modules.name',
            display: 'skeleton_modules.display',
            is_active: 'skeleton_modules.is_active',
            created_at: 'skeleton_modules.created_at',
            updated_at: 'skeleton_modules.updated_at'
          };
          view = '<div class="card flex-fill">...</div>';
          title = 'Modules Retrieved';
          message = 'Module card data retrieved successfully.';
          break;

        case 'central_skeleton_sections':
          columns = {
            id: 'skeleton_sections.id',
            module_id: 'skeleton_sections.module_id',
            name: 'skeleton_sections.name',
            is_active: 'skeleton_sections.is_active',
            created_at: 'skeleton_sections.created_at',
            updated_at: 'skeleton_sections.updated_at'
          };
          view = '<div class="card h-100">...</div>';
          title = 'Sections Retrieved';
          message = 'Section card data retrieved successfully.';
          break;

        default:
          return res.status(400).json({
            status: false,
            title: 'Invalid Configuration',
            message: 'The configuration key is not supported.'
          });
      }

      // Fetch data using DataService
      const params = {
        draw: reqSet.draw,
        columns: Object.values(columns),
        filters: reqSet.filters,
        joins: joins,
        where: conditions,
        custom: custom
      };

      const result = await DataService.filter(reqSet.system, reqSet.table, params);

      if (!result.status) {
        return res.status(500).json({
          status: false,
          title: 'Data Fetch Failed',
          message: result.message || 'Failed to fetch card data.'
        });
      }

      // Generate response
      return res.status(200).json({
        status: true,
        data: result.data || [],
        recordsTotal: result.recordsTotal || 0,
        recordsFiltered: result.recordsFiltered || 0,
        draw: reqSet.draw,
        title: title,
        message: message
      });

    } catch (error) {
      console.error('❌ CardCtrl error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: error.message || 'Failed to retrieve card data.'
      });
    }
  }
}

