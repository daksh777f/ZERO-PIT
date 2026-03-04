import './RaceCompareEmptyState.css';

const IconUser = () => (
  <svg className="empty-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="8" r="5" />
    <path d="M3 21v-1a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v1" />
  </svg>
);

const IconUsers = () => (
  <svg className="empty-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="7" r="4" />
    <path d="M2 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
    <circle cx="17" cy="7" r="3" />
    <path d="M21 21v-1a4 4 0 0 0-3-3.87" />
  </svg>
);

const IconChart = () => (
  <svg className="empty-svg-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 3v18h18" />
    <path d="M7 16l4-8 4 4 5-10" />
  </svg>
);

function RaceCompareEmptyState({ driver1, driver2, mode }) {
  const getModeRequirements = () => {
    switch (mode) {
      case 'performance':
      case 'battle':
        return 'Select two drivers to compare performance and battle dynamics.';
      case 'flow':
        return 'Select at least one driver to view race flow analysis.';
      case 'consistency':
        return 'Select a driver to analyze consistency and performance distribution.';
      default:
        return 'Select drivers to begin analysis.';
    }
  };

  const getIcon = () => {
    if (!driver1) return <IconUser />;
    if (!driver2 && (mode === 'performance' || mode === 'battle')) return <IconUsers />;
    return <IconChart />;
  };

  return (
    <div className="race-compare-empty-state">
      <div className="empty-state-icon">{getIcon()}</div>
      <h2 className="empty-state-title">No Drivers Selected</h2>
      <p className="empty-state-message">{getModeRequirements()}</p>
      <div className="empty-state-steps">
        <div className="empty-step">
          <span className="step-number">1</span>
          <span className="step-text">Select your driver from the "You" dropdown</span>
        </div>
        {(mode === 'performance' || mode === 'battle') && (
          <div className="empty-step">
            <span className="step-number">2</span>
            <span className="step-text">Select a comparison driver from the "Compare" dropdown</span>
          </div>
        )}
        <div className="empty-step">
          <span className="step-number">{(mode === 'performance' || mode === 'battle') ? '3' : '2'}</span>
          <span className="step-text">Choose an analysis mode to view insights</span>
        </div>
      </div>
    </div>
  );
}

export default RaceCompareEmptyState;
