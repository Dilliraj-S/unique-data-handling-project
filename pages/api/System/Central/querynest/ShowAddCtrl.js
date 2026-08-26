import SkeletonService from '../../../../../src/services/SkeletonService';
import { getCollection } from '../../../../../src/lib/mongodb';


export default class ShowAddCtrl {
  /**
   * index method - Main handler
   * @param {Request} req 
   * @param {Response} res 
   * @returns {Promise<Response>}
   */
  async index(req, res) {
    try {
      console.log('🎯 ShowAddCtrl::index() called');

      // Token comes from URL params (set by [token].js route handler)
      const token = req.params?.token || req.body?.skeleton_token || req.query?.token;
      
      if (!token) {
        console.error('❌ No token found:', { params: req.params, body: req.body, query: req.query });
        return res.status(400).json({
          status: false,
          title: 'Token Missing',
          message: 'No token was provided.'
        });
      }
      
      console.log('🔍 Token extracted:', token);

      // Resolve token
      const reqSet = await SkeletonService.resolveToken(token);
      
      console.log('📋 Token resolution result:', JSON.stringify({
        hasReqSet: !!reqSet,
        status: reqSet?.status,
        key: reqSet?.key,
        module: reqSet?.module,
        system: reqSet?.system,
        table: reqSet?.table
      }, null, 2));
      
      if (!reqSet || !reqSet.status || !reqSet.key) {
        console.error('❌ Invalid token resolution:', { reqSet });
        return res.status(400).json({
          status: false,
          title: 'Invalid Token',
          message: 'The provided token is invalid.'
        });
    }

      let popup = {};

      switch (reqSet.key) {
        case 'central_querynest':
          popup = {
      form: 'builder',
      labelType: 'floating',
      fields: [
        {
          type: 'text',
          name: 'name',
          label: 'Name',
          required: true,
          col: 12,
                attr: { 'maxlength': '100' }
              }
              // TODO: Add more form fields here
            ],
            type: 'modal',
            size: 'md',
            position: 'end',
            label: '<i class="fa-regular fa-folder me-1"></i> Add querynest',
            short_label: '',
            button: 'Save',
            script: 'window.general.select();'
          };
          break;

        case 'central_users_addusers':
          // User form fields matching users collection schema
          popup = {
            form: 'builder',
            labelType: 'floating',
            fields: [
              {
                type: 'text',
                name: 'username',
                label: 'Username',
                required: true,
                col: 6,
                attr: { 'maxlength': '100' }
              },
              {
                type: 'email',
                name: 'email',
                label: 'Email',
                required: false,
                col: 6,
                attr: { 'maxlength': '255' }
              },
              {
                type: 'password',
                name: 'password',
                label: 'Password',
                value: '12345678',
                required: true,
                col: 6,
                attr: { 'minlength': '8', 'maxlength': '255' }
              },
              {
                type: 'text',
                name: 'first_name',
                label: 'First Name',
                required: false,
                col: 6,
                attr: { 'maxlength': '255' }
              },
              {
                type: 'text',
                name: 'last_name',
                label: 'Last Name',
                required: false,
                col: 6,
                attr: { 'maxlength': '255' }
              },
              {
                type: 'text',
                name: 'phone',
                label: 'Phone',
                required: false,
                col: 6,
                attr: { 'maxlength': '50' }
              },
              {
                type: 'select',
                name: 'role',
                label: 'Role',
                options: { 'user': 'User', 'admin': 'Admin' },
                required: true,
                col: 6
              },
              {
                type: 'select',
                name: 'account_status',
                label: 'Status',
                options: { 'active': 'Active', 'deactive': 'Deactive' },
                required: true,
                col: 6
              },
              {
                type: 'file',
                name: 'profile',
                label: 'Profile Image',
                required: false,
                col: 6,
                helpText: 'Optional: Upload profile image (max 10MB)'
              },
              {
                type: 'file',
                name: 'cover',
                label: 'Cover Image',
                required: false,
                col: 6,
                helpText: 'Optional: Upload cover image (max 10MB)'
              }
            ],
            type: 'modal',
            size: 'lg',
            position: 'end',
            label: '<i class="fa-regular fa-user me-1"></i> Add New User',
            button: 'Add User',
            script: 'window.general.select();'
          };
          break;

        default:
          return res.status(400).json({
            status: false,
            title: 'Invalid Configuration',
            message: 'The configuration key is not supported.'
          });
      }

      // Structure response for DynamicModal component
      const responseData = {
        fields: popup.fields || [],
        labelType: popup.labelType || 'floating',
        modal: {
          size: popup.size || 'lg',
          title: popup.label || 'Form',
          button: popup.button || 'Save'
        },
        script: popup.script || '',
        validate: reqSet.validate || '0'
    };

    return res.status(200).json({
      status: true,
        title: 'Form Generated',
        message: `Add form for ${reqSet.key} generated successfully.`,
        data: responseData
    });

  } catch (error) {
      console.error('❌ ShowAddCtrl error:', error);
    return res.status(500).json({
      status: false,
        title: 'Error',
        message: 'An error occurred while processing the request.'
    });
    }
  }
}
