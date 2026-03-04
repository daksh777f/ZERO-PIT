import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import './FieldDynamics.css';

const ChartBarIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const WarningIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#ffd60a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const RulerIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.3 15.3a2.4 2.4 0 010 3.4l-2.6 2.6a2.4 2.4 0 01-3.4 0L2.7 8.7a2.4 2.4 0 010-3.4l2.6-2.6a2.4 2.4 0 013.4 0z"/>
    <line x1="14.5" y1="12.5" x2="11.5" y2="15.5"/><line x1="11" y1="9" x2="8" y2="12"/>
    <line x1="7.5" y1="5.5" x2="4.5" y2="8.5"/>
  </svg>
);

const TargetIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#00d9ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
  </svg>
);

function FieldDynamics({ data }) {
  if (!data) return null;

  const {
    field_balance,
    race_comparisons
  } = data;

  // Prepare field balance data
  const fieldBalanceData = [
    {
      race: 'Race 1',
      p1: parseFloat(field_balance.race_1.p1_time.toFixed(3)),
      p5: parseFloat(field_balance.race_1.p5_time.toFixed(3)),
      p10: parseFloat(field_balance.race_1.p10_time.toFixed(3)),
      gap: parseFloat(field_balance.race_1.p1_to_p10_gap.toFixed(3)),
      stdDev: parseFloat(field_balance.race_1.field_std_dev.toFixed(3))
    },
    {
      race: 'Race 2',
      p1: parseFloat(field_balance.race_2.p1_time.toFixed(3)),
      p5: parseFloat(field_balance.race_2.p5_time.toFixed(3)),
      p10: parseFloat(field_balance.race_2.p10_time.toFixed(3)),
      gap: parseFloat(field_balance.race_2.p1_to_p10_gap.toFixed(3)),
      stdDev: parseFloat(field_balance.race_2.field_std_dev.toFixed(3))
    }
  ];

  // Field spread timeline
  const fieldSpreadData = [
    { race: 'Race 1', stdDev: parseFloat(field_balance.race_1.field_std_dev.toFixed(3)) },
    { race: 'Race 2', stdDev: parseFloat(field_balance.race_2.field_std_dev.toFixed(3)) }
  ];

  const comparison = race_comparisons[0];
  const isConverging = comparison.trend === 'converging';

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.race}</p>
          {data.p1 !== undefined && (
            <>
              <p className="tooltip-value">P1: {data.p1}s</p>
              <p className="tooltip-value">P5: {data.p5}s</p>
              <p className="tooltip-value">P10: {data.p10}s</p>
              <p className="tooltip-detail">Gap: {data.gap}s</p>
              <p className="tooltip-detail">Std Dev: {data.stdDev}s</p>
            </>
          )}
          {data.stdDev !== undefined && data.p1 === undefined && (
            <p className="tooltip-value">Std Dev: {data.stdDev}s</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="insights-section field-dynamics">
      <h2 className="insights-section-title">
        <span className="section-title-icon"><ChartBarIcon /></span>
        Field Dynamics & Competitive Balance
      </h2>

      {/* Summary Cards */}
      <div className="field-summary">
        <div className={`field-card ${isConverging ? 'converging' : 'diverging'}`}>
          <div className="field-card-icon">{isConverging ? <CheckCircleIcon /> : <WarningIcon />}</div>
          <div className="field-card-content">
            <h3>Field Trend</h3>
            <div className="field-card-value">{comparison.trend.toUpperCase()}</div>
            <div className="field-card-detail">
              {isConverging ? 'Competition is tightening' : 'Field is spreading out'}
            </div>
          </div>
        </div>

        <div className="field-card">
          <div className="field-card-icon"><RulerIcon /></div>
          <div className="field-card-content">
            <h3>Trend Magnitude</h3>
            <div className="field-card-value">{comparison.trend_magnitude.toFixed(3)}s</div>
            <div className="field-card-detail">Change in field std dev</div>
          </div>
        </div>

        <div className="field-card">
          <div className="field-card-icon"><TargetIcon /></div>
          <div className="field-card-content">
            <h3>P1-P10 Gap Change</h3>
            <div className="field-card-value">{comparison.gap_change.toFixed(3)}s</div>
            <div className="field-card-detail">
              {comparison.gap_change < 0 ? 'Gap narrowing' : 'Gap widening'}
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid - 2 Column Layout */}
      <div className="insights-grid-2col">
        {/* Gap Funnel Chart */}
        <div className="chart-container">
          <h3 className="chart-title">P1, P5, P10 Lap Times Comparison</h3>
          <p className="chart-description">
            Visual representation of field spread. Narrower funnel = tighter competition.
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <BarChart data={fieldBalanceData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="race" stroke="#888" tick={{ fill: '#888' }} />
              <YAxis 
                label={{ value: 'Lap Time (seconds)', angle: -90, position: 'insideLeft', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="p1" name="P1 (Fastest)" fill="#39ff14" radius={[8, 8, 0, 0]} />
              <Bar dataKey="p5" name="P5 (Midfield)" fill="#00d9ff" radius={[8, 8, 0, 0]} />
              <Bar dataKey="p10" name="P10" fill="#ffd60a" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Field Spread Timeline */}
        <div className="chart-container">
          <h3 className="chart-title">Field Spread Evolution</h3>
          <p className="chart-description">
            Standard deviation of lap times across races. Lower values indicate tighter competition.
          </p>
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={fieldSpreadData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis dataKey="race" stroke="#888" tick={{ fill: '#888' }} />
              <YAxis 
                label={{ value: 'Standard Deviation (seconds)', angle: -90, position: 'insideLeft', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
                domain={[0, 'dataMax + 0.2']}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="stdDev" 
                stroke="#e63946" 
                strokeWidth={3}
                dot={{ fill: '#e63946', r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Detailed Stats */}
      <div className="field-stats-grid">
        <div className="stats-card">
          <h4>Race 1 Statistics</h4>
          <div className="stats-list">
            <div className="stat-item">
              <span className="stat-label">P1 Time:</span>
              <span className="stat-value">{field_balance.race_1.p1_time.toFixed(3)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">P5 Time:</span>
              <span className="stat-value">{field_balance.race_1.p5_time.toFixed(3)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">P10 Time:</span>
              <span className="stat-value">{field_balance.race_1.p10_time.toFixed(3)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">P1-P10 Gap:</span>
              <span className="stat-value">{field_balance.race_1.p1_to_p10_gap.toFixed(3)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Field Std Dev:</span>
              <span className="stat-value">{field_balance.race_1.field_std_dev.toFixed(3)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Drivers:</span>
              <span className="stat-value">{field_balance.race_1.driver_count}</span>
            </div>
          </div>
        </div>

        <div className="stats-card">
          <h4>Race 2 Statistics</h4>
          <div className="stats-list">
            <div className="stat-item">
              <span className="stat-label">P1 Time:</span>
              <span className="stat-value">{field_balance.race_2.p1_time.toFixed(3)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">P5 Time:</span>
              <span className="stat-value">{field_balance.race_2.p5_time.toFixed(3)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">P10 Time:</span>
              <span className="stat-value">{field_balance.race_2.p10_time.toFixed(3)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">P1-P10 Gap:</span>
              <span className="stat-value">{field_balance.race_2.p1_to_p10_gap.toFixed(3)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Field Std Dev:</span>
              <span className="stat-value">{field_balance.race_2.field_std_dev.toFixed(3)}s</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Drivers:</span>
              <span className="stat-value">{field_balance.race_2.driver_count}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Analysis Summary */}
      <div className="field-analysis">
        <h3 className="insights-section-subtitle">Analysis</h3>
        <div className={`analysis-box ${isConverging ? 'positive' : 'warning'}`}>
          <div className="analysis-icon">{isConverging ? <CheckCircleIcon /> : <WarningIcon />}</div>
          <div className="analysis-content">
            <p className="analysis-title">
              {isConverging ? 'Healthy Competition Detected' : 'Field Parity Concern'}
            </p>
            <p className="analysis-text">
              {isConverging 
                ? `The field is converging with a ${Math.abs(comparison.trend_magnitude).toFixed(3)}s reduction in standard deviation. This indicates improving competitive balance and suggests that teams are finding similar performance levels. The P1-P10 gap has ${comparison.gap_change < 0 ? 'narrowed' : 'widened'} by ${Math.abs(comparison.gap_change).toFixed(3)}s, further supporting this trend.`
                : `The field is diverging with a ${Math.abs(comparison.trend_magnitude).toFixed(3)}s increase in standard deviation. This suggests growing performance gaps between teams. The P1-P10 gap has ${comparison.gap_change < 0 ? 'narrowed' : 'widened'} by ${Math.abs(comparison.gap_change).toFixed(3)}s. Series organizers may want to investigate potential technical advantages or disadvantages.`
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FieldDynamics;
