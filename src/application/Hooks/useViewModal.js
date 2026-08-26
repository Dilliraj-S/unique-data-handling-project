import { useState } from 'react';
import AuthService from '../Services/AuthService';
import axios from 'axios';

/**
 * useViewModal Hook
 * Universal hook for handling view modal functionality across all tables
 * Automatically handles fetching view data and managing view modal state
 * 
 * @param {string} baseToken - The base token for the table (e.g., 'central_skeleton_tokens')
 * @returns {Object} - { handleView, showViewModal, viewData, setShowViewModal, setViewData }
 */
export const useViewModal = (baseToken) => {
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewData, setViewData] = useState(null);

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
   * Handle view button click - Common for all sections (like Hello Kuppam)
   * @param {Object} record - The record to view
   */
  const handleView = async (record) => {
    try {
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

      // Add cache-busting to prevent 304 responses
      const timestamp = new Date().getTime();
      const url = `/api/skeleton-action/${baseToken}_v?id=${recordId}&_t=${timestamp}`;
      console.log('🔵 Fetching view data:', url);
      
      const response = await authAxios.get(url, {
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log('✅ View response:', response.data);

      if (response.data && response.data.status && response.data.content) {
        // Show offcanvas modal with record details (like Hello Kuppam)
        const viewDataObj = {
          content: response.data.content,
          label: response.data.label || 'Record Details',
          type: response.data.type || 'offcanvas',
          position: response.data.position || 'end'
        };
        console.log('📋 Setting view data:', viewDataObj);
        setViewData(viewDataObj);
        setShowViewModal(true);
      } else {
        console.error('❌ Invalid response:', response.data);
        alert(response.data?.message || 'Failed to load record details');
      }
    } catch (err) {
      console.error('❌ Error fetching record details:', err);
      console.error('Error response:', err.response?.data);
      alert(err.response?.data?.message || 'Failed to load record details');
    }
  };

  return {
    handleView,
    showViewModal,
    viewData,
    setShowViewModal,
    setViewData
  };
};

