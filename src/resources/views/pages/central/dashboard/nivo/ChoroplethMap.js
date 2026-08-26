import React from 'react';
import { ResponsiveChoropleth } from '@nivo/geo';
import { CSpinner } from '@coreui/react';

// World countries GeoJSON features (simplified)
import worldCountries from './world_countries.json';

/**
 * Choropleth Map Component (Nivo)
 * Shows email distribution by country
 */
const ChoroplethMap = ({ data, loading = false }) => {
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <CSpinner />
      </div>
    );
  }

  // Default data if none provided
  const chartData = data && data.length > 0 ? data : [
    { id: 'USA', value: 45000 },
    { id: 'IND', value: 32000 },
    { id: 'GBR', value: 18000 },
    { id: 'CAN', value: 12000 },
    { id: 'AUS', value: 8000 },
    { id: 'DEU', value: 7500 },
    { id: 'FRA', value: 6000 },
  ];

  return (
    <div style={{ height: '400px' }}>
      <ResponsiveChoropleth
        data={chartData}
        features={worldCountries.features}
        margin={{ top: 0, right: 0, bottom: 0, left: 0 }}
        colors="blues"
        domain={[0, Math.max(...chartData.map(d => d.value), 1000)]}
        unknownColor="#f5f5f5"
        label="properties.name"
        valueFormat=".2s"
        projectionType="mercator"
        projectionScale={120}
        projectionTranslation={[0.5, 0.6]}
        projectionRotation={[0, 0, 0]}
        borderWidth={0.5}
        borderColor="#999"
        legends={[
          {
            anchor: 'bottom-left',
            direction: 'column',
            translateX: 20,
            translateY: -40,
            itemWidth: 94,
            itemHeight: 18,
            itemDirection: 'left-to-right',
            itemTextColor: '#666',
            itemOpacity: 0.85,
            symbolSize: 18,
          },
        ]}
        tooltip={({ feature }) => (
          <div
            style={{
              background: 'white',
              padding: '8px 12px',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            }}
          >
            <strong>{feature.properties?.name || feature.id}</strong>
            <br />
            Emails: {feature.value?.toLocaleString() || 0}
          </div>
        )}
      />
    </div>
  );
};

export default ChoroplethMap;
