import SkeletonService from '../../../../../src/services/SkeletonService';
import TableHelper from '../../../../../src/services/TableHelper';
import DataService from '../../../../../src/services/DataService';
import { connectionExists, defaultConnection } from '../../../../../src/config/database';

/**
 * TableCtrl - Laravel TableCtrl.php equivalent
 * Handles AJAX table data requests for EmailSystem module
 */
export default class TableCtrl {
  /**
   * index method - Main handler
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async index(req, res) {
    try {
      console.log('🎯 TableCtrl::index() called');

      // Extract and validate token from params (set by SystemRouteController)
      const token = req.params?.token || req.body?.skeleton_token;
      
      if (!token) {
        console.warn('⚠️ TableCtrl: No token provided');
        return res.status(400).json({
      status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }

      console.log(`📋 Resolving token: ${token}`);

      // Resolve token configuration
      const reqSet = await SkeletonService.resolveToken(token);

      if (!reqSet || !reqSet.status || !reqSet.key || !reqSet.table) {
        console.error('❌ TableCtrl: Invalid token configuration', reqSet);
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid or lacks required configuration.'
        });
  }

      console.log('✅ Token resolved:', { key: reqSet.key, table: reqSet.table });

      // Set view to table and parse filters
      const draw = parseInt(req.body.draw || 1);
      const filters = req.body.skeleton_filters || {};

      // Initialize variables
      let columnList = [];
      let title = 'Data Retrieved';
      let message = 'EmailSystem data retrieved successfully.';

      // Handle different configuration keys
      switch (reqSet.key) {
      case 'central_emails_audience':
        reqSet.table = 'audiences';
        columnList = [
          'id',
          'name',
          'created_at',
          'updated_at',
          'deleted_at'
        ];
        title = 'Audience Retrieved';
        message = 'Central emails audience data retrieved successfully.';
        break;
      case 'central_emails_templates':
        reqSet.table = 'templates';
        columnList = [
          'id',
          'title',
          'subject',
          'last_modified',
          'created_at',
          'updated_at',
          'deleted_at'
        ];
        title = 'Templates Retrieved';
        message = 'Central emails templates data retrieved successfully.';
        break;
      case 'central_emails_campaigns':
        reqSet.table = 'campaigns';
        columnList = [
          'id',
          'name',
          'template_id',
          'audience_id',
          'status',
          'created_at',
          'updated_at',
          'deleted_at'
        ];
        title = 'Campaigns Retrieved';
        message = 'Central emails campaigns data retrieved successfully.';
        break;
        case 'central_email_config': 
          // Exclude sensitive fields from table display
          columnList = [
            'id',
            'email',
            'first_name',
            'last_name',
            'designation',
            'region',
            'daily_send_limit',
            'status',
            'type',
            'created_at',
            'updated_at'
          ];
          title = 'Email Accounts Retrieved';
          message = 'Email accounts data retrieved successfully.';
          break;
        case 'central_emails_subscribers':
          reqSet.table = 'subscribers';
          columnList = [
            'id',
            'first_name',
            'last_name',
            'email',
            'status',
            'audience_id',
            'created_at',
            'updated_at',
            'deleted_at'
          ];
          title = 'Subscribers Retrieved';
          message = 'Subscribers data retrieved successfully.';
          break;
        case 'central_emails_emailbounce':
          reqSet.table = 'emails';
          columnList = [
            'id',
            'message_id',
            'thread_id',
            'email_account_id',
            'account_email',
            'from_email',
            'from_name',
            'subject',
            'snippet',
            'body',
            'body_plain',
            'received_at',
            'category',
            'read',
            'labels',
            'status',
            'status_reasons',
            'campaign_id',
            'created_at',
            'updated_at',
            'deleted_at'
          ];
          title = 'Email Bounce Reports Retrieved';
          message = 'Email bounce reports data retrieved successfully.';
          break;
      

        default:
          return res.status(400).json({
            status: false,
            title: 'Invalid Configuration',
            message: 'The configuration key is not supported.'
          });
      }

      // Generate column configuration compatible with TableHelper/DataService
      const columnsConfig = columnList.reduce((acc, col) => {
        acc[col] = [col, true];
        return acc;
      }, {});

      const collectionName = reqSet.table;
      
      // Map collections to their actual database systems
      // Some collections might be in different databases than the token's system
      const collectionSystemMap = {
        email_accounts: 'pluto', // email_accounts is in pluto database
        audiences: 'pluto', // audiences is in pluto database
        templates: 'pluto', // templates is in pluto database
        campaigns: 'pluto', // campaigns is in pluto database
        subscribers: 'pluto', // subscribers is in pluto database
        emails: 'pluto', // emails is in pluto database
        email_bounce_reports: 'pluto', // email_bounce_reports is in pluto database (legacy)
        master_leads: 'sun',
        master_accounts: 'sun'
      };
      
      // Determine system: check collection map first, then token system, then default
      let system = collectionSystemMap[collectionName] || reqSet.system || defaultConnection;

      // Ensure system connection exists
      if (!connectionExists(system)) {
        system = defaultConnection;
        console.log(`⚠️ Invalid system "${reqSet.system}", using default: ${system}`);
      }

      console.log(`📊 Using database system: ${system} for collection: ${collectionName}`, {
        fromCollectionMap: collectionSystemMap[collectionName],
        fromToken: reqSet.system,
        resolved: system
      });

      // Generate params for DataService filter
      const params = TableHelper.generateParams(columnsConfig, [], [], {
        ...reqSet,
        token,
        table: collectionName,
        filters,
        draw,
      });

      // Fetch data using DataService
      console.log(`📊 Fetching data from ${system} database, collection: ${collectionName}`);
      console.log(`📋 DataService params:`, {
        system,
        table: collectionName,
        draw: params.draw,
        filters: Object.keys(params.filters || {}),
        pagination: params.filters?.pagination
      });
      
      let dataResponse;
      try {
        dataResponse = await DataService.filter(system, collectionName, params);
      } catch (error) {
        console.error('❌ DataService.filter threw an error:', error);
        return res.status(500).json({
          status: false,
          title: 'Error',
          message: error.message || 'Failed to fetch data from database',
          data: [],
          recordsTotal: 0,
          recordsFiltered: 0,
          draw: draw
        });
      }
      
      console.log(`📊 DataService response type:`, typeof dataResponse);
      console.log(`📊 DataService response keys:`, dataResponse ? Object.keys(dataResponse) : 'null/undefined');
      console.log(`📊 DataService response:`, {
        status: dataResponse?.status,
        hasData: !!dataResponse?.data,
        dataCount: dataResponse?.data?.length || 0,
        recordsTotal: dataResponse?.recordsTotal,
        recordsFiltered: dataResponse?.recordsFiltered,
        draw: dataResponse?.draw,
        message: dataResponse?.message
      });
      
      // Validate response structure
      if (!dataResponse || typeof dataResponse !== 'object') {
        console.error('❌ DataService returned invalid response:', dataResponse);
        return res.status(500).json({
          status: false,
          title: 'Error',
          message: 'Invalid response from data service',
          data: [],
          recordsTotal: 0,
          recordsFiltered: 0,
          draw: draw
        });
      }
      
      if (dataResponse.status === false) {
        console.error('❌ DataService returned error:', dataResponse.message);
    return res.status(200).json({
          status: false,
          title: 'Error',
          message: dataResponse.message || 'Failed to fetch data',
          data: [],
          recordsTotal: 0,
          recordsFiltered: 0,
          draw: draw,
          columns: {},
          custom: [],
          reqSet: {
            ...reqSet,
            token,
            actions: reqSet.actions || 'cevd',
            act: reqSet.act || 'id'
          }
        });
      }
      
      // Ensure response has required fields with defaults
      if (!Array.isArray(dataResponse.data)) {
        console.warn('⚠️ DataService response.data is not an array, defaulting to empty array');
        dataResponse.data = [];
      }
      if (typeof dataResponse.recordsTotal !== 'number') {
        console.warn('⚠️ DataService response.recordsTotal is not a number, defaulting to 0');
        dataResponse.recordsTotal = 0;
      }
      if (typeof dataResponse.recordsFiltered !== 'number') {
        console.warn('⚠️ DataService response.recordsFiltered is not a number, defaulting to 0');
        dataResponse.recordsFiltered = 0;
      }

      // Format dates for display
      const formatDate = (dateValue) => {
        if (!dateValue) return '';
        if (dateValue instanceof Date) {
          return dateValue.toLocaleString();
        }
        if (typeof dateValue === 'string') {
          try {
            const date = new Date(dateValue);
            if (!isNaN(date.getTime())) {
              return date.toLocaleString();
            }
          } catch (e) {
            console.warn(`⚠️ Failed to parse date: ${dateValue}`, e);
          }
        }
        return '';
      };

      // Transform data for email_accounts and templates
      // Ensure dataResponse.data is an array
      const rawData = Array.isArray(dataResponse.data) ? dataResponse.data : [];
      let transformedData = rawData;
      
      if (reqSet.key === 'central_email_config') {
        transformedData = rawData.map((account, index) => {
          if (!account || typeof account !== 'object') {
            console.warn(`⚠️ Skipping invalid account at index ${index}:`, account);
            return null;
          }
          const accountId = account._id ? account._id.toString() : (account.id ? String(account.id) : '');
          return {
            id: accountId,
            _id: accountId,
            email: account.email || '',
            first_name: account.first_name || '',
            last_name: account.last_name || '',
            designation: account.designation || '',
            region: account.region || '',
            daily_send_limit: account.daily_send_limit || 0,
            status: account.status || 'inactive',
            type: account.type || 'manual',
            created_at: formatDate(account.created_at),
            updated_at: formatDate(account.updated_at)
          };
        }).filter(Boolean); // Remove any null entries
      } else if (reqSet.key === 'central_emails_templates') {
        transformedData = rawData.map((template, index) => {
          if (!template || typeof template !== 'object') {
            console.warn(`⚠️ Skipping invalid template at index ${index}:`, template);
            return null;
          }
          const templateId = template._id ? template._id.toString() : (template.id ? String(template.id) : '');
          return {
            id: templateId,
            _id: templateId,
            title: template.title || '',
            subject: template.subject || '',
            content: template.content || '',
            last_modified: formatDate(template.updated_at || template.created_at),
            created_at: formatDate(template.created_at),
            updated_at: formatDate(template.updated_at)
          };
        }).filter(Boolean); // Remove any null entries
      } else if (reqSet.key === 'central_emails_campaigns') {
        transformedData = rawData.map((campaign, index) => {
          if (!campaign || typeof campaign !== 'object') {
            console.warn(`⚠️ Skipping invalid campaign at index ${index}:`, campaign);
            return null;
          }
          const campaignId = campaign._id ? campaign._id.toString() : (campaign.id ? String(campaign.id) : '');
          return {
            id: campaignId,
            _id: campaignId,
            name: campaign.name || '',
            template_id: campaign.template_id || '',
            audience_id: campaign.audience_id || '',
            status: campaign.status || 'Draft',
            created_at: formatDate(campaign.created_at),
            updated_at: formatDate(campaign.updated_at)
          };
        }).filter(Boolean); // Remove any null entries
      } else if (reqSet.key === 'central_emails_emailbounce') {
        transformedData = rawData.map((email, index) => {
          if (!email || typeof email !== 'object') {
            console.warn(`⚠️ Skipping invalid email at index ${index}:`, email);
            return null;
          }
          const emailId = email._id ? email._id.toString() : (email.id ? String(email.id) : '');
          return {
            id: emailId,
            _id: emailId,
            message_id: email.message_id || '',
            thread_id: email.thread_id || '',
            email_account_id: email.email_account_id || '',
            account_email: email.account_email || '',
            from_email: email.from_email || email.from || '',
            from_name: email.from_name || '',
            subject: email.subject || '',
            snippet: email.snippet || '',
            body: email.body || email.body_html || '',
            body_plain: email.body_plain || '',
            received_at: formatDate(email.received_at || email.date),
            category: email.category || '',
            read: email.read !== undefined ? email.read : (email.is_read || false),
            labels: Array.isArray(email.labels) ? email.labels.join(', ') : (email.labels || ''),
            status: email.status || 'delivered',
            status_reasons: Array.isArray(email.status_reasons) ? email.status_reasons.join(', ') : (email.status_reasons || ''),
            campaign_id: email.campaign_id || '',
            created_at: formatDate(email.created_at),
            updated_at: formatDate(email.updated_at)
          };
        }).filter(Boolean); // Remove any null entries
      }
      
      console.log(`🔄 Transformed ${transformedData.length} records from ${rawData.length} raw records for ${reqSet.key}`);

      // Prepare data for TableHelper.generateResponse
      // TableHelper expects: { status, data, draw, recordsTotal, recordsFiltered }
      const responseData = {
      status: true,
        data: transformedData,
        draw: draw,
        recordsTotal: dataResponse.recordsTotal || 0,
        recordsFiltered: dataResponse.recordsFiltered || 0
      };

      // Validate response structure before passing to TableHelper
      if (!Array.isArray(responseData.data)) {
        console.error('❌ responseData.data is not an array:', typeof responseData.data);
        responseData.data = [];
      }
      if (typeof responseData.recordsTotal !== 'number' || isNaN(responseData.recordsTotal)) {
        console.error('❌ responseData.recordsTotal is not a valid number:', responseData.recordsTotal);
        responseData.recordsTotal = 0;
      }
      if (typeof responseData.recordsFiltered !== 'number' || isNaN(responseData.recordsFiltered)) {
        console.error('❌ responseData.recordsFiltered is not a valid number:', responseData.recordsFiltered);
        responseData.recordsFiltered = 0;
      }
      if (typeof responseData.draw !== 'number' || isNaN(responseData.draw)) {
        console.error('❌ responseData.draw is not a valid number:', responseData.draw);
        responseData.draw = draw;
      }

      console.log('✅ Prepared response data for TableHelper:', {
        dataLength: responseData.data.length,
        recordsTotal: responseData.recordsTotal,
        recordsFiltered: responseData.recordsFiltered,
        draw: responseData.draw
      });

      // Generate response using TableHelper
      // Ensure reqSet has required fields (token and act) like filters module
      const enrichedReqSet = {
        ...reqSet,
        token: token || reqSet.key || reqSet.token,
        table: collectionName,
        actions: reqSet.actions || 'cevd',
        act: reqSet.act || 'id'
      };
      
      console.log('📋 Enriched reqSet for TableHelper:', {
        hasToken: !!enrichedReqSet.token,
        hasAct: !!enrichedReqSet.act,
        token: enrichedReqSet.token,
        act: enrichedReqSet.act,
        table: enrichedReqSet.table,
        actions: enrichedReqSet.actions
      });
      
      let tableResponse;
      try {
        tableResponse = TableHelper.generateResponse(
          responseData,
          columnsConfig,
          [],
          enrichedReqSet
        );
      } catch (error) {
        console.error('❌ TableHelper.generateResponse error:', error);
        console.error('❌ Response data that caused error:', {
          hasData: !!responseData.data,
          dataType: Array.isArray(responseData.data),
          dataLength: responseData.data?.length,
          hasDraw: responseData.draw !== undefined,
          drawType: typeof responseData.draw,
          hasRecordsTotal: responseData.recordsTotal !== undefined,
          recordsTotalType: typeof responseData.recordsTotal,
          hasRecordsFiltered: responseData.recordsFiltered !== undefined,
          recordsFilteredType: typeof responseData.recordsFiltered
        });
        return res.status(500).json({
          status: false,
          title: 'Error',
          message: `Failed to generate table response: ${error.message}`,
        data: [],
        recordsTotal: 0,
        recordsFiltered: 0,
          draw: draw
        });
      }

      return res.status(200).json({
        ...tableResponse,
        title,
        message
    });

  } catch (error) {
      console.error('❌ TableCtrl error:', error);
    return res.status(500).json({
      status: false,
        title: 'Error',
        message: error.message || 'An error occurred while processing the request.'
    });
    }
  }
}
