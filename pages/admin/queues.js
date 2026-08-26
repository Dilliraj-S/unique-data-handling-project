import React, { useState, useEffect } from 'react';
import { CCard, CCardBody, CCardHeader, CCol, CRow, CBadge, CTable, CTableHead, CTableRow, CTableHeaderCell, CTableBody, CTableDataCell, CButton } from '@coreui/react';
import { cilReload, cilCheckCircle, cilXCircle, cilClock, cilWarning } from '@coreui/icons';
import CIcon from '@coreui/icons-react';

const QueueDashboard = () => {
  const [queueStats, setQueueStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchQueueStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/queue-status');
      const data = await response.json();
      
      if (data.success) {
        setQueueStats(data.stats);
        setError(null);
      } else {
        setError(data.message || 'Failed to fetch queue stats');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueueStats();
    const interval = setInterval(fetchQueueStats, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    const badges = {
      waiting: <CBadge color="warning">Waiting</CBadge>,
      active: <CBadge color="info">Active</CBadge>,
      completed: <CBadge color="success">Completed</CBadge>,
      failed: <CBadge color="danger">Failed</CBadge>,
      delayed: <CBadge color="secondary">Delayed</CBadge>
    };
    return badges[status] || <CBadge color="light">{status}</CBadge>;
  };

  if (loading && !queueStats) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardBody className="text-center">
              <div className="spinner-border" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-2">Loading queue statistics...</p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    );
  }

  if (error) {
    return (
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <h5>Queue Dashboard - Error</h5>
              <CButton color="primary" size="sm" onClick={fetchQueueStats}>
                <CIcon icon={cilReload} className="me-1" />
                Retry
              </CButton>
            </CCardHeader>
            <CCardBody>
              <div className="alert alert-danger">
                <CIcon icon={cilXCircle} className="me-2" />
                <strong>Error:</strong> {error}
                <hr />
                <p className="mb-0">
                  <strong>Possible solutions:</strong>
                  <ul className="mt-2">
                    <li>Make sure Redis is running on localhost:6379</li>
                    <li>Start the queue worker: <code>npm run queue:work</code></li>
                    <li>Check if all dependencies are installed: <code>npm install</code></li>
                  </ul>
                </p>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    );
  }

  return (
    <div>
      <CRow>
        <CCol xs={12}>
          <CCard>
            <CCardHeader className="d-flex justify-content-between align-items-center">
              <h5>Bull Queue Dashboard - {queueStats?.name}</h5>
              <CButton 
                color="primary" 
                size="sm" 
                onClick={fetchQueueStats}
                disabled={loading}
              >
                <CIcon icon={cilReload} className="me-1" />
                {loading ? 'Refreshing...' : 'Refresh'}
              </CButton>
            </CCardHeader>
          </CCard>
        </CCol>
      </CRow>

      {/* Queue Statistics Cards */}
      <CRow className="mb-4">
        <CCol sm={6} lg={2}>
          <CCard className="text-center">
            <CCardBody>
              <CIcon icon={cilClock} size="2xl" className="text-warning mb-2" />
              <h4>{queueStats?.counts?.waiting || 0}</h4>
              <p className="text-muted">Waiting</p>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={2}>
          <CCard className="text-center">
            <CCardBody>
              <CIcon icon={cilWarning} size="2xl" className="text-info mb-2" />
              <h4>{queueStats?.counts?.active || 0}</h4>
              <p className="text-muted">Active</p>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={2}>
          <CCard className="text-center">
            <CCardBody>
              <CIcon icon={cilCheckCircle} size="2xl" className="text-success mb-2" />
              <h4>{queueStats?.counts?.completed || 0}</h4>
              <p className="text-muted">Completed</p>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={2}>
          <CCard className="text-center">
            <CCardBody>
              <CIcon icon={cilXCircle} size="2xl" className="text-danger mb-2" />
              <h4>{queueStats?.counts?.failed || 0}</h4>
              <p className="text-muted">Failed</p>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={2}>
          <CCard className="text-center">
            <CCardBody>
              <CIcon icon={cilClock} size="2xl" className="text-secondary mb-2" />
              <h4>{queueStats?.counts?.delayed || 0}</h4>
              <p className="text-muted">Delayed</p>
            </CCardBody>
          </CCard>
        </CCol>
        <CCol sm={6} lg={2}>
          <CCard className="text-center">
            <CCardBody>
              <h4>{queueStats?.counts?.total || 0}</h4>
              <p className="text-muted">Total Jobs</p>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Active Jobs */}
      {queueStats?.jobs?.active?.length > 0 && (
        <CRow className="mb-4">
          <CCol xs={12}>
            <CCard>
              <CCardHeader>
                <h6>Active Jobs</h6>
              </CCardHeader>
              <CCardBody>
                <CTable striped hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Job ID</CTableHeaderCell>
                      <CTableHeaderCell>Transfer ID</CTableHeaderCell>
                      <CTableHeaderCell>Table</CTableHeaderCell>
                      <CTableHeaderCell>Database</CTableHeaderCell>
                      <CTableHeaderCell>Progress</CTableHeaderCell>
                      <CTableHeaderCell>Started</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {queueStats.jobs.active.map((job) => (
                      <CTableRow key={job.id}>
                        <CTableDataCell>{job.id}</CTableDataCell>
                        <CTableDataCell>{job.data.transferId}</CTableDataCell>
                        <CTableDataCell>{job.data.table}</CTableDataCell>
                        <CTableDataCell>{job.data.database}</CTableDataCell>
                        <CTableDataCell>
                          <div className="progress" style={{ height: '20px' }}>
                            <div 
                              className="progress-bar" 
                              style={{ width: `${job.progress}%` }}
                            >
                              {job.progress}%
                            </div>
                          </div>
                        </CTableDataCell>
                        <CTableDataCell>
                          {job.processedOn ? new Date(job.processedOn).toLocaleString() : 'N/A'}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}

      {/* Recent Completed Jobs */}
      {queueStats?.jobs?.recent_completed?.length > 0 && (
        <CRow className="mb-4">
          <CCol xs={12}>
            <CCard>
              <CCardHeader>
                <h6>Recent Completed Jobs</h6>
              </CCardHeader>
              <CCardBody>
                <CTable striped hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Job ID</CTableHeaderCell>
                      <CTableHeaderCell>Transfer ID</CTableHeaderCell>
                      <CTableHeaderCell>Table</CTableHeaderCell>
                      <CTableHeaderCell>Result</CTableHeaderCell>
                      <CTableHeaderCell>Completed</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {queueStats.jobs.recent_completed.map((job) => (
                      <CTableRow key={job.id}>
                        <CTableDataCell>{job.id}</CTableDataCell>
                        <CTableDataCell>{job.data.transferId}</CTableDataCell>
                        <CTableDataCell>{job.data.table}</CTableDataCell>
                        <CTableDataCell>
                          {job.returnvalue ? (
                            <small>
                              Inserted: {job.returnvalue.inserted_rows || 0}, 
                              Rejected: {job.returnvalue.rejected_rows || 0}
                            </small>
                          ) : 'N/A'}
                        </CTableDataCell>
                        <CTableDataCell>
                          {job.finishedOn ? new Date(job.finishedOn).toLocaleString() : 'N/A'}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}

      {/* Recent Failed Jobs */}
      {queueStats?.jobs?.recent_failed?.length > 0 && (
        <CRow>
          <CCol xs={12}>
            <CCard>
              <CCardHeader>
                <h6>Recent Failed Jobs</h6>
              </CCardHeader>
              <CCardBody>
                <CTable striped hover>
                  <CTableHead>
                    <CTableRow>
                      <CTableHeaderCell>Job ID</CTableHeaderCell>
                      <CTableHeaderCell>Transfer ID</CTableHeaderCell>
                      <CTableHeaderCell>Table</CTableHeaderCell>
                      <CTableHeaderCell>Error</CTableHeaderCell>
                      <CTableHeaderCell>Failed</CTableHeaderCell>
                    </CTableRow>
                  </CTableHead>
                  <CTableBody>
                    {queueStats.jobs.recent_failed.map((job) => (
                      <CTableRow key={job.id}>
                        <CTableDataCell>{job.id}</CTableDataCell>
                        <CTableDataCell>{job.data.transferId}</CTableDataCell>
                        <CTableDataCell>{job.data.table}</CTableDataCell>
                        <CTableDataCell>
                          <small className="text-danger">{job.failedReason}</small>
                        </CTableDataCell>
                        <CTableDataCell>
                          {job.finishedOn ? new Date(job.finishedOn).toLocaleString() : 'N/A'}
                        </CTableDataCell>
                      </CTableRow>
                    ))}
                  </CTableBody>
                </CTable>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}
    </div>
  );
};

export default QueueDashboard;
