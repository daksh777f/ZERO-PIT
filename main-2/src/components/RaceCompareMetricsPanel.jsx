import './RaceCompareMetricsPanel.css';

function RaceCompareMetricsPanel({ metrics }) {
  if (!metrics || metrics.length === 0) return null;

  return (
    <div className="metrics-panel">
      {metrics.map((metric, index) => (
        <div key={index} className="metric-card">
          <div className="metric-label">{metric.label}</div>
          <div className="metric-value" style={{ color: metric.color || 'var(--text-primary)' }}>
            {metric.value}
          </div>
          {metric.subtitle && (
            <div className="metric-subtitle">{metric.subtitle}</div>
          )}
        </div>
      ))}
    </div>
  );
}

export default RaceCompareMetricsPanel;
