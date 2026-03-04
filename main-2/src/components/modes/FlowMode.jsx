import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import RaceCompareMetricsPanel from '../RaceCompareMetricsPanel';
import {
  getStartPosition,
  getFinishPosition,
  getBestPosition,
  calculateLeadershipMetrics
} from '../../utils/raceCompareCalculations';
import { getDriverColor } from '../../utils/raceCompareUtils';
import './FlowMode.css';

function FlowMode({ driver1Data, manifest }) {
  // Calculate flow metrics
  const flowMetrics = useMemo(() => {
    if (!driver1Data?.timeline) return null;

    const startPos = getStartPosition(driver1Data.timeline);
    const finishPos = getFinishPosition(driver1Data.timeline);
    const bestPos = getBestPosition(driver1Data.timeline);
    const leadership = calculateLeadershipMetrics(driver1Data.timeline);

    return {
      startPos,
      finishPos,
      bestPos,
      leadership
    };
  }, [driver1Data]);

  // Position flow chart
  const positionChartOption = useMemo(() => {
    if (!driver1Data?.timeline || !driver1Data?.rawData) {
      console.log('FlowMode: Missing data', {
        hasTimeline: !!driver1Data?.timeline,
        hasRawData: !!driver1Data?.rawData,
        eventCount: driver1Data?.timeline?.events?.length
      });
      return null;
    }

    const driver1Color = getDriverColor(driver1Data.rawData.driver_number, manifest);

    // Extract position data
    const positions = [];
    const lapNumbers = [];

    const sector3Events = driver1Data.timeline.events.filter(e => e.event_type === 'lap_complete');
    
    console.log('FlowMode position data:', {
      totalEvents: driver1Data.timeline.events.length,
      sector3Events: sector3Events.length,
      sampleEvent: sector3Events[0]
    });

    sector3Events.forEach(event => {
      lapNumbers.push(event.lap_number);
      positions.push(event.race_position);
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
        data: [driver1Data.rawData.driver_name],
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
          data: positions,
          lineStyle: { width: 4, color: driver1Color },
          symbolSize: 8,
          symbol: 'circle',
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
          }
        }
      ]
    };
  }, [driver1Data, manifest]);

  // Performance heatmap
  const heatmapOption = useMemo(() => {
    if (!driver1Data?.timeline || !driver1Data?.rawData) return null;

    const data = [];
    const lapNumbers = [];
    const sectors = ['S1', 'S2', 'S3'];

    driver1Data.timeline.events
      .filter(e => e.event_type.includes('sector'))
      .forEach(event => {
        const sectorIndex = event.sector - 1;
        const performanceValue = 
          event.sector_performance === 'fastest' ? 0 :
          event.sector_performance === 'slow' ? 2 : 1;
        
        data.push([event.lap_number - 1, sectorIndex, performanceValue]);
        
        if (!lapNumbers.includes(event.lap_number)) {
          lapNumbers.push(event.lap_number);
        }
      });

    return {
      backgroundColor: 'transparent',
      tooltip: {
        position: 'top',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#E63946',
        borderWidth: 2,
        textStyle: { color: '#FFFFFF' },
        formatter: (params) => {
          const performance = ['Fastest', 'Normal', 'Slow'][params.value[2]];
          return `Lap ${params.value[0] + 1} - ${sectors[params.value[1]]}<br/>Performance: ${performance}`;
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
        name: 'Lap',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { color: '#FFFFFF' },
        splitArea: { show: true }
      },
      yAxis: {
        type: 'category',
        data: sectors,
        name: 'Sector',
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { color: '#FFFFFF' },
        splitArea: { show: true }
      },
      visualMap: {
        min: 0,
        max: 2,
        calculable: false,
        orient: 'horizontal',
        left: 'center',
        bottom: '5%',
        pieces: [
          { value: 0, label: 'Fastest', color: '#10B981' },
          { value: 1, label: 'Normal', color: '#FCD34D' },
          { value: 2, label: 'Slow', color: '#EF4444' }
        ],
        textStyle: { color: '#FFFFFF' }
      },
      series: [{
        name: 'Performance',
        type: 'heatmap',
        data: data,
        label: { show: false },
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };
  }, [driver1Data]);

  const metricsData = useMemo(() => {
    if (!flowMetrics) return [];

    const posChange = flowMetrics.finishPos - flowMetrics.startPos;
    const posChangeColor = posChange < 0 ? '#10B981' : posChange > 0 ? '#EF4444' : '#FFFFFF';

    return [
      {
        label: 'Start Position',
        value: flowMetrics.startPos ? `P${flowMetrics.startPos}` : 'N/A'
      },
      {
        label: 'Finish Position',
        value: flowMetrics.finishPos ? `P${flowMetrics.finishPos} (${posChange > 0 ? '▼' : posChange < 0 ? '▲' : ''}${Math.abs(posChange)})` : 'N/A',
        color: posChangeColor
      },
      {
        label: 'Best Position',
        value: flowMetrics.bestPos ? `P${flowMetrics.bestPos.position} (L${flowMetrics.bestPos.lap})` : 'N/A',
        color: '#10B981'
      },
      {
        label: 'Laps Led',
        value: flowMetrics.leadership.lapsLed,
        subtitle: `${flowMetrics.leadership.lapsOnLeadLap} on lead lap`
      }
    ];
  }, [flowMetrics]);

  if (!positionChartOption) {
    return <div className="mode-loading">Loading race flow data...</div>;
  }

  return (
    <div className="flow-mode">
      <div className="chart-container">
        <h3 className="chart-title">Position Flow</h3>
        <ReactECharts option={positionChartOption} style={{ height: '350px', width: '100%' }} />
      </div>

      {heatmapOption && (
        <div className="chart-container">
          <h3 className="chart-title">Sector Performance Heatmap</h3>
          <ReactECharts option={heatmapOption} style={{ height: '300px', width: '100%' }} />
        </div>
      )}

      <RaceCompareMetricsPanel metrics={metricsData} />
    </div>
  );
}

export default FlowMode;
