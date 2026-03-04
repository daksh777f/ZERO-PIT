import { useNavigate, useLocation } from 'react-router-dom';
import './SROAlphaHeader.css';

/**
 * SROAlphaHeader Component
 * 
 * This is the feature-specific header for the SRO Alpha feature.
 * It is rendered INSIDE the Layout component's header, next to the hamburger menu.
 * 
 * The hamburger menu button is provided by the Layout component and is automatically
 * included for all features. This header only contains SRO Alpha-specific controls.
 */

function SROAlphaHeader({ selectedSession, onSessionChange }) {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { path: '/sro-alpha/drivers', label: 'Driver Leaderboard' },
    { path: '/sro-alpha/teams', label: 'Team Leaderboard' },
    { path: '/sro-alpha/driver-comparison', label: 'Driver Comparison' },
    { path: '/sro-alpha/team-comparison', label: 'Team Comparison' },
    { path: '/sro-alpha/driver-profile', label: 'Driver Profile' },
    { path: '/sro-alpha/weekend', label: 'Weekend Summary' },
    { path: '/sro-alpha/head-to-head', label: 'Head to Head' },
    { path: '/sro-alpha/lap-by-lap', label: 'Lap-by-Lap' },
  ];

  return (
    <div className="sro-header">
      <div className="sro-header-top">
        <div className="sro-header-title">
          <h1 className="header-glitch-title" data-text="ZERO PIT">ZERO PIT</h1>
          <div className="sro-header-subtitle">━━━ RACE PERFORMANCE ANALYSIS SYSTEM ━━━</div>
        </div>

        <div className="session-selector">
          <label htmlFor="session">Session:</label>
          <select
            id="session"
            value={selectedSession}
            onChange={onSessionChange}
          >
            <option value="practice_1">Practice 1</option>
            <option value="practice_2">Practice 2</option>
            <option value="qualifying">Qualifying</option>
            <option value="qualifying_2">Qualifying 2</option>
            <option value="race_1">Race 1</option>
            <option value="race_2">Race 2</option>
          </select>
        </div>
      </div>

      <nav className="sro-nav">
        {navItems.map(item => (
          <button
            key={item.path}
            className={`sro-nav-link ${location.pathname === item.path ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default SROAlphaHeader;
