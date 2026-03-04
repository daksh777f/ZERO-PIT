import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, Cell, LineChart, Line } from 'recharts';
import './BattlePerformance.css';

const SwordsIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5"/>
    <line x1="13" y1="19" x2="19" y2="13"/><line x1="16" y1="16" x2="20" y2="20"/>
    <line x1="19" y1="21" x2="21" y2="19"/>
    <polyline points="14.5 6.5 18 3 21 3 21 6 17.5 9.5"/>
    <line x1="5" y1="14" x2="9" y2="18"/><line x1="7" y1="17" x2="4" y2="20"/>
    <line x1="3" y1="19" x2="5" y2="21"/>
  </svg>
);

function BattlePerformance({ data }) {
  if (!data) return null;

  const {
    battle_performance,
    position_analysis,
    visualization_data
  } = data;

  // Use pre-processed visualization data
  const trafficPenaltyComparison = visualization_data?.traffic_penalty_comparison || [];
  
  // Transform to chart format
  const trafficPenaltyData = trafficPenaltyComparison
    .map(d => ({
      driver: d.driver,
      driver_name: d.driver_name,
      team: d.team,
      race1: d.race_1_traffic_penalty,
      race2: d.race_2_traffic_penalty,
      cleanAir: d.clean_air_median,
      traffic: d.traffic_median
    }))
    .sort((a, b) => (a.race2 || 0) - (b.race2 || 0))
    .slice(0, 15);

  // Scatter plot: clean air pace vs traffic penalty
  const trafficScatterData = trafficPenaltyComparison
    .filter(d => d.race_2_traffic_penalty !== null && d.clean_air_median !== null)
    .map(d => ({
      cleanAir: d.clean_air_median,
      penalty: d.race_2_traffic_penalty,
      name: `#${d.driver} ${d.driver_name}`
    }));

  // Position change summary
  const positionChangeData = (position_analysis || [])
    .map(entry => {
      const race1 = entry.race === 'race_1' ? entry : position_analysis.find(e => e.driver === entry.driver && e.race === 'race_1');
      const race2 = entry.race === 'race_2' ? entry : position_analysis.find(e => e.driver === entry.driver && e.race === 'race_2');
      
      if (!race1 || !race2 || entry.race !== 'race_1') return null;
      
      return {
        driver: `#${entry.driver}`,
        name: entry.driver_name,
        race1Net: race1.net_change,
        race2Net: race2.net_change,
        total: race1.net_change + race2.net_change
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.total - a.total)
    .slice(0, 12);

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.name || `${data.driver} ${data.driver_name}`}</p>
          {data.race1 !== undefined && (
            <>
              <p className="tooltip-value">Race 1 Penalty: {data.race1?.toFixed(3) || 'N/A'}s</p>
              <p className="tooltip-value">Race 2 Penalty: {data.race2?.toFixed(3) || 'N/A'}s</p>
            </>
          )}
          {data.cleanAir !== undefined && (
            <>
              <p className="tooltip-value">Clean Air: {data.cleanAir}s</p>
              <p className="tooltip-value">Traffic Penalty: {data.penalty}s</p>
            </>
          )}
          {data.total !== undefined && (
            <>
              <p className="tooltip-value">Total: {data.total > 0 ? '+' : ''}{data.total}</p>
              <p className="tooltip-detail">Race 1: {data.race1Net > 0 ? '+' : ''}{data.race1Net}</p>
              <p className="tooltip-detail">Race 2: {data.race2Net > 0 ? '+' : ''}{data.race2Net}</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="insights-section battle-performance">
      <h2 className="insights-section-title">
        <span className="section-title-icon"><SwordsIcon /></span>
        Battle Performance Analysis
      </h2>

      {/* Charts Grid - 2 Column Layout */}
      <div className="insights-grid-2col">
        {/* Traffic Penalty Comparison */}
        <div className="chart-container">
          <h3 className="chart-title">Traffic Penalty by Driver (Top 15)</h3>
          <p className="chart-description">
            Lower penalty = better racecraft in traffic. Negative values mean faster in traffic than clean air.
          </p>
          {trafficPenaltyData.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
              No traffic penalty data available
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={trafficPenaltyData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="driver" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                stroke="#888"
                tick={{ fill: '#888', fontSize: 12 }}
                tickFormatter={(value) => `#${value}`}
              />
              <YAxis 
                label={{ value: 'Traffic Penalty (seconds)', angle: -90, position: 'insideLeft', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Bar dataKey="race1" name="Race 1" fill="#00d9ff" radius={[8, 8, 0, 0]} />
              <Bar dataKey="race2" name="Race 2" fill="#39ff14" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          )}
        </div>

        {/* Clean Air vs Traffic Penalty Scatter */}
        <div className="chart-container">
          <h3 className="chart-title">Clean Air Pace vs Traffic Penalty (Race 2)</h3>
          <p className="chart-description">
            Bottom-left quadrant = Fast in clean air with low traffic penalty (best racecraft).
          </p>
          {trafficScatterData.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#888' }}>
              No scatter plot data available
            </div>
          ) : (
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                type="number" 
                dataKey="cleanAir" 
                name="Clean Air Pace"
                label={{ value: 'Clean Air Median Lap (seconds)', position: 'bottom', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <YAxis 
                type="number" 
                dataKey="penalty" 
                name="Traffic Penalty"
                label={{ value: 'Traffic Penalty (seconds)', angle: -90, position: 'insideLeft', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Drivers" data={trafficScatterData} fill="#00d9ff" />
            </ScatterChart>
          </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Position Change Summary - Full Width */}
      <div className="chart-container">
        <h3 className="chart-title">Position Changes Summary (Top 12)</h3>
        <p className="chart-description">
          Net position changes across both races. Positive values = positions gained.
        </p>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={positionChangeData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="driver" stroke="#888" tick={{ fill: '#888' }} />
            <YAxis 
              label={{ value: 'Net Position Change', angle: -90, position: 'insideLeft', fill: '#888' }}
              stroke="#888"
              tick={{ fill: '#888' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Bar dataKey="race1Net" name="Race 1" fill="#00d9ff" radius={[8, 8, 0, 0]} />
            <Bar dataKey="race2Net" name="Race 2" fill="#39ff14" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Position Change Table */}
      <div className="position-table-container">
        <h3 className="insights-section-subtitle">Position Change Details</h3>
        <div className="position-table">
          <div className="table-header">
            <div className="table-cell">Driver</div>
            <div className="table-cell">Race 1</div>
            <div className="table-cell">Race 2</div>
            <div className="table-cell">Total</div>
          </div>
          {positionChangeData.map((entry, idx) => (
            <div key={idx} className="table-row">
              <div className="table-cell driver-cell">
                <span className="driver-number">{entry.driver}</span>
                <span className="driver-name">{entry.name}</span>
              </div>
              <div className={`table-cell ${entry.race1Net > 0 ? 'positive' : entry.race1Net < 0 ? 'negative' : ''}`}>
                {entry.race1Net > 0 ? '+' : ''}{entry.race1Net}
              </div>
              <div className={`table-cell ${entry.race2Net > 0 ? 'positive' : entry.race2Net < 0 ? 'negative' : ''}`}>
                {entry.race2Net > 0 ? '+' : ''}{entry.race2Net}
              </div>
              <div className={`table-cell total ${entry.total > 0 ? 'positive' : entry.total < 0 ? 'negative' : ''}`}>
                {entry.total > 0 ? '+' : ''}{entry.total}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BattlePerformance;
