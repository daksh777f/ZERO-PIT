import { useState } from 'react';
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, ResponsiveContainer } from 'recharts';
import { calculateZScores } from '../utils/dataUtils';
import './PageStyles.css';

const TeamComparison = ({ data }) => {
  const [selectedTeams, setSelectedTeams] = useState([]);

  if (!data || !data.team_performance) {
    return <div className="error">No team data available</div>;
  }

  const { team_performance } = data;

  const toggleTeam = (teamName) => {
    setSelectedTeams(prev => {
      if (prev.includes(teamName)) {
        return prev.filter(t => t !== teamName);
      }
      if (prev.length >= 6) {
        return prev;
      }
      return [...prev, teamName];
    });
  };

  const getRadarData = () => {
    if (selectedTeams.length === 0) return [];

    const metrics = [
      { key: 'fastest_lap', label: 'Fastest Lap', invert: true },
      { key: 'optimal_lap', label: 'Optimal Lap', invert: true },
      { key: 'consistency', label: 'Consistency', invert: true },
      { key: 's1_fastest', label: 'Sector 1', invert: true },
      { key: 's2_fastest', label: 'Sector 2', invert: true },
      { key: 's3_fastest', label: 'Sector 3', invert: true },
    ];

    const selectedData = team_performance.filter(t => 
      selectedTeams.includes(t.team_name)
    );

    const radarData = metrics.map(metric => {
      const values = team_performance.map(t => {
        if (metric.key === 'fastest_lap') return t.lap_times?.fastest || 999;
        if (metric.key === 'optimal_lap') return t.lap_times?.optimal_lap_time || 999;
        if (metric.key === 'consistency') return t.lap_times?.consistency_best_5 || 999;
        if (metric.key === 's1_fastest') return t.s1_times?.fastest || 999;
        if (metric.key === 's2_fastest') return t.s2_times?.fastest || 999;
        if (metric.key === 's3_fastest') return t.s3_times?.fastest || 999;
        return 0;
      });

      const zScores = calculateZScores(values);
      
      const dataPoint = { metric: metric.label };
      
      selectedData.forEach((team) => {
        const teamIdx = team_performance.findIndex(t => t.team_name === team.team_name);
        let score = zScores[teamIdx];
        
        if (metric.invert) score = -score;
        dataPoint[team.team_name] = ((score + 3) / 6) * 100;
      });

      return dataPoint;
    });

    return radarData;
  };

  const teamColors = [
    '#e63946',
    '#00d9ff',
    '#06ffa5',
    '#9d4edd',
    '#ffd60a',
    '#ff006e',
  ];

  const radarData = getRadarData();

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Team Comparison</h1>
        <p className="page-description">
          Multi-dimensional team performance analysis using normalized z-scores
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Select Teams</h2>
          <div className="stat-badge">
            {selectedTeams.length} / 6 Selected
          </div>
        </div>
        <div className="driver-selector">
          {team_performance.map(team => (
            <button
              key={team.team_name}
              className={`driver-chip ${selectedTeams.includes(team.team_name) ? 'selected' : ''}`}
              onClick={() => toggleTeam(team.team_name)}
              disabled={!selectedTeams.includes(team.team_name) && selectedTeams.length >= 6}
            >
              {team.team_name}
            </button>
          ))}
        </div>
      </div>

      {selectedTeams.length > 0 && (
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
                {selectedTeams.map((team, idx) => (
                  <Radar
                    key={team}
                    name={team}
                    dataKey={team}
                    stroke={teamColors[idx]}
                    fill={teamColors[idx]}
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

export default TeamComparison;
