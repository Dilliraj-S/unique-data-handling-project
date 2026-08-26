import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { CSpinner } from '@coreui/react';

ChartJS.register(ArcElement, Tooltip, Legend);

/**
 * Delivery Rate Doughnut Chart
 * Shows Success vs Bounce vs Failed rate
 */
const DeliveryRateDoughnut = ({ data, loading = false }) => {
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

  const delivered = data.delivered || 0;
  const bounced = data.bounced || 0;
  const failed = data.failed || 0;
  const total = delivered + bounced + failed;
  const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : 0;

  const chartData = {
    labels: ['Delivered', 'Bounced', 'Failed'],
    datasets: [
      {
        data: [delivered, bounced, failed],
        backgroundColor: [
          'rgba(40, 167, 69, 0.8)',
          'rgba(255, 193, 7, 0.8)',
          'rgba(220, 53, 69, 0.8)',
        ],
        borderColor: [
          'rgba(40, 167, 69, 1)',
          'rgba(255, 193, 7, 1)',
          'rgba(220, 53, 69, 1)',
        ],
        borderWidth: 2,
        cutout: '65%',
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { usePointStyle: true, padding: 15 },
      },
    },
  };

  const centerTextPlugin = {
    id: 'deliveryRateCenterText',
    beforeDraw: (chart) => {
      const { ctx, width, height } = chart;
      ctx.save();
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#28a745';
      ctx.fillText(`${successRate}%`, width / 2, height / 2 - 10);
      ctx.font = '11px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText('Success Rate', width / 2, height / 2 + 15);
      ctx.restore();
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Doughnut data={chartData} options={options} plugins={[centerTextPlugin]} />
    </div>
  );
};

export default DeliveryRateDoughnut;
