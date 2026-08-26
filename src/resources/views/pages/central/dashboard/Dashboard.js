import React, { useState, useEffect, useCallback } from 'react';
import {
  CButton,
  CButtonGroup,
  CCard,
  CCardBody,
  CCardFooter,
  CCardHeader,
  CCol,
  CProgress,
  CRow,
} from '@coreui/react';
import CIcon from '@coreui/icons-react';
import { cilCloudDownload } from '@coreui/icons';

import WidgetsDropdown from '../../widgets/WidgetsDropdown';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';

// Nivo Charts (Beautiful Pies & Map)
import {
  ActiveUsersPie,
  DataDistributionPie,
  DeliveryRatePie,
  MasterFlowsPie,
  WorkflowsPie,
  ChoroplethMap,
} from './nivo';

// Chart.js (Fast Line & Bar charts)
import {
  EmailActivityLine,
  HourlyPatternBar,
  WeeklyComparisonBar,
} from './charts';

const Dashboard = () => {
  const [period, setPeriod] = useState('7d');
  const [stats, setStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [flowsWorkflows, setFlowsWorkflows] = useState(null);
  const [loadingFlows, setLoadingFlows] = useState(true);

  const getAuthAxios = useCallback(() => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoadingStats(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/api/dashboard/stats');
      if (response.data.status && response.data.data) {
        setStats(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoadingStats(false);
    }
  }, [getAuthAxios]);

  const fetchFlowsWorkflows = useCallback(async () => {
    try {
      setLoadingFlows(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/api/dashboard/flows-workflows');
      if (response.data.status && response.data.data) {
        setFlowsWorkflows(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch flows/workflows:', error);
    } finally {
      setLoadingFlows(false);
    }
  }, [getAuthAxios]);

  useEffect(() => {
    fetchStats();
    fetchFlowsWorkflows();
    const interval = setInterval(() => {
      fetchStats();
      fetchFlowsWorkflows();
    }, 600000);
    return () => clearInterval(interval);
  }, [fetchStats, fetchFlowsWorkflows]);

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  return (
    <>
      {/* Widgets Row */}
      <WidgetsDropdown className="mb-4" />

      {/* Choropleth Map - Full Width */}
      <CCard className="mb-4">
        <CCardHeader>
          <h5 className="mb-0">📍 Email Distribution by Country</h5>
        </CCardHeader>
        <CCardBody>
          <ChoroplethMap data={stats?.countryDistribution || []} loading={loadingStats} />
        </CCardBody>
      </CCard>

      {/* Row 2: Three Pie Charts (Nivo) */}
      <CRow className="mb-4">
        <CCol xs={12} lg={4}>
          <CCard className="h-100">
            <CCardHeader>
              <h5 className="mb-0">👥 Active Users</h5>
            </CCardHeader>
            <CCardBody>
              <ActiveUsersPie data={stats?.users} loading={loadingStats} />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={4}>
          <CCard className="h-100">
            <CCardHeader>
              <h5 className="mb-0">📊 Data Distribution</h5>
            </CCardHeader>
            <CCardBody>
              <DataDistributionPie
                data={{
                  contacts: stats?.data?.contacts || 0,
                  companies: stats?.data?.companies || 0,
                  users: stats?.users?.total || 0,
                }}
                loading={loadingStats}
              />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={4}>
          <CCard className="h-100">
            <CCardHeader>
              <h5 className="mb-0">📧 Delivery Rate</h5>
            </CCardHeader>
            <CCardBody>
              <DeliveryRatePie data={stats?.emails} loading={loadingStats} />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Row 3: Email Activity Line Chart (Chart.js) */}
      <CCard className="mb-4">
        <CCardBody>
          <CRow>
            <CCol sm={5}>
              <h4 className="card-title mb-0">📈 Email Activity</h4>
              <div className="small text-body-secondary">
                {period === '7d' ? 'Last 7 days' : period === '30d' ? 'Last 30 days' : 'Last 90 days'}
              </div>
            </CCol>
            <CCol sm={7} className="d-none d-md-block">
              <CButton color="primary" className="float-end">
                <CIcon icon={cilCloudDownload} />
              </CButton>
              <CButtonGroup className="float-end me-3">
                {[
                  { value: '7d', label: '7 Days' },
                  { value: '30d', label: '30 Days' },
                  { value: '90d', label: '90 Days' },
                ].map((item) => (
                  <CButton
                    color="outline-secondary"
                    key={item.value}
                    className="mx-0"
                    active={period === item.value}
                    onClick={() => setPeriod(item.value)}
                  >
                    {item.label}
                  </CButton>
                ))}
              </CButtonGroup>
            </CCol>
          </CRow>
          <EmailActivityLine period={period} />
        </CCardBody>
        {stats && (
          <CCardFooter>
            <CRow xs={{ cols: 1, gutter: 4 }} sm={{ cols: 2 }} lg={{ cols: 5 }} className="mb-2 text-center">
              <CCol>
                <div className="text-body-secondary">Total Sent</div>
                <div className="fw-semibold">{formatNumber(stats.emails?.sent_month)}</div>
                <CProgress thin className="mt-2" color="primary" value={100} />
              </CCol>
              <CCol>
                <div className="text-body-secondary">Delivered</div>
                <div className="fw-semibold text-success">{formatNumber(stats.emails?.delivered)}</div>
                <CProgress thin className="mt-2" color="success" value={parseFloat(stats.emails?.success_rate) || 0} />
              </CCol>
              <CCol>
                <div className="text-body-secondary">Failed</div>
                <div className="fw-semibold text-danger">{formatNumber(stats.emails?.failed)}</div>
                <CProgress thin className="mt-2" color="danger" value={10} />
              </CCol>
              <CCol>
                <div className="text-body-secondary">Bounced</div>
                <div className="fw-semibold text-warning">{formatNumber(stats.emails?.bounced)}</div>
                <CProgress thin className="mt-2" color="warning" value={5} />
              </CCol>
              <CCol className="d-none d-xl-block">
                <div className="text-body-secondary">Success Rate</div>
                <div className="fw-semibold">{stats.emails?.success_rate}%</div>
                <CProgress thin className="mt-2" color="info" value={parseFloat(stats.emails?.success_rate) || 0} />
              </CCol>
            </CRow>
          </CCardFooter>
        )}
      </CCard>

      {/* Row 4: Bar Charts (Chart.js) */}
      <CRow className="mb-4">
        <CCol xs={12} lg={6}>
          <CCard className="h-100">
            <CCardHeader>
              <h5 className="mb-0">⏰ Hourly Send Pattern</h5>
            </CCardHeader>
            <CCardBody>
              <HourlyPatternBar data={stats?.hourlyPattern || {}} loading={loadingStats} />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={6}>
          <CCard className="h-100">
            <CCardHeader>
              <h5 className="mb-0">📅 Weekly Comparison</h5>
            </CCardHeader>
            <CCardBody>
              <WeeklyComparisonBar data={stats?.weeklyComparison || {}} loading={loadingStats} />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Row 5: Master Flows & Workflows (Nivo Pies) */}
      <CRow className="mb-4">
        <CCol xs={12} lg={6}>
          <CCard className="h-100">
            <CCardHeader>
              <h5 className="mb-0">🔄 Master Flows</h5>
            </CCardHeader>
            <CCardBody>
              <MasterFlowsPie data={flowsWorkflows?.masterFlows || []} loading={loadingFlows} />
            </CCardBody>
          </CCard>
        </CCol>

        <CCol xs={12} lg={6}>
          <CCard className="h-100">
            <CCardHeader>
              <h5 className="mb-0">⚙️ Workflows</h5>
            </CCardHeader>
            <CCardBody>
              <WorkflowsPie data={flowsWorkflows?.workflows || []} loading={loadingFlows} />
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>
    </>
  );
};

export default Dashboard;
