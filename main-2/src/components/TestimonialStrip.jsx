import React from 'react';
import './TestimonialStrip.css';

const TESTIMONIALS = [
    { quote: "THE ALPHA SCORE COMPLETELY CHANGED HOW WE EVALUATE OUR JUNIOR DRIVERS.", author: "RACING DIRECTOR // GT AMERICA" },
    { quote: "FINALLY, GPS REPLAYS WITHOUT WIRING A $5,000 DATALOGGER TO EVERY CAR.", author: "CHIEF ENGINEER // CLUB RACING" },
    { quote: "WE USED ZERO PIT'S OUTLIER DETECTION TO PROVE A COMPETITOR'S BOP VIOLATION.", author: "TEAM PRINCIPAL // SRO" },
    { quote: "IT'S LIKE HAVING F1-TIER PIT WALL SOFTWARE ON A SATURDAY TRACK DAY.", author: "PRO-AM DRIVER" },
    { quote: "THE AI COMMENTARY MAKES POST-RACE ANALYSIS INCREDIBLY ENGAGING FOR SPONSORS.", author: "COMMERCIAL DIRECTOR" }
];

const TestimonialStrip = () => {
    return (
        <div className="testimonial-strip-container">
            <div className="marquee-track">
                {/* Double the array to ensure seamless infinite looping */}
                {[...TESTIMONIALS, ...TESTIMONIALS].map((t, idx) => (
                    <div key={idx} className="testimonial-card">
                        <span className="t-quote">"{t.quote}"</span>
                        <span className="t-author">__{t.author}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default TestimonialStrip;
