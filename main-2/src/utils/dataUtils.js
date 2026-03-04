// Calculate z-scores for normalization
export const calculateZScores = (values) => {
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);
  
  return values.map(val => stdDev === 0 ? 0 : (val - mean) / stdDev);
};

// Normalize data for spider charts
export const normalizeDriverData = (drivers, metrics) => {
  const normalized = {};
  
  metrics.forEach(metric => {
    const values = drivers.map(d => getMetricValue(d, metric));
    const zScores = calculateZScores(values);
    
    drivers.forEach((driver, idx) => {
      if (!normalized[driver.driver_name]) {
        normalized[driver.driver_name] = {};
      }
      normalized[driver.driver_name][metric] = zScores[idx];
    });
  });
  
  return normalized;
};

// Get metric value from driver data
export const getMetricValue = (driver, metric) => {
  const metricMap = {
    'fastest_lap': driver.lap_times?.fastest,
    'optimal_lap': driver.lap_times?.optimal_lap_time,
    'best_5_avg': driver.lap_times?.best_5_avg,
    'consistency': driver.lap_times?.consistency_best_5,
    'alpha_score': driver.alpha_score,
    's1_fastest': driver.s1_times?.fastest,
    's2_fastest': driver.s2_times?.fastest,
    's3_fastest': driver.s3_times?.fastest,
  };
  
  return metricMap[metric] || 0;
};

// Format lap time for display
export const formatLapTime = (seconds) => {
  if (!seconds) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, '0')}`;
};

// Format delta time
export const formatDelta = (delta) => {
  if (!delta) return '--';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)}`;
};

// Get position color
export const getPositionColor = (position) => {
  if (position === 1) return '#9d4edd'; // Purple for P1
  if (position <= 3) return '#06ffa5'; // Green for podium
  if (position <= 10) return '#00d9ff'; // Blue for top 10
  return '#707070'; // Gray for others
};

// Get alpha score color
export const getAlphaScoreColor = (score) => {
  if (score > 1) return '#9d4edd';
  if (score > 0.5) return '#06ffa5';
  if (score > 0) return '#00d9ff';
  if (score > -0.5) return '#ffd60a';
  return '#e63946';
};

// Sort data by metric
export const sortByMetric = (data, metric, ascending = true) => {
  return [...data].sort((a, b) => {
    const aVal = getMetricValue(a, metric);
    const bVal = getMetricValue(b, metric);
    return ascending ? aVal - bVal : bVal - aVal;
  });
};
