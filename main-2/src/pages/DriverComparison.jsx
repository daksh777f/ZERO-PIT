import { useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
import { calculateZScores } from '../utils/dataUtils';
import './PageStyles.css';

const DriverComparison = ({ data }) => {
  const [selectedDrivers, setSelectedDrivers] = useState([]);

  if (!data || !data.driver_performance) {
    return <div className="error">No driver data available</div>;
  }

  const { driver_performance } = data;

  const toggleDriver = (driverName) => {
    setSelectedDrivers(prev => {
      if (prev.includes(driverName)) {
        return prev.filter(d => d !== driverName);
      }
      if (prev.length >= 6) {
        return prev; // Limit to 6 drivers for readability
      }
      return [...prev, driverName];
    });
  };

  const getRadarData = () => {
    if (selectedDrivers.length === 0) return [];

    const metrics = [
      { key: 'fastest_lap', label: 'Fastest Lap', invert: true },
      { key: 'optimal_lap', label: 'Optimal Lap', invert: true },
      { key: 'consistency', label: 'Consistency', invert: true },
      { key: 'alpha_score', label: 'Alpha Score', invert: false },
      { key: 's1_fastest', label: 'Sector 1', invert: true },
      { key: 's2_fastest', label: 'Sector 2', invert: true },
      { key: 's3_fastest', label: 'Sector 3', invert: true },
    ];

    const selectedData = driver_performance.filter(d => 
      selectedDrivers.includes(d.driver_name)
    );

    // Calculate z-scores for each metric
    const radarData = metrics.map(metric => {
      const values = driver_performance.map(d => {
        if (metric.key === 'alpha_score') return d.alpha_score;
        if (metric.key === 'fastest_lap') return d.lap_times?.fastest || 999;
        if (metric.key === 'optimal_lap') return d.lap_times?.optimal_lap_time || 999;
        if (metric.key === 'consistency') return d.lap_times?.consistency_best_5 || 999;
        if (metric.key === 's1_fastest') return d.s1_times?.fastest || 999;
        if (metric.key === 's2_fastest') return d.s2_times?.fastest || 999;
        if (metric.key === 's3_fastest') return d.s3_times?.fastest || 999;
        return 0;
      });

      const zScores = calculateZScores(values);
      
      const dataPoint = { metric: metric.label };
      
      selectedData.forEach((driver, idx) => {
        const driverIdx = driver_performance.findIndex(d => d.driver_name === driver.driver_name);
        let score = zScores[driverIdx];
        
        // Invert for metrics where lower is better
        if (metric.invert) score = -score;
        
        // Normalize to 0-100 scale for better visualization
        dataPoint[driver.driver_name] = ((score + 3) / 6) * 100;
      });

      return dataPoint;
    });

    return radarData;
  };

  const driverColors = [
    '#e63946', // Racing red
    '#00d9ff', // Electric blue
    '#06ffa5', // Neon green
    '#9d4edd', // Purple
    '#ffd60a', // Yellow
    '#ff006e', // Pink
  ];

  const radarData = getRadarData();

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Driver Comparison</h1>
        <p className="page-description">
          Multi-dimensional performance analysis using normalized z-scores
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Select Drivers</h2>
          <div className="stat-badge">
            {selectedDrivers.length} / 6 Selected
          </div>
        </div>
        <div className="driver-selector">
          {driver_performance.map(driver => (
            <button
              key={driver.driver_name}
              className={`driver-chip ${selectedDrivers.includes(driver.driver_name) ? 'selected' : ''}`}
              onClick={() => toggleDriver(driver.driver_name)}
              disabled={!selectedDrivers.includes(driver.driver_name) && selectedDrivers.length >= 6}
            >
              {driver.driver_name}
            </button>
          ))}
        </div>
      </div>

      {selectedDrivers.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Performance Radar</h2>
          </div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={600}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#333333" />
                <PolarAngleAxis 
                  dataKey="metric" 
                  tick={{ fill: '#b0b0b0', fontSize: 12, fontFamily: 'Rajdhani' }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]}
                  tick={{ fill: '#707070', fontSize: 10 }}
                />
                {selectedDrivers.map((driver, idx) => (
                  <Radar
                    key={driver}
                    name={driver}
                    dataKey={driver}
                    stroke={driverColors[idx]}
                    fill={driverColors[idx]}
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                ))}
                <Legend 
                  wrapperStyle={{ 
                    fontFamily: 'Orbitron',
                    fontSize: '14px',
                    paddingTop: '20px'
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-note">
            Note: Values are normalized z-scores scaled 0-100. Higher values indicate better performance relative to the field.
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverComparison;
