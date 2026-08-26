import { useState } from 'react';
import AuthService from '../Services/AuthService';
import axios from 'axios';

/**
 * useDelete Hook
 * Universal hook for handling delete functionality across all tables
 * Automatically handles single and bulk delete operations
 * 
 * @param {string} baseToken - The base token for the table (e.g., 'central_skeleton_tokens')
 * @param {Function} onDeleteSuccess - Callback function called after successful deletion
 * @returns {Object} - { handleDelete, handleBulkDelete, isDeleting }
 */
export const useDelete = (baseToken, onDeleteSuccess = null) => {
  const [isDeleting, setIsDeleting] = useState(false);

  // Helper to get axios with auth headers
  const getAuthAxios = () => {
    const token = AuthService.getToken();
    const authAxios = axios.create({
      baseURL: '',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    // Handle 401 errors
    authAxios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          AuthService.logout();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );

    return authAxios;
  };

  /**
   * Handle single delete button click - Common for all sections (like Hello Kuppam)
   * @param {Object} record - The record to delete
   */
  const handleDelete = async (record) => {
    if (!confirm('Are you sure you want to delete this record?')) {
      return;
    }

    try {
      setIsDeleting(true);
      const authAxios = getAuthAxios();
      
      // Use _id for MongoDB, fallback to id
      const recordId = record._id || record.id;
      
      if (!recordId) {
        alert('Record ID is missing');
        return;
      }

      if (!baseToken) {
        alert('Base token is not configured');
        return;
      }

      console.log('🗑️ Deleting record:', { baseToken, recordId });

      // Call delete endpoint with ID in body (immediate deletion)
      const response = await authAxios.post(
        `/api/skeleton-action/${baseToken}_d`,
        { id: recordId }
      );

      console.log('✅ Delete response:', response.data);

      if (response.data && response.data.status) {
        alert(response.data.message || 'Record deleted successfully');
        
        // Call success callback if provided
        if (onDeleteSuccess && typeof onDeleteSuccess === 'function') {
          onDeleteSuccess();
        }
      } else {
        alert(response.data?.message || 'Delete failed');
      }
    } catch (err) {
      console.error('❌ Error deleting record:', err);
      console.error('Error response:', err.response?.data);
      alert(err.response?.data?.message || 'Failed to delete record');
    } finally {
      setIsDeleting(false);
    }
  };

  /**
   * Handle bulk delete for multiple records - Common for all sections (like Hello Kuppam)
   * @param {Array} recordIds - Array of record IDs to delete
   */
  const handleBulkDelete = async (recordIds) => {
    if (!recordIds || recordIds.length === 0) {
      alert('Please select at least one record to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${recordIds.length} record(s)?`)) {
      return;
    }

    try {
      setIsDeleting(true);
      const authAxios = getAuthAxios();

      if (!baseToken) {
        alert('Base token is not configured');
        return;
      }

      console.log('🗑️ Bulk deleting records:', { baseToken, count: recordIds.length, recordIds });

      // Join IDs with @ separator (Laravel style)
      const idsString = recordIds.join('@');

      console.log('🗑️ Bulk delete request:', { baseToken, count: recordIds.length, idsString });

      // Call bulk delete endpoint - expects delete_token and delete_ids (matching Delete.js delete_bulk method)
      const response = await authAxios.post(
        `/api/skeleton-action/${baseToken}_db`,
        { 
          delete_token: `${baseToken}_db`,
          delete_ids: idsString 
        }
      );

      console.log('✅ Bulk delete response:', response.data);

      if (response.data && response.data.status) {
        alert(response.data.message || `Successfully deleted ${recordIds.length} record(s)`);
        
        // Call success callback if provided
        if (onDeleteSuccess && typeof onDeleteSuccess === 'function') {
          onDeleteSuccess();
        }
      } else {
        alert(response.data?.message || 'Bulk delete failed');
      }
    } catch (err) {
      console.error('❌ Error bulk deleting records:', err);
      console.error('Error response:', err.response?.data);
      alert(err.response?.data?.message || 'Failed to delete records');
    } finally {
      setIsDeleting(false);
    }
  };

  return {
    handleDelete,
    handleBulkDelete,
    isDeleting
  };
};

