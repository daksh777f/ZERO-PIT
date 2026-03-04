import { useEffect, useRef, useState, useCallback } from 'react';
import Map from 'ol/Map';
import View from 'ol/View';
import TileLayer from 'ol/layer/Tile';
import VectorLayer from 'ol/layer/Vector';
import VectorSource from 'ol/source/Vector';
import XYZ from 'ol/source/XYZ';
import { Feature } from 'ol';
import { Point } from 'ol/geom';
import { fromLonLat } from 'ol/proj';
import { Style, Circle, Fill, Stroke, Text } from 'ol/style';
import { DRIVER_COLORS } from './RaceReplayHeader';
import './RaceReplayMap.css';

function RaceReplayMap({
  session,
  manifest,
  selectedDrivers,
  followDriver,
  selectedLap,
  currentTime,
  isPlaying,
  playbackSpeed,
  onTimeUpdate,
  onMaxTimeUpdate,
  onDriverDataLoaded,
  onPlayingChange
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const vectorLayerRef = useRef(null);
  const driverDataRef = useRef({});
  const animationFrameRef = useRef(null);
  const lastUpdateTimeRef = useRef(Date.now());
  const currentTimeRef = useRef(currentTime);
  const updatePositionsRef = useRef(null);

  const [loadingDrivers, setLoadingDrivers] = useState(false);

  // Keep currentTimeRef in sync
  useEffect(() => {
    currentTimeRef.current = currentTime;
  }, [currentTime]);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    const vectorSource = new VectorSource();
    const vectorLayer = new VectorLayer({
      source: vectorSource,
      style: (feature) => createDriverStyle(feature)
    });
    vectorLayerRef.current = vectorLayer;

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({
          source: new XYZ({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            maxZoom: 19
          })
        }),
        vectorLayer
      ],
      view: new View({
        center: fromLonLat([-86.6195, 33.5323]), // Default center (Barber Motorsports Park)
        zoom: 15
      })
    });

    mapInstanceRef.current = map;

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setTarget(null);
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Load driver data when selected drivers change
  useEffect(() => {
    if (!manifest || selectedDrivers.length === 0) {
      console.log('Skipping load: manifest or selectedDrivers not ready');
      return;
    }

    console.log('Loading data for session:', session, 'drivers:', selectedDrivers);
    loadDriverData();
  }, [session, manifest, selectedDrivers.join(',')]);

  // Note: calculateMaxTime is called directly in loadDriverData after data is loaded

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    // Don't start animation if no data loaded
    if (Object.keys(driverDataRef.current).length === 0) {
      console.log('No driver data loaded, cannot start animation');
      onPlayingChange(false);
      return;
    }

    lastUpdateTimeRef.current = Date.now();
    
    const animate = () => {
      const now = Date.now();
      const deltaTime = (now - lastUpdateTimeRef.current) / 1000;
      lastUpdateTimeRef.current = now;

      // Get max time for current view
      let maxTimeForView = 0;
      Object.values(driverDataRef.current).forEach(driverData => {
        if (driverData.laps && driverData.laps.length > 0) {
          const lastLap = driverData.laps[driverData.laps.length - 1];
          if (lastLap.telemetry && lastLap.telemetry.length > 0) {
            const lastPoint = lastLap.telemetry[lastLap.telemetry.length - 1];
            maxTimeForView = Math.max(maxTimeForView, lastPoint.elapsed_race_time);
          }
        }
      });

      // Calculate new time using ref (to avoid stale closure)
      const safeCurrentTime = isNaN(currentTimeRef.current) || currentTimeRef.current === null ? 0 : currentTimeRef.current;
      const newTime = safeCurrentTime + (deltaTime * playbackSpeed);
      
      // Check if we've reached the end
      if (newTime >= maxTimeForView && maxTimeForView > 0) {
        onTimeUpdate(maxTimeForView);
        onPlayingChange(false); // Stop playback
        return; // Stop animation
      }

      // CRITICAL: Update positions FIRST with the new time
      if (updatePositionsRef.current) {
        updatePositionsRef.current(newTime);
      }
      
      // Then update the time state (this will trigger React re-render but won't update positions due to isPlaying check)
      onTimeUpdate(newTime);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isPlaying, playbackSpeed, onTimeUpdate, onPlayingChange]);

  // Update positions when currentTime changes (but NOT during playback - animation loop handles that)
  useEffect(() => {
    // Skip if playing - the animation loop handles position updates during playback
    if (isPlaying) {
      return;
    }
    
    if (Object.keys(driverDataRef.current).length > 0 && updatePositionsRef.current) {
      updatePositionsRef.current(currentTime);
    }
  }, [currentTime, selectedDrivers, selectedLap, isPlaying]);

  const loadDriverData = async () => {
    console.log('Loading driver data for:', selectedDrivers.length, 'drivers');
    setLoadingDrivers(true);
    const newDriverData = {};

    try {
      await Promise.all(
        selectedDrivers.map(async (driverNumber) => {
          const driver = manifest.drivers.find(d => d.driver_number === driverNumber);
          if (!driver) return;

          try {
            const response = await fetch(`/data/telemetry/${session}/${driver.file}`);
            if (!response.ok) throw new Error(`Failed to load ${driver.file}`);
            const data = await response.json();
            newDriverData[driverNumber] = data;
            console.log(`Loaded driver ${driverNumber}:`, data.driver_name, 'with', data.laps?.length, 'laps');
          } catch (err) {
            console.error(`Error loading driver ${driverNumber}:`, err);
          }
        })
      );

      console.log('All driver data loaded:', Object.keys(newDriverData).length, 'drivers');
      driverDataRef.current = newDriverData;
      
      // Calculate max time AFTER data is set
      const calculatedMaxTime = calculateMaxTime();
      console.log('Calculated max time:', calculatedMaxTime);
      
      // Notify parent that data is loaded
      onDriverDataLoaded(newDriverData);
      
      // Show initial positions at time 0
      updateDriverPositions(0);
      
      // Fit map to show all drivers
      setTimeout(() => fitMapToDrivers(), 100);
    } catch (err) {
      console.error('Error loading driver data:', err);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const calculateMaxTime = () => {
    let maxTime = 0;
    let dataCount = 0;

    Object.values(driverDataRef.current).forEach(driverData => {
      if (driverData.laps && driverData.laps.length > 0) {
        dataCount++;
        const lastLap = driverData.laps[driverData.laps.length - 1];
        if (lastLap.telemetry && lastLap.telemetry.length > 0) {
          const lastPoint = lastLap.telemetry[lastLap.telemetry.length - 1];
          maxTime = Math.max(maxTime, lastPoint.elapsed_race_time);
          console.log(`Driver ${driverData.driver_number} max time: ${lastPoint.elapsed_race_time}s`);
        }
      }
    });

    console.log(`Calculated max time from ${dataCount} drivers: ${maxTime}s`);
    onMaxTimeUpdate(maxTime);
    return maxTime;
  };



  const updateDriverPositions = useCallback((time) => {
    if (!vectorLayerRef.current || !manifest) {
      return;
    }

    // Ensure time is valid
    const safeTime = isNaN(time) || time === null ? 0 : time;

    const source = vectorLayerRef.current.getSource();
    if (!source) {
      return;
    }
    
    // Clear and recreate
    source.clear();
    
    const newFeatures = [];

    selectedDrivers.forEach(driverNumber => {
      const driverData = driverDataRef.current[driverNumber];
      if (!driverData) {
        return;
      }

      const position = getDriverPositionAtTime(driverData, safeTime, selectedLap);
      if (!position) {
        return;
      }
      
      const newCoords = fromLonLat([position.lon, position.lat]);
      
      // Get driver color
      const driverIndex = manifest.drivers.findIndex(d => d.driver_number === driverNumber);
      const color = DRIVER_COLORS[driverIndex % DRIVER_COLORS.length];
      
      // Create new feature with geometry
      const feature = new Feature({
        geometry: new Point(newCoords),
        driverNumber: driverNumber,
        driverName: driverData.driver_name,
        speed: position.speed_kph,
        color: color
      });
      
      // Set style
      feature.setStyle(new Style({
        image: new Circle({
          radius: 12,
          fill: new Fill({ color: color }),
          stroke: new Stroke({
            color: '#FFFFFF',
            width: 2
          })
        }),
        text: new Text({
          text: String(driverNumber),
          font: 'bold 11px sans-serif',
          fill: new Fill({ color: '#FFFFFF' }),
          stroke: new Stroke({
            color: '#000000',
            width: 2
          })
        })
      }));
      
      newFeatures.push(feature);
    });
    
    // Add all features at once
    if (newFeatures.length > 0) {
      source.addFeatures(newFeatures);
    }

    // Follow driver if selected
    if (followDriver && mapInstanceRef.current) {
      const followFeature = newFeatures.find(f => f.get('driverNumber') === followDriver);
      if (followFeature) {
        const coords = followFeature.getGeometry().getCoordinates();
        mapInstanceRef.current.getView().setCenter(coords);
      }
    }
  }, [manifest, selectedDrivers, selectedLap, followDriver]);
  
  // Store the function in a ref so animation loop can access it
  useEffect(() => {
    updatePositionsRef.current = updateDriverPositions;
  }, [updateDriverPositions]);

  const getDriverPositionAtTime = (driverData, time, startLap) => {
    if (!driverData.laps || driverData.laps.length === 0) {
      return null;
    }

    // Find all laps from startLap onwards
    const relevantLaps = driverData.laps.filter(lap => lap.lap_number >= startLap);
    if (relevantLaps.length === 0) {
      return null;
    }

    // Search through all relevant laps for the time
    for (const lap of relevantLaps) {
      if (!lap.telemetry || lap.telemetry.length === 0) continue;

      const firstPoint = lap.telemetry[0];
      const lastPoint = lap.telemetry[lap.telemetry.length - 1];

      // Check if time falls within this lap
      if (time >= firstPoint.elapsed_race_time && time <= lastPoint.elapsed_race_time) {
        // Find the two points to interpolate between
        let beforePoint = firstPoint;
        let afterPoint = null;

        for (let i = 0; i < lap.telemetry.length; i++) {
          const point = lap.telemetry[i];
          
          if (point.elapsed_race_time <= time) {
            beforePoint = point;
          }
          
          if (point.elapsed_race_time >= time) {
            afterPoint = point;
            break;
          }
        }

        // If we don't have an after point, use the before point
        if (!afterPoint || beforePoint === afterPoint) {
          return beforePoint;
        }

        // Calculate interpolation factor (0 to 1)
        const timeDiff = afterPoint.elapsed_race_time - beforePoint.elapsed_race_time;
        const t = timeDiff > 0 ? (time - beforePoint.elapsed_race_time) / timeDiff : 0;

        // Interpolate position (lat/lon)
        const interpolatedLat = beforePoint.lat + (afterPoint.lat - beforePoint.lat) * t;
        const interpolatedLon = beforePoint.lon + (afterPoint.lon - beforePoint.lon) * t;
        
        // Interpolate speed
        const interpolatedSpeed = beforePoint.speed_kph + (afterPoint.speed_kph - beforePoint.speed_kph) * t;

        // Return interpolated position
        return {
          lat: interpolatedLat,
          lon: interpolatedLon,
          speed_kph: interpolatedSpeed,
          elapsed_race_time: time
        };
      }
    }

    // If time is beyond all laps, return null (driver disappeared)
    return null;
  };

  const getDriverColor = (driverNumber) => {
    if (!manifest) return '#FFFFFF';
    const index = manifest.drivers.findIndex(d => d.driver_number === driverNumber);
    return DRIVER_COLORS[index % DRIVER_COLORS.length];
  };

  const createDriverStyle = (feature) => {
    const color = feature.get('color');
    const driverNumber = feature.get('driverNumber');

    return new Style({
      image: new Circle({
        radius: 12,
        fill: new Fill({ color: color }),
        stroke: new Stroke({
          color: '#FFFFFF',
          width: 2
        })
      }),
      text: new Text({
        text: driverNumber,
        font: 'bold 11px sans-serif',
        fill: new Fill({ color: '#FFFFFF' }),
        stroke: new Stroke({
          color: '#000000',
          width: 2
        })
      })
    });
  };

  const fitMapToDrivers = () => {
    if (!mapInstanceRef.current || !vectorLayerRef.current || followDriver) return;

    const source = vectorLayerRef.current.getSource();
    const extent = source.getExtent();
    
    if (extent && extent.every(val => isFinite(val))) {
      mapInstanceRef.current.getView().fit(extent, {
        padding: [100, 100, 150, 100], // Extra padding at bottom for controls
        duration: 500,
        maxZoom: 17
      });
    }
  };

  const getFollowDriverName = () => {
    if (!followDriver || !manifest) return '';
    const driver = manifest.drivers.find(d => d.driver_number === followDriver);
    return driver ? `${driver.driver_name} (#${driver.driver_number})` : '';
  };

  const getFollowDriverSpeed = () => {
    if (!followDriver || !vectorLayerRef.current) return null;
    const source = vectorLayerRef.current.getSource();
    const features = source.getFeatures();
    const followFeature = features.find(f => f.get('driverNumber') === followDriver);
    return followFeature ? followFeature.get('speed') : null;
  };

  return (
    <div className="race-replay-map-container">
      <div ref={mapRef} className="race-replay-map" />
      {loadingDrivers && (
        <div className="map-loading-overlay">
          <div className="loading-spinner"></div>
          <div>Loading driver data...</div>
        </div>
      )}
      {followDriver && (
        <div className="follow-mode-indicator">
          <span className="follow-icon">📍</span>
          Following: {getFollowDriverName()}
          {getFollowDriverSpeed() && (
            <span className="follow-speed"> • {Math.round(getFollowDriverSpeed())} km/h</span>
          )}
        </div>
      )}
    </div>
  );
}

export default RaceReplayMap;
