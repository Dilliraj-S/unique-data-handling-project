import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { CSpinner } from '@coreui/react';

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Email Accounts Doughnut Chart
 * Shows Active vs Inactive email accounts
 */
const EmailAccountsDoughnut = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="text-center py-5" style={{ height: '300px' }}>
        <CSpinner />
      </div>
    );
  }

  if (!data) {
    return <div className="text-center py-5 text-muted">No data available</div>;
  }

  const active = data.active || 0;
  const total = data.total || 0;
  const inactive = total - active;

  const chartData = {
    labels: ['Active Accounts', 'Inactive Accounts'],
    datasets: [
      {
        data: [active, inactive],
        backgroundColor: [
          'rgba(23, 162, 184, 0.8)',
          'rgba(255, 193, 7, 0.6)',
        ],
        borderColor: [
          'rgba(23, 162, 184, 1)',
          'rgba(255, 193, 7, 1)',
        ],
        borderWidth: 2,
        cutout: '60%',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
            return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Doughnut data={chartData} options={options} />
    </div>
  );
};

export default EmailAccountsDoughnut;
