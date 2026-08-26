import React, { useState, useCallback, useMemo } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CCol,
  CRow,
  CButton,
  CAlert,
  CFormSelect
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilReload, cilWarning } from '@coreui/icons';
import DynamicTable from 'src/application/Components/DynamicTable';
import ViewModal from 'src/application/Components/ViewModal';
import { useViewModal } from 'src/application/Hooks/useViewModal';
import { useDelete } from 'src/application/Hooks/useDelete';
import AuthService from 'src/application/Services/AuthService';
import ExportService from 'src/services/ExportService';
import axios from 'axios';

/**
 * Email Bounce Reports Page
 * URL: /central/emailsystem/emailbouncereports
 * Token: central_emails_emailbounce
 */
const Emailbouncereports = () => {
  console.log('🔵 EmailBounceReportsPage component rendering...');
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [tableRefreshKey, setTableRefreshKey] = useState(0);
  const [statusFilter, setStatusFilter] = useState('all');

  const baseToken = 'central_emails_emailbounce';

  // Universal view modal hook - works for all tables automatically
  const { handleView, showViewModal, viewData, setShowViewModal, setViewData } = useViewModal(baseToken);
  
  // Universal delete hook - works for all tables automatically
  const { handleDelete } = useDelete(baseToken, () => {
    setTableRefreshKey(prev => prev + 1);
  });

  const getAuthAxios = () => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  };

  const tableReqSet = {
    token: `${baseToken}_t`,
    table: 'emails',
    actions: 'cvd', // Create, View, Delete (no edit for bounce reports)
    act: 'id',
    system: 'pluto'
  };

  // Build initial filters based on status filter
  const initialFilters = useMemo(() => {
    if (statusFilter === 'all') {
      return {};
    }
    
    // Handle "other" status: emails with null, undefined, or "other" status
    if (statusFilter === 'other') {
      return {
        columns: {
          status: {
            search: {
              value: ['__NULL__', '__UNDEFINED__', 'other'] // Special markers for null/undefined
            }
          }
        },
        filterType: {
          status: 'other_status' // Custom filter type for handling null/undefined
        }
      };
    }
    
    // Regular status filter
    return {
      columns: {
        status: {
          search: {
            value: [statusFilter]
          }
        }
      },
      filterType: {
        status: 'strict'
      }
    };
  }, [statusFilter]);

  // Handle export all filtered data
  const handleExportAll = async (format, columns, filters) => {
    try {
      console.log(`🔄 Exporting all filtered data in ${format} format...`);
      
      const apiUrl = `/api/System/Central/emailsystem/TableCtrl/${baseToken}_t`;
      const authAxios = getAuthAxios();
      
      // Merge current status filter with existing filters
      const exportFilters = {
        ...filters,
        ...initialFilters,
        pagination: { page: 1, limit: 999999 }, // Get all records
        export: true
      };
      
      // Fetch ALL data (no pagination limit)
      const response = await authAxios.post(apiUrl, {
        skeleton_filters: exportFilters
      });

      if (response.data.status && response.data.data) {
        const allData = response.data.data;
        console.log(`✅ Fetched ${allData.length} records for export`);
        
        // Create column definitions for export
        const exportColumns = columns.map(colName => ({
          data: colName,
          title: colName.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' ')
        }));

        switch (format) {
          case 'csv':
            ExportService.exportToCSV(allData, exportColumns, `email_bounce_reports_export_${Date.now()}.csv`);
            break;
          case 'excel':
            ExportService.exportToExcel(allData, exportColumns, `email_bounce_reports_export_${Date.now()}.xlsx`);
            break;
          case 'pdf':
            ExportService.exportToPDF(allData, exportColumns, `email_bounce_reports_export_${Date.now()}.pdf`);
            break;
        }
        
        console.log(`✅ Export completed: ${allData.length} records`);
      } else {
        throw new Error(response.data.message || 'Failed to fetch export data');
      }
    } catch (error) {
      console.error('❌ Export error:', error);
      throw error;
    }
  };

  return (
    <>
      <CRow>
        <CCol xs={12}>
          <CCard className="mb-4">
         <CCardHeader
  className="d-flex align-items-center justify-content-between rounded-3"
  style={{
    background: '#5856D6',
    color: '#fff',
    borderBottom: '2px solid #e0e7ef',
    padding: '12px 16px',
  }}
>
  {/* Left Title */}
  <div className="d-flex align-items-center">
    <CIcon icon={cilWarning} className="me-2 text-white" />
    <h5
      className="mb-0"
      style={{
        fontWeight: 700,
        letterSpacing: '0.5px',
      }}
    >
      Email Bounce Reports
    </h5>
  </div>

  {/* Right Controls */}
  <div className="d-flex align-items-center gap-2">
    <CFormSelect
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      size="sm"
      style={{
        maxWidth: '200px',
        borderRadius: '8px',
      }}
    >
      <option value="all">All Categories</option>
      <option value="unsubscribe">Unsubscribe</option>
      <option value="automatic_reply">Automatic Reply</option>
      <option value="no_longer">No Longer Interested</option>
      <option value="hard_bounce">Hard Bounce</option>
      <option value="soft_bounce">Soft Bounce</option>
      <option value="other">Other</option>
    </CFormSelect>

    <CButton
      color="light"
      size="sm"
      className="rounded-circle"
      onClick={() => setTableRefreshKey((prev) => prev + 1)}
    >
      <CIcon icon={cilReload} />
    </CButton>
  </div>
</CCardHeader>

            <CCardBody>
              {error && (
                <CAlert color="danger" dismissible onClose={() => setError(null)}>
                  {error}
                </CAlert>
              )}
              {success && (
                <CAlert color="success" dismissible onClose={() => setSuccess(null)}>
                  {success}
                </CAlert>
              )}
              <DynamicTable
                key={`${tableRefreshKey}_${statusFilter}`}
                token={`${baseToken}_t`}
                tableName="emails"
                system="pluto"
                // Minimal columns; server returns full columns and filters
                columns={{
                  id: ['id', true],
                  account_email: ['account_email', true],
                  from_email: ['from_email', true],
                  subject: ['subject', true],
                  received_at: ['received_at', true],
                  category: ['category', true],
                  status: ['status', true],
                  read: ['read', true]
                }}
                custom={[]}
                reqSet={tableReqSet}
                onAction={(actionType, row) => {
                  if (!row) return;
                  if (actionType === 'view') handleView(row);
                  if (actionType === 'delete') handleDelete(row);
                }}
                initialFilters={initialFilters}
                autoFetch={true}
                enableSelection={false}
                onExportAll={handleExportAll}
              />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* View Modal (Offcanvas) - Common for all sections */}
      <ViewModal
        show={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setViewData(null);
        }}
        data={viewData}
      />
    </>
  );
};

export default Emailbouncereports;
