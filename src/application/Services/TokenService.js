import AuthService from './AuthService';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

/**
 * Token Service - Frontend
 * Handles token-based routing and API calls
 */
class TokenService {
  // ================================
  // Token Building
  // ================================

  /**
   * Build table token (base_token + '_t')
   * @param {string} baseToken - Base token
   * @returns {string} Table token
   */
  buildTableToken(baseToken) {
    return `${baseToken}_t`;
  }

  /**
   * Build add token (base_token + '_a')
   * @param {string} baseToken - Base token
   * @returns {string} Add token
   */
  buildAddToken(baseToken) {
    return `${baseToken}_a`;
  }

  /**
   * Build save add token (base_token + '_as')
   * @param {string} baseToken - Base token
   * @returns {string} Save add token
   */
  buildSaveAddToken(baseToken) {
    return `${baseToken}_as`;
  }

  /**
   * Build edit token (base_token + '_e_' + id)
   * @param {string} baseToken - Base token
   * @param {number|string} id - Record ID
   * @returns {string} Edit token
   */
  buildEditToken(baseToken, id) {
    return `${baseToken}_e_${id}`;
  }

  /**
   * Build save edit token (base_token + '_es_' + id)
   * @param {string} baseToken - Base token
   * @param {number|string} id - Record ID
   * @returns {string} Save edit token
   */
  buildSaveEditToken(baseToken, id) {
    return `${baseToken}_es_${id}`;
  }

  /**
   * Build delete token (base_token + '_d_' + id)
   * @param {string} baseToken - Base token
   * @param {number|string} id - Record ID
   * @returns {string} Delete token
   */
  buildDeleteToken(baseToken, id) {
    return `${baseToken}_d_${id}`;
  }

  /**
   * Build view token (base_token + '_v_' + id)
   * @param {string} baseToken - Base token
   * @param {number|string} id - Record ID
   * @returns {string} View token
   */
  buildViewToken(baseToken, id) {
    return `${baseToken}_v_${id}`;
  }

  /**
   * Build custom action token
   * @param {string} baseToken - Base token
   * @param {string} action - Action type
   * @param {number|string} id - Record ID (optional)
   * @param {string} params - Additional parameters (optional)
   * @returns {string} Action token
   */
  buildActionToken(baseToken, action, id = null, params = null) {
    let token = `${baseToken}_${action}`;
    if (id) token += `_${id}`;
    if (params) token += `_${params}`;
    return token;
  }

  // ================================
  // API Calls
  // ================================

  /**
   * Fetch table data (Token-Based Routing)
   * @param {string} baseToken - Base token (e.g., 'central_skeleton_tokens')
   * @param {object} filters - Table filters (optional)
   * @returns {Promise<object>} Table data with pagination and column definitions
   */
  async fetchTableData(baseToken, filters = {}) {
    try {
      const tableToken = this.buildTableToken(baseToken);
      const axios = AuthService.getAxiosInstance();
      
      // Prepare request body matching backend TableCtrl format
      const requestBody = {
        skeleton_token: tableToken,
        key: baseToken,
        draw: filters.draw || 1,
        skeleton_filters: {
          search: filters.search || {},
          dateRange: filters.dateRange || {},
          columns: filters.columns || {},
          sort: filters.sort || {},
          pagination: filters.pagination || { page: 1, limit: 10 }
        }
      };
      
      console.log('📤 Token-Based API Request:', {
        token: tableToken,
        key: baseToken,
        filters: requestBody.skeleton_filters
      });
      
      const response = await axios.post(`/skeleton-action/${tableToken}`, requestBody);
      
      console.log('📥 Token-Based API Response:', {
        status: response.data.status,
        dataCount: response.data.data?.length || 0,
        columns: Object.keys(response.data.columns || {}),
        total: response.data.recordsTotal
      });
      
      // Backend returns: { status, data, recordsTotal, recordsFiltered, draw, title, message, columns }
      return {
        status: response.data.status || true,
        data: response.data.data || [],
        recordsTotal: response.data.recordsTotal || 0,
        recordsFiltered: response.data.recordsFiltered || 0,
        draw: response.data.draw || 1,
        title: response.data.title || '',
        message: response.data.message || '',
        columns: response.data.columns || {}
      };
    } catch (error) {
      console.error('❌ Fetch table data error:', error);
      return {
        status: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch table data',
        data: [],
        columns: {},
        recordsTotal: 0,
        recordsFiltered: 0
      };
    }
  }

  /**
   * Fetch add/edit form configuration (Laravel-style skeleton-action)
   * @param {string} baseToken - Base token (e.g., 'central_skeleton_tokens')
   * @param {string} action - 'add' or 'edit'
   * @param {number} recordId - Record ID for edit mode
   * @returns {Promise<object>} Form configuration
   */
  async fetchForm(baseToken, action = 'add', recordId = null) {
    try {
      const formToken = action === 'add' 
        ? this.buildAddToken(baseToken) 
        : this.buildEditToken(baseToken);
      
      const axios = AuthService.getAxiosInstance();
      
      console.log('📋 Laravel-style: Fetching form via skeleton-action:', formToken);
      
      // Laravel-style: GET /api/skeleton-action/{token}
      const response = await axios.get(`/skeleton-action/${formToken}`, {
        params: { record_id: recordId }
      });
      
      console.log('✅ Form config received from skeleton-action');
      
      return {
        status: response.data.status || true,
        data: response.data.data || {},
        action: action,
        record_id: recordId
      };
    } catch (error) {
      console.error('❌ Fetch form error:', error);
      return {
        status: false,
        message: error.response?.data?.message || error.message || 'Failed to fetch form',
        data: {}
      };
    }
  }

  /**
   * Save form data (Laravel-style skeleton-action)
   * @param {string} baseToken - Base token
   * @param {object} formData - Form data to save
   * @param {string} action - 'add' or 'edit'
   * @param {number} recordId - Record ID for edit mode
   * @returns {Promise<object>} Save result
   */
  async saveForm(baseToken, formData, action = 'add', recordId = null) {
    try {
      const saveToken = action === 'add' 
        ? this.buildSaveAddToken(baseToken) 
        : this.buildSaveEditToken(baseToken);
      
      const axios = AuthService.getAxiosInstance();
      
      console.log('💾 Laravel-style: Saving via skeleton-action:', saveToken);
      
      // Laravel-style: POST /api/skeleton-action/{token}
      const response = await axios.post(`/skeleton-action/${saveToken}`, {
        record_id: recordId,
        ...formData
      });
      
      console.log('✅ Save successful via skeleton-action');
      
      return {
        status: response.data.status || true,
        data: response.data.data || {},
        reload_table: response.data.reload_table || false,
        title: response.data.title || 'Success',
        message: response.data.message || 'Saved successfully'
      };
    } catch (error) {
      console.error('❌ Save form error:', error);
      return {
        status: false,
        message: error.response?.data?.message || error.message || 'Failed to save data',
        reload_table: false
      };
    }
  }

  // Legacy methods for backwards compatibility
  async fetchAddForm(baseToken) {
    return await this.fetchForm(baseToken, 'add', null);
  }

  async submitAddForm(baseToken, formData) {
    return await this.saveForm(baseToken, formData, 'add', null);
  }

  /**
   * Get axios instance with authentication header
   * @returns {object} Axios instance
   */
  getAxiosInstance() {
    return AuthService.getAxiosInstance();
  }

  /**
   * Fetch edit form configuration
   * @param {string} baseToken - Base token
   * @param {number|string} id - Record ID
   * @returns {Promise<object>} Form configuration with data
   */
  async fetchEditForm(baseToken, id) {
    try {
      const editToken = this.buildEditToken(baseToken, id);
      const axios = AuthService.getAxiosInstance();
      
      const response = await axios.get(`/skeleton-action/${editToken}`);
      
      return {
        success: true,
        data: response.data.data || {}
      };
    } catch (error) {
      console.error('Fetch edit form error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch form',
        data: {}
      };
    }
  }

  /**
   * Submit edit form
   * @param {string} baseToken - Base token
   * @param {number|string} id - Record ID
   * @param {object} formData - Form data
   * @returns {Promise<object>} Submit result
   */
  async submitEditForm(baseToken, id, formData) {
    try {
      const saveToken = this.buildSaveEditToken(baseToken, id);
      const axios = AuthService.getAxiosInstance();
      
      const response = await axios.post(`/skeleton-action/${saveToken}`, formData);
      
      return {
        success: true,
        message: response.data.message || 'Updated successfully',
        data: response.data.data || {}
      };
    } catch (error) {
      console.error('Submit edit form error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to update',
        data: {}
      };
    }
  }

  /**
   * Delete record
   * @param {string} baseToken - Base token
   * @param {number|string} id - Record ID
   * @returns {Promise<object>} Delete result
   */
  async deleteRecord(baseToken, id) {
    try {
      const deleteToken = this.buildDeleteToken(baseToken, id);
      const axios = AuthService.getAxiosInstance();
      
      const response = await axios.post(`/skeleton-action/${deleteToken}`);
      
      return {
        success: true,
        message: response.data.message || 'Deleted successfully'
      };
    } catch (error) {
      console.error('Delete record error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to delete'
      };
    }
  }

  /**
   * Fetch view data
   * @param {string} baseToken - Base token
   * @param {number|string} id - Record ID
   * @returns {Promise<object>} View data
   */
  async fetchView(baseToken, id) {
    try {
      const viewToken = this.buildViewToken(baseToken, id);
      const axios = AuthService.getAxiosInstance();
      
      const response = await axios.get(`/skeleton-action/${viewToken}`);
      
      return {
        success: true,
        data: response.data.data || {}
      };
    } catch (error) {
      console.error('Fetch view error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch data',
        data: {}
      };
    }
  }

  /**
   * Fetch page navigation data
   * @param {string} module - Module name
   * @param {string} section - Section name (optional)
   * @param {string} item - Item name (optional)
   * @returns {Promise<object>} Page data with tokens
   */
  async fetchPageData(module, section = null, item = null) {
    try {
      const axios = AuthService.getAxiosInstance();
      let url = `/${module}`;
      if (section) url += `/${section}`;
      if (item) url += `/${item}`;
      
      const response = await axios.get(url);
      
      return {
        success: true,
        data: response.data.data || {}
      };
    } catch (error) {
      console.error('Fetch page data error:', error);
      return {
        success: false,
        message: error.response?.data?.message || 'Failed to fetch page data',
        data: {}
      };
    }
  }
}

export default new TokenService();

