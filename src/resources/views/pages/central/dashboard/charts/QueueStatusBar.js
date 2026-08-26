import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { CSpinner } from '@coreui/react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Queue Status Bar Chart
 * Shows Pending/Processing/Completed/Failed jobs
 */
const QueueStatusBar = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="text-center py-5" style={{ height: '300px' }}>
        <CSpinner />
      </div>
    );
  }

  const pending = data?.pending || 0;
  const processing = data?.processing || 0;
  const completed = data?.completed || 0;
  const failed = data?.failed || 0;

  const chartData = {
    labels: ['Pending', 'Processing', 'Completed', 'Failed'],
    datasets: [
      {
        label: 'Jobs',
        data: [pending, processing, completed, failed],
        backgroundColor: [
          'rgba(255, 193, 7, 0.7)',
          'rgba(23, 162, 184, 0.7)',
          'rgba(40, 167, 69, 0.7)',
          'rgba(220, 53, 69, 0.7)',
        ],
        borderColor: [
          'rgba(255, 193, 7, 1)',
          'rgba(23, 162, 184, 1)',
          'rgba(40, 167, 69, 1)',
          'rgba(220, 53, 69, 1)',
        ],
        borderWidth: 1,
        borderRadius: 6,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y.toLocaleString()} jobs`,
        },
      },
    },
    scales: {
      x: { grid: { display: false } },
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default QueueStatusBar;
