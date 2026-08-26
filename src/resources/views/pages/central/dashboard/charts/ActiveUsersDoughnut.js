import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { CSpinner } from '@coreui/react';

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Active Users Doughnut Chart
 * Shows Active vs Inactive users
 */
const ActiveUsersDoughnut = ({ data, loading = false }) => {
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
    labels: ['Active Users', 'Inactive Users'],
    datasets: [
      {
        data: [active, inactive],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(108, 117, 125, 0.6)',
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(108, 117, 125, 1)',
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

  // Center text plugin
  const centerTextPlugin = {
    id: 'centerText',
    beforeDraw: (chart) => {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#333';
      ctx.fillText(`${active}`, width / 2, height / 2 - 10);
      ctx.font = '12px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText('Active', width / 2, height / 2 + 15);
      ctx.restore();
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Doughnut data={chartData} options={options} plugins={[centerTextPlugin]} />
    </div>
  );
};

export default ActiveUsersDoughnut;
