import SkeletonService from '../../../../../src/services/SkeletonService';
import DataService from '../../../../../src/services/DataService';
import { ObjectId } from 'mongodb';

/**
 * ViewCtrl - Laravel ViewCtrl.php equivalent
 * Renders view form for Developer entities
 */
export default class ViewCtrl {
  /**
   * Columns to exclude from the details table globally
   */
  excludedColumns = ['_id', 'id', 'unique_id', 'content', 'password', 'deleted_at', 'deleted_on', 'created_by', 'updated_by'];

  /**
   * index method - Main handler
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async index(req, res) {
    try {
      console.log('🎯 ViewCtrl::index() called');

      const token = req.params?.token || req.body?.skeleton_token || req.query?.token;
      const recordId = req.query?.id || req.body?.id;
      
      if (!token) {
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      if (!recordId) {
        return res.status(400).json({
          status: false,
          title: 'Record ID Missing',
          message: 'No record ID was provided.'
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

      // Convert recordId to ObjectId if valid
      let queryId = recordId;
      if (ObjectId.isValid(recordId)) {
        queryId = new ObjectId(recordId);
      }

      // Fetch existing data using _id for MongoDB
      const result = await DataService.get(reqSet.system, reqSet.table, {
        where: { _id: queryId }
      });
      
      const data = result.data?.[0];
      if (!data) {
        return res.status(404).json({
          status: false,
          title: 'Record Not Found',
          message: 'The requested record was not found.'
        });
      }

      let popup = {};
      let title = 'View Form Loaded';
      let message = 'View form loaded successfully.';
      const allowDefault = true;
      let detailsHtml = '';

      // Handle different configuration keys
      switch (reqSet.key) {
        case 'Developer_entities':
          popup = {
            type: 'modal',
            size: 'lg',
            position: 'center',
            label: 'View Developer Entity',
            form: 'builder',
            labelType: 'above',
            content: `
              <div class="mb-3"><label class="font-bold">Name:</label> <input type="text" name="name" value="${data.name || ''}" readonly class="form-control"></div>
              <div class="mb-3"><label class="font-bold">Type:</label> <input type="text" name="type" value="${data.type || ''}" readonly class="form-control"></div>
              <div class="mb-3"><label class="font-bold">Status:</label> <input type="text" name="status" value="${data.status || ''}" readonly class="form-control"></div>
            `,
            button: 'Close',
            button_class: 'btn btn-secondary',
            footer: true,
            header: true
          };
          title = 'View Entity Form';
          message = 'Developer entity view form loaded successfully.';
          break;

        default:
          // Generate default details table (like Hello Kuppam)
          const filteredRecord = {};
          Object.entries(data).forEach(([key, value]) => {
            if (!this.excludedColumns.includes(key)) {
              // Format value for display
              let displayValue = value;
              if (value === null || value === undefined) {
                displayValue = '';
              } else if (value instanceof Date) {
                displayValue = value.toLocaleString();
              } else if (typeof value === 'object') {
                displayValue = JSON.stringify(value);
              } else if (typeof value === 'boolean') {
                displayValue = value ? 'Yes' : 'No';
              }
              filteredRecord[key] = displayValue;
            }
          });

          // Escape HTML to prevent XSS
          const escapeHtml = (text) => {
            if (text === null || text === undefined) return '';
            return String(text)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;')
              .replace(/'/g, '&#039;');
          };

          detailsHtml = '<div class="table-responsive"><table class="table table-sm table-borderless table-striped table-hover mb-0"><thead><tr class="bg-light"><th>Field</th><th>Value</th></tr></thead><tbody>';
          
          if (Object.keys(filteredRecord).length > 0) {
            Object.entries(filteredRecord).forEach(([key, value]) => {
              const formattedKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
              const escapedValue = escapeHtml(value);
              detailsHtml += `<tr><td>${escapeHtml(formattedKey)}</td><td class="text-wrap"><b>${escapedValue}</b></td></tr>`;
            });
          } else {
            detailsHtml += '<tr><td colspan="2">No displayable details available</td></tr>';
          }
          
          detailsHtml += '</tbody></table></div>';

          popup = {
            type: 'offcanvas',
            size: '',
            position: 'end',
            label: 'Record Details',
            form: 'builder',
            labelType: 'above',
            content: detailsHtml,
            button: 'View',
            button_class: 'd-none'
          };
          title = 'View Record';
          message = 'Record details loaded successfully.';
      }

      // Set no-cache headers to prevent 304 responses
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.status(200).json({
        token: token,
        type: popup.type,
        size: popup.size || '',
        position: popup.position,
        label: popup.label,
        content: popup.content,
        script: popup.script || '',
        button_class: popup.button_class || 'd-none',
        button: popup.button || '',
        footer: popup.footer || false,
        header: popup.header || false,
        validate: reqSet.validate || '0',
        status: true,
        title: title,
        message: message
      });

    } catch (error) {
      console.error('❌ ViewCtrl error:', error);
      return res.status(500).json({
        status: false,
        title: 'Error',
        message: error.message || 'An error occurred while processing the request.'
      });
    }
  }
}

