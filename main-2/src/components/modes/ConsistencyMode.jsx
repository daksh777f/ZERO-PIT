import { useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import RaceCompareMetricsPanel from '../RaceCompareMetricsPanel';
import {
  getBestLap,
  getAverageLap,
  getWorstLap,
  getConsistencyMetrics,
  rankSectorVariability,
  identifyOutlierLaps,
  createHistogram
} from '../../utils/raceCompareCalculations';
import { formatTime, calculateBoxPlotData } from '../../utils/raceCompareUtils';
import './ConsistencyMode.css';

function ConsistencyMode({ driver1Data }) {
  // Calculate consistency metrics
  const consistencyMetrics = useMemo(() => {
    if (!driver1Data?.base) return null;

    const best = getBestLap(driver1Data.base);
    const avg = getAverageLap(driver1Data.base);
    const worst = getWorstLap(driver1Data.base);
    const consistency = getConsistencyMetrics(driver1Data.base);
    const sectorRanking = rankSectorVariability(driver1Data.base);
    const outliers = identifyOutlierLaps(driver1Data.base);

    return {
      best,
      avg,
      worst,
      consistency,
      sectorRanking,
      outliers
    };
  }, [driver1Data]);

  // Histogram chart
  const histogramOption = useMemo(() => {
    if (!driver1Data?.base) return null;

    const lapTimes = driver1Data.base.map(l => l.lapTime);
    const { bins, frequencies } = createHistogram(lapTimes, 8);
    const avg = consistencyMetrics.avg;

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#E63946',
        borderWidth: 2,
        textStyle: { color: '#FFFFFF' }
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
        top: '10%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: bins,
        name: 'Lap Time (s)',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { 
          color: '#FFFFFF',
          rotate: 45,
          formatter: (value) => {
            const parts = value.split('-');
            return ((parseFloat(parts[0]) + parseFloat(parts[1])) / 2).toFixed(1);
          }
        },
        axisLine: { lineStyle: { color: '#444' } }
      },
      yAxis: {
        type: 'value',
        name: 'Frequency',
        minInterval: 1,
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { color: '#FFFFFF' },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: { lineStyle: { color: '#333' } }
      },
      series: [{
        name: 'Lap Count',
        type: 'bar',
        data: frequencies,
        itemStyle: { color: '#3B82F6' },
        barWidth: '90%',
        label: {
          show: true,
          position: 'top',
          formatter: '{c}',
          color: '#FFFFFF'
        },
        markLine: {
          data: [
            {
              name: 'Average',
              xAxis: bins.findIndex(bin => {
                const [min, max] = bin.split('-').map(parseFloat);
                return avg >= min && avg <= max;
              }),
              label: { formatter: 'Avg', position: 'end' },
              lineStyle: { color: '#F59E0B', width: 2, type: 'dashed' }
            }
          ]
        }
      }]
    };
  }, [driver1Data, consistencyMetrics]);

  // Box plot chart
  const boxPlotOption = useMemo(() => {
    if (!driver1Data?.base || driver1Data.base.length === 0) return null;

    const s1Times = driver1Data.base.map(l => l.sector1).filter(t => t && !isNaN(t));
    const s2Times = driver1Data.base.map(l => l.sector2).filter(t => t && !isNaN(t));
    const s3Times = driver1Data.base.map(l => l.sector3).filter(t => t && !isNaN(t));

    console.log('ConsistencyMode box plot data:', {
      s1Count: s1Times.length,
      s2Count: s2Times.length,
      s3Count: s3Times.length,
      s1Sample: s1Times.slice(0, 3),
      s2Sample: s2Times.slice(0, 3),
      s3Sample: s3Times.slice(0, 3)
    });

    if (s1Times.length === 0 || s2Times.length === 0 || s3Times.length === 0) {
      console.error('ConsistencyMode: No valid sector times found');
      return null;
    }

    const s1Data = calculateBoxPlotData(s1Times);
    const s2Data = calculateBoxPlotData(s2Times);
    const s3Data = calculateBoxPlotData(s3Times);

    // Calculate dynamic y-axis bounds with 10% buffer
    const allSectorTimes = [...s1Times, ...s2Times, ...s3Times];
    const minValue = Math.min(...allSectorTimes);
    const maxValue = Math.max(...allSectorTimes);
    const range = maxValue - minValue;
    const yMin = minValue - (range * 0.1);
    const yMax = maxValue + (range * 0.1);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#E63946',
        borderWidth: 2,
        textStyle: { color: '#FFFFFF' },
        formatter: (params) => {
          if (params.componentSubType === 'boxplot') {
            const [min, q1, median, q3, max] = params.value;
            return `${params.name}<br/>
              Min: ${min.toFixed(3)}s<br/>
              Q1: ${q1.toFixed(3)}s<br/>
              Median: ${median.toFixed(3)}s<br/>
              Q3: ${q3.toFixed(3)}s<br/>
              Max: ${max.toFixed(3)}s`;
          }
          return params.name;
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
        data: ['S1', 'S2', 'S3'],
        name: 'Sector',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { color: '#FFFFFF' },
        axisLine: { lineStyle: { color: '#444' } }
      },
      yAxis: {
        type: 'value',
        name: 'Time (s)',
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { 
          color: '#FFFFFF', 
          formatter: (value) => `${value.toFixed(2)}s`
        },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: { lineStyle: { color: '#333' } },
        min: yMin,
        max: yMax
      },
      series: [
        {
          name: 'Sector Times',
          type: 'boxplot',
          data: [s1Data?.boxData, s2Data?.boxData, s3Data?.boxData],
          itemStyle: {
            color: '#3B82F6',
            borderColor: '#1E40AF'
          }
        },
        {
          name: 'Outliers',
          type: 'scatter',
          data: [
            ...(s1Data?.outliers.map(v => [0, v]) || []),
            ...(s2Data?.outliers.map(v => [1, v]) || []),
            ...(s3Data?.outliers.map(v => [2, v]) || [])
          ],
          itemStyle: { color: '#EF4444' },
          symbolSize: 8
        }
      ]
    };
  }, [driver1Data]);

  // Lap time trace chart
  const traceOption = useMemo(() => {
    if (!driver1Data?.base || !consistencyMetrics) return null;

    const lapTimePoints = driver1Data.base
      .filter(l => l.lapTime && !isNaN(l.lapTime))
      .map(l => [l.lapNumber, l.lapTime]);
    
    if (lapTimePoints.length === 0) return null;

    const avg = consistencyMetrics.avg;
    const best = consistencyMetrics.best.time;
    const allTimes = lapTimePoints.map(p => p[1]);
    const minTime = Math.min(...allTimes);
    const maxTime = Math.max(...allTimes);

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'item',
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#E63946',
        borderWidth: 2,
        textStyle: { color: '#FFFFFF' },
        formatter: (params) => {
          return `Lap ${params.value[0]}<br/>Time: ${formatTime(params.value[1])}`;
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
        type: 'value',
        min: 1,
        max: driver1Data.base.length,
        name: 'Lap Number',
        nameLocation: 'middle',
        nameGap: 30,
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { color: '#FFFFFF' },
        axisLine: { lineStyle: { color: '#444' } }
      },
      yAxis: {
        type: 'value',
        name: 'Lap Time (s)',
        nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
        axisLabel: { color: '#FFFFFF', formatter: '{value}s' },
        axisLine: { lineStyle: { color: '#444' } },
        splitLine: { lineStyle: { color: '#333' } },
        // Tighter scaling to show variance
        min: minTime - 1,
        max: maxTime + 1
      },
      series: [
        {
          name: 'Lap Times',
          type: 'scatter',
          data: lapTimePoints,
          symbolSize: 8,
          itemStyle: { color: '#3B82F6' },
          markLine: {
            data: [
              {
                yAxis: best,
                label: { formatter: `Best: ${formatTime(best)}`, position: 'end' },
                lineStyle: { color: '#10B981', width: 2 }
              },
              {
                yAxis: avg,
                label: { formatter: `Avg: ${formatTime(avg)}`, position: 'end' },
                lineStyle: { color: '#F59E0B', width: 2, type: 'dashed' }
              }
            ]
          }
        }
      ]
    };
  }, [driver1Data, consistencyMetrics]);

  const metricsData = useMemo(() => {
    if (!consistencyMetrics) return [];

    return [
      {
        label: 'Best Lap',
        value: formatTime(consistencyMetrics.best.time),
        subtitle: `Lap ${consistencyMetrics.best.lap}`,
        color: '#10B981'
      },
      {
        label: 'Avg Lap',
        value: formatTime(consistencyMetrics.avg)
      },
      {
        label: 'Worst Lap',
        value: formatTime(consistencyMetrics.worst.time),
        subtitle: `Lap ${consistencyMetrics.worst.lap}`,
        color: '#EF4444'
      },
      {
        label: 'Lap Std Dev',
        value: `${consistencyMetrics.consistency.lapStdDev.toFixed(3)}s`
      },
      {
        label: 'S1 Std Dev',
        value: `${consistencyMetrics.consistency.s1StdDev.toFixed(3)}s`
      },
      {
        label: 'S2 Std Dev',
        value: `${consistencyMetrics.consistency.s2StdDev.toFixed(3)}s`
      }
    ];
  }, [consistencyMetrics]);

  if (!histogramOption) {
    return <div className="mode-loading">Loading consistency data...</div>;
  }

  return (
    <div className="consistency-mode">
      <div className="chart-container">
        <h3 className="chart-title">Lap Time Distribution</h3>
        <ReactECharts option={histogramOption} style={{ height: '300px', width: '100%' }} />
      </div>

      <div className="chart-container">
        <h3 className="chart-title">Sector Consistency (Box Plot)</h3>
        <ReactECharts option={boxPlotOption} style={{ height: '300px', width: '100%' }} />
      </div>

      <div className="chart-container">
        <h3 className="chart-title">Lap Time Trace</h3>
        <ReactECharts option={traceOption} style={{ height: '300px', width: '100%' }} />
      </div>

      <RaceCompareMetricsPanel metrics={metricsData} />
    </div>
  );
}

export default ConsistencyMode;
