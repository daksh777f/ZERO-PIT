import { useState } from 'react';
import { AreaChart } from 'lucide-react';
import './PageStyles.css';
import './DriverProfile.css';

const DriverProfile = ({ data }) => {
  const [selectedDriver, setSelectedDriver] = useState(null);

  if (!data || !data.driver_performance) {
    return <div className="error">No driver data available</div>;
  }

  const { driver_performance, session_summary } = data;

  // Sort drivers alphabetically for selection
  const sortedDrivers = [...driver_performance].sort((a, b) =>
    a.driver_name.localeCompare(b.driver_name)
  );

  const handleDriverSelect = (driver) => {
    setSelectedDriver(driver);
  };

  const renderDataTable = (driver) => {
    const isRaceSession = driver.pace_profile &&
      (driver.pace_profile.p1_laps > 0 ||
        driver.pace_profile.top_3_laps > 0 ||
        driver.pace_profile.top_5_laps > 0 ||
        driver.pace_profile.top_10_laps > 0);

    return (
      <div className="profile-data-container">
        {/* General Information */}
        <div className="data-section">
          <h3 className="section-title">General Information</h3>
          <table className="profile-table">
            <tbody>
              <tr>
                <td className="label-cell">Driver Name</td>
                <td className="value-cell">{driver.driver_name}</td>
              </tr>
              <tr>
                <td className="label-cell">Team</td>
                <td className="value-cell">{driver.team}</td>
              </tr>
              <tr>
                <td className="label-cell">Total Valid Laps</td>
                <td className="value-cell mono">{driver.total_valid_laps}</td>
              </tr>
              <tr>
                <td className="label-cell">Alpha Score</td>
                <td className="value-cell">
                  <span className="alpha-value" style={{
                    color: driver.alpha_score > 0.5 ? '#06ffa5' :
                      driver.alpha_score > 0 ? '#00d9ff' :
                        driver.alpha_score > -0.5 ? '#ffa500' : '#e63946'
                  }}>
                    {driver.alpha_score?.toFixed(3) || '--'}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Lap Times */}
        <div className="data-section">
          <h3 className="section-title">Lap Times</h3>
          <table className="profile-table">
            <tbody>
              <tr>
                <td className="label-cell">Fastest Lap</td>
                <td className="value-cell mono highlight">{driver.lap_times?.fastest?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Optimal Lap Time</td>
                <td className="value-cell mono highlight">{driver.lap_times?.optimal_lap_time?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Delta to Optimal</td>
                <td className="value-cell mono">{driver.lap_times?.fastest_delta?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Best 3 Average</td>
                <td className="value-cell mono">{driver.lap_times?.best_3_avg?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Best 5 Average</td>
                <td className="value-cell mono">{driver.lap_times?.best_5_avg?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Consistency (Best 5)</td>
                <td className="value-cell mono">{driver.lap_times?.consistency_best_5?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Lap Count</td>
                <td className="value-cell mono">{driver.lap_times?.lap_count || '--'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sector 1 Times */}
        <div className="data-section">
          <h3 className="section-title sector-1-title">Sector 1 Times</h3>
          <table className="profile-table">
            <tbody>
              <tr>
                <td className="label-cell">Fastest S1</td>
                <td className="value-cell mono sector-1">{driver.s1_times?.fastest?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Best 3 Average</td>
                <td className="value-cell mono sector-1">{driver.s1_times?.best_3_avg?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Best 5 Average</td>
                <td className="value-cell mono sector-1">{driver.s1_times?.best_5_avg?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Consistency (Best 5)</td>
                <td className="value-cell mono sector-1">{driver.s1_times?.consistency_best_5?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Lap Count</td>
                <td className="value-cell mono sector-1">{driver.s1_times?.lap_count || '--'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sector 2 Times */}
        <div className="data-section">
          <h3 className="section-title sector-2-title">Sector 2 Times</h3>
          <table className="profile-table">
            <tbody>
              <tr>
                <td className="label-cell">Fastest S2</td>
                <td className="value-cell mono sector-2">{driver.s2_times?.fastest?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Best 3 Average</td>
                <td className="value-cell mono sector-2">{driver.s2_times?.best_3_avg?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Best 5 Average</td>
                <td className="value-cell mono sector-2">{driver.s2_times?.best_5_avg?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Consistency (Best 5)</td>
                <td className="value-cell mono sector-2">{driver.s2_times?.consistency_best_5?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Lap Count</td>
                <td className="value-cell mono sector-2">{driver.s2_times?.lap_count || '--'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Sector 3 Times */}
        <div className="data-section">
          <h3 className="section-title sector-3-title">Sector 3 Times</h3>
          <table className="profile-table">
            <tbody>
              <tr>
                <td className="label-cell">Fastest S3</td>
                <td className="value-cell mono sector-3">{driver.s3_times?.fastest?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Best 3 Average</td>
                <td className="value-cell mono sector-3">{driver.s3_times?.best_3_avg?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Best 5 Average</td>
                <td className="value-cell mono sector-3">{driver.s3_times?.best_5_avg?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Consistency (Best 5)</td>
                <td className="value-cell mono sector-3">{driver.s3_times?.consistency_best_5?.toFixed(3) || '--'}</td>
              </tr>
              <tr>
                <td className="label-cell">Lap Count</td>
                <td className="value-cell mono sector-3">{driver.s3_times?.lap_count || '--'}</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Pace Profile (only for race sessions) */}
        {isRaceSession && (
          <div className="data-section">
            <h3 className="section-title">Pace Profile (Race Sessions)</h3>
            <table className="profile-table">
              <tbody>
                <tr>
                  <td className="label-cell">P1 Laps</td>
                  <td className="value-cell mono pace-p1">{driver.pace_profile?.p1_laps || 0}</td>
                </tr>
                <tr>
                  <td className="label-cell">Top 3 Laps</td>
                  <td className="value-cell mono pace-top3">{driver.pace_profile?.top_3_laps || 0}</td>
                </tr>
                <tr>
                  <td className="label-cell">Top 5 Laps</td>
                  <td className="value-cell mono pace-top5">{driver.pace_profile?.top_5_laps || 0}</td>
                </tr>
                <tr>
                  <td className="label-cell">Top 10 Laps</td>
                  <td className="value-cell mono pace-top10">{driver.pace_profile?.top_10_laps || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Driver Profile</h1>
        <p className="page-description">
          Comprehensive performance data for individual drivers
        </p>
      </div>

      {/* Session Weather Info */}
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

      {/* Driver Selection */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Select Driver</h2>
          <div className="stat-badge">
            {driver_performance.length} Drivers
          </div>
        </div>
        <div className="driver-selector">
          {sortedDrivers.map((driver) => (
            <button
              key={driver.driver_name}
              className={`driver-chip ${selectedDriver?.driver_name === driver.driver_name ? 'selected' : ''}`}
              onClick={() => handleDriverSelect(driver)}
            >
              {driver.driver_name}
            </button>
          ))}
        </div>
      </div>

      {/* Driver Profile Data */}
      {selectedDriver && (
        <div className="card profile-card">
          <div className="card-header">
            <div>
              <h2 className="card-title">{selectedDriver.driver_name}</h2>
              <p className="driver-team">{selectedDriver.team}</p>
            </div>
            <div className="alpha-badge">
              Alpha Score: <span style={{
                color: selectedDriver.alpha_score > 0.5 ? '#06ffa5' :
                  selectedDriver.alpha_score > 0 ? '#00d9ff' :
                    selectedDriver.alpha_score > -0.5 ? '#ffa500' : '#e63946'
              }}>
                {selectedDriver.alpha_score?.toFixed(3) || '--'}
              </span>
            </div>
          </div>
          {renderDataTable(selectedDriver)}
        </div>
      )}

      {!selectedDriver && (
        <div className="card empty-state">
          <div className="empty-state-content">
            <div className="empty-state-icon"><AreaChart className="empty-state-icon-svg" size={64} /></div>
            <h3 className="empty-state-title">No Driver Selected</h3>
            <p className="empty-state-text">
              Select a driver from the list above to view their complete performance profile
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverProfile;
