import React from 'react';
import { ResponsivePie } from '@nivo/pie';
import { CSpinner } from '@coreui/react';

/**
 * Active Users Pie Chart (Nivo)
 * Beautiful animated pie with center label
 */
const ActiveUsersPie = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '320px' }}>
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

  const chartData = [
    { id: 'Active', label: 'Active Users', value: active, color: '#28a745' },
    { id: 'Inactive', label: 'Inactive Users', value: inactive, color: '#6c757d' },
  ];

  return (
    <div style={{ height: '320px' }}>
      <ResponsivePie
        data={chartData}
        margin={{ top: 20, right: 80, bottom: 60, left: 80 }}
        innerRadius={0.6}
        padAngle={2}
        cornerRadius={4}
        activeOuterRadiusOffset={8}
        colors={{ datum: 'data.color' }}
        borderWidth={2}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor="#333333"
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 2]] }}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            translateY: 50,
            itemWidth: 100,
            itemHeight: 18,
            itemTextColor: '#666',
            symbolSize: 12,
            symbolShape: 'circle',
          },
        ]}
        motionConfig="gentle"
        layers={[
          'arcs',
          'arcLabels',
          'arcLinkLabels',
          'legends',
          ({ centerX, centerY }) => (
            <text
              x={centerX}
              y={centerY}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ fontSize: '28px', fontWeight: 'bold', fill: '#28a745' }}
            >
              {active}
              <tspan x={centerX} dy="1.4em" style={{ fontSize: '12px', fill: '#666' }}>
                Active
              </tspan>
            </text>
          ),
        ]}
      />
    </div>
  );
};

export default ActiveUsersPie;
