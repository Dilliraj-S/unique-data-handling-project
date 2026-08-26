import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { CSpinner } from '@coreui/react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Top Domains Bar Chart
 * Shows top 10 recipient domains (horizontal)
 */
const TopDomainsBar = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="text-center py-5" style={{ height: '300px' }}>
        <CSpinner />
      </div>
    );
  }

  if (!data || !data.length) {
    return <div className="text-center py-5 text-muted">No domain data available</div>;
  }

  // Take top 10 sorted by count
  const sortedData = [...data].sort((a, b) => b.count - a.count).slice(0, 10);

  const chartData = {
    labels: sortedData.map((d) => d.domain || 'Unknown'),
    datasets: [
      {
        label: 'Emails',
        data: sortedData.map((d) => d.count || 0),
        backgroundColor: 'rgba(54, 162, 235, 0.7)',
        borderColor: 'rgba(54, 162, 235, 1)',
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const options = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.x.toLocaleString()} emails`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0, 0, 0, 0.05)' },
      },
      y: {
        grid: { display: false },
      },
    },
  };

  return (
    <div style={{ height: '300px' }}>
      <Bar data={chartData} options={options} />
    </div>
  );
};

export default TopDomainsBar;
