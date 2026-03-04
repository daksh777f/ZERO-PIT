import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ChevronRight, ArrowUpRight } from 'lucide-react';
import LiveTimingTower from '../components/LiveTimingTower';
import AIBriefing from '../components/AIBriefing';
import TestimonialStrip from '../components/TestimonialStrip';
import './LandingPage.css';

gsap.registerPlugin(ScrollTrigger);

const LandingPage = () => {
    const mountRef = useRef(null);
    const containerRef = useRef(null);
    const textRef = useRef(null);
    const featuresRef = useRef(null);
    const navigate = useNavigate();

    const [loadingProgress, setLoadingProgress] = useState(0);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Reset scroll position on reload to prevent starting halfway through the trigger
        if ('scrollRestoration' in window.history) {
            window.history.scrollRestoration = 'manual';
        }
        window.scrollTo(0, 0);

        if (!mountRef.current) return;

        // --- Setup Three.js Scene ---
        const width = window.innerWidth;
        const height = window.innerHeight;

        const scene = new THREE.Scene();
        // Camera with proper near/far to prevent clipping z=0 plane
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, -5, 5);
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });

        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        mountRef.current.appendChild(renderer.domElement);

        // Load textures
        const totalFrames = 300;
        const textures = new Array(totalFrames).fill(null);
        let loadedCount = 0;
        const loader = new THREE.TextureLoader();

        // Material with Custom Shader for Zoom / Distortion
        // Using uniforms that can safely start empty
        const material = new THREE.ShaderMaterial({
            uniforms: {
                tDiffuse: { value: null },
                zoom: { value: 1.0 },
                distortion: { value: 0.0 }, // Subtle center-out lens distortion
                focalPoint: { value: new THREE.Vector2(0.5, 0.51) }
            },
            vertexShader: `
        varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`,
            fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float zoom;
        uniform float distortion;
        uniform vec2 focalPoint;
        varying vec2 vUv;

void main() {
          vec2 uv = vUv;

    // Apply basic zoom centered on focalPoint
    uv = focalPoint + (uv - focalPoint) / zoom;

          // Apply subtle lens distortion outward from focal point
          vec2 d = uv - focalPoint;
          float r = length(d);
    uv -= d * (distortion * r * r);
          
          vec4 color = texture2D(tDiffuse, uv);
    gl_FragColor = color;
}
`
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        // Render loop function
        const render = () => {
            renderer.render(scene, camera);
        };

        // Render purely black first frame safely
        render();

        // Preload frames logic
        for (let i = 1; i <= totalFrames; i++) {
            const idx = i.toString().padStart(3, '0');
            const arrayIndex = i - 1;

            loader.load(
                `/landing-sequence/ezgif-frame-${idx}.jpg`,
                (tx) => { // onLoad callback
                    tx.minFilter = THREE.LinearFilter;
                    tx.magFilter = THREE.LinearFilter;
                    textures[arrayIndex] = tx;

                    loadedCount++;
                    setLoadingProgress(Math.floor((loadedCount / totalFrames) * 100));

                    // Initial Render once the FIRST texture (index 0) is loaded
                    if (arrayIndex === 0) {
                        material.uniforms.tDiffuse.value = textures[0];
                        render();
                    }

                    if (loadedCount === totalFrames) {
                        setIsLoaded(true);
                        ScrollTrigger.refresh();
                    }
                },
                undefined, // onProgress
                (err) => {
                    console.error(`Failed to load texture ${idx} `, err);
                } // onError
            );
        }

        // --- GSAP ScrollTrigger Sequence ---
        const animationObj = { frame: 0, zoom: 1.0, distortion: 0.0 };

        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: containerRef.current,
                start: "top top",
                end: "+=400%", // Significantly extends pinning to slow down the 300 frame sequence
                pin: true,
                scrub: 1, // Smooth scrub for forward/backward scrolling
            }
        });

        // 3D Canvas Image Sequence & Shader Animation
        tl.to(animationObj, {
            frame: totalFrames - 1,
            zoom: 1.8,         // Zoom into the tunnel mouth
            distortion: -0.1,  // Slight outwards distortion at the end
            snap: "frame",
            ease: "none",
            onUpdate: () => {
                const currentFrame = Math.floor(animationObj.frame);
                if (textures[currentFrame]) {
                    material.uniforms.tDiffuse.value = textures[currentFrame];
                    material.uniforms.zoom.value = animationObj.zoom;
                    material.uniforms.distortion.value = animationObj.distortion;
                    render();
                }
            }
        }, 0); // Start at 0 seconds on timeline

        // Handle Resize
        const handleResize = () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            render();
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            ScrollTrigger.getAll().forEach(t => t.kill());
            if (mountRef.current) {
                // eslint-disable-next-line react-hooks/exhaustive-deps
                mountRef.current.removeChild(renderer.domElement);
            }
            renderer.dispose();
            material.dispose();
            geometry.dispose();
            textures.forEach(t => {
                if (t) t.dispose();
            });
            // Also nullify scene to aid GC
            scene.clear();
        };
    }, []);

    // Parallax Setup for content sections
    useEffect(() => {
        if (!featuresRef.current) return;

        gsap.fromTo(featuresRef.current.children,
            { y: 50, opacity: 0 },
            {
                y: 0,
                opacity: 1,
                stagger: 0.2,
                duration: 1,
                ease: "power3.out",
                scrollTrigger: {
                    trigger: featuresRef.current,
                    start: "top 80%",
                }
            }
        );
    }, []);

    return (
        <div className="landing-wrapper">
            {/* Loading Overlay */}
            {!isLoaded && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <h2 className="loading-title">INITIALIZING TELEMETRY</h2>
                        <div className="loading-bar-container">
                            <div className="loading-bar" style={{ width: `${loadingProgress}% ` }}></div>
                        </div>
                        <p>{loadingProgress}% BUFFERED</p>
                    </div>
                </div>
            )
            }

            <div className="hero-section" ref={containerRef}>
                {/* WebGL Canvas */}
                <div className="canvas-container" ref={mountRef}></div>

                {/* Editorial Text Overlay */}
                <div className="hero-text-overlay" ref={textRef} style={{ opacity: isLoaded ? 1 : 0, transition: 'opacity 1s ease' }}>
                    <div className="hero-title">
                        <h1 className="cinematic-title">ZERO PIT</h1>
                        <p className="subtitle">THE APEX OF MOTORSPORT TELEMETRY & ANALYSIS</p>
                    </div>

                    <div className="mission-statement">
                        <p>Precision data visualization inspired by professional pit walls.
                            Track, compare, and reconstruct telemetry over any session to conquer the grid.</p>
                    </div>
                </div>
            </div>

            <div className="content-section">
                <div className="new-gen-z-layout" ref={featuresRef}>

                    {/* Feature 1: Live Timing Tower (Left Side) */}
                    <div className="feature-block timing-feature">
                        <div className="feature-text">
                            <h2 className="glitch-title" data-text="01 // LIVE TELEMETRY">01 // LIVE TELEMETRY</h2>
                            <p className="feature-p">
                                Stop staring at static PDFs. ZERO PIT ingests standard CSV timing
                                data and instantly reconstructs it into a live-updating, broadcast-grade
                                timing tower. Track personal bests, overall fastest sectors, and
                                dynamic gaps — no $10,000 GPS hardware required.
                            </p>
                            <button className="hollow-btn" onClick={() => navigate('/sro-alpha')}>
                                ENTER DASHBOARD <ArrowUpRight size={18} />
                            </button>
                        </div>
                        <div className="feature-visual">
                            <LiveTimingTower />
                        </div>
                    </div>

                    {/* Testimonial Break */}
                    <TestimonialStrip />

                    {/* Feature 2: AI Briefing (Right Side Bias) */}
                    <div className="feature-block ai-feature">
                        <div className="feature-visual">
                            <AIBriefing />
                        </div>
                        <div className="feature-text ai-text">
                            <h2 className="glitch-title" data-text="02 // AI DIRECTOR CUT">02 // AI DIRECTOR CUT</h2>
                            <p className="feature-p">
                                Content is the fastest growth lever in modern motorsport.
                                Our event engine automatically scans the raw timing data to detect
                                overtakes, fastest laps, and incidents — instantly generating a
                                60-second narrated highlight reel ready for social media.
                            </p>
                            <p className="feature-p highlight-p">
                                &gt;_ Let the platform market your team.
                            </p>
                        </div>
                    </div>

                </div>

                <div className="cta-container final-cta">
                    <button className="launch-btn" onClick={() => navigate('/sro-alpha')}>
                        INITIALIZE FULL SYSTEM <ChevronRight size={24} />
                    </button>
                </div>
            </div>
        </div >
    );
};

export default LandingPage;
