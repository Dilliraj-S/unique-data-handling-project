import React from 'react';
import { ResponsivePie } from '@nivo/pie';
import { CSpinner } from '@coreui/react';

// Color palette for multiple flows
const COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b', '#8b5cf6',
  '#06b6d4', '#ec4899', '#14b8a6', '#f97316', '#6366f1',
];

/**
 * Master Flows Pie Chart (Nivo)
 */
const MasterFlowsPie = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '380px' }}>
        <CSpinner />
      </div>
    );
  }

  if (!data || !data.length) {
    return <div className="text-center py-5 text-muted">No master flows data</div>;
  }

  const chartData = data.map((item, index) => ({
    id: item.name || `Flow ${index + 1}`,
    label: item.name || `Flow ${index + 1}`,
    value: item.value || 1,
    color: COLORS[index % COLORS.length],
  }));

  return (
    <div style={{ height: '380px' }}>
      <ResponsivePie
        data={chartData}
        margin={{ top: 20, right: 120, bottom: 40, left: 20 }}
        innerRadius={0.4}
        padAngle={1}
        cornerRadius={3}
        activeOuterRadiusOffset={6}
        colors={{ datum: 'data.color' }}
        borderWidth={1}
        borderColor={{ from: 'color', modifiers: [['darker', 0.2]] }}
        enableArcLinkLabels={false}
        arcLabelsSkipAngle={15}
        arcLabelsTextColor="#fff"
        legends={[
          {
            anchor: 'right',
            direction: 'column',
            translateX: 100,
            itemWidth: 90,
            itemHeight: 20,
            itemTextColor: '#666',
            symbolSize: 10,
            symbolShape: 'circle',
          },
        ]}
        motionConfig="gentle"
      />
    </div>
  );
};

export default MasterFlowsPie;
