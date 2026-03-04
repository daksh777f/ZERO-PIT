import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Cell, LineChart, Line } from 'recharts';
import './TalentDevelopment.css';

const TrophyIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 9H4.5a2.5 2.5 0 010-5H6"/><path d="M18 9h1.5a2.5 2.5 0 000-5H18"/>
    <path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20 17 22"/>
    <path d="M18 2H6v7a6 6 0 0012 0V2z"/>
  </svg>
);

const BlueDot = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="#00d9ff" stroke="none">
    <circle cx="12" cy="12" r="8"/>
  </svg>
);

const RedDot = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="#e63946" stroke="none">
    <circle cx="12" cy="12" r="8"/>
  </svg>
);

const MomentumUpIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/>
  </svg>
);

const MomentumDownIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#e63946" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6"/><polyline points="17 18 23 18 23 12"/>
  </svg>
);

const ScalesIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="3" x2="12" y2="21"/><line x1="1" y1="12" x2="23" y2="12"/>
    <path d="M16 3l4 9h-8z"/><path d="M4 3l4 9H0z"/>
  </svg>
);

function TalentDevelopment({ data }) {
  if (!data) return null;

  const {
    teammate_pairs,
    consistency_rankings,
    improvement_rankings
  } = data;

  // Prepare improvement rankings data (horizontal bar chart)
  const improvementData = improvement_rankings
    .slice(0, 15) // Top 15
    .map(driver => ({
      name: `#${driver.driver} ${driver.driver_name}`,
      shortName: `#${driver.driver}`,
      improvementPercent: parseFloat(driver.improvement_percent.toFixed(2)),
      improvementSeconds: parseFloat(driver.improvement_seconds.toFixed(3)),
      race1: parseFloat(driver.race_1_median.toFixed(3)),
      race2: parseFloat(driver.race_2_median.toFixed(3))
    }));

  // Prepare consistency quadrant data
  const consistencyData = consistency_rankings.map(driver => ({
    name: `#${driver.driver} ${driver.driver_name}`,
    shortName: `#${driver.driver}`,
    speed: parseFloat(driver.race_2_median.toFixed(3)),
    consistency: parseFloat(driver.race_2_std_dev.toFixed(3)),
    race1StdDev: parseFloat(driver.race_1_std_dev.toFixed(3)),
    improvement: parseFloat(driver.improvement.toFixed(3))
  }));

  // Prepare consistency trend data (Race 1 vs Race 2)
  const consistencyTrendData = consistency_rankings
    .slice(0, 10) // Top 10 for clarity
    .map(driver => ({
      name: `#${driver.driver}`,
      race1: parseFloat(driver.race_1_std_dev.toFixed(3)),
      race2: parseFloat(driver.race_2_std_dev.toFixed(3))
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.name || data.shortName}</p>
          {data.improvementPercent !== undefined && (
            <>
              <p className="tooltip-value">Improvement: {data.improvementPercent}%</p>
              <p className="tooltip-detail">({data.improvementSeconds}s faster)</p>
              <p className="tooltip-detail">Race 1: {data.race1}s</p>
              <p className="tooltip-detail">Race 2: {data.race2}s</p>
            </>
          )}
          {data.speed !== undefined && data.consistency !== undefined && (
            <>
              <p className="tooltip-value">Median Lap: {data.speed}s</p>
              <p className="tooltip-value">Std Dev: {data.consistency}s</p>
              <p className="tooltip-detail">Consistency Improvement: {data.improvement.toFixed(3)}s</p>
            </>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="insights-section talent-development">
      <h2 className="insights-section-title">
        <span className="section-title-icon"><TrophyIcon /></span>
        Talent Development Metrics
      </h2>

      {/* Charts Grid - 2 Column Layout */}
      <div className="insights-grid-2col">
        {/* Consistency Quadrant */}
        <div className="chart-container">
          <h3 className="chart-title">Consistency vs Speed Quadrant (Race 2)</h3>
          <p className="chart-description">
            Bottom-left quadrant = Fast & Consistent (ideal). X-axis: lower is faster, Y-axis: lower is more consistent.
          </p>
          <ResponsiveContainer width="100%" height={450}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                type="number" 
                dataKey="speed" 
                name="Median Lap Time"
                label={{ value: 'Median Lap Time (seconds) - Lower is Faster', position: 'bottom', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
                domain={['dataMin - 0.5', 'dataMax + 0.5']}
              />
              <YAxis 
                type="number" 
                dataKey="consistency" 
                name="Std Dev"
                label={{ value: 'Standard Deviation (seconds) - Lower is More Consistent', angle: -90, position: 'insideLeft', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
                domain={[0, 'dataMax + 0.1']}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter name="Drivers" data={consistencyData} fill="#00d9ff" />
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        {/* Improvement Rankings */}
        <div className="chart-container">
          <h3 className="chart-title">Top 15 Most Improved Drivers</h3>
          <p className="chart-description">
            Percentage improvement from Race 1 to Race 2. Green indicates positive improvement.
          </p>
          <ResponsiveContainer width="100%" height={450}>
            <BarChart 
              data={improvementData} 
              layout="vertical"
              margin={{ top: 20, right: 30, left: 120, bottom: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                type="number" 
                label={{ value: 'Improvement (%)', position: 'bottom', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
              />
              <YAxis 
                type="category" 
                dataKey="shortName"
                stroke="#888"
                tick={{ fill: '#888', fontSize: 12 }}
                width={100}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="improvementPercent" radius={[0, 8, 8, 0]}>
                {improvementData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={entry.improvementPercent > 0 ? '#39ff14' : '#e63946'} 
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Consistency Trend - Full Width */}
      <div className="chart-container">
        <h3 className="chart-title">Consistency Improvement Trend (Top 10)</h3>
        <p className="chart-description">
          Comparison of standard deviation between Race 1 and Race 2. Lower values indicate better consistency.
        </p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={consistencyTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="name" stroke="#888" tick={{ fill: '#888' }} />
            <YAxis 
              label={{ value: 'Standard Deviation (seconds)', angle: -90, position: 'insideLeft', fill: '#888' }}
              stroke="#888"
              tick={{ fill: '#888' }}
            />
            <Tooltip 
              contentStyle={{ background: '#1a1f3a', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '8px' }}
              labelStyle={{ color: '#00d4ff' }}
            />
            <Legend />
            <Bar dataKey="race1" name="Race 1" fill="#00d9ff" radius={[8, 8, 0, 0]} />
            <Bar dataKey="race2" name="Race 2" fill="#39ff14" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Teammate Comparisons */}
      <div className="teammate-section">
        <h3 className="insights-section-subtitle">Teammate Head-to-Head Battles</h3>
        <p className="section-description">
          Direct comparisons between teammates showing race wins, sector advantages, and momentum shifts.
        </p>
        <div className="teammate-grid">
          {teammate_pairs.slice(0, 8).map((pair, idx) => (
            <TeammateCard key={idx} pair={pair} />
          ))}
        </div>
      </div>
    </div>
  );
}

function TeammateCard({ pair }) {
  const {
    team,
    driver_a,
    driver_b,
    driver_a_name,
    driver_b_name,
    race_comparisons,
    sector_advantages,
    momentum,
    total_wins_a,
    total_wins_b
  } = pair;

  // Prepare radar chart data for latest race
  const latestRace = race_comparisons[race_comparisons.length - 1];
  const radarData = ['S1', 'S2', 'S3'].map(sector => {
    const sectorData = sector_advantages[sector];
    const latestSectorRace = sectorData[`race_${race_comparisons.length}`];
    
    // Invert so that being the leader means higher value
    const driverAValue = latestSectorRace.leader === driver_a ? 100 : 50;
    const driverBValue = latestSectorRace.leader === driver_b ? 100 : 50;
    
    return {
      sector,
      [driver_a_name]: driverAValue,
      [driver_b_name]: driverBValue,
      gap: latestSectorRace.gap
    };
  });

  const getMomentumIcon = () => {
    if (momentum === 'driver_a_dominant') return <BlueDot />;
    if (momentum === 'driver_b_dominant') return <RedDot />;
    if (momentum === 'driver_a_improving') return <MomentumUpIcon />;
    if (momentum === 'driver_b_improving') return <MomentumDownIcon />;
    return <ScalesIcon />;
  };

  const getMomentumText = () => {
    if (momentum === 'driver_a_dominant') return `${driver_a_name} Dominant`;
    if (momentum === 'driver_b_dominant') return `${driver_b_name} Dominant`;
    if (momentum === 'driver_a_improving') return `${driver_a_name} Improving`;
    if (momentum === 'driver_b_improving') return `${driver_b_name} Improving`;
    return 'Even Battle';
  };

  return (
    <div className="teammate-card">
      <div className="teammate-header">
        <div className="team-name">{team}</div>
        <div className="momentum-badge">
          <span className="momentum-icon">{getMomentumIcon()}</span>
          <span className="momentum-text">{getMomentumText()}</span>
        </div>
      </div>

      <div className="drivers-comparison">
        <div className="driver-side driver-a">
          <div className="driver-number">#{driver_a}</div>
          <div className="driver-name">{driver_a_name}</div>
          <div className="driver-wins">{total_wins_a} wins</div>
        </div>
        <div className="vs-divider">VS</div>
        <div className="driver-side driver-b">
          <div className="driver-number">#{driver_b}</div>
          <div className="driver-name">{driver_b_name}</div>
          <div className="driver-wins">{total_wins_b} wins</div>
        </div>
      </div>

      <div className="race-results">
        {race_comparisons.map((race, idx) => (
          <div key={idx} className="race-result">
            <div className="race-label">{race.race.replace('_', ' ').toUpperCase()}</div>
            <div className="race-winner">
              Winner: <span className="winner-name">#{race.winner} {race.winner_name}</span>
            </div>
            <div className="race-gap">Gap: {race.gap.toFixed(3)}s</div>
          </div>
        ))}
      </div>

      <div className="sector-radar">
        <h4>Sector Advantages (Latest Race)</h4>
        <ResponsiveContainer width="100%" height={200}>
          <RadarChart data={radarData}>
            <PolarGrid stroke="rgba(255,255,255,0.1)" />
            <PolarAngleAxis dataKey="sector" tick={{ fill: '#888', fontSize: 12 }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} />
            <Radar name={driver_a_name} dataKey={driver_a_name} stroke="#00d9ff" fill="#00d9ff" fillOpacity={0.3} />
            <Radar name={driver_b_name} dataKey={driver_b_name} stroke="#ffd60a" fill="#ffd60a" fillOpacity={0.3} />
            <Legend />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default TalentDevelopment;
