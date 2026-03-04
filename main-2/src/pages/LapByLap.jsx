import { useState, useMemo } from 'react';
import { formatLapTime, getPositionColor } from '../utils/dataUtils';
import './PageStyles.css';

const LapByLap = ({ data }) => {
  const [selectedLap, setSelectedLap] = useState('lap_1');
  const [selectedMetric, setSelectedMetric] = useState('fastest_lap');

  // Check if this is a race session
  const isRaceSession = data && data.lap_by_lap_leaders;

  // Get available laps
  const availableLaps = useMemo(() => {
    if (!isRaceSession) return [];
    return Object.keys(data.lap_by_lap_leaders).sort((a, b) => {
      const numA = parseInt(a.split('_')[1]);
      const numB = parseInt(b.split('_')[1]);
      return numA - numB;
    });
  }, [data, isRaceSession]);

  // Get current lap data
  const currentLapData = useMemo(() => {
    if (!isRaceSession || !data.lap_by_lap_leaders[selectedLap]) return [];
    return data.lap_by_lap_leaders[selectedLap][selectedMetric] || [];
  }, [data, isRaceSession, selectedLap, selectedMetric]);

  const metrics = [
    { value: 'fastest_lap', label: 'Fastest Lap' },
    { value: 'fastest_s1', label: 'Fastest S1' },
    { value: 'fastest_s2', label: 'Fastest S2' },
    { value: 'fastest_s3', label: 'Fastest S3' },
  ];

  if (!isRaceSession) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Lap-by-Lap Leaders</h1>
          <p className="page-description">
            View lap-by-lap performance rankings throughout the race
          </p>
        </div>
        <div className="card">
          <div className="card-body" style={{ padding: '3rem', textAlign: 'center' }}>
            <h2 style={{ marginBottom: '1rem', color: '#888' }}>No Lap-by-Lap Data Available</h2>
            <p style={{ color: '#aaa', fontSize: '1.1rem' }}>
              Please select a race session to view lap-by-lap details.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Lap-by-Lap Leaders</h1>
        <p className="page-description">
          View lap-by-lap performance rankings throughout the race
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Lap-by-Lap Analysis</h2>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="stat-badge">
              {availableLaps.length} Laps
            </div>
            <div className="stat-badge">
              {currentLapData.length} Drivers
            </div>
          </div>
        </div>

        <div className="card-body">
          <div style={{ 
            display: 'flex', 
            gap: '2rem', 
            marginBottom: '2rem',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Lap Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="lap-select" style={{ fontWeight: '600', color: '#fff' }}>
                Lap:
              </label>
              <select
                id="lap-select"
                value={selectedLap}
                onChange={(e) => setSelectedLap(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '1rem',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  minWidth: '120px'
                }}
              >
                {availableLaps.map((lap) => {
                  const lapNum = lap.split('_')[1];
                  return (
                    <option key={lap} value={lap}>
                      Lap {lapNum}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Metric Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label htmlFor="metric-select" style={{ fontWeight: '600', color: '#fff' }}>
                Metric:
              </label>
              <select
                id="metric-select"
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value)}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '1rem',
                  backgroundColor: '#2a2a2a',
                  color: '#fff',
                  border: '1px solid #444',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  minWidth: '160px'
                }}
              >
                {metrics.map((metric) => (
                  <option key={metric.value} value={metric.value}>
                    {metric.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Data Table */}
          <div className="table-wrapper">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="pos-col">Pos</th>
                  <th className="name-col">Driver</th>
                  <th className="data-col">Time</th>
                  <th className="data-col">Gap to Leader</th>
                </tr>
              </thead>
              <tbody>
                {currentLapData.map((entry, idx) => {
                  const leaderTime = currentLapData[0]?.time || 0;
                  const gap = idx === 0 ? 0 : entry.time - leaderTime;
                  
                  return (
                    <tr key={`${entry.driver}-${idx}`} className="data-row">
                      <td className="pos-col">
                        <span 
                          className="position-badge"
                          style={{ backgroundColor: getPositionColor(idx + 1) }}
                        >
                          {idx + 1}
                        </span>
                      </td>
                      <td className="name-col">
                        <span className="driver-name">{entry.driver}</span>
                      </td>
                      <td className="data-col mono">
                        {formatLapTime(entry.time)}
                      </td>
                      <td className="data-col mono">
                        {idx === 0 ? (
                          <span style={{ color: '#4CAF50' }}>Leader</span>
                        ) : (
                          <span style={{ color: '#ff9800' }}>
                            +{gap.toFixed(3)}s
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LapByLap;
