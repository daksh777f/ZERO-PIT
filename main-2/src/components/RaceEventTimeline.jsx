import { useState, useEffect, useRef, useMemo, memo, useCallback } from 'react';
import { DRIVER_COLORS } from './RaceReplayHeader';
import './RaceEventTimeline.css';

// Utility functions outside component to prevent recreation
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00.0';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
};

const formatDelta = (delta) => {
  if (delta === null || delta === undefined || isNaN(delta)) return 'N/A';
  const sign = delta >= 0 ? '+' : '';
  return `${sign}${delta.toFixed(3)}s`;
};

const formatDistance = (meters) => {
  if (meters === null || meters === undefined || isNaN(meters)) return 'N/A';
  return `${meters.toFixed(1)}m`;
};

const getEventTypeLabel = (eventType) => {
  switch (eventType) {
    case 'sector_1_complete':
      return 'S1';
    case 'sector_2_complete':
      return 'S2';
    case 'sector_3_complete':
      return 'S3';
    case 'lap_complete':
      return 'LAP';
    default:
      return eventType;
  }
};

// Memoized event card component to prevent unnecessary re-renders
const EventCard = memo(({ event, driverColor }) => {
  return (
    <div
      className={`timeline-event ${event.event_type === 'lap_complete' ? 'lap-complete' : ''}`}
      style={{
        borderLeftColor: driverColor
      }}
    >
      <div className="event-header">
        <div className="event-driver">
          <span
            className="driver-number"
            style={{ backgroundColor: driverColor }}
          >
            {event.driver_number}
          </span>
          <span className="driver-name">{event.driver_name}</span>
        </div>
        <div className="event-type-badge">
          {getEventTypeLabel(event.event_type)}
        </div>
      </div>

      <div className="event-details">
        <div className="event-detail-row">
          <span className="detail-label">Lap {event.lap_number}</span>
          <span className="detail-separator">•</span>
          <span className="detail-label">Sector {event.sector}</span>
          <span className="detail-separator">•</span>
          <span className="detail-value position">P{event.race_position}</span>
        </div>

        <div className="event-detail-row">
          <span className="detail-label">Sector Time:</span>
          <span className="detail-value">{formatTime(event.sector_time)}</span>
          <span className="detail-separator">•</span>
          <span className="detail-label">Race Time:</span>
          <span className="detail-value">{formatTime(event.elapsed_race_time)}</span>
        </div>

        <div className="event-detail-row deltas">
          <div className="delta-item">
            <span className="delta-label">Ahead:</span>
            <span className="delta-value">
              {formatDelta(event.deltas?.to_car_ahead)}
            </span>
          </div>
          <div className="delta-item">
            <span className="delta-label">Behind:</span>
            <span className="delta-value">
              {formatDelta(event.deltas?.to_car_behind)}
            </span>
          </div>
          <div className="delta-item">
            <span className="delta-label">Gap:</span>
            <span className="delta-value">
              {formatDistance(event.gap_distance_meters)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

EventCard.displayName = 'EventCard';

function RaceEventTimeline({
  session,
  manifest,
  selectedDrivers,
  currentTime
}) {
  const [events, setEvents] = useState([]);
  const [displayedEvents, setDisplayedEvents] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const timelineRef = useRef(null);
  const lastEventIndexRef = useRef(0);
  const userScrolledRef = useRef(false);
  const scrollTimeoutRef = useRef(null);
  
  // Maximum number of events to keep in DOM for performance
  const MAX_DISPLAYED_EVENTS = 35;

  // Load event timeline data
  useEffect(() => {
    if (!session) return;
    
    loadEventTimeline();
  }, [session]);

  // Memoize selected drivers set for faster lookup
  const selectedDriversSet = useMemo(() => new Set(selectedDrivers), [selectedDrivers.join(',')]);

  // Update displayed events based on current time
  // Use ref to track last update time to throttle updates
  const lastUpdateTimeRef = useRef(0);
  const pendingUpdateRef = useRef(null);
  
  useEffect(() => {
    if (events.length === 0 || !manifest) return;

    // Throttle updates to every 100ms instead of every frame (60fps -> 10fps for timeline)
    const now = Date.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    
    if (timeSinceLastUpdate < 100) {
      // Schedule an update for later if one isn't already scheduled
      if (!pendingUpdateRef.current) {
        pendingUpdateRef.current = setTimeout(() => {
          pendingUpdateRef.current = null;
          lastUpdateTimeRef.current = Date.now();
          updateDisplayedEvents();
        }, 100 - timeSinceLastUpdate);
      }
      return;
    }
    
    lastUpdateTimeRef.current = now;
    updateDisplayedEvents();
    
    function updateDisplayedEvents() {
      // Find all events up to current time (with 0.2s buffer for matching)
      const buffer = 0.2;
      const targetTime = currentTime + buffer;
      
      // Filter events - only check new events since last update
      const relevantEvents = events.filter(event => 
        selectedDriversSet.has(event.driver_number) && 
        event.elapsed_race_time <= targetTime
      );

      // Only update if we have new events
      if (relevantEvents.length > lastEventIndexRef.current) {
        // Window the events to only keep the most recent MAX_DISPLAYED_EVENTS
        const windowedEvents = relevantEvents.length > MAX_DISPLAYED_EVENTS
          ? relevantEvents.slice(-MAX_DISPLAYED_EVENTS)
          : relevantEvents;
        
        setDisplayedEvents(windowedEvents);
        lastEventIndexRef.current = relevantEvents.length;
        
        // Auto-scroll to bottom
        if (autoScroll && timelineRef.current) {
          requestAnimationFrame(() => {
            if (timelineRef.current) {
              timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
            }
          });
        }
      }
    }
    
    return () => {
      if (pendingUpdateRef.current) {
        clearTimeout(pendingUpdateRef.current);
        pendingUpdateRef.current = null;
      }
    };
  }, [currentTime, events, selectedDriversSet, manifest, autoScroll]);

  // Reset when selected drivers change
  useEffect(() => {
    lastEventIndexRef.current = 0;
    setDisplayedEvents([]);
  }, [selectedDrivers.join(',')]);

  // Detect user scroll
  useEffect(() => {
    const timeline = timelineRef.current;
    if (!timeline) return;

    const handleScroll = () => {
      // Clear existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }

      // Check if user scrolled away from bottom
      const isAtBottom = timeline.scrollHeight - timeline.scrollTop - timeline.clientHeight < 50;
      
      if (!isAtBottom && autoScroll) {
        // User scrolled up, disable auto-scroll
        userScrolledRef.current = true;
        setAutoScroll(false);
      }
    };

    timeline.addEventListener('scroll', handleScroll);
    return () => {
      timeline.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [autoScroll]);

  const loadEventTimeline = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/data/telemetry/${session}/event_timeline_complete.json`);
      if (!response.ok) {
        // If event timeline doesn't exist for this session, show a friendly message
        if (response.status === 404) {
          setError('Event timeline not available for this session');
        } else {
          throw new Error('Failed to load event timeline');
        }
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      console.log(`[Timeline] Loaded ${data.events?.length || 0} events for session ${session}`);
      setEvents(data.events || []);
      setLoading(false);
    } catch (err) {
      console.error('Error loading event timeline:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  // Memoize driver color lookup
  const getDriverColor = useCallback((driverNumber) => {
    if (!manifest) return '#FFFFFF';
    const index = manifest.drivers.findIndex(d => d.driver_number === driverNumber);
    return DRIVER_COLORS[index % DRIVER_COLORS.length];
  }, [manifest]);

  const handleAutoScrollToggle = () => {
    const newAutoScroll = !autoScroll;
    setAutoScroll(newAutoScroll);
    
    // If enabling auto-scroll, scroll to bottom
    if (newAutoScroll && timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  };

  if (loading) {
    return (
      <div className="race-event-timeline loading">
        <div className="timeline-loading">
          <div className="loading-spinner"></div>
          <div>Loading Events...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="race-event-timeline error">
        <div className="timeline-error">
          <h3>Error Loading Events</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="race-event-timeline">
      <div className="timeline-header">
        <h3 className="timeline-title">Race Events</h3>
        <div className="timeline-controls">
          <label className="auto-scroll-toggle">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={handleAutoScrollToggle}
            />
            <span>Auto-scroll</span>
          </label>
          <div className="event-count">
            {displayedEvents.length} events
            {displayedEvents.length >= MAX_DISPLAYED_EVENTS && (
              <span style={{marginLeft: '0.5rem', fontSize: '0.7rem', opacity: 0.7}}>
                (showing last {MAX_DISPLAYED_EVENTS})
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="timeline-content" ref={timelineRef}>
        {displayedEvents.length === 0 ? (
          <div className="timeline-empty">
            <p>No events yet. Start playback to see race events.</p>
          </div>
        ) : (
          <div className="timeline-events">
            {displayedEvents.map((event) => (
              <EventCard
                key={event.event_id}
                event={event}
                driverColor={getDriverColor(event.driver_number)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default RaceEventTimeline;
