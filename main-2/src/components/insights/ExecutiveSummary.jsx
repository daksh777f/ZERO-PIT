import './ExecutiveSummary.css';

const ClipboardIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
    <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
  </svg>
);

const FlagIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
  </svg>
);

const WrenchIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#ffd60a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);

const TrophyIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/>
    <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
  </svg>
);

const TargetIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);

const ChartBarIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const WarningIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#ffd60a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const TrendUpIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);

function ExecutiveSummary({ data }) {
  if (!data) return null;

  const {
    report_title,
    races_analyzed,
    total_drivers,
    technical_compliance_alerts,
    talent_development_insights,
    field_health
  } = data;

  return (
    <div className="insights-section executive-summary">
      <h2 className="insights-section-title">
        <span className="section-title-icon"><ClipboardIcon /></span>
        {report_title}
      </h2>

      <div className="summary-grid">
        {/* Race Info Card */}
        <div className="summary-card info-card">
          <div className="card-icon"><FlagIcon /></div>
          <div className="card-content">
            <h3>Races Analyzed</h3>
            <div className="card-value">{races_analyzed.join(' vs ')}</div>
            <div className="card-detail">{total_drivers} drivers</div>
          </div>
        </div>

        {/* Technical Compliance Card */}
        <div className="summary-card alert-card">
          <div className="card-icon"><WrenchIcon /></div>
          <div className="card-content">
            <h3>Technical Compliance</h3>
            <div className="card-metrics">
              <div className="metric">
                <span className="metric-value">{technical_compliance_alerts.sector_outlier_count}</span>
                <span className="metric-label">Sector Outliers</span>
              </div>
              <div className="metric">
                <span className="metric-value">{technical_compliance_alerts.persistent_outlier_count}</span>
                <span className="metric-label">Persistent</span>
              </div>
              <div className="metric">
                <span className="metric-value anomalous">{technical_compliance_alerts.anomalous_improvement_count}</span>
                <span className="metric-label">Anomalous Jumps</span>
              </div>
            </div>
          </div>
        </div>

        {/* Most Improved Driver Card */}
        <div className="summary-card talent-card">
          <div className="card-icon"><TrophyIcon /></div>
          <div className="card-content">
            <h3>Most Improved Driver</h3>
            <div className="driver-highlight">
              <div className="driver-number">#{talent_development_insights.most_improved_driver.driver}</div>
              <div className="driver-info">
                <div className="driver-name">{talent_development_insights.most_improved_driver.driver_name}</div>
                <div className="improvement-percent">
                  +{talent_development_insights.most_improved_driver.improvement_percent.toFixed(2)}% faster
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Most Consistent Driver Card */}
        <div className="summary-card consistency-card">
          <div className="card-icon"><TargetIcon /></div>
          <div className="card-content">
            <h3>Most Consistent Driver</h3>
            <div className="driver-highlight">
              <div className="driver-number">#{talent_development_insights.most_consistent_driver.driver}</div>
              <div className="driver-info">
                <div className="driver-name">{talent_development_insights.most_consistent_driver.driver_name}</div>
                <div className="consistency-value">
                  {talent_development_insights.most_consistent_driver.std_dev.toFixed(3)}s std dev
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Field Health Card */}
        <div className={`summary-card field-card ${field_health.competitive_balance.toLowerCase()}`}>
          <div className="card-icon"><ChartBarIcon /></div>
          <div className="card-content">
            <h3>Field Health</h3>
            <div className="field-status">
              <div className="status-badge">{field_health.competitive_balance}</div>
              <div className="field-metrics">
                <div className="field-metric">
                  <span className="field-label">Trend:</span>
                  <span className="field-value">{field_health.trend_magnitude.toFixed(3)}s</span>
                </div>
                <div className="field-metric">
                  <span className="field-label">Gap Change:</span>
                  <span className="field-value">{field_health.gap_change.toFixed(3)}s</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Key Insights Summary */}
      <div className="insights-summary-text">
        <h3 className="insights-section-subtitle">Key Findings</h3>
        <div className="findings-list">
          {technical_compliance_alerts.anomalous_improvement_count > 0 && (
            <div className="finding-item warning">
              <span className="finding-icon"><WarningIcon /></span>
              <span className="finding-text">
                {technical_compliance_alerts.anomalous_improvement_count} driver(s) showed anomalous race-to-race improvement (&gt;0.5s above field median)
              </span>
            </div>
          )}
          {technical_compliance_alerts.sector_outlier_count > 0 && (
            <div className="finding-item alert">
              <span className="finding-icon"><AlertIcon /></span>
              <span className="finding-text">
                {technical_compliance_alerts.sector_outlier_count} sector outlier(s) detected (&gt;2.5 SD from field mean)
              </span>
            </div>
          )}
          {technical_compliance_alerts.sector_outlier_count === 0 && technical_compliance_alerts.anomalous_improvement_count === 0 && (
            <div className="finding-item success">
              <span className="finding-icon"><CheckCircleIcon /></span>
              <span className="finding-text">
                No technical compliance issues detected
              </span>
            </div>
          )}
          <div className="finding-item info">
            <span className="finding-icon"><TrendUpIcon /></span>
            <span className="finding-text">
              Field is {field_health.competitive_balance.toLowerCase()} - {field_health.competitive_balance === 'CONVERGING' ? 'competition is tightening' : 'field is spreading out'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExecutiveSummary;
