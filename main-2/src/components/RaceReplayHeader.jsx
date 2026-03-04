import { useState } from 'react';
import './RaceReplayHeader.css';

/**
 * RaceReplayHeader Component
 * 
 * This is the feature-specific header for the Race Replay feature.
 * It is rendered INSIDE the Layout component's header, next to the hamburger menu.
 * 
 * The hamburger menu button is provided by the Layout component and is automatically
 * included for all features. This header only contains Race Replay-specific controls.
 */

// Generate distinct colors for drivers
const DRIVER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#E63946', '#A8DADC', '#457B9D', '#F1FAEE', '#E76F51',
  '#2A9D8F', '#E9C46A', '#F4A261', '#264653', '#8338EC',
  '#FF006E', '#FFBE0B'
];

function RaceReplayHeader({ 
  sessions, 
  selectedSession, 
  onSessionChange,
  manifest,
  selectedDrivers,
  followDriver,
  onDriverToggle,
  onFollowDriver,
  selectedLap,
  onLapChange,
  audioMuted,
  onAudioMuteToggle
}) {
  const [driversMenuOpen, setDriversMenuOpen] = useState(false);

  const getDriverColor = (driverNumber) => {
    if (!manifest) return '#FFFFFF';
    const index = manifest.drivers.findIndex(d => d.driver_number === driverNumber);
    return DRIVER_COLORS[index % DRIVER_COLORS.length];
  };

  const getMaxLaps = () => {
    if (!manifest) return 1;
    return Math.max(...manifest.drivers.map(d => d.total_laps));
  };

  const handleSelectAll = () => {
    if (!manifest) return;
    const allDrivers = manifest.drivers.map(d => d.driver_number);
    allDrivers.forEach(d => {
      if (!selectedDrivers.includes(d)) {
        onDriverToggle(d);
      }
    });
  };

  const handleDeselectAll = () => {
    selectedDrivers.forEach(d => onDriverToggle(d));
  };

  return (
    <div className="race-replay-header">
      <div className="race-replay-header-top">
        <div className="race-replay-title">
          <span className="race-replay-icon">🏎️</span>
          <h1>Race Replay</h1>
        </div>

        <div className="race-replay-header-controls">
        {/* Session Selector */}
        <div className="control-group">
          <label htmlFor="session-select">Session:</label>
          <select 
            id="session-select"
            value={selectedSession}
            onChange={(e) => onSessionChange(e.target.value)}
            className="session-select"
          >
            {sessions.map(session => (
              <option key={session} value={session}>
                {session.replace(/_/g, ' ').toUpperCase()}
              </option>
            ))}
          </select>
        </div>

        {/* Lap Selector */}
        {manifest && (
          <div className="control-group">
            <label htmlFor="lap-select">Start Lap:</label>
            <select 
              id="lap-select"
              value={selectedLap}
              onChange={(e) => onLapChange(Number(e.target.value))}
              className="lap-select"
            >
              {Array.from({ length: getMaxLaps() }, (_, i) => i + 1).map(lap => (
                <option key={lap} value={lap}>
                  Lap {lap}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Audio Mute Toggle */}
        <div className="control-group">
          <button 
            className={`audio-toggle-btn ${audioMuted ? 'muted' : ''}`}
            onClick={onAudioMuteToggle}
            title={audioMuted ? 'Unmute Commentary Audio' : 'Mute Commentary Audio'}
          >
            <span className="audio-icon">{audioMuted ? '🔇' : '🔊'}</span>
          </button>
        </div>

        {/* Drivers Selector */}
        {manifest && (
          <div className="control-group drivers-control">
            <button 
              className="drivers-toggle-btn"
              onClick={() => setDriversMenuOpen(!driversMenuOpen)}
            >
              Drivers ({selectedDrivers.length}/{manifest.total_drivers})
              <span className={`dropdown-arrow ${driversMenuOpen ? 'open' : ''}`}>▼</span>
            </button>

            {driversMenuOpen && (
              <>
                <div 
                  className="drivers-menu-overlay" 
                  onClick={() => setDriversMenuOpen(false)}
                />
                <div className="drivers-menu">
                  <div className="drivers-menu-header">
                    <h3>Select Drivers</h3>
                    <div className="drivers-menu-actions">
                      <button onClick={handleSelectAll} className="action-btn">
                        Select All
                      </button>
                      <button onClick={handleDeselectAll} className="action-btn">
                        Deselect All
                      </button>
                    </div>
                  </div>
                  <div className="drivers-list">
                    {manifest.drivers.map(driver => {
                      const isSelected = selectedDrivers.includes(driver.driver_number);
                      const isFollowed = followDriver === driver.driver_number;
                      const color = getDriverColor(driver.driver_number);

                      return (
                        <div key={driver.driver_number} className="driver-item">
                          <div className="driver-info">
                            <div 
                              className="driver-color-indicator"
                              style={{ backgroundColor: color }}
                            >
                              {driver.driver_number}
                            </div>
                            <span className="driver-name">
                              {driver.driver_name}
                            </span>
                            <span className="driver-laps">
                              ({driver.total_laps} laps)
                            </span>
                          </div>
                          <div className="driver-actions">
                            <label className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => onDriverToggle(driver.driver_number)}
                              />
                              <span>Show</span>
                            </label>
                            <label className={`checkbox-label ${!isSelected ? 'disabled' : ''}`}>
                              <input
                                type="radio"
                                name="follow-driver"
                                checked={isFollowed}
                                disabled={!isSelected}
                                onChange={() => onFollowDriver(driver.driver_number)}
                              />
                              <span>Follow</span>
                            </label>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );
}

export default RaceReplayHeader;
export { DRIVER_COLORS };
