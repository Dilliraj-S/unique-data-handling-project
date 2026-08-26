import React, { useEffect, useRef, useState, useCallback } from 'react'
import PropTypes from 'prop-types'

import {
  CRow,
  CCol,
  CDropdown,
  CDropdownMenu,
  CDropdownItem,
  CDropdownToggle,
  CWidgetStatsA,
  CSpinner,
} from '@coreui/react'
import { getStyle } from '@coreui/utils'
import { CChartBar, CChartLine } from '@coreui/react-chartjs'
import CIcon from '@coreui/icons-react'
import { cilArrowBottom, cilArrowTop, cilOptions, cilEnvelopeOpen, cilCheckCircle, cilXCircle, cilWarning, cilPeople, cilBuilding, cilBasket, cilUser } from '@coreui/icons'
import AuthService from 'src/application/Services/AuthService'
import axios from 'axios'

const WidgetsDropdown = (props) => {
  const widgetChartRef1 = useRef(null)
  const widgetChartRef2 = useRef(null)
  const widgetChartRef3 = useRef(null)
  const widgetChartRef4 = useRef(null)
  const widgetChartRef5 = useRef(null)
  const widgetChartRef6 = useRef(null)
  const widgetChartRef7 = useRef(null)
  const widgetChartRef8 = useRef(null)
  
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [emailTrend, setEmailTrend] = useState([])

  const getAuthAxios = useCallback(() => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        'Authorization': token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json'
      }
    });
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get('/api/dashboard/stats');
      
      if (response.data.status && response.data.data) {
        setStats(response.data.data);
        
        // Fetch email trend for charts
        const trendResponse = await authAxios.get('/api/dashboard/email-activity?period=7d');
        if (trendResponse.data.status && trendResponse.data.data) {
          setEmailTrend(trendResponse.data.data.datasets.sent || []);
        }
      }
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  }, [getAuthAxios]);

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh every 10 minutes (600000 milliseconds)
    const interval = setInterval(fetchStats, 600000); // 10 minutes = 600000 milliseconds
    return () => clearInterval(interval);
  }, [fetchStats]);

  useEffect(() => {
    document.documentElement.addEventListener('ColorSchemeChange', () => {
      if (widgetChartRef1.current) {
        setTimeout(() => {
          widgetChartRef1.current.data.datasets[0].pointBackgroundColor = getStyle('--cui-primary')
          widgetChartRef1.current.update()
        })
      }

      if (widgetChartRef2.current) {
        setTimeout(() => {
          widgetChartRef2.current.data.datasets[0].pointBackgroundColor = getStyle('--cui-info')
          widgetChartRef2.current.update()
        })
      }
    })
  }, [widgetChartRef1, widgetChartRef2])

  if (loading || !stats) {
    return (
      <CRow className={props.className} xs={{ gutter: 4 }}>
        <CCol xs={12} className="text-center py-4">
          <CSpinner />
        </CCol>
      </CRow>
    );
  }

  // Format numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Calculate trends (simplified - compare today vs yesterday)
  const getTrend = (current, previous) => {
    if (!previous || previous === 0) return { value: '0%', icon: cilArrowTop, positive: true };
    const change = ((current - previous) / previous) * 100;
    return {
      value: `${Math.abs(change).toFixed(1)}%`,
      icon: change >= 0 ? cilArrowTop : cilArrowBottom,
      positive: change >= 0
    };
  };

  const emailTrendData = emailTrend.length > 0 ? emailTrend : [0, 0, 0, 0, 0, 0, 0];
  const maxEmailValue = Math.max(...emailTrendData, 1);

  return (
    <CRow className={props.className} xs={{ gutter: 4 }}>
      {/* Total Contacts */}
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsA
          color="success"
          value={
            <>
              {formatNumber(stats.data.contacts)}{' '}
              <span className="fs-6 fw-normal">
                (<CIcon icon={cilPeople} />)
              </span>
            </>
          }
          title="Total Contacts"
          chart={
            <CChartLine
              ref={widgetChartRef5}
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: ['', '', '', '', '', '', ''],
                datasets: [
                  {
                    label: 'Contacts',
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(255,255,255,.55)',
                    pointBackgroundColor: getStyle('--cui-success'),
                    data: Array(7).fill(stats.data.contacts || 0),
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                maintainAspectRatio: false,
                scales: {
                  x: {
                    border: { display: false },
                    grid: { display: false, drawBorder: false },
                    ticks: { display: false },
                  },
                  y: {
                    min: 0,
                    max: Math.max(stats.data.contacts || 1, 1),
                    display: false,
                    grid: { display: false },
                    ticks: { display: false },
                  },
                },
                elements: {
                  line: { borderWidth: 1, tension: 0.4 },
                  point: { radius: 4, hitRadius: 10, hoverRadius: 4 },
                },
              }}
            />
          }
        />
      </CCol>

      {/* Email Accounts */}
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsA
          color="info"
          value={
            <>
              {stats.accounts.active}{' '}
              <span className="fs-6 fw-normal">
                ({stats.accounts.total} total <CIcon icon={cilEnvelopeOpen} />)
              </span>
            </>
          }
          title="Email Accounts"
          chart={
            <CChartBar
              ref={widgetChartRef6}
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: ['', '', '', '', '', '', ''],
                datasets: [
                  {
                    label: 'Accounts',
                    backgroundColor: 'rgba(255,255,255,.2)',
                    borderColor: 'rgba(255,255,255,.55)',
                    data: Array(7).fill(stats.accounts.active || 0),
                    barPercentage: 0.6,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  x: {
                    grid: { display: false, drawTicks: false },
                    ticks: { display: false },
                  },
                  y: {
                    border: { display: false },
                    grid: { display: false, drawBorder: false, drawTicks: false },
                    ticks: { display: false },
                  },
                },
              }}
            />
          }
        />
      </CCol>

      {/* Products */}
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsA
          color="warning"
          value={
            <>
              {formatNumber(stats.data.products)}{' '}
              <span className="fs-6 fw-normal">
                (<CIcon icon={cilBasket} />)
              </span>
            </>
          }
          title="Products"
          chart={
            <CChartBar
              ref={widgetChartRef7}
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: ['', '', '', '', '', '', ''],
                datasets: [
                  {
                    label: 'Products',
                    backgroundColor: 'rgba(255,255,255,.2)',
                    borderColor: 'rgba(255,255,255,.55)',
                    data: Array(7).fill(stats.data.products || 0),
                    barPercentage: 0.6,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  x: {
                    grid: { display: false, drawTicks: false },
                    ticks: { display: false },
                  },
                  y: {
                    border: { display: false },
                    grid: { display: false, drawBorder: false, drawTicks: false },
                    ticks: { display: false },
                  },
                },
              }}
            />
          }
        />
      </CCol>

      {/* Users */}
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsA
          color="secondary"
          value={
            <>
              {formatNumber(stats.users.total)}{' '}
              <span className="fs-6 fw-normal">
                ({stats.users.active} active <CIcon icon={cilUser} />)
              </span>
            </>
          }
          title="Users"
          chart={
            <CChartLine
              ref={widgetChartRef8}
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: ['', '', '', '', '', '', ''],
                datasets: [
                  {
                    label: 'Users',
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(255,255,255,.55)',
                    pointBackgroundColor: getStyle('--cui-secondary'),
                    data: Array(7).fill(stats.users.total || 0),
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                maintainAspectRatio: false,
                scales: {
                  x: {
                    border: { display: false },
                    grid: { display: false, drawBorder: false },
                    ticks: { display: false },
                  },
                  y: {
                    min: 0,
                    max: Math.max(stats.users.total || 1, 1),
                    display: false,
                    grid: { display: false },
                    ticks: { display: false },
                  },
                },
                elements: {
                  line: { borderWidth: 1, tension: 0.4 },
                  point: { radius: 4, hitRadius: 10, hoverRadius: 4 },
                },
              }}
            />
          }
        />
      </CCol>

      {/* Total Emails Sent */}
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsA
          color="primary"
          value={
            <>
              {formatNumber(stats.emails.sent_today)}{' '}
              <span className="fs-6 fw-normal">
                ({stats.emails.sent_week > 0 ? '+' : ''}{getTrend(stats.emails.sent_today, stats.emails.sent_week / 7).value} <CIcon icon={getTrend(stats.emails.sent_today, stats.emails.sent_week / 7).icon} />)
              </span>
            </>
          }
          title="Emails Sent Today"
          action={
            <CDropdown alignment="end">
              <CDropdownToggle color="transparent" caret={false} className="text-white p-0">
                <CIcon icon={cilOptions} />
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem>Action</CDropdownItem>
                <CDropdownItem>Another action</CDropdownItem>
                <CDropdownItem>Something else here...</CDropdownItem>
                <CDropdownItem disabled>Disabled action</CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          }
          chart={
            <CChartLine
              ref={widgetChartRef1}
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: emailTrend.length > 0 ? Array(emailTrend.length).fill('') : ['', '', '', '', '', '', ''],
                datasets: [
                  {
                    label: 'Emails Sent',
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(255,255,255,.55)',
                    pointBackgroundColor: getStyle('--cui-primary'),
                    data: emailTrendData,
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                maintainAspectRatio: false,
                scales: {
                  x: {
                    border: {
                      display: false,
                    },
                    grid: {
                      display: false,
                      drawBorder: false,
                    },
                    ticks: {
                      display: false,
                    },
                  },
                  y: {
                    min: 0,
                    max: maxEmailValue,
                    display: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false,
                    },
                  },
                },
                elements: {
                  line: {
                    borderWidth: 1,
                    tension: 0.4,
                  },
                  point: {
                    radius: 4,
                    hitRadius: 10,
                    hoverRadius: 4,
                  },
                },
              }}
            />
          }
        />
      </CCol>
      {/* Successful Deliveries */}
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsA
          color="success"
          value={
            <>
              {formatNumber(stats.emails.delivered)}{' '}
              <span className="fs-6 fw-normal">
                ({stats.emails.success_rate}% <CIcon icon={cilCheckCircle} />)
              </span>
            </>
          }
          title="Successful Deliveries"
          action={
            <CDropdown alignment="end">
              <CDropdownToggle color="transparent" caret={false} className="text-white p-0">
                <CIcon icon={cilOptions} />
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem>Action</CDropdownItem>
                <CDropdownItem>Another action</CDropdownItem>
                <CDropdownItem>Something else here...</CDropdownItem>
                <CDropdownItem disabled>Disabled action</CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          }
          chart={
            <CChartLine
              ref={widgetChartRef2}
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: emailTrend.length > 0 ? Array(emailTrend.length).fill('') : ['', '', '', '', '', '', ''],
                datasets: [
                  {
                    label: 'Delivered',
                    backgroundColor: 'transparent',
                    borderColor: 'rgba(255,255,255,.55)',
                    pointBackgroundColor: getStyle('--cui-success'),
                    data: emailTrendData.map((_, i) => Math.floor(emailTrendData[i] * (parseFloat(stats.emails.success_rate) / 100))),
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                maintainAspectRatio: false,
                scales: {
                  x: {
                    border: {
                      display: false,
                    },
                    grid: {
                      display: false,
                      drawBorder: false,
                    },
                    ticks: {
                      display: false,
                    },
                  },
                  y: {
                    min: 0,
                    max: maxEmailValue,
                    display: false,
                    grid: {
                      display: false,
                    },
                    ticks: {
                      display: false,
                    },
                  },
                },
                elements: {
                  line: {
                    borderWidth: 1,
                  },
                  point: {
                    radius: 4,
                    hitRadius: 10,
                    hoverRadius: 4,
                  },
                },
              }}
            />
          }
        />
      </CCol>
      {/* Failed Emails */}
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsA
          color="danger"
          value={
            <>
              {formatNumber(stats.emails.failed)}{' '}
              <span className="fs-6 fw-normal">
                ({stats.emails.sent_today > 0 ? ((stats.emails.failed / stats.emails.sent_today) * 100).toFixed(1) : 0}% <CIcon icon={cilXCircle} />)
              </span>
            </>
          }
          title="Failed Emails"
          action={
            <CDropdown alignment="end">
              <CDropdownToggle color="transparent" caret={false} className="text-white p-0">
                <CIcon icon={cilOptions} />
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem>Action</CDropdownItem>
                <CDropdownItem>Another action</CDropdownItem>
                <CDropdownItem>Something else here...</CDropdownItem>
                <CDropdownItem disabled>Disabled action</CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          }
          chart={
            <CChartLine
              ref={widgetChartRef3}
              className="mt-3"
              style={{ height: '70px' }}
              data={{
                labels: emailTrend.length > 0 ? Array(emailTrend.length).fill('') : ['', '', '', '', '', '', ''],
                datasets: [
                  {
                    label: 'Failed',
                    backgroundColor: 'rgba(255,255,255,.2)',
                    borderColor: 'rgba(255,255,255,.55)',
                    data: emailTrendData.map(() => stats.emails.failed || 0),
                    fill: true,
                  },
                ],
              }}
              options={{
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                maintainAspectRatio: false,
                scales: {
                  x: {
                    display: false,
                  },
                  y: {
                    display: false,
                  },
                },
                elements: {
                  line: {
                    borderWidth: 2,
                    tension: 0.4,
                  },
                  point: {
                    radius: 0,
                    hitRadius: 10,
                    hoverRadius: 4,
                  },
                },
              }}
            />
          }
        />
      </CCol>
      {/* Active Campaigns */}
      <CCol sm={6} xl={4} xxl={3}>
        <CWidgetStatsA
          color="info"
          value={
            <>
              {stats.campaigns.active}{' '}
              <span className="fs-6 fw-normal">
                ({stats.campaigns.total} total <CIcon icon={cilEnvelopeOpen} />)
              </span>
            </>
          }
          title="Active Campaigns"
          action={
            <CDropdown alignment="end">
              <CDropdownToggle color="transparent" caret={false} className="text-white p-0">
                <CIcon icon={cilOptions} />
              </CDropdownToggle>
              <CDropdownMenu>
                <CDropdownItem>Action</CDropdownItem>
                <CDropdownItem>Another action</CDropdownItem>
                <CDropdownItem>Something else here...</CDropdownItem>
                <CDropdownItem disabled>Disabled action</CDropdownItem>
              </CDropdownMenu>
            </CDropdown>
          }
          chart={
            <CChartBar
              ref={widgetChartRef4}
              className="mt-3 mx-3"
              style={{ height: '70px' }}
              data={{
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [
                  {
                    label: 'Campaigns',
                    backgroundColor: 'rgba(255,255,255,.2)',
                    borderColor: 'rgba(255,255,255,.55)',
                    data: Array(7).fill(stats.campaigns.active || 0),
                    barPercentage: 0.6,
                  },
                ],
              }}
              options={{
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  x: {
                    grid: {
                      display: false,
                      drawTicks: false,
                    },
                    ticks: {
                      display: false,
                    },
                  },
                  y: {
                    border: {
                      display: false,
                    },
                    grid: {
                      display: false,
                      drawBorder: false,
                      drawTicks: false,
                    },
                    ticks: {
                      display: false,
                    },
                  },
                },
              }}
            />
          }
        />
      </CCol>
    </CRow>
  )
}

WidgetsDropdown.propTypes = {
  className: PropTypes.string,
  withCharts: PropTypes.bool,
}

export default WidgetsDropdown

