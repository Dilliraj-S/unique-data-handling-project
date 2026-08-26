import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { CSpinner } from '@coreui/react';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

/**
 * Hourly Pattern Bar Chart
 * Shows email distribution across 24 hours
 */
const HourlyPatternBar = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="text-center py-5" style={{ height: '300px' }}>
        <CSpinner />
      </div>
    );
  }

  // Generate hours 0-23
  const hours = Array.from({ length: 24 }, (_, i) => i);
  const hourLabels = hours.map((h) => `${h}:00`);
  
  // Default to zeros if no data
  const hourData = hours.map((h) => (data && data[h]) || 0);

  // Find peak hour for highlighting
  const maxValue = Math.max(...hourData);
  const peakHour = hourData.indexOf(maxValue);

  const chartData = {
    labels: hourLabels,
    datasets: [
      {
        label: 'Emails Sent',
        data: hourData,
        backgroundColor: hourData.map((_, i) =>
          i === peakHour ? 'rgba(40, 167, 69, 0.8)' : 'rgba(54, 162, 235, 0.6)'
        ),
        borderColor: hourData.map((_, i) =>
          i === peakHour ? 'rgba(40, 167, 69, 1)' : 'rgba(54, 162, 235, 1)'
        ),
        borderWidth: 1,
        borderRadius: 2,
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
          title: (context) => `Hour: ${context[0].label}`,
          label: (context) => `${context.parsed.y.toLocaleString()} emails`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 45 },
      },
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

export default HourlyPatternBar;
