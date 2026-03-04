import { useState } from 'react';
import { formatLapTime, formatDelta, getPositionColor, getAlphaScoreColor } from '../utils/dataUtils';
import './LeaderboardTable.css';

const LeaderboardTable = ({ data, type = 'driver' }) => {
  const [sortMetric, setSortMetric] = useState('alpha_score');
  const [sortAscending, setSortAscending] = useState(false);

  const metrics = {
    alpha_score: { label: 'Alpha Score', format: (v) => v?.toFixed(3) || '--' },
    fastest_lap: { label: 'Fastest Lap', format: formatLapTime },
    optimal_lap: { label: 'Optimal Lap', format: formatLapTime },
    best_5_avg: { label: 'Best 5 Avg', format: formatLapTime },
    consistency: { label: 'Consistency', format: (v) => v?.toFixed(3) || '--' },
    fastest_delta: { label: 'Δ to Optimal', format: formatDelta },
    s1_fastest: { label: 'S1 Best', format: formatLapTime },
    s2_fastest: { label: 'S2 Best', format: formatLapTime },
    s3_fastest: { label: 'S3 Best', format: formatLapTime },
  };

  const getMetricValue = (item, metric) => {
    if (metric === 'alpha_score') return item.alpha_score;
    if (metric === 'fastest_lap') return item.lap_times?.fastest;
    if (metric === 'optimal_lap') return item.lap_times?.optimal_lap_time;
    if (metric === 'best_5_avg') return item.lap_times?.best_5_avg;
    if (metric === 'consistency') return item.lap_times?.consistency_best_5;
    if (metric === 'fastest_delta') return item.lap_times?.fastest_delta;
    if (metric === 's1_fastest') return item.s1_times?.fastest;
    if (metric === 's2_fastest') return item.s2_times?.fastest;
    if (metric === 's3_fastest') return item.s3_times?.fastest;
    return 0;
  };

  const sortedData = [...data].sort((a, b) => {
    const aVal = getMetricValue(a, sortMetric);
    const bVal = getMetricValue(b, sortMetric);
    
    // Handle consistency (lower is better)
    if (sortMetric === 'consistency') {
      return sortAscending ? bVal - aVal : aVal - bVal;
    }
    
    // Handle lap times (lower is better)
    if (['fastest_lap', 'optimal_lap', 'best_5_avg', 's1_fastest', 's2_fastest', 's3_fastest'].includes(sortMetric)) {
      return sortAscending ? bVal - aVal : aVal - bVal;
    }
    
    // Default (higher is better)
    return sortAscending ? aVal - bVal : bVal - aVal;
  });

  const handleSort = (metric) => {
    if (sortMetric === metric) {
      setSortAscending(!sortAscending);
    } else {
      setSortMetric(metric);
      setSortAscending(false);
    }
  };

  return (
    <div className="leaderboard-container">
      <div className="metric-selector">
        <label>Sort by:</label>
        <div className="metric-buttons">
          {Object.entries(metrics).map(([key, { label }]) => (
            <button
              key={key}
              className={`metric-btn ${sortMetric === key ? 'active' : ''}`}
              onClick={() => handleSort(key)}
            >
              {label}
              {sortMetric === key && (
                <span className="sort-indicator">{sortAscending ? '↑' : '↓'}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrapper">
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th className="pos-col">Pos</th>
              <th className="name-col">{type === 'driver' ? 'Driver' : 'Team'}</th>
              {type === 'driver' && <th className="team-col">Team</th>}
              <th className="data-col">Fastest Lap</th>
              <th className="data-col">Optimal Lap</th>
              <th className="data-col">Best 5 Avg</th>
              <th className="data-col">Consistency</th>
              <th className="data-col">Alpha Score</th>
              <th className="data-col">S1</th>
              <th className="data-col">S2</th>
              <th className="data-col">S3</th>
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, idx) => {
              const name = type === 'driver' ? item.driver_name : item.team_name;
              const alphaScore = item.alpha_score || 0;
              
              return (
                <tr key={name} className="data-row">
                  <td className="pos-col">
                    <span 
                      className="position-badge"
                      style={{ backgroundColor: getPositionColor(idx + 1) }}
                    >
                      {idx + 1}
                    </span>
                  </td>
                  <td className="name-col">
                    <span className="driver-name">{name}</span>
                  </td>
                  {type === 'driver' && (
                    <td className="team-col">
                      <span className="team-name">{item.team}</span>
                    </td>
                  )}
                  <td className="data-col mono">{formatLapTime(item.lap_times?.fastest)}</td>
                  <td className="data-col mono">{formatLapTime(item.lap_times?.optimal_lap_time)}</td>
                  <td className="data-col mono">{formatLapTime(item.lap_times?.best_5_avg)}</td>
                  <td className="data-col mono">{item.lap_times?.consistency_best_5?.toFixed(3) || '--'}</td>
                  <td className="data-col">
                    <span 
                      className="alpha-score"
                      style={{ color: getAlphaScoreColor(alphaScore) }}
                    >
                      {alphaScore.toFixed(3)}
                    </span>
                  </td>
                  <td className="data-col mono sector-1">{formatLapTime(item.s1_times?.fastest)}</td>
                  <td className="data-col mono sector-2">{formatLapTime(item.s2_times?.fastest)}</td>
                  <td className="data-col mono sector-3">{formatLapTime(item.s3_times?.fastest)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LeaderboardTable;
