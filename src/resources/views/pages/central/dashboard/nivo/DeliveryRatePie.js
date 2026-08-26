import React from 'react';
import { ResponsivePie } from '@nivo/pie';
import { CSpinner } from '@coreui/react';

/**
 * Delivery Rate Pie Chart (Nivo)
 * Shows Delivered/Bounced/Failed with success rate center
 */
const DeliveryRatePie = ({ data, loading = false }) => {
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

  const delivered = data.delivered || 0;
  const bounced = data.bounced || 0;
  const failed = data.failed || 0;
  const total = delivered + bounced + failed;
  const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) : 0;

  const chartData = [
    { id: 'Delivered', label: 'Delivered', value: delivered, color: '#22c55e' },
    { id: 'Bounced', label: 'Bounced', value: bounced, color: '#eab308' },
    { id: 'Failed', label: 'Failed', value: failed, color: '#ef4444' },
  ];

  return (
    <div style={{ height: '320px' }}>
      <ResponsivePie
        data={chartData}
        margin={{ top: 20, right: 80, bottom: 60, left: 80 }}
        innerRadius={0.65}
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
        arcLabelsTextColor="#fff"
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            translateY: 50,
            itemWidth: 80,
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
              style={{ fontSize: '26px', fontWeight: 'bold', fill: '#22c55e' }}
            >
              {successRate}%
              <tspan x={centerX} dy="1.4em" style={{ fontSize: '11px', fill: '#666' }}>
                Success Rate
              </tspan>
            </text>
          ),
        ]}
      />
    </div>
  );
};

export default DeliveryRatePie;
