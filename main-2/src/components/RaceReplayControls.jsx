import { useState, useRef, useEffect } from 'react';
import './RaceReplayControls.css';

const SPEED_OPTIONS = [0.25, 0.5, 1, 2, 3];

function RaceReplayControls({
  isPlaying,
  onPlayPause,
  currentTime,
  maxTime,
  onSeek,
  playbackSpeed,
  onSpeedChange
}) {
  const [isDragging, setIsDragging] = useState(false);
  const scrubberRef = useRef(null);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) {
      return '0:00.0';
    }
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms}`;
  };

  const handleScrubberMouseDown = (e) => {
    if (maxTime <= 0) {
      console.log('Cannot scrub: maxTime is', maxTime);
      return;
    }
    setIsDragging(true);
    updateTimeFromMouse(e);
  };

  const updateTimeFromMouse = (e) => {
    if (!scrubberRef.current || maxTime <= 0) return;

    const rect = scrubberRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const newTime = percentage * maxTime;
    console.log(`Scrubbing to ${newTime.toFixed(2)}s (${(percentage * 100).toFixed(1)}%)`);
    onSeek(newTime);
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e) => {
      if (!scrubberRef.current || maxTime <= 0) return;
      const rect = scrubberRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const newTime = percentage * maxTime;
      onSeek(newTime);
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleUp);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleUp);
    };
  }, [isDragging, maxTime, onSeek]);

  const progressPercentage = (maxTime > 0 && !isNaN(currentTime)) 
    ? Math.min(100, Math.max(0, (currentTime / maxTime) * 100))
    : 0;

  return (
    <div className="race-replay-controls">
      {/* Speed Controls */}
      <div className="speed-controls">
        <span className="speed-label">Speed:</span>
        <div className="speed-buttons">
          {SPEED_OPTIONS.map(speed => (
            <button
              key={speed}
              className={`speed-btn ${playbackSpeed === speed ? 'active' : ''}`}
              onClick={() => onSpeedChange(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      {/* Playback Controls */}
      <div className="playback-controls">
        <button 
          className="play-pause-btn"
          onClick={() => {
            console.log('Play/Pause clicked. Current state:', isPlaying, 'maxTime:', maxTime);
            onPlayPause();
          }}
          aria-label={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        <div className="time-display">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="time-separator">/</span>
          <span className="max-time">{formatTime(maxTime)}</span>
        </div>

        {/* Scrubber */}
        <div 
          ref={scrubberRef}
          className="scrubber"
          onMouseDown={handleScrubberMouseDown}
        >
          <div className="scrubber-track">
            <div 
              className="scrubber-progress"
              style={{ width: `${progressPercentage}%` }}
            />
            <div 
              className="scrubber-handle"
              style={{ left: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default RaceReplayControls;
