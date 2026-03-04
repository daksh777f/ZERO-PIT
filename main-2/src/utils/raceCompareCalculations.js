/**
 * Race Compare Calculations
 * All metric calculation functions for different modes
 */

import { parseTime, calculateStdDev } from './raceCompareUtils';

// ============================================================================
// MODE 1: PERFORMANCE COMPARISON CALCULATIONS
// ============================================================================

/**
 * Calculate total delta between two drivers
 */
export function calculateTotalDelta(driver1Laps, driver2Laps) {
  if (!driver1Laps || !driver2Laps) return 0;
  
  const minLaps = Math.min(driver1Laps.length, driver2Laps.length);
  return driver1Laps.slice(0, minLaps).reduce((sum, lap, idx) => {
    return sum + (lap.lapTime - driver2Laps[idx].lapTime);
  }, 0);
}

/**
 * Calculate sector delta statistics
 */
export function calculateSectorDelta(driver1Laps, driver2Laps, sector) {
  if (!driver1Laps || !driver2Laps) return { average: 0, min: 0, max: 0 };
  
  const sectorKey = `sector${sector}`;
  const minLaps = Math.min(driver1Laps.length, driver2Laps.length);
  const deltas = [];
  
  for (let i = 0; i < minLaps; i++) {
    const delta = driver1Laps[i][sectorKey] - driver2Laps[i][sectorKey];
    deltas.push(delta);
  }
  
  return {
    average: deltas.reduce((a, b) => a + b, 0) / deltas.length,
    min: Math.min(...deltas),
    max: Math.max(...deltas)
  };
}

/**
 * Calculate average gap per lap
 */
export function calculateAvgGap(totalDelta, lapCount) {
  if (!lapCount) return 0;
  return totalDelta / lapCount;
}

/**
 * Compare best laps
 */
export function compareBestLaps(driver1Laps, driver2Laps) {
  if (!driver1Laps || !driver2Laps) return null;
  
  const d1Best = Math.min(...driver1Laps.map(l => l.lapTime));
  const d2Best = Math.min(...driver2Laps.map(l => l.lapTime));
  
  return {
    driver1Best: d1Best,
    driver2Best: d2Best,
    delta: d1Best - d2Best
  };
}

/**
 * Calculate cumulative delta array
 */
export function calculateCumulativeDelta(driver1Laps, driver2Laps) {
  if (!driver1Laps || !driver2Laps) return [];
  
  const minLaps = Math.min(driver1Laps.length, driver2Laps.length);
  let cumulative = 0;
  
  return driver1Laps.slice(0, minLaps).map((lap, idx) => {
    cumulative += (lap.lapTime - driver2Laps[idx].lapTime);
    return cumulative;
  });
}

// ============================================================================
// MODE 2: BATTLE ANALYSIS CALCULATIONS
// ============================================================================

/**
 * Detect battles between two drivers
 */
export function detectBattles(driver1Timeline, driver2Timeline, threshold = 2.0) {
  if (!driver1Timeline || !driver2Timeline) return [];
  
  const battles = [];
  
  driver1Timeline.events
    .filter(e => e.event_type === 'lap_complete')
    .forEach(event => {
      const gap = Math.abs(event.deltas.to_all_cars?.[driver2Timeline.driver_number] || 999);
      
      if (gap < threshold) {
        battles.push({
          lapNumber: event.lap_number,
          gap: gap,
          position: event.race_position,
          battleType: determineBattleType(event, driver2Timeline.driver_number)
        });
      }
    });
  
  return battles;
}

function determineBattleType(event, driver2Number) {
  const isAhead = event.deltas.car_ahead_number === driver2Number;
  const isBehind = event.deltas.car_behind_number === driver2Number;
  
  if (isAhead) return 'attacking';
  if (isBehind) return 'defending';
  return 'nearby';
}

/**
 * Count battle laps
 */
export function countBattleLaps(battles) {
  return new Set(battles.map(b => b.lapNumber)).size;
}

/**
 * Calculate position changes
 */
export function calculatePositionChanges(timeline) {
  if (!timeline) return { gained: 0, lost: 0 };
  
  const changes = timeline.events
    .filter(e => e.position_change !== 0)
    .reduce((acc, e) => {
      if (e.position_change > 0) acc.gained += Math.abs(e.position_change);
      if (e.position_change < 0) acc.lost += Math.abs(e.position_change);
      return acc;
    }, { gained: 0, lost: 0 });
  
  return changes;
}

/**
 * Calculate average gap in battle
 */
export function calculateAvgBattleGap(battles) {
  if (!battles || battles.length === 0) return null;
  const sum = battles.reduce((acc, b) => acc + b.gap, 0);
  return sum / battles.length;
}

/**
 * Calculate maximum closing rate
 */
export function calculateMaxClosingRate(gapEvolution) {
  if (!gapEvolution || gapEvolution.length < 2) return 0;
  
  let maxClosing = 0;
  
  for (let i = 1; i < gapEvolution.length; i++) {
    if (gapEvolution[i-1].gap !== null && gapEvolution[i].gap !== null) {
      const gapChange = gapEvolution[i-1].gap - gapEvolution[i].gap;
      if (gapChange > maxClosing) maxClosing = gapChange;
    }
  }
  
  return maxClosing;
}

/**
 * Extract gap evolution
 */
export function extractGapEvolution(driver1Timeline, driver2Number) {
  if (!driver1Timeline) return [];
  
  const lapMap = new Map();
  
  driver1Timeline.events
    .filter(e => e.event_type === 'lap_complete')
    .forEach(event => {
      const gap = event.deltas.to_all_cars?.[driver2Number];
      lapMap.set(event.lap_number, {
        lap: event.lap_number,
        gap: gap !== undefined ? gap : null,
        position: event.race_position
      });
    });
  
  return Array.from(lapMap.values());
}

// ============================================================================
// MODE 3: RACE FLOW CALCULATIONS
// ============================================================================

/**
 * Get starting position
 */
export function getStartPosition(timeline) {
  if (!timeline || !timeline.events.length) return null;
  const firstEvent = timeline.events.find(e => e.lap_number === 1);
  return firstEvent?.race_position || null;
}

/**
 * Get finishing position
 */
export function getFinishPosition(timeline) {
  if (!timeline || !timeline.events.length) return null;
  const lastLap = Math.max(...timeline.events.map(e => e.lap_number));
  const lastEvent = timeline.events.find(
    e => e.lap_number === lastLap && e.event_type === 'lap_complete'
  );
  return lastEvent?.race_position || null;
}

/**
 * Get best position achieved
 */
export function getBestPosition(timeline) {
  if (!timeline || !timeline.events || timeline.events.length === 0) return null;
  
  const positions = timeline.events
    .filter(e => e.event_type === 'lap_complete')
    .map(e => e.race_position);
  
  if (positions.length === 0) return null;
  
  const best = Math.min(...positions);
  const event = timeline.events.find(
    e => e.race_position === best && e.event_type === 'lap_complete'
  );
  
  if (!event) return null;
  
  return { position: best, lap: event.lap_number };
}

/**
 * Calculate leadership metrics
 */
export function calculateLeadershipMetrics(timeline) {
  if (!timeline || !timeline.events.length) return { lapsLed: 0, lapsOnLeadLap: 0 };
  
  const lapsLed = timeline.events.filter(
    e => e.event_type === 'lap_complete' && e.race_position === 1
  ).length;
  
  const lapsOnLeadLap = timeline.events.filter(
    e => e.event_type === 'lap_complete' && e.on_same_lap_as_leader
  ).length;
  
  return { lapsLed, lapsOnLeadLap };
}

/**
 * Extract all driver positions
 */
export function extractAllDriverPositions(allDriversTimeline) {
  const driverMap = new Map();
  
  allDriversTimeline.forEach(driver => {
    const positions = [];
    
    driver.events
      .filter(e => e.event_type === 'lap_complete')
      .sort((a, b) => a.lap_number - b.lap_number)
      .forEach(event => {
        positions.push({
          lap: event.lap_number,
          position: event.race_position
        });
      });
    
    driverMap.set(driver.driver_number, {
      number: driver.driver_number,
      name: driver.driver_name,
      positions: positions.map(p => p.position)
    });
  });
  
  return Array.from(driverMap.values());
}

// ============================================================================
// MODE 4: CONSISTENCY ANALYSIS CALCULATIONS
// ============================================================================

/**
 * Get best lap
 */
export function getBestLap(laps) {
  if (!laps || laps.length === 0) return null;
  const times = laps.map(l => l.lapTime);
  const best = Math.min(...times);
  const lapNum = laps.find(l => l.lapTime === best).lapNumber;
  return { time: best, lap: lapNum };
}

/**
 * Get average lap
 */
export function getAverageLap(laps) {
  if (!laps || laps.length === 0) return 0;
  const sum = laps.reduce((acc, l) => acc + l.lapTime, 0);
  return sum / laps.length;
}

/**
 * Get worst lap
 */
export function getWorstLap(laps) {
  if (!laps || laps.length === 0) return null;
  const times = laps.map(l => l.lapTime);
  const worst = Math.max(...times);
  const lapNum = laps.find(l => l.lapTime === worst).lapNumber;
  return { time: worst, lap: lapNum };
}

/**
 * Get consistency metrics
 */
export function getConsistencyMetrics(laps) {
  if (!laps || laps.length === 0) return null;
  
  const lapTimes = laps.map(l => l.lapTime);
  const s1Times = laps.map(l => l.sector1);
  const s2Times = laps.map(l => l.sector2);
  const s3Times = laps.map(l => l.sector3);
  
  return {
    lapStdDev: calculateStdDev(lapTimes),
    s1StdDev: calculateStdDev(s1Times),
    s2StdDev: calculateStdDev(s2Times),
    s3StdDev: calculateStdDev(s3Times)
  };
}

/**
 * Rank sector variability
 */
export function rankSectorVariability(laps) {
  if (!laps || laps.length === 0) return null;
  
  const metrics = getConsistencyMetrics(laps);
  
  const sectors = [
    { name: 'S1', stdDev: metrics.s1StdDev },
    { name: 'S2', stdDev: metrics.s2StdDev },
    { name: 'S3', stdDev: metrics.s3StdDev }
  ];
  
  sectors.sort((a, b) => a.stdDev - b.stdDev);
  
  return {
    mostConsistent: sectors[0].name,
    leastConsistent: sectors[2].name,
    ranking: sectors
  };
}

/**
 * Identify outlier laps
 */
export function identifyOutlierLaps(laps) {
  if (!laps || laps.length === 0) return [];
  
  const times = laps.map(l => l.lapTime);
  const sorted = [...times].sort((a, b) => a - b);
  const n = sorted.length;
  
  const q1 = sorted[Math.floor(n * 0.25)];
  const q3 = sorted[Math.floor(n * 0.75)];
  const iqr = q3 - q1;
  
  const lowerFence = q1 - (1.5 * iqr);
  const upperFence = q3 + (1.5 * iqr);
  
  return laps.filter(lap => 
    lap.lapTime < lowerFence || lap.lapTime > upperFence
  ).map(lap => ({
    lap: lap.lapNumber,
    time: lap.lapTime,
    deviation: lap.lapTime > upperFence 
      ? lap.lapTime - upperFence 
      : lowerFence - lap.lapTime
  }));
}

/**
 * Create histogram bins
 */
export function createHistogram(lapTimes, binCount = 8) {
  if (!lapTimes || lapTimes.length === 0) return { bins: [], frequencies: [] };
  
  const min = Math.min(...lapTimes);
  const max = Math.max(...lapTimes);
  const binSize = (max - min) / binCount;
  
  const bins = [];
  const frequencies = [];
  
  for (let i = 0; i < binCount; i++) {
    const binStart = min + (i * binSize);
    const binEnd = binStart + binSize;
    
    bins.push(`${binStart.toFixed(1)}-${binEnd.toFixed(1)}`);
    
    const count = lapTimes.filter(
      time => time >= binStart && (i === binCount - 1 ? time <= binEnd : time < binEnd)
    ).length;
    
    frequencies.push(count);
  }
  
  return { bins, frequencies };
}
