import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ReferenceLine, Cell } from 'recharts';
import './TechnicalCompliance.css';

const WrenchIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="#39ff14" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const FlagIndicator = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffd60a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign: 'middle', marginRight: '4px'}}>
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

function TechnicalCompliance({ data }) {
  if (!data) return null;

  const {
    sector_outliers_by_race,
    persistent_outliers,
    pace_jump_analysis,
    visualization_data
  } = data;

  // Prepare pace jump chart data
  const paceJumpData = pace_jump_analysis.driver_improvements
    .sort((a, b) => b.improvement - a.improvement)
    .map(driver => ({
      name: `#${driver.driver} ${driver.driver_name}`,
      shortName: `#${driver.driver}`,
      improvement: parseFloat(driver.improvement.toFixed(3)),
      flagged: driver.flagged,
      race1: parseFloat(driver.race_1_median.toFixed(3)),
      race2: parseFloat(driver.race_2_median.toFixed(3)),
      improvementPercent: driver.improvement_percent
    }));

  // Prepare scatter plot data
  const scatterData = pace_jump_analysis.driver_improvements.map(driver => ({
    race1: parseFloat(driver.race_1_median.toFixed(3)),
    race2: parseFloat(driver.race_2_median.toFixed(3)),
    name: `#${driver.driver} ${driver.driver_name}`,
    flagged: driver.flagged
  }));

  // Prepare sector distribution data for box plots
  const sectorData = [];
  if (visualization_data?.sector_distributions) {
    ['s1', 's2', 's3'].forEach((sector, idx) => {
      const sectorNum = idx + 1;
      const race1Data = visualization_data.sector_distributions.race_1[sector];
      const race2Data = visualization_data.sector_distributions.race_2[sector];
      
      sectorData.push({
        sector: `S${sectorNum}`,
        race1Mean: parseFloat(race1Data.mean.toFixed(3)),
        race1Min: parseFloat(race1Data.min.toFixed(3)),
        race1Max: parseFloat(race1Data.max.toFixed(3)),
        race1Median: parseFloat(race1Data.median.toFixed(3)),
        race2Mean: parseFloat(race2Data.mean.toFixed(3)),
        race2Min: parseFloat(race2Data.min.toFixed(3)),
        race2Max: parseFloat(race2Data.max.toFixed(3)),
        race2Median: parseFloat(race2Data.median.toFixed(3))
      });
    });
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="custom-tooltip">
          <p className="tooltip-label">{data.name || data.shortName}</p>
          {data.improvement !== undefined && (
            <>
              <p className="tooltip-value">Improvement: {data.improvement}s ({data.improvementPercent?.toFixed(2)}%)</p>
              <p className="tooltip-detail">Race 1: {data.race1}s</p>
              <p className="tooltip-detail">Race 2: {data.race2}s</p>
              {data.flagged && <p className="tooltip-flag"><FlagIndicator /> Flagged</p>}
            </>
          )}
          {data.race1 !== undefined && data.race2 !== undefined && data.improvement === undefined && (
            <>
              <p className="tooltip-value">Race 1: {data.race1}s</p>
              <p className="tooltip-value">Race 2: {data.race2}s</p>
              <p className="tooltip-detail">Improvement: {(data.race1 - data.race2).toFixed(3)}s</p>
              {data.flagged && <p className="tooltip-flag"><FlagIndicator /> Flagged</p>}
            </>
          )}
        </div>
      );
    }
    return null;
  };

  const totalOutliers = (sector_outliers_by_race.race_1?.length || 0) + (sector_outliers_by_race.race_2?.length || 0);

  return (
    <div className="insights-section technical-compliance">
      <h2 className="insights-section-title">
        <span className="section-title-icon"><WrenchIcon /></span>
        Technical Compliance Analysis
      </h2>

      {/* Summary Stats */}
      <div className="compliance-summary">
        <div className="compliance-stat">
          <div className="stat-value">{totalOutliers}</div>
          <div className="stat-label">Total Sector Outliers</div>
        </div>
        <div className="compliance-stat">
          <div className="stat-value">{persistent_outliers.length}</div>
          <div className="stat-label">Persistent Outliers</div>
        </div>
        <div className="compliance-stat warning">
          <div className="stat-value">{pace_jump_analysis.flagged_drivers.length}</div>
          <div className="stat-label">Anomalous Improvements</div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="insights-grid-2col">
        {/* Pace Jump Analysis */}
        <div className="chart-container">
          <h3 className="chart-title">Race-to-Race Pace Jump Detection</h3>
          <p className="chart-description">
            Drivers with improvement exceeding field median by &gt;0.5s are flagged (yellow bars). 
            Field median improvement: {pace_jump_analysis.field_median_improvement.toFixed(3)}s
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={paceJumpData} margin={{ top: 20, right: 30, left: 20, bottom: 80 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="shortName" 
                angle={-45} 
                textAnchor="end" 
                height={80}
                stroke="#888"
                tick={{ fill: '#888', fontSize: 12 }}
              />
              <YAxis 
                label={{ value: 'Improvement (seconds)', angle: -90, position: 'insideLeft', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine 
                y={pace_jump_analysis.field_median_improvement} 
                stroke="#ff4444" 
                strokeDasharray="5 5"
                label={{ value: 'Field Median', fill: '#ff4444', position: 'right' }}
              />
              <Bar dataKey="improvement" radius={[8, 8, 0, 0]}>
                {paceJumpData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.flagged ? '#ffd60a' : '#00d9ff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Scatter Plot: Race 1 vs Race 2 */}
        <div className="chart-container">
          <h3 className="chart-title">Race 1 vs Race 2 Median Lap Times</h3>
          <p className="chart-description">
            Points below the diagonal line indicate improvement. Flagged drivers shown in yellow.
          </p>
          <ResponsiveContainer width="100%" height={400}>
            <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                type="number" 
                dataKey="race1" 
                name="Race 1" 
                label={{ value: 'Race 1 Median (seconds)', position: 'bottom', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <YAxis 
                type="number" 
                dataKey="race2" 
                name="Race 2"
                label={{ value: 'Race 2 Median (seconds)', angle: -90, position: 'insideLeft', fill: '#888' }}
                stroke="#888"
                tick={{ fill: '#888' }}
                domain={['dataMin - 1', 'dataMax + 1']}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3' }} />
              <ReferenceLine 
                segment={[{ x: 95, y: 95 }, { x: 105, y: 105 }]} 
                stroke="#888" 
                strokeDasharray="5 5"
                label={{ value: 'No Change', fill: '#888' }}
              />
              <Scatter name="Drivers" data={scatterData} fill="#00d9ff">
                {scatterData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.flagged ? '#ffd60a' : '#00d9ff'} />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Sector Distribution Comparison - Full Width */}
      <div className="chart-container">
        <h3 className="chart-title">Sector Time Distribution (Race 1 vs Race 2)</h3>
        <p className="chart-description">
          Comparison of sector time ranges across both races. Lower times indicate faster sectors.
        </p>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={sectorData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey="sector" stroke="#888" tick={{ fill: '#888' }} />
            <YAxis 
              label={{ value: 'Time (seconds)', angle: -90, position: 'insideLeft', fill: '#888' }}
              stroke="#888"
              tick={{ fill: '#888' }}
            />
            <Tooltip 
              contentStyle={{ background: '#1a1f3a', border: '1px solid rgba(0,212,255,0.3)', borderRadius: '8px' }}
              labelStyle={{ color: '#00d4ff' }}
            />
            <Legend />
            <Bar dataKey="race1Mean" name="Race 1 Mean" fill="#00d9ff" radius={[8, 8, 0, 0]} />
            <Bar dataKey="race2Mean" name="Race 2 Mean" fill="#39ff14" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Outliers List */}
      {totalOutliers > 0 && (
        <div className="outliers-section">
          <h3 className="insights-section-subtitle">Detected Outliers</h3>
          {sector_outliers_by_race.race_1?.length > 0 && (
            <div className="outliers-race">
              <h4>Race 1 Outliers</h4>
              <div className="outliers-list">
                {sector_outliers_by_race.race_1.map((outlier, idx) => (
                  <div key={idx} className="outlier-card">
                    <div className="outlier-driver">
                      <span className="outlier-number">#{outlier.driver}</span>
                      <span className="outlier-name">{outlier.driver_name}</span>
                    </div>
                    <div className="outlier-details">
                      <div className="outlier-detail">
                        <span className="detail-label">Sector:</span>
                        <span className="detail-value">S{outlier.sector}</span>
                      </div>
                      <div className="outlier-detail">
                        <span className="detail-label">Time:</span>
                        <span className="detail-value">{outlier.median_time.toFixed(3)}s</span>
                      </div>
                      <div className="outlier-detail">
                        <span className="detail-label">Z-Score:</span>
                        <span className="detail-value alert">{outlier.z_score.toFixed(2)}</span>
                      </div>
                      <div className="outlier-detail">
                        <span className="detail-label">Faster by:</span>
                        <span className="detail-value">{outlier.seconds_faster.toFixed(3)}s</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {sector_outliers_by_race.race_2?.length > 0 && (
            <div className="outliers-race">
              <h4>Race 2 Outliers</h4>
              <div className="outliers-list">
                {sector_outliers_by_race.race_2.map((outlier, idx) => (
                  <div key={idx} className="outlier-card">
                    <div className="outlier-driver">
                      <span className="outlier-number">#{outlier.driver}</span>
                      <span className="outlier-name">{outlier.driver_name}</span>
                    </div>
                    <div className="outlier-details">
                      <div className="outlier-detail">
                        <span className="detail-label">Sector:</span>
                        <span className="detail-value">S{outlier.sector}</span>
                      </div>
                      <div className="outlier-detail">
                        <span className="detail-label">Time:</span>
                        <span className="detail-value">{outlier.median_time.toFixed(3)}s</span>
                      </div>
                      <div className="outlier-detail">
                        <span className="detail-label">Z-Score:</span>
                        <span className="detail-value alert">{outlier.z_score.toFixed(2)}</span>
                      </div>
                      <div className="outlier-detail">
                        <span className="detail-label">Faster by:</span>
                        <span className="detail-value">{outlier.seconds_faster.toFixed(3)}s</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {totalOutliers === 0 && (
        <div className="no-outliers">
          <span className="success-icon"><CheckCircleIcon /></span>
          <p>No sector outliers detected. All drivers within normal performance range.</p>
        </div>
      )}
    </div>
  );
}

export default TechnicalCompliance;
