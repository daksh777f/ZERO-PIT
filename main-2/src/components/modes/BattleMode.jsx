import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import RaceCompareMetricsPanel from '../RaceCompareMetricsPanel';
import {
  detectBattles,
  countBattleLaps,
  calculatePositionChanges,
  calculateAvgBattleGap,
  extractGapEvolution,
  calculateMaxClosingRate
} from '../../utils/raceCompareCalculations';
import { getDriverColor } from '../../utils/raceCompareUtils';
import './BattleMode.css';

function BattleMode({ driver1Data, driver2Data, manifest }) {
  // Calculate battle metrics
  const battleMetrics = useMemo(() => {
    if (!driver1Data?.timeline || !driver2Data?.timeline) {
      console.log('BattleMode: Missing timeline data', {
        d1HasTimeline: !!driver1Data?.timeline,
        d1EventCount: driver1Data?.timeline?.events?.length,
        d2HasTimeline: !!driver2Data?.timeline,
        d2EventCount: driver2Data?.timeline?.events?.length
      });
      return null;
    }

    const battles = detectBattles(driver1Data.timeline, driver2Data.timeline);
    const battleLapCount = countBattleLaps(battles);
    const posChanges = calculatePositionChanges(driver1Data.timeline);
    const avgGap = calculateAvgBattleGap(battles);
    const gapEvolution = extractGapEvolution(driver1Data.timeline, driver2Data.rawData.driver_number);
    const maxClosing = calculateMaxClosingRate(gapEvolution);

    console.log('BattleMode metrics calculated:', {
      battles: battles.length,
      battleLapCount,
      gapEvolutionLength: gapEvolution.length
    });

    return {
      battles,
      battleLapCount,
      posChanges,
      avgGap,
      gapEvolution,
      maxClosing
    };
  }, [driver1Data, driver2Data]);

  // Position timeline chart
  const positionChartOption = useMemo(() => {
    if (!driver1Data?.timeline?.events || !driver2Data?.timeline?.events || 
        !driver1Data?.rawData || !driver2Data?.rawData) {
      console.log('BattleMode: Missing data', {
        d1Timeline: !!driver1Data?.timeline,
        d1Events: driver1Data?.timeline?.events?.length,
        d2Timeline: !!driver2Data?.timeline,
        d2Events: driver2Data?.timeline?.events?.length
      });
      return null;
    }

    const driver1Color = getDriverColor(driver1Data.rawData.driver_number, manifest);
    const driver2Color = getDriverColor(driver2Data.rawData.driver_number, manifest);

    // Extract position data - ensure we have matching lap numbers
    const d1EventsMap = new Map();
    driver1Data.timeline.events
      .filter(e => e.event_type === 'lap_complete')
      .forEach(event => {
        d1EventsMap.set(event.lap_number, event.race_position);
      });

    const d2EventsMap = new Map();
    driver2Data.timeline.events
      .filter(e => e.event_type === 'lap_complete')
      .forEach(event => {
        d2EventsMap.set(event.lap_number, event.race_position);
      });

    // Get common lap numbers
    const allLaps = [...new Set([...d1EventsMap.keys(), ...d2EventsMap.keys()])].sort((a, b) => a - b);
    const lapNumbers = [];
    const d1Positions = [];
    const d2Positions = [];

    allLaps.forEach(lap => {
      if (d1EventsMap.has(lap) && d2EventsMap.has(lap)) {
        lapNumbers.push(lap);
        d1Positions.push(d1EventsMap.get(lap));
        d2Positions.push(d2EventsMap.get(lap));
      }
    });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#E63946',
        borderWidth: 2,
        textStyle: { color: '#FFFFFF' }
      },
      legend: {
        data: [driver1Data.rawData.driver_name, driver2Data.rawData.driver_name],
        textStyle: { color: '#FFFFFF' },
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: lapNumbers,
        name: 'Lap Number',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { color: '#FFFFFF' },
        axisLine: { lineStyle: { color: '#444' } }
      },
      yAxis: {
        type: 'value',
        name: 'Position',
        inverse: true,
        min: 1,
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { 
          color: '#FFFFFF',
          formatter: 'P{value}'
        },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: { lineStyle: { color: '#333' } }
      },
      series: [
        {
          name: driver1Data.rawData.driver_name,
          type: 'line',
          data: d1Positions,
          lineStyle: { width: 3, color: driver1Color },
          symbolSize: 8,
          symbol: 'circle'
        },
        {
          name: driver2Data.rawData.driver_name,
          type: 'line',
          data: d2Positions,
          lineStyle: { width: 3, color: driver2Color },
          symbolSize: 8,
          symbol: 'circle'
        }
      ]
    };
  }, [driver1Data, driver2Data, manifest]);

  // Gap evolution chart
  const gapChartOption = useMemo(() => {
    if (!battleMetrics?.gapEvolution || battleMetrics.gapEvolution.length === 0 || !driver1Data?.rawData) {
      console.log('BattleMode gap chart: Missing data', {
        hasGapEvolution: !!battleMetrics?.gapEvolution,
        gapEvolutionLength: battleMetrics?.gapEvolution?.length
      });
      return null;
    }

    const driver1Color = getDriverColor(driver1Data.rawData.driver_number, manifest);

    const lapNumbers = battleMetrics.gapEvolution.map(g => g.lap);
    const gaps = battleMetrics.gapEvolution.map(g => g.gap);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#E63946',
        borderWidth: 2,
        textStyle: { color: '#FFFFFF' },
        formatter: (params) => {
          const gap = params[0].value;
          return `Lap ${params[0].axisValue}<br/>Gap: ${gap !== null ? gap.toFixed(3) + 's' : 'N/A'}`;
        }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '10%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: lapNumbers,
        name: 'Lap Number',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { color: '#FFFFFF' },
        axisLine: { lineStyle: { color: '#444' } }
      },
      yAxis: {
        type: 'value',
        name: 'Gap (seconds)',
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { color: '#FFFFFF', formatter: '{value}s' },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: { lineStyle: { color: '#333' } }
      },
      series: [
        {
          name: 'Gap to Comparison Driver',
          type: 'line',
          data: gaps,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: `${driver1Color}40` },
                { offset: 1, color: `${driver1Color}10` }
              ]
            }
          },
          lineStyle: { width: 2, color: driver1Color },
          symbolSize: 6,
          markLine: {
            data: [
              {
                yAxis: 2.0,
                label: { formatter: 'Battle Threshold (2s)', position: 'end' },
                lineStyle: { color: '#F59E0B', width: 2, type: 'dashed' }
              },
              {
                yAxis: 0,
                lineStyle: { color: '#6B7280', width: 1 }
              }
            ]
          }
        }
      ]
    };
  }, [battleMetrics, driver1Data, manifest]);

  const metricsData = useMemo(() => {
    if (!battleMetrics) return [];

    return [
      {
        label: 'Battle Laps',
        value: battleMetrics.battleLapCount,
        subtitle: `${battleMetrics.battles.length} events`
      },
      {
        label: 'Position Changes',
        value: `▲${battleMetrics.posChanges.gained} ▼${battleMetrics.posChanges.lost}`,
        color: battleMetrics.posChanges.gained > battleMetrics.posChanges.lost ? '#10B981' : '#EF4444'
      },
      {
        label: 'Avg Battle Gap',
        value: battleMetrics.avgGap !== null ? `${battleMetrics.avgGap.toFixed(3)}s` : 'N/A'
      },
      {
        label: 'Max Closing',
        value: `${battleMetrics.maxClosing.toFixed(3)}s/lap`,
        color: battleMetrics.maxClosing > 0 ? '#10B981' : '#FFFFFF'
      }
    ];
  }, [battleMetrics]);

  if (!positionChartOption && !gapChartOption) {
    return (
      <div className="mode-loading">
        <div>Loading battle data...</div>
        <div style={{ fontSize: '0.875rem', color: '#888', marginTop: '1rem' }}>
          Debug: Position chart: {positionChartOption ? 'OK' : 'NULL'}, 
          Gap chart: {gapChartOption ? 'OK' : 'NULL'}
        </div>
      </div>
    );
  }

  return (
    <div className="battle-mode">
      {battleMetrics && (
        <div className="battle-info">
          <span className="battle-count">
            {battleMetrics.battleLapCount} laps in battle (&lt;2s gap)
          </span>
        </div>
      )}

      {positionChartOption && (
        <div className="chart-container">
          <h3 className="chart-title">Position Timeline</h3>
          <ReactECharts option={positionChartOption} style={{ height: '300px', width: '100%' }} />
        </div>
      )}

      {gapChartOption && (
        <div className="chart-container">
          <h3 className="chart-title">Gap Evolution</h3>
          <ReactECharts option={gapChartOption} style={{ height: '300px', width: '100%' }} />
        </div>
      )}

      {!positionChartOption && !gapChartOption && (
        <div className="chart-container">
          <p style={{ color: '#888', textAlign: 'center', padding: '2rem' }}>
            No battle data available. This may occur if drivers have no overlapping laps or timeline data is missing.
          </p>
        </div>
      )}

      <RaceCompareMetricsPanel metrics={metricsData} />
    </div>
  );
}

export default BattleMode;
