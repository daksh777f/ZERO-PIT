import { useState, useMemo } from 'react';
import ReactECharts from 'echarts-for-react';
import RaceCompareMetricsPanel from '../RaceCompareMetricsPanel';
import {
  calculateTotalDelta,
  calculateSectorDelta,
  calculateAvgGap,
  compareBestLaps
} from '../../utils/raceCompareCalculations';
import { formatDelta, getDriverColor } from '../../utils/raceCompareUtils';
import './PerformanceMode.css';

function PerformanceMode({ driver1Data, driver2Data, manifest }) {
  const [visibleSectors, setVisibleSectors] = useState({
    sector1: true,
    sector2: true,
    sector3: true
  });
  const [showLapLines, setShowLapLines] = useState(true);

  // Calculate metrics
  const metrics = useMemo(() => {
    if (!driver1Data?.base || !driver2Data?.base) return null;

    const totalDelta = calculateTotalDelta(driver1Data.base, driver2Data.base);
    const s1Delta = calculateSectorDelta(driver1Data.base, driver2Data.base, 1);
    const s2Delta = calculateSectorDelta(driver1Data.base, driver2Data.base, 2);
    const s3Delta = calculateSectorDelta(driver1Data.base, driver2Data.base, 3);
    const minLaps = Math.min(driver1Data.base.length, driver2Data.base.length);
    const avgGap = calculateAvgGap(totalDelta, minLaps);
    const bestLaps = compareBestLaps(driver1Data.base, driver2Data.base);

    return {
      totalDelta,
      s1Delta,
      s2Delta,
      s3Delta,
      avgGap,
      bestLaps
    };
  }, [driver1Data, driver2Data]);

  // Prepare chart data
  const chartOption = useMemo(() => {
    if (!driver1Data?.base || !driver2Data?.base || !driver1Data?.rawData || !driver2Data?.rawData) {
      return null;
    }

    const minLaps = Math.min(driver1Data.base.length, driver2Data.base.length);
    const lapNumbers = Array.from({ length: minLaps }, (_, i) => i + 1);

    const driver1Color = getDriverColor(driver1Data.rawData.driver_number, manifest);
    const driver2Color = getDriverColor(driver2Data.rawData.driver_number, manifest);

    // Prepare sector data
    const d1S1 = driver1Data.base.slice(0, minLaps).map(l => l.sector1);
    const d1S2 = driver1Data.base.slice(0, minLaps).map(l => l.sector2);
    const d1S3 = driver1Data.base.slice(0, minLaps).map(l => l.sector3);
    const d2S1 = driver2Data.base.slice(0, minLaps).map(l => l.sector1);
    const d2S2 = driver2Data.base.slice(0, minLaps).map(l => l.sector2);
    const d2S3 = driver2Data.base.slice(0, minLaps).map(l => l.sector3);

    // Prepare lap time data
    const d1LapTimes = driver1Data.base.slice(0, minLaps).map(l => l.lapTime);
    const d2LapTimes = driver2Data.base.slice(0, minLaps).map(l => l.lapTime);

    const series = [];

    // Driver 1 sectors (stacked bars)
    if (visibleSectors.sector1) {
      series.push({
        name: `${driver1Data.rawData.driver_name} - S1`,
        type: 'bar',
        stack: 'driver1',
        data: d1S1,
        itemStyle: { color: driver1Color, opacity: 0.8 },
        barWidth: '35%',
        barGap: '10%'
      });
    }
    if (visibleSectors.sector2) {
      series.push({
        name: `${driver1Data.rawData.driver_name} - S2`,
        type: 'bar',
        stack: 'driver1',
        data: d1S2,
        itemStyle: { color: driver1Color, opacity: 0.6 },
        barWidth: '35%'
      });
    }
    if (visibleSectors.sector3) {
      series.push({
        name: `${driver1Data.rawData.driver_name} - S3`,
        type: 'bar',
        stack: 'driver1',
        data: d1S3,
        itemStyle: { color: driver1Color, opacity: 0.4 },
        barWidth: '35%'
      });
    }

    // Driver 2 sectors (stacked bars)
    if (visibleSectors.sector1) {
      series.push({
        name: `${driver2Data.rawData.driver_name} - S1`,
        type: 'bar',
        stack: 'driver2',
        data: d2S1,
        itemStyle: { color: driver2Color, opacity: 0.8 },
        barWidth: '35%'
      });
    }
    if (visibleSectors.sector2) {
      series.push({
        name: `${driver2Data.rawData.driver_name} - S2`,
        type: 'bar',
        stack: 'driver2',
        data: d2S2,
        itemStyle: { color: driver2Color, opacity: 0.6 },
        barWidth: '35%'
      });
    }
    if (visibleSectors.sector3) {
      series.push({
        name: `${driver2Data.rawData.driver_name} - S3`,
        type: 'bar',
        stack: 'driver2',
        data: d2S3,
        itemStyle: { color: driver2Color, opacity: 0.4 },
        barWidth: '35%'
      });
    }

    // Lap time lines
    if (showLapLines) {
      series.push({
        name: `${driver1Data.rawData.driver_name} Lap Time`,
        type: 'line',
        data: d1LapTimes,
        yAxisIndex: 1,
        lineStyle: { width: 2, color: driver1Color },
        symbol: 'circle',
        symbolSize: 6
      });
      series.push({
        name: `${driver2Data.rawData.driver_name} Lap Time`,
        type: 'line',
        data: d2LapTimes,
        yAxisIndex: 1,
        lineStyle: { width: 2, color: driver2Color },
        symbol: 'circle',
        symbolSize: 6
      });
    }

    return {
      backgroundColor: 'transparent',
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        borderColor: '#E63946',
        borderWidth: 2,
        textStyle: { color: '#FFFFFF' }
      },
      legend: {
        data: series.map(s => s.name),
        textStyle: { color: '#FFFFFF' },
        top: 10
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '15%',
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
      yAxis: [
        {
          type: 'value',
          name: 'Sector Time (s)',
          position: 'left',
          nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
          axisLabel: { color: '#FFFFFF', formatter: '{value}s' },
          axisLine: { lineStyle: { color: '#444' } },
          splitLine: { lineStyle: { color: '#333' } }
        },
        {
          type: 'value',
          name: 'Lap Time (s)',
          position: 'right',
          nameTextStyle: { color: '#FFFFFF', fontSize: 12 },
          axisLabel: { color: '#FFFFFF', formatter: '{value}s' },
          axisLine: { lineStyle: { color: '#444' } },
          splitLine: { show: false },
          // Tighter scaling to show variance better
          min: function(value) { return value.min - 1; },
          max: function(value) { return value.max + 1; }
        }
      ],
      dataZoom: [
        {
          type: 'slider',
          xAxisIndex: 0,
          start: 0,
          end: minLaps > 7 ? (7 / minLaps) * 100 : 100,
          height: 25,
          bottom: 60,
          handleSize: '80%',
          textStyle: { color: '#FFFFFF' },
          borderColor: '#E63946',
          fillerColor: 'rgba(230, 57, 70, 0.2)',
          handleStyle: { color: '#E63946' }
        },
        {
          type: 'inside',
          xAxisIndex: 0,
          zoomOnMouseWheel: true,
          moveOnMouseWheel: true
        }
      ],
      series: series
    };
  }, [driver1Data, driver2Data, manifest, visibleSectors, showLapLines]);

  // Navigator chart (minimap)
  const navigatorOption = useMemo(() => {
    if (!driver1Data?.base || !driver2Data?.base || !driver1Data?.rawData || !driver2Data?.rawData) {
      return null;
    }

    const minLaps = Math.min(driver1Data.base.length, driver2Data.base.length);
    const lapNumbers = Array.from({ length: minLaps }, (_, i) => i + 1);
    const d1LapTimes = driver1Data.base.slice(0, minLaps).map(l => l.lapTime);
    const d2LapTimes = driver2Data.base.slice(0, minLaps).map(l => l.lapTime);

    const driver1Color = getDriverColor(driver1Data.rawData.driver_number, manifest);
    const driver2Color = getDriverColor(driver2Data.rawData.driver_number, manifest);

    return {
      backgroundColor: 'transparent',
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
        axisLabel: { show: false },
        axisLine: { lineStyle: { color: '#444' } },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        axisLabel: { show: false },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false }
      },
      series: [
        {
          name: driver1Data.rawData.driver_name,
          type: 'line',
          data: d1LapTimes,
          lineStyle: { width: 1, color: driver1Color },
          symbol: 'none',
          animation: false
        },
        {
          name: driver2Data.rawData.driver_name,
          type: 'line',
          data: d2LapTimes,
          lineStyle: { width: 1, color: driver2Color },
          symbol: 'none',
          animation: false
        }
      ]
    };
  }, [driver1Data, driver2Data, manifest]);

  const handleSectorToggle = (sector) => {
    const activeCount = Object.values(visibleSectors).filter(v => v).length;
    if (activeCount === 1 && visibleSectors[sector]) {
      return; // Prevent hiding last sector
    }
    setVisibleSectors(prev => ({ ...prev, [sector]: !prev[sector] }));
  };

  const metricsData = useMemo(() => {
    if (!metrics) return [];

    const getDeltaColor = (delta) => {
      if (delta > 0) return '#EF4444'; // Red (slower)
      if (delta < 0) return '#10B981'; // Green (faster)
      return '#FFFFFF';
    };

    return [
      {
        label: 'Total Delta',
        value: formatDelta(metrics.totalDelta),
        color: getDeltaColor(metrics.totalDelta)
      },
      {
        label: 'S1 Delta',
        value: formatDelta(metrics.s1Delta.average),
        subtitle: `${formatDelta(metrics.s1Delta.min)} to ${formatDelta(metrics.s1Delta.max)}`,
        color: getDeltaColor(metrics.s1Delta.average)
      },
      {
        label: 'S2 Delta',
        value: formatDelta(metrics.s2Delta.average),
        subtitle: `${formatDelta(metrics.s2Delta.min)} to ${formatDelta(metrics.s2Delta.max)}`,
        color: getDeltaColor(metrics.s2Delta.average)
      },
      {
        label: 'S3 Delta',
        value: formatDelta(metrics.s3Delta.average),
        subtitle: `${formatDelta(metrics.s3Delta.min)} to ${formatDelta(metrics.s3Delta.max)}`,
        color: getDeltaColor(metrics.s3Delta.average)
      },
      {
        label: 'Avg Gap/Lap',
        value: formatDelta(metrics.avgGap),
        color: getDeltaColor(metrics.avgGap)
      }
    ];
  }, [metrics]);

  if (!chartOption) {
    return <div className="mode-loading">Loading performance data...</div>;
  }

  return (
    <div className="performance-mode">
      <div className="performance-controls">
        <div className="toggle-group">
          <label className="toggle-label">Sectors:</label>
          <button
            className={`toggle-btn ${visibleSectors.sector1 ? 'active' : ''}`}
            onClick={() => handleSectorToggle('sector1')}
          >
            S1
          </button>
          <button
            className={`toggle-btn ${visibleSectors.sector2 ? 'active' : ''}`}
            onClick={() => handleSectorToggle('sector2')}
          >
            S2
          </button>
          <button
            className={`toggle-btn ${visibleSectors.sector3 ? 'active' : ''}`}
            onClick={() => handleSectorToggle('sector3')}
          >
            S3
          </button>
        </div>
        <div className="toggle-group">
          <button
            className={`toggle-btn ${showLapLines ? 'active' : ''}`}
            onClick={() => setShowLapLines(!showLapLines)}
          >
            Lap Lines
          </button>
        </div>
      </div>

      <div className="chart-container">
        <ReactECharts option={chartOption} style={{ height: '500px', width: '100%' }} />
      </div>

      {navigatorOption && (
        <div className="navigator-container">
          <div className="navigator-label">Navigator (All Laps)</div>
          <ReactECharts option={navigatorOption} style={{ height: '80px', width: '100%' }} />
        </div>
      )}

      <RaceCompareMetricsPanel metrics={metricsData} />
    </div>
  );
}

export default PerformanceMode;
