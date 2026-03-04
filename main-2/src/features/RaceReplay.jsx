import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import RaceReplayHeader from '../components/RaceReplayHeader';
import RaceReplayMap from '../components/RaceReplayMap';
import RaceReplayControls from '../components/RaceReplayControls';
import RaceEventTimeline from '../components/RaceEventTimeline';
import RaceCommentaryPopup from '../components/RaceCommentaryPopup';
import useRaceCommentary from '../hooks/useRaceCommentary';
import './RaceReplay.css';

function RaceReplay() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [manifest, setManifest] = useState(null);
  const [selectedDrivers, setSelectedDrivers] = useState([]);
  const [followDriver, setFollowDriver] = useState(null);
  const [selectedLap, setSelectedLap] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [maxTime, setMaxTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [driverData, setDriverData] = useState({});
  const [dataLoaded, setDataLoaded] = useState(false);
  const [audioMuted, setAudioMuted] = useState(() => {
    // Load mute preference from localStorage
    const saved = localStorage.getItem('raceCommentaryMuted');
    return saved === 'true';
  });
  
  const navigate = useNavigate();
  const location = useLocation();

  // Use race commentary hook
  const { currentCommentary, isCommentaryVisible, hasCommentaryData } = useRaceCommentary(
    selectedSession,
    currentTime,
    isPlaying,
    audioMuted,
    playbackSpeed
  );

  // Load available sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

  // Load manifest when session changes
  useEffect(() => {
    if (selectedSession) {
      loadManifest();
    }
  }, [selectedSession]);

  const loadSessions = async () => {
    setLoading(true);
    setError(null);
    
    // Try to discover sessions by attempting to load manifests
    const potentialSessions = ['race_1', 'race_2', 'practice_1', 'practice_2', 'qualifying'];
    const availableSessions = [];
    
    try {
      await Promise.all(
        potentialSessions.map(async (session) => {
          try {
            const response = await fetch(`/data/telemetry/${session}/manifest.json`);
            if (response.ok) {
              availableSessions.push(session);
            }
          } catch (err) {
            // Session doesn't exist, skip
          }
        })
      );
      
      if (availableSessions.length > 0) {
        setSessions(availableSessions);
        // Default to race_2 if available, otherwise use first session
        const defaultSession = availableSessions.includes('race_2') ? 'race_2' : availableSessions[0];
        setSelectedSession(defaultSession);
      } else {
        throw new Error('No sessions found');
      }
      
      setLoading(false);
    } catch (err) {
      setError('No telemetry sessions found');
      setLoading(false);
    }
  };

  const loadManifest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/data/telemetry/${selectedSession}/manifest.json`);
      if (!response.ok) throw new Error('Failed to load manifest');
      const manifestData = await response.json();
      setManifest(manifestData);
      
      // Auto-select all drivers initially
      const allDrivers = manifestData.drivers.map(d => d.driver_number);
      setSelectedDrivers(allDrivers);
      
      // Calculate max time from manifest (we'll refine this when loading actual data)
      const maxLaps = Math.max(...manifestData.drivers.map(d => d.total_laps));
      setSelectedLap(1);
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSessionChange = (session) => {
    setSelectedSession(session);
    setCurrentTime(0);
    setIsPlaying(false);
    setSelectedLap(1);
    setDataLoaded(false);
  };

  const handleDriverToggle = (driverNumber) => {
    setSelectedDrivers(prev => {
      if (prev.includes(driverNumber)) {
        const newSelected = prev.filter(d => d !== driverNumber);
        // If we're unfollowing the followed driver, clear follow
        if (followDriver === driverNumber) {
          setFollowDriver(null);
        }
        return newSelected;
      } else {
        return [...prev, driverNumber];
      }
    });
  };

  const handleFollowDriver = (driverNumber) => {
    // Only allow following if driver is selected
    if (selectedDrivers.includes(driverNumber)) {
      // Toggle: if clicking the same driver, unfollow; otherwise follow new driver
      setFollowDriver(driverNumber === followDriver ? null : driverNumber);
    } else {
      // If driver is not selected, clear follow
      setFollowDriver(null);
    }
  };

  const handleLapChange = (lap) => {
    setSelectedLap(lap);
    setIsPlaying(false);
    
    // Find the start time of the selected lap
    if (dataLoaded && Object.keys(driverData).length > 0) {
      const lapStartTime = getLapStartTime(lap);
      setCurrentTime(lapStartTime);
    }
  };

  const getLapStartTime = (lapNumber) => {
    // Find the earliest start time for the selected lap across all drivers
    let minTime = Infinity;
    
    Object.values(driverData).forEach(data => {
      if (data.laps) {
        const lap = data.laps.find(l => l.lap_number === lapNumber);
        if (lap && lap.telemetry && lap.telemetry.length > 0) {
          const startTime = lap.telemetry[0].elapsed_race_time;
          minTime = Math.min(minTime, startTime);
        }
      }
    });
    
    return minTime === Infinity ? 0 : minTime;
  };

  const handleDataLoaded = (data) => {
    setDriverData(data);
    setDataLoaded(true);
  };

  const handleAudioMuteToggle = () => {
    const newMuted = !audioMuted;
    setAudioMuted(newMuted);
    // Save preference to localStorage
    localStorage.setItem('raceCommentaryMuted', newMuted.toString());
  };

  // Debug logging removed - was causing performance issues during playback

  // Memoize featureHeader to prevent Layout re-renders on every currentTime change
  const featureHeader = useMemo(() => (
    <RaceReplayHeader 
      sessions={sessions}
      selectedSession={selectedSession}
      onSessionChange={handleSessionChange}
      manifest={manifest}
      selectedDrivers={selectedDrivers}
      followDriver={followDriver}
      onDriverToggle={handleDriverToggle}
      onFollowDriver={handleFollowDriver}
      selectedLap={selectedLap}
      onLapChange={handleLapChange}
      audioMuted={audioMuted}
      onAudioMuteToggle={handleAudioMuteToggle}
    />
  ), [sessions, selectedSession, manifest, selectedDrivers, followDriver, selectedLap, audioMuted]);

  return (
    <Layout 
      noScroll={true}
      featureHeader={featureHeader}
    >
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading Race Data...</div>
        </div>
      ) : error ? (
        <div className="error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
        </div>
      ) : (
        <div className="race-replay-container">
          <div className="race-replay-main">
            <div className="race-replay-map-section">
              <RaceReplayMap
                session={selectedSession}
                manifest={manifest}
                selectedDrivers={selectedDrivers}
                followDriver={followDriver}
                selectedLap={selectedLap}
                currentTime={currentTime}
                isPlaying={isPlaying}
                playbackSpeed={playbackSpeed}
                onTimeUpdate={setCurrentTime}
                onMaxTimeUpdate={setMaxTime}
                onDriverDataLoaded={handleDataLoaded}
                onPlayingChange={setIsPlaying}
              />
              {/* Commentary Popup Overlay */}
              {hasCommentaryData && (
                <RaceCommentaryPopup
                  message={currentCommentary?.event_message}
                  isVisible={isCommentaryVisible}
                />
              )}
            </div>
            <div className="race-replay-timeline-section">
              <RaceEventTimeline
                session={selectedSession}
                manifest={manifest}
                selectedDrivers={selectedDrivers}
                currentTime={currentTime}
              />
            </div>
          </div>
          <RaceReplayControls
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            currentTime={currentTime}
            maxTime={maxTime}
            onSeek={setCurrentTime}
            playbackSpeed={playbackSpeed}
            onSpeedChange={setPlaybackSpeed}
          />
        </div>
      )}
    </Layout>
  );
}

export default RaceReplay;
