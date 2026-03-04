import React, { useState, useEffect } from 'react';
import './LiveTimingTower.css';

const MOCK_DRIVERS = [
    { num: "93", name: "A. HARPER", pos: 1, gap: "LEADER", s1: "28.451", s2: "32.110", s3: "27.501", status: "none", lastLap: "1:28.062" },
    { num: "04", name: "C. KURTZ", pos: 2, gap: "+1.204", s1: "28.512", s2: "32.001", s3: "27.550", status: "none", lastLap: "1:28.063" },
    { num: "14", name: "J. SOFRONAS", pos: 3, gap: "+3.450", s1: "28.601", s2: "32.330", s3: "27.601", status: "none", lastLap: "1:28.532" },
    { num: "27", name: "J. BELL", pos: 4, gap: "+4.112", s1: "28.550", s2: "32.401", s3: "27.511", status: "none", lastLap: "1:28.462" },
    { num: "50", name: "R. DALZIEL", pos: 5, gap: "+5.900", s1: "28.701", s2: "32.301", s3: "27.650", status: "none", lastLap: "1:28.652" },
    { num: "08", name: "S. CHOVIN", pos: 6, gap: "+8.220", s1: "28.801", s2: "32.501", s3: "27.701", status: "none", lastLap: "1:29.003" },
];

const generateRandomTime = (base, variance) => {
    const val = parseFloat(base) + (Math.random() * variance * 2 - variance);
    return val.toFixed(3);
};

const LiveTimingTower = () => {
    const [drivers, setDrivers] = useState(MOCK_DRIVERS);
    const [overallBestSectors, setOverallBestSectors] = useState({ s1: 28.400, s2: 31.900, s3: 27.450 });
    const [highlightIndex, setHighlightIndex] = useState(-1);

    useEffect(() => {
        const interval = setInterval(() => {
            // Pick a random driver to "cross the line"
            const driverToUpdate = Math.floor(Math.random() * MOCK_DRIVERS.length);
            setHighlightIndex(driverToUpdate);

            setDrivers(prev => {
                const newDrivers = [...prev];
                const driver = { ...newDrivers[driverToUpdate] };

                // Simulate new sector times
                const newS1 = generateRandomTime(28.6, 0.4);
                const newS2 = generateRandomTime(32.4, 0.6);
                const newS3 = generateRandomTime(27.6, 0.3);

                driver.s1 = newS1;
                driver.s2 = newS2;
                driver.s3 = newS3;

                // Overall best logic (Purple)
                let status = "none";
                if (parseFloat(newS1) < overallBestSectors.s1) {
                    setOverallBestSectors(prev => ({ ...prev, s1: parseFloat(newS1) }));
                    status = "purple";
                } else if (parseFloat(newS2) < overallBestSectors.s2) {
                    setOverallBestSectors(prev => ({ ...prev, s2: parseFloat(newS2) }));
                    status = "purple";
                } else if (parseFloat(newS3) < overallBestSectors.s3) {
                    setOverallBestSectors(prev => ({ ...prev, s3: parseFloat(newS3) }));
                    status = "purple";
                }
                // Personal best logic (Green) - just simulated for effect
                else if (Math.random() > 0.6) {
                    status = "green";
                }

                // Calculate Last Lap
                const total = parseFloat(newS1) + parseFloat(newS2) + parseFloat(newS3);
                const mins = Math.floor(total / 60);
                const secs = (total % 60).toFixed(3).padStart(6, '0');
                driver.lastLap = `${mins}:${secs}`;

                driver.status = status;
                newDrivers[driverToUpdate] = driver;

                return newDrivers;
            });

            // Clear highlight after 1.5s
            setTimeout(() => {
                setHighlightIndex(-1);
            }, 1500);

        }, 2500); // New update every 2.5s

        return () => clearInterval(interval);
    }, [overallBestSectors]);

    return (
        <div className="live-timing-container">
            <div className="timing-header">
                <div className="timing-title">
                    <span className="live-dot"></span>
                    LIVE TIMING
                </div>
                <div className="timing-session">SRO GT AMERICA // RND 1</div>
            </div>

            <div className="timing-table-header">
                <div className="t-col t-pos">POS</div>
                <div className="t-col t-num">NO</div>
                <div className="t-col t-name">DRIVER</div>
                <div className="t-col t-gap">GAP</div>
                <div className="t-col t-sec">S1</div>
                <div className="t-col t-sec">S2</div>
                <div className="t-col t-sec">S3</div>
                <div className="t-col t-lap">LAST LAP</div>
            </div>

            <div className="timing-rows">
                {drivers.map((driver, idx) => (
                    <div
                        key={driver.num}
                        className={`timing-row ${highlightIndex === idx ? 'flash-update' : ''}`}
                    >
                        <div className="t-col t-pos">{driver.pos}</div>
                        <div className="t-col t-num"><span className="num-box">{driver.num}</span></div>
                        <div className="t-col t-name">{driver.name}</div>
                        <div className="t-col t-gap">{driver.gap}</div>

                        <div className={`t-col t-sec ${driver.status === 'purple' && highlightIndex === idx ? 'text-purple' : driver.status === 'green' && highlightIndex === idx ? 'text-green' : ''}`}>
                            {driver.s1}
                        </div>
                        <div className={`t-col t-sec ${driver.status === 'purple' && highlightIndex === idx ? 'text-purple' : driver.status === 'green' && highlightIndex === idx ? 'text-green' : ''}`}>
                            {driver.s2}
                        </div>
                        <div className={`t-col t-sec ${driver.status === 'purple' && highlightIndex === idx ? 'text-purple' : driver.status === 'green' && highlightIndex === idx ? 'text-green' : ''}`}>
                            {driver.s3}
                        </div>

                        <div className={`t-col t-lap ${driver.status === 'purple' && highlightIndex === idx ? 'bg-purple' : driver.status === 'green' && highlightIndex === idx ? 'bg-green' : ''}`}>
                            {driver.lastLap}
                        </div>
                    </div>
                ))}
            </div>
            <div className="timing-footer">
                <div className="legend-item"><span className="legend-color legend-purple"></span> OVERALL BEST</div>
                <div className="legend-item"><span className="legend-color legend-green"></span> PERSONAL BEST</div>
            </div>
        </div>
    );
};

export default LiveTimingTower;
