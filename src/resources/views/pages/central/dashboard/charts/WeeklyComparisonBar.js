import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { CSpinner } from '@coreui/react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Weekly Comparison Bar Chart
 * Shows This Week vs Last Week email stats
 */
const WeeklyComparisonBar = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="text-center py-5" style={{ height: '300px' }}>
        <CSpinner />
      </div>
    );
  }

  const thisWeek = data?.thisWeek || { sent: 0, delivered: 0, failed: 0 };
  const lastWeek = data?.lastWeek || { sent: 0, delivered: 0, failed: 0 };

  const chartData = {
    labels: ['Sent', 'Delivered', 'Failed'],
    datasets: [
      {
        label: 'This Week',
        data: [thisWeek.sent, thisWeek.delivered, thisWeek.failed],
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
      {
        label: 'Last Week',
        data: [lastWeek.sent, lastWeek.delivered, lastWeek.failed],
        backgroundColor: 'rgba(153, 102, 255, 0.5)',
        borderColor: 'rgba(153, 102, 255, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: { usePointStyle: true },
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

export default WeeklyComparisonBar;
