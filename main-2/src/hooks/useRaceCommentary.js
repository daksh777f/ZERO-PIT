import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook to manage race commentary playback
 * Handles loading commentary data, queueing events, and audio playback
 */
function useRaceCommentary(session, currentTime, isPlaying, isMuted, playbackSpeed = 1) {
  const [commentaryEvents, setCommentaryEvents] = useState([]);
  const [currentCommentary, setCurrentCommentary] = useState(null);
  const [isCommentaryVisible, setIsCommentaryVisible] = useState(false);
  
  const queueRef = useRef([]);
  const processedEventsRef = useRef(new Set());
  const currentAudioRef = useRef(null);
  const displayTimeoutRef = useRef(null);
  const queueProcessingRef = useRef(false);
  const lastTimeRef = useRef(0);

  // Load commentary data when session changes
  useEffect(() => {
    if (!session) return;
    
    loadCommentaryData();
    
    // Cleanup on session change
    return () => {
      stopCurrentCommentary();
      queueRef.current = [];
      processedEventsRef.current.clear();
    };
  }, [session]);

  // Reset processed events when seeking backwards
  useEffect(() => {
    if (currentTime < lastTimeRef.current - 1) {
      // User seeked backwards, reset processed events
      const eventsToReset = Array.from(processedEventsRef.current).filter(eventId => {
        const event = commentaryEvents.find(e => e.event_id === eventId);
        return event && event.elapsed_race_time > currentTime;
      });
      
      eventsToReset.forEach(eventId => {
        processedEventsRef.current.delete(eventId);
      });
    }
    
    lastTimeRef.current = currentTime;
  }, [currentTime, commentaryEvents]);

  // Check for new commentary events based on current time
  useEffect(() => {
    if (!isPlaying || commentaryEvents.length === 0) return;
    
    const buffer = 0.1; // Small buffer for timing matching
    
    // Find events that should trigger now
    const eventsToTrigger = commentaryEvents.filter(event => {
      const isInTimeRange = Math.abs(event.elapsed_race_time - currentTime) < buffer;
      const notProcessed = !processedEventsRef.current.has(event.event_id);
      return isInTimeRange && notProcessed;
    });
    
    if (eventsToTrigger.length > 0) {
      // Sort by elapsed_race_time to ensure correct order
      eventsToTrigger.sort((a, b) => a.elapsed_race_time - b.elapsed_race_time);
      
      // Add to queue
      eventsToTrigger.forEach(event => {
        if (!queueRef.current.find(e => e.event_id === event.event_id)) {
          queueRef.current.push(event);
          processedEventsRef.current.add(event.event_id);
        }
      });
      
      // Process queue if not already processing
      if (!queueProcessingRef.current) {
        processQueue();
      }
    }
  }, [currentTime, isPlaying, commentaryEvents]);

  const loadCommentaryData = async () => {
    try {
      const response = await fetch(`/data/telemetry/${session}/race_commentary_persona.json`);
      if (!response.ok) {
        console.log(`No commentary data available for session: ${session}`);
        setCommentaryEvents([]);
        return;
      }
      
      const data = await response.json();
      console.log(`[Commentary] Loaded ${data.length} commentary events for session ${session}`);
      setCommentaryEvents(data);
    } catch (err) {
      console.error('Error loading commentary data:', err);
      setCommentaryEvents([]);
    }
  };

  const processQueue = async () => {
    if (queueProcessingRef.current || queueRef.current.length === 0) {
      return;
    }
    
    queueProcessingRef.current = true;
    
    while (queueRef.current.length > 0) {
      const event = queueRef.current.shift();
      await playCommentary(event);
      
      // Small pause between queued items
      if (queueRef.current.length > 0) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    queueProcessingRef.current = false;
  };

  const playCommentary = async (event) => {
    return new Promise((resolve) => {
      // Set current commentary to display
      setCurrentCommentary(event);
      setIsCommentaryVisible(true);
      
      // Calculate display duration based on message length
      const cleanMessage = event.event_message.replace(/\[.*?\]/g, '').trim();
      const charCount = cleanMessage.length;
      // Roughly 15 characters per second reading speed, minimum 3 seconds
      const baseDuration = Math.max(3000, (charCount / 15) * 1000);
      
      let audioDuration = 0;
      
      // Try to play audio if not muted
      if (!isMuted) {
        const audioPath = `/data/audio/${session}/${event.event_id}.mp3`;
        const audio = new Audio(audioPath);
        currentAudioRef.current = audio;
        
        // Set playback rate to match race playback speed
        audio.playbackRate = playbackSpeed;
        
        audio.addEventListener('loadedmetadata', () => {
          // Adjust duration based on playback speed
          audioDuration = (audio.duration / playbackSpeed) * 1000;
        });
        
        audio.addEventListener('ended', () => {
          currentAudioRef.current = null;
        });
        
        audio.addEventListener('error', (e) => {
          console.log(`Audio file not found or error loading: ${audioPath}`);
          currentAudioRef.current = null;
        });
        
        audio.play().catch(err => {
          console.log(`Could not play audio: ${err.message}`);
        });
      }
      
      // Use the longer of base duration or audio duration
      const displayDuration = Math.max(baseDuration, audioDuration);
      
      // Hide commentary after duration
      displayTimeoutRef.current = setTimeout(() => {
        setIsCommentaryVisible(false);
        setCurrentCommentary(null);
        resolve();
      }, displayDuration);
    });
  };

  const stopCurrentCommentary = useCallback(() => {
    // Stop audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    
    // Clear timeout
    if (displayTimeoutRef.current) {
      clearTimeout(displayTimeoutRef.current);
      displayTimeoutRef.current = null;
    }
    
    // Hide popup
    setIsCommentaryVisible(false);
    setCurrentCommentary(null);
  }, []);

  // Pause audio when playback paused, but keep popup visible
  useEffect(() => {
    if (!isPlaying && currentAudioRef.current) {
      currentAudioRef.current.pause();
    }
  }, [isPlaying]);
  
  // Update audio playback rate when speed changes
  useEffect(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  // Stop audio when muted
  useEffect(() => {
    if (isMuted && currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
  }, [isMuted]);

  return {
    currentCommentary,
    isCommentaryVisible,
    hasCommentaryData: commentaryEvents.length > 0
  };
}

export default useRaceCommentary;
