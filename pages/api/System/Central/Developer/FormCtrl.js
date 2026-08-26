import SkeletonService from '../../../../../src/services/SkeletonService';
import DataService from '../../../../../src/services/DataService';

/**
 * FormCtrl - Laravel FormCtrl.php equivalent
 * Handles custom form submissions
 */
export default class FormCtrl {
  /**
   * index method - Main handler
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async index(req, res) {
    try {
      console.log('🎯 FormCtrl::index() called');

      const token = req.body.save_token;
      
      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      // Resolve token
      const reqSet = await SkeletonService.resolveToken(token);
      
      if (!reqSet || !reqSet.status || !reqSet.key) {
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid.'
        });
      }

      let reloadTable = true;
      let validated = {};
      let title = 'Success';
      let message = 'Data saved successfully.';

      // Handle different configuration keys
      switch (reqSet.key) {
        case 'central_skeleton_tokens':
          const { key, module, system, type, table, column, value, act, validate, actions } = req.body;
          
          if (!key || !system || !type || !table) {
            return res.status(400).json({
              status: false,
              title: 'Validation Failed',
              message: 'Missing required fields'
            });
          }

          validated = {
            key: key.trim(),
            module: module?.trim() || null,
            system: system,
            type: type,
            table: table.trim(),
            column: column?.trim() || '',
            value: value?.trim() || '',
            act: act?.trim() || '',
            validate: validate === '1' || validate === true,
            actions: Array.isArray(actions) ? actions.join('') : actions || null,
            created_by: req.user.user_id,
            updated_by: req.user.user_id,
            created_at: new Date(),
            updated_at: new Date()
          };

          const result = await DataService.create(reqSet.system, reqSet.table, validated, reqSet.key);
          
          title = 'Token Added';
          message = 'Token configuration added successfully.';
          
          return res.status(200).json({
            status: result.status,
            reload_table: reloadTable,
            token: reqSet.key,
            affected: result.data?.id || '-',
            title: result.status ? title : 'Failed',
            message: result.status ? message : result.message
          });

        default:
          return res.status(400).json({
            status: false,
            title: 'Invalid Configuration',
            message: 'The configuration key is not supported.'
          });
      }

    } catch (error) {
      console.error('❌ FormCtrl error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: error.message || 'An error occurred while saving the data.'
      });
    }
  }
}

