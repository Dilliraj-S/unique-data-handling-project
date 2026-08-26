import React from 'react';
import { ResponsivePie } from '@nivo/pie';
import { CSpinner } from '@coreui/react';

/**
 * Data Distribution Pie Chart (Nivo)
 * Shows Contacts, Companies, Users distribution
 */
const DataDistributionPie = ({ data, loading = false }) => {
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

  const chartData = [
    { id: 'Contacts', label: 'Contacts', value: data.contacts || 0, color: '#3b82f6' },
    { id: 'Companies', label: 'Companies', value: data.companies || 0, color: '#10b981' },
    { id: 'Users', label: 'Users', value: data.users || 0, color: '#8b5cf6' },
  ];

  return (
    <div style={{ height: '320px' }}>
      <ResponsivePie
        data={chartData}
        margin={{ top: 20, right: 80, bottom: 60, left: 80 }}
        innerRadius={0.5}
        padAngle={2}
        cornerRadius={5}
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
            itemWidth: 90,
            itemHeight: 18,
            itemTextColor: '#666',
            symbolSize: 12,
            symbolShape: 'circle',
          },
        ]}
        motionConfig="wobbly"
      />
    </div>
  );
};

export default DataDistributionPie;
