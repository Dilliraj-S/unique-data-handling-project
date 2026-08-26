import React, { useState, useEffect, useCallback } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { CSpinner } from '@coreui/react';
import AuthService from 'src/application/Services/AuthService';
import axios from 'axios';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/**
 * Email Activity Line Chart
 * Shows Sent, Delivered, Failed, Bounced over time
 */
const EmailActivityLine = ({ period = '7d' }) => {
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(true);

  const getAuthAxios = useCallback(() => {
    const token = AuthService.getToken();
    return axios.create({
      headers: {
        Authorization: token ? `Bearer ${token}` : '',
        'Content-Type': 'application/json',
      },
    });
  }, []);

  const fetchEmailActivity = useCallback(async () => {
    try {
      setLoading(true);
      const authAxios = getAuthAxios();
      const response = await authAxios.get(`/api/dashboard/email-activity?period=${period}`);
      if (response.data.status && response.data.data) {
        setChartData(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch email activity:', error);
    } finally {
      setLoading(false);
    }
  }, [period, getAuthAxios]);

  useEffect(() => {
    fetchEmailActivity();
  }, [fetchEmailActivity]);

  if (loading) {
    return (
      <div className="text-center py-5" style={{ height: '350px' }}>
        <CSpinner />
      </div>
    );
  }

  if (!chartData) {
    return <div className="text-center py-5 text-muted">No data available</div>;
  }

  const data = {
    labels: chartData.labels || [],
    datasets: [
      {
        label: 'Sent',
        data: chartData.datasets?.sent || [],
        borderColor: 'rgba(54, 162, 235, 1)',
        backgroundColor: 'rgba(54, 162, 235, 0.1)',
        fill: true,
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Delivered',
        data: chartData.datasets?.delivered || [],
        borderColor: 'rgba(40, 167, 69, 1)',
        backgroundColor: 'transparent',
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Failed',
        data: chartData.datasets?.failed || [],
        borderColor: 'rgba(220, 53, 69, 1)',
        backgroundColor: 'transparent',
        borderDash: [5, 5],
        tension: 0.4,
        borderWidth: 2,
      },
      {
        label: 'Bounced',
        data: chartData.datasets?.bounced || [],
        borderColor: 'rgba(255, 193, 7, 1)',
        backgroundColor: 'transparent',
        borderDash: [8, 4],
        tension: 0.4,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        grid: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
    },
    elements: {
      point: {
        radius: 0,
        hoverRadius: 6,
      },
    },
  };

  return (
    <div style={{ height: '350px' }}>
      <Line data={data} options={options} />
    </div>
  );
};

export default EmailActivityLine;
