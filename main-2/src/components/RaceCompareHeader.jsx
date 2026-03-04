import { useState } from 'react';
import './RaceCompareHeader.css';

const IconPerformance = () => (
  <svg className="mode-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="12" width="4" height="9" rx="1" />
    <rect x="10" y="6" width="4" height="15" rx="1" />
    <rect x="17" y="2" width="4" height="19" rx="1" />
  </svg>
);

const IconBattle = () => (
  <svg className="mode-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 20L20 4" />
    <path d="M15 4h5v5" />
    <path d="M20 20L4 4" />
    <path d="M9 4H4v5" />
  </svg>
);

const IconFlow = () => (
  <svg className="mode-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 12c2-4 6-4 8 0s6 4 8 0" />
    <path d="M2 18c2-4 6-4 8 0s6 4 8 0" />
    <path d="M2 6c2-4 6-4 8 0s6 4 8 0" />
  </svg>
);

const IconConsistency = () => (
  <svg className="mode-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const IconCompare = () => (
  <svg className="header-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-8 4 4 5-10" />
  </svg>
);

const MODE_OPTIONS = [
  { id: 'performance', label: 'Performance', icon: IconPerformance, requiresTwo: true },
  { id: 'battle', label: 'Battle', icon: IconBattle, requiresTwo: true },
  { id: 'flow', label: 'Race Flow', icon: IconFlow, requiresTwo: false },
  { id: 'consistency', label: 'Consistency', icon: IconConsistency, requiresTwo: false }
];

function RaceCompareHeader({
  sessions,
  selectedSession,
  onSessionChange,
  manifest,
  driver1,
  driver2,
  onDriver1Change,
  onDriver2Change,
  mode,
  onModeChange
}) {
  const [driver1MenuOpen, setDriver1MenuOpen] = useState(false);
  const [driver2MenuOpen, setDriver2MenuOpen] = useState(false);

  const getDriverName = (driverNumber) => {
    if (!manifest || !driverNumber) return 'Select Driver';
    const driver = manifest.drivers.find(d => d.driver_number === driverNumber);
    return driver ? `#${driver.driver_number} ${driver.driver_name}` : 'Select Driver';
  };

  const handleDriverSelect = (driverNumber, isDriver1) => {
    if (isDriver1) {
      onDriver1Change(driverNumber);
      setDriver1MenuOpen(false);
    } else {
      onDriver2Change(driverNumber);
      setDriver2MenuOpen(false);
    }
  };

  return (
    <div className="race-compare-header">
      <div className="race-compare-header-top">
        <div className="race-compare-title">
          <span className="race-compare-icon"><IconCompare /></span>
          <h1>Race Compare</h1>
        </div>

        <div className="race-compare-controls">
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

          {/* Driver 1 Selector */}
          <div className="control-group driver-control">
            <label>You:</label>
            <button
              className="driver-select-btn"
              onClick={() => setDriver1MenuOpen(!driver1MenuOpen)}
            >
              {getDriverName(driver1)}
              <span className={`dropdown-arrow ${driver1MenuOpen ? 'open' : ''}`}>▼</span>
            </button>

            {driver1MenuOpen && (
              <>
                <div
                  className="driver-menu-overlay"
                  onClick={() => setDriver1MenuOpen(false)}
                />
                <div className="driver-menu">
                  <div className="driver-menu-header">
                    <h3>Select Your Driver</h3>
                  </div>
                  <div className="driver-list">
                    {manifest?.drivers.map(driver => (
                      <button
                        key={driver.driver_number}
                        className={`driver-item ${driver1 === driver.driver_number ? 'selected' : ''}`}
                        onClick={() => handleDriverSelect(driver.driver_number, true)}
                      >
                        <span className="driver-number">#{driver.driver_number}</span>
                        <span className="driver-name">{driver.driver_name}</span>
                        <span className="driver-laps">({driver.total_laps} laps)</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Driver 2 Selector */}
          <div className="control-group driver-control">
            <label>Compare:</label>
            <button
              className="driver-select-btn"
              onClick={() => setDriver2MenuOpen(!driver2MenuOpen)}
            >
              {getDriverName(driver2)}
              <span className={`dropdown-arrow ${driver2MenuOpen ? 'open' : ''}`}>▼</span>
            </button>

            {driver2MenuOpen && (
              <>
                <div
                  className="driver-menu-overlay"
                  onClick={() => setDriver2MenuOpen(false)}
                />
                <div className="driver-menu">
                  <div className="driver-menu-header">
                    <h3>Select Comparison Driver</h3>
                    <button
                      className="clear-btn"
                      onClick={() => {
                        onDriver2Change(null);
                        setDriver2MenuOpen(false);
                      }}
                    >
                      Clear
                    </button>
                  </div>
                  <div className="driver-list">
                    {manifest?.drivers
                      .filter(d => d.driver_number !== driver1)
                      .map(driver => (
                        <button
                          key={driver.driver_number}
                          className={`driver-item ${driver2 === driver.driver_number ? 'selected' : ''}`}
                          onClick={() => handleDriverSelect(driver.driver_number, false)}
                        >
                          <span className="driver-number">#{driver.driver_number}</span>
                          <span className="driver-name">{driver.driver_name}</span>
                          <span className="driver-laps">({driver.total_laps} laps)</span>
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="race-compare-modes">
        {MODE_OPTIONS.map(modeOption => {
          const isDisabled = modeOption.requiresTwo && (!driver1 || !driver2);
          const ModeIcon = modeOption.icon;
          return (
            <button
              key={modeOption.id}
              className={`mode-btn ${mode === modeOption.id ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`}
              onClick={() => !isDisabled && onModeChange(modeOption.id)}
              disabled={isDisabled}
              title={isDisabled ? 'Requires two drivers' : modeOption.label}
            >
              <span className="mode-icon"><ModeIcon /></span>
              <span className="mode-label">{modeOption.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RaceCompareHeader;
