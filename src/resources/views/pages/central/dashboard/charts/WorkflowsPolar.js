import React from 'react';
import { PolarArea } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, ArcElement, Tooltip, Legend } from 'chart.js';
import { CSpinner } from '@coreui/react';

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

// Color palette
const COLORS = [
  'rgba(75, 192, 192, 0.7)',
  'rgba(255, 99, 132, 0.7)',
  'rgba(54, 162, 235, 0.7)',
  'rgba(255, 206, 86, 0.7)',
  'rgba(153, 102, 255, 0.7)',
  'rgba(255, 159, 64, 0.7)',
  'rgba(199, 199, 199, 0.7)',
  'rgba(83, 102, 255, 0.7)',
  'rgba(255, 99, 255, 0.7)',
  'rgba(99, 255, 132, 0.7)',
  'rgba(255, 205, 86, 0.7)',
  'rgba(201, 203, 207, 0.7)',
];

/**
 * Workflows Polar Area Chart
 */
const WorkflowsPolar = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="text-center py-5" style={{ height: '350px' }}>
        <CSpinner />
      </div>
    );
  }

  if (!data || !data.length) {
    return <div className="text-center py-5 text-muted">No workflows data</div>;
  }

  const chartData = {
    labels: data.map((w) => w.name || 'Unknown'),
    datasets: [
      {
        data: data.map((w) => w.value || 1),
        backgroundColor: data.map((_, i) => COLORS[i % COLORS.length]),
        borderWidth: 1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          boxWidth: 12,
          padding: 8,
          font: { size: 10 },
        },
      },
    },
    scales: {
      r: {
        ticks: { display: false },
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
    },
  };

  return (
    <div style={{ height: '350px' }}>
      <PolarArea data={chartData} options={options} />
    </div>
  );
};

export default WorkflowsPolar;
