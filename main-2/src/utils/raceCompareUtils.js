/**
 * Race Compare Utilities
 * Shared utility functions for data transformation and calculations
 */

/**
 * Parse time string to seconds
 * Handles "1:47.271" or "0:32.456" format
 */
export function parseTime(timeString) {
  if (!timeString) return 0;
  const parts = timeString.split(':');
  const minutes = parseInt(parts[0]);
  const seconds = parseFloat(parts[1]);
  return minutes * 60 + seconds;
}

/**
 * Format seconds to time string
 */
export function formatTime(seconds) {
  if (!seconds && seconds !== 0) return '--';
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(3);
  return `${mins}:${secs.padStart(6, '0')}`;
}

/**
 * Format delta with sign
 */
export function formatDelta(delta) {
  if (!delta && delta !== 0) return '--';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)}s`;
}

/**
 * Prepare lap data from base driver JSON
 */
export function prepareLapData(baseLapData) {
  if (!baseLapData || !baseLapData.laps) return [];
  
  return baseLapData.laps.map(lap => ({
    lapNumber: lap.lap_number,
    lapTime: parseTime(lap.lap_time),
    // Sectors are already in seconds (numbers), not time strings
    sector1: typeof lap.sector_1 === 'number' ? lap.sector_1 : parseTime(lap.sector_1),
    sector2: typeof lap.sector_2 === 'number' ? lap.sector_2 : parseTime(lap.sector_2),
    sector3: typeof lap.sector_3 === 'number' ? lap.sector_3 : parseTime(lap.sector_3),
    lapTimeString: lap.lap_time,
    sector1String: typeof lap.sector_1 === 'number' ? lap.sector_1.toFixed(3) : lap.sector_1,
    sector2String: typeof lap.sector_2 === 'number' ? lap.sector_2.toFixed(3) : lap.sector_2,
    sector3String: typeof lap.sector_3 === 'number' ? lap.sector_3.toFixed(3) : lap.sector_3
  }));
}

/**
 * Extract timeline data for a specific driver
 */
export function extractDriverTimeline(completeTimeline, driverNumber) {
  if (!completeTimeline || !completeTimeline.events) {
    console.log('extractDriverTimeline: No timeline or events', {
      hasTimeline: !!completeTimeline,
      hasEvents: !!completeTimeline?.events
    });
    return null;
  }
  
  // Ensure both are strings for comparison
  const driverNumStr = String(driverNumber);
  
  const driverEvents = completeTimeline.events.filter(
    event => String(event.driver_number) === driverNumStr
  );
  
  console.log('extractDriverTimeline:', {
    driverNumber: driverNumStr,
    totalEvents: completeTimeline.events.length,
    driverEvents: driverEvents.length,
    sampleEventDriverNum: completeTimeline.events[0]?.driver_number
  });
  
  if (driverEvents.length === 0) {
    console.warn(`No events found for driver ${driverNumStr}`);
  }
  
  return {
    driver_number: driverNumStr,
    driver_name: driverEvents[0]?.driver_name || '',
    total_events: driverEvents.length,
    events: driverEvents
  };
}

/**
 * Calculate standard deviation
 */
export function calculateStdDev(values) {
  if (!values || values.length === 0) return 0;
  const n = values.length;
  const mean = values.reduce((a, b) => a + b, 0) / n;
  const variance = values.reduce((acc, val) => 
    acc + Math.pow(val - mean, 2), 0) / n;
  return Math.sqrt(variance);
}

/**
 * Calculate box plot statistics
 */
export function calculateBoxPlotData(values) {
  if (!values || values.length === 0) return null;
  
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  
  const min = sorted[0];
  const max = sorted[n - 1];
  const median = n % 2 === 0 
    ? (sorted[n/2 - 1] + sorted[n/2]) / 2 
    : sorted[Math.floor(n/2)];
  
  const q1Index = Math.floor(n * 0.25);
  const q3Index = Math.floor(n * 0.75);
  const q1 = sorted[q1Index];
  const q3 = sorted[q3Index];
  
  const iqr = q3 - q1;
  const lowerFence = q1 - (1.5 * iqr);
  const upperFence = q3 + (1.5 * iqr);
  
  const outliers = sorted.filter(
    v => v < lowerFence || v > upperFence
  );
  
  return {
    boxData: [min, q1, median, q3, max],
    outliers: outliers,
    mean: values.reduce((a, b) => a + b, 0) / n,
    stdDev: calculateStdDev(values)
  };
}

/**
 * Assign driver colors (matching RaceReplayMap colors)
 */
const DRIVER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
  '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B739', '#52B788',
  '#E63946', '#A8DADC', '#457B9D', '#F1FAEE', '#E76F51',
  '#2A9D8F', '#E9C46A', '#F4A261', '#264653', '#8338EC',
  '#FF006E', '#FFBE0B'
];

export function getDriverColor(driverNumber, manifest) {
  if (!manifest) return '#FFFFFF';
  const index = manifest.drivers.findIndex(d => d.driver_number === driverNumber);
  return DRIVER_COLORS[index % DRIVER_COLORS.length];
}

export { DRIVER_COLORS };
