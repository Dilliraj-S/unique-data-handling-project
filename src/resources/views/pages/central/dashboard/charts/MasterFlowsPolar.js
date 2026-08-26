import React from 'react';
import { PolarArea } from 'react-chartjs-2';
import { Chart as ChartJS, RadialLinearScale, ArcElement, Tooltip, Legend } from 'chart.js';
import { CSpinner } from '@coreui/react';

ChartJS.register(RadialLinearScale, ArcElement, Tooltip, Legend);

// Color palette for multiple items
const COLORS = [
  'rgba(54, 162, 235, 0.7)',
  'rgba(255, 99, 132, 0.7)',
  'rgba(255, 206, 86, 0.7)',
  'rgba(75, 192, 192, 0.7)',
  'rgba(153, 102, 255, 0.7)',
  'rgba(255, 159, 64, 0.7)',
  'rgba(199, 199, 199, 0.7)',
  'rgba(83, 102, 255, 0.7)',
  'rgba(255, 99, 255, 0.7)',
  'rgba(99, 255, 132, 0.7)',
];

/**
 * Master Flows Polar Area Chart
 */
const MasterFlowsPolar = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="text-center py-5" style={{ height: '350px' }}>
        <CSpinner />
      </div>
    );
  }

  if (!data || !data.length) {
    return <div className="text-center py-5 text-muted">No master flows data</div>;
  }

  const chartData = {
    labels: data.map((f) => f.name || 'Unknown'),
    datasets: [
      {
        data: data.map((f) => f.value || 1),
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
          padding: 10,
          font: { size: 11 },
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

export default MasterFlowsPolar;
