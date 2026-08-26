import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { CSpinner } from '@coreui/react';

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Data Distribution Pie Chart
 * Shows Contacts, Companies, Users distribution
 */
const DataDistributionPie = ({ data, loading = false }) => {
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

  const chartData = {
    labels: ['Contacts', 'Companies', 'Users'],
    datasets: [
      {
        data: [
          data.contacts || 0,
          data.companies || 0,
          data.users || 0,
        ],
        backgroundColor: [
          'rgba(54, 162, 235, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)',
        ],
        borderColor: [
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
        ],
        borderWidth: 2,
        hoverOffset: 10,
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
          font: { size: 12 },
        },
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${context.label}: ${value.toLocaleString()} (${percentage}%)`;
          },
        },
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Pie data={chartData} options={options} />
    </div>
  );
};

export default DataDistributionPie;
