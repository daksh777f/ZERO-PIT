import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Target, Activity, Orbit, Sparkles, Calendar } from 'lucide-react';
import './Layout.css';

function Layout({ children, featureHeader, noScroll = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const features = [
    { path: '/sro-alpha', label: 'SRO Alpha', icon: <Target className="menu-icon-glitch" /> },
    { path: '/race-replay', label: 'Race Replay', icon: <Orbit className="menu-icon-glitch" /> },
    { path: '/race-compare', label: 'Race Compare', icon: <Activity className="menu-icon-glitch" /> },
    { path: '/weekend-insights', label: 'Weekend Insights', icon: <Sparkles className="menu-icon-glitch" /> },
    { path: '/schedule', label: 'Schedule', icon: <Calendar className="menu-icon-glitch" /> },
    // Add more features here as they're developed
  ];

  const handleFeatureClick = (path) => {
    navigate(path);
    setMenuOpen(false);
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const isFeatureActive = (path) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="layout">
      {/* Hamburger Menu Overlay */}
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)} />
      )}

      {/* Sidebar Menu */}
      <aside className={`sidebar ${menuOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <h2 className="sidebar-title">Features</h2>
          <button
            className="close-menu-btn"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="sidebar-nav">
          {features.map(feature => (
            <button
              key={feature.path}
              className={`sidebar-item ${isFeatureActive(feature.path) ? 'active' : ''}`}
              onClick={() => handleFeatureClick(feature.path)}
            >
              <span className="sidebar-icon">{feature.icon}</span>
              <span className="sidebar-label">{feature.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-version">v1.0.0</div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="layout-main">
        {/* Feature-specific Header - Contains hamburger menu + feature header */}
        <header className="layout-header">
          {/* Hamburger Menu Button - Always visible, controls sidebar */}
          <button
            className="hamburger-btn"
            onClick={toggleMenu}
            aria-label="Toggle menu"
            title="Open navigation menu"
          >
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
            <span className="hamburger-line"></span>
          </button>

          {/* Feature-specific header content (e.g., SROAlphaHeader, RaceReplayHeader) */}
          {featureHeader}
        </header>

        {/* Page Content */}
        <main className={`layout-content ${noScroll ? 'no-scroll' : ''}`}>
          {children}
        </main>
      </div>
    </div>
  );
}

export default Layout;
