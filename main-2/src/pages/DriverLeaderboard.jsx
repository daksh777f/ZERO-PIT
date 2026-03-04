import LeaderboardTable from '../components/LeaderboardTable';
import './PageStyles.css';

const DriverLeaderboard = ({ data }) => {
  if (!data || !data.driver_performance) {
    return <div className="error">No driver data available</div>;
  }

  const { driver_performance, session_summary } = data;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Driver Leaderboard</h1>
        <p className="page-description">
          Complete driver performance rankings and telemetry analysis
        </p>
      </div>

      {session_summary?.weather && (
        <div className="weather-card card">
          <div className="card-header">
            <h2 className="card-title">Session Conditions</h2>
          </div>
          <div className="weather-grid">
            <div className="weather-item">
              <div className="weather-label">Air Temp</div>
              <div className="weather-value">
                {session_summary.weather.average_air_temp?.toFixed(1)}°C
              </div>
            </div>
            <div className="weather-item">
              <div className="weather-label">Humidity</div>
              <div className="weather-value">
                {session_summary.weather.average_humidity?.toFixed(1)}%
              </div>
            </div>
            <div className="weather-item">
              <div className="weather-label">Conditions</div>
              <div className="weather-value">
                {session_summary.weather.was_rain_reported ? 'WET' : 'DRY'}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Performance Rankings</h2>
          <div className="stat-badge">
            {driver_performance.length} Drivers
          </div>
        </div>
        <LeaderboardTable data={driver_performance} type="driver" />
      </div>
    </div>
  );
};

export default DriverLeaderboard;
