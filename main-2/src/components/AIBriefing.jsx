import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import './AIBriefing.css';

const SCRIPT_EVENTS = [
    { text: "INITIALIZING RACE_2 TELEMETRY SCAN...", src: null },
    { text: "GREEN FLAG: Twenty-two drivers unleash their horsepower!", src: "/data/audio/race_2/1.mp3" },
    { text: "LAP 1: Westin Workman has stormed into the lead on the very first lap!", src: "/data/audio/race_2/2.mp3" },
    { text: "LAP 2: Goulart muscled his way into P2! It's a frantic opening lap!", src: "/data/audio/race_2/5.mp3" },
    { text: "LAP 5: Max Schweid is absolutely glued to Kohlbecker! Barely a coat of paint!", src: "/data/audio/race_2/26.mp3" },
    { text: "LAP 6: OH MY WORD! That's Ethan Tovo! He's lost massive time!", src: "/data/audio/race_2/69.mp3" },
    { text: "LAP 7: Max Stallone gains! He forces his way past into P14!", src: "/data/audio/race_2/94.mp3" },
    { text: "GENERATING HIGHLIGHT REEL COMPLETED...", src: null }
];

const AIBriefing = () => {
    const [isPlaying, setIsPlaying] = useState(false); // Start paused to allow manual playback for audio
    const [progress, setProgress] = useState(0);
    const [currentEventIndex, setCurrentEventIndex] = useState(0);
    const [visualizerBars, setVisualizerBars] = useState(Array(30).fill(20));
    const [isMuted, setIsMuted] = useState(false);

    const audioRef = useRef(null);

    // Progress and Event Sync
    useEffect(() => {
        let interval;
        if (isPlaying) {
            interval = setInterval(() => {
                setProgress(prev => {
                    if (prev >= 100) return 0; // Loop
                    return prev + 0.12;
                });
            }, 50);
        }
        return () => clearInterval(interval);
    }, [isPlaying]);

    useEffect(() => {
        // Map 0-100 progress directly into segments based on SCRIPT_EVENTS array
        const mappedIndex = Math.floor((progress / 100) * SCRIPT_EVENTS.length);
        if (mappedIndex !== currentEventIndex && mappedIndex < SCRIPT_EVENTS.length) {
            setCurrentEventIndex(mappedIndex);

            // Dynamically play the audio for this specific sector if it's a new event
            if (audioRef.current && isPlaying && !isMuted) {
                const newSrc = SCRIPT_EVENTS[mappedIndex].src;
                if (newSrc) {
                    audioRef.current.src = newSrc;
                    audioRef.current.play().catch(e => console.log("Audio play prevented", e));
                } else {
                    audioRef.current.pause();
                }
            }
        }
    }, [progress, currentEventIndex, isPlaying, isMuted]);

    // Audio Visualizer Animation (only bounces if voice is actually playing)
    useEffect(() => {
        let anim;
        const isAudioActive = audioRef.current && !audioRef.current.paused && !isMuted && SCRIPT_EVENTS[currentEventIndex].src !== null;

        if (isPlaying && isAudioActive) {
            anim = setInterval(() => {
                setVisualizerBars(prev => prev.map(() => 10 + Math.random() * 60));
            }, 80);
        } else {
            setVisualizerBars(Array(30).fill(5));
        }
        return () => clearInterval(anim);
    }, [isPlaying, isMuted, progress, currentEventIndex]);

    // Audio Playback Sync
    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.muted = isMuted;
            if (!isPlaying) {
                audioRef.current.pause();
            } else if (isPlaying && audioRef.current.paused !== false) {
                // Try to resume current audio if hitting play
                const activeSrc = SCRIPT_EVENTS[currentEventIndex].src;
                if (activeSrc && (!audioRef.current.src || audioRef.current.src.includes(activeSrc))) {
                    audioRef.current.src = activeSrc;
                    audioRef.current.play().catch(e => { });
                }
            }
        }
    }, [isPlaying, isMuted, currentEventIndex]);

    const handleDownload = () => {
        const link = document.createElement('a');
        link.href = '/data/audio/race_2/26.mp3'; // Example highlight for download
        link.download = 'ZERO_PIT_HIGHLIGHT_LAP5.mp3';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="ai-briefing-wrapper">
            <div className="ai-briefing-container">
                {/* Background visual - would be a Map or Replay in reality */}
                <img src="/landing-sequence/ezgif-frame-150.jpg" alt="Race Replay Backdrop" className="briefing-backdrop" draggable="false" />
                <div className="briefing-overlay"></div>
                <audio ref={audioRef} loop={false} preload="auto" />

                <div className="briefing-top-bar">
                    <div className="live-badge"><span className="rec-dot"></span> AI DIRECTOR CUT</div>
                    <div className="timecode">T+{Math.floor(progress)}s</div>
                </div>

                {/* Subtitles / Captions */}
                <div className="briefing-captions">
                    <p className="caption-text">{SCRIPT_EVENTS[currentEventIndex].text}</p>
                </div>

                {/* Audio Visualizer */}
                <div className="audio-visualizer">
                    {visualizerBars.map((height, i) => (
                        <div key={i} className="vis-bar" style={{ height: `${height}%` }}></div>
                    ))}
                </div>

                {/* Video Controls */}
                <div className="briefing-controls">
                    <button className="control-btn" onClick={() => setIsPlaying(!isPlaying)}>
                        {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
                    </button>

                    <div className="progress-bar-container">
                        <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
                    </div>

                    <div className="control-group">
                        <button className="control-btn" onClick={() => setIsMuted(!isMuted)}>
                            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                        </button>
                        <button className="control-btn"><Maximize size={16} /></button>
                    </div>
                </div>
            </div>

            {/* Supporting text outside the "player" */}
            <div className="briefing-info">
                <h3>Auto-Generated Race Briefings</h3>
                <p>ZERO PIT's event engine scans timing data to automatically detect overtakes, fastest laps, and incidents, stitching them into a 60-second narrated highlight reel.</p>
                <button className="ghost-btn" onClick={handleDownload}>DOWNLOAD CLIP</button>
            </div>
        </div>
    );
};

export default AIBriefing;
