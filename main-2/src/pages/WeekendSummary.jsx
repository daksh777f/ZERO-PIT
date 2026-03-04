import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { formatLapTime } from '../utils/dataUtils';
import './PageStyles.css';

const WeekendSummary = ({ data }) => {
  if (!data) {
    return <div className="error">No weekend data available</div>;
  }

  const { weekend_champions, weekend_alpha_performance, performance_progression } = data;

  // Prepare progression data for top 5 drivers
  const top5Drivers = weekend_alpha_performance.slice(0, 5);
  const sessions = ['practice_1', 'practice_2', 'qualifying', 'qualifying_2', 'race_1', 'race_2'];
  const sessionLabels = ['P1', 'P2', 'Q1', 'Q2', 'R1', 'R2'];

  const progressionData = sessions.map((session, idx) => {
    const dataPoint = { session: sessionLabels[idx] };
    
    top5Drivers.forEach(driver => {
      const driverData = performance_progression.drivers.find(d => d.driver_name === driver.driver_name);
      if (driverData && driverData.sessions[session]) {
        dataPoint[driver.driver_name] = driverData.sessions[session].fastest_lap;
      }
    });
    
    return dataPoint;
  });

  const alphaScoreData = weekend_alpha_performance.slice(0, 10).map(driver => ({
    name: driver.driver_name.split(' ').pop(), // Last name only for space
    score: driver.weekend_alpha_score,
    avgRank: driver.avg_rank,
  }));

  const driverColors = ['#e63946', '#00d9ff', '#06ffa5', '#9d4edd', '#ffd60a'];

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Weekend Summary</h1>
        <p className="page-description">
          {data.event_name}
        </p>
      </div>

      <div className="champions-grid">
        <div className="champion-card card">
          <div className="champion-label">Ultimate Fastest Lap</div>
          <div className="champion-value">{formatLapTime(weekend_champions.ultimate_fastest_lap.value)}</div>
          <div className="champion-driver">{weekend_champions.ultimate_fastest_lap.driver}</div>
          <div className="champion-session">{weekend_champions.ultimate_fastest_lap.session.replace('_', ' ').toUpperCase()}</div>
        </div>

        <div className="champion-card card">
          <div className="champion-label">Top Alpha Score</div>
          <div className="champion-value">{weekend_champions.top_alpha_score.value.toFixed(3)}</div>
          <div className="champion-driver">{weekend_champions.top_alpha_score.driver}</div>
          <div className="champion-session">{weekend_champions.top_alpha_score.session.replace('_', ' ').toUpperCase()}</div>
        </div>

        <div className="champion-card card">
          <div className="champion-label">Best Sector 1</div>
          <div className="champion-value">{formatLapTime(weekend_champions.best_s1.value)}</div>
          <div className="champion-driver">{weekend_champions.best_s1.driver}</div>
          <div className="champion-session">{weekend_champions.best_s1.session.replace('_', ' ').toUpperCase()}</div>
        </div>

        <div className="champion-card card">
          <div className="champion-label">Best Sector 2</div>
          <div className="champion-value">{formatLapTime(weekend_champions.best_s2.value)}</div>
          <div className="champion-driver">{weekend_champions.best_s2.driver}</div>
          <div className="champion-session">{weekend_champions.best_s2.session.replace('_', ' ').toUpperCase()}</div>
        </div>

        <div className="champion-card card">
          <div className="champion-label">Best Sector 3</div>
          <div className="champion-value">{formatLapTime(weekend_champions.best_s3.value)}</div>
          <div className="champion-driver">{weekend_champions.best_s3.driver}</div>
          <div className="champion-session">{weekend_champions.best_s3.session.replace('_', ' ').toUpperCase()}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Weekend Alpha Performance</h2>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={alphaScoreData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#b0b0b0', fontSize: 12, fontFamily: 'Rajdhani' }}
              />
              <YAxis 
                tick={{ fill: '#b0b0b0', fontSize: 12 }}
                label={{ value: 'Alpha Score', angle: -90, position: 'insideLeft', fill: '#b0b0b0' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a1a', 
                  border: '1px solid #333333',
                  borderRadius: '4px',
                  fontFamily: 'Rajdhani'
                }}
              />
              <Bar dataKey="score" fill="#e63946" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Lap Time Progression - Top 5 Drivers</h2>
        </div>
        <div className="chart-container">
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={progressionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#333333" />
              <XAxis 
                dataKey="session" 
                tick={{ fill: '#b0b0b0', fontSize: 12, fontFamily: 'Rajdhani' }}
              />
              <YAxis 
                domain={['dataMin - 1', 'dataMax + 1']}
                tick={{ fill: '#b0b0b0', fontSize: 12 }}
                label={{ value: 'Lap Time (s)', angle: -90, position: 'insideLeft', fill: '#b0b0b0' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1a1a1a', 
                  border: '1px solid #333333',
                  borderRadius: '4px',
                  fontFamily: 'Rajdhani'
                }}
                formatter={(value) => formatLapTime(value)}
              />
              <Legend 
                wrapperStyle={{ 
                  fontFamily: 'Orbitron',
                  fontSize: '12px',
                  paddingTop: '10px'
                }}
              />
              {top5Drivers.map((driver, idx) => (
                <Line
                  key={driver.driver_name}
                  type="monotone"
                  dataKey={driver.driver_name}
                  stroke={driverColors[idx]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Weekend Alpha Rankings</h2>
        </div>
        <div className="weekend-rankings">
          {weekend_alpha_performance.map((driver, idx) => (
            <div key={driver.driver_name} className="ranking-row">
              <div className="ranking-pos">{idx + 1}</div>
              <div className="ranking-name">{driver.driver_name}</div>
              <div className="ranking-stats">
                <span className="ranking-stat">
                  <span className="stat-label">Alpha:</span>
                  <span className="stat-value">{driver.weekend_alpha_score.toFixed(3)}</span>
                </span>
                <span className="ranking-stat">
                  <span className="stat-label">Avg Rank:</span>
                  <span className="stat-value">{driver.avg_rank.toFixed(1)}</span>
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WeekendSummary;
