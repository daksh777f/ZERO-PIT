import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import Layout from '../components/Layout';
import SROAlphaHeader from '../components/SROAlphaHeader';
import DriverLeaderboard from '../pages/DriverLeaderboard';
import TeamLeaderboard from '../pages/TeamLeaderboard';
import DriverComparison from '../pages/DriverComparison';
import TeamComparison from '../pages/TeamComparison';
import WeekendSummary from '../pages/WeekendSummary';
import DriverProfile from '../pages/DriverProfile';
import HeadToHead from '../pages/HeadToHead';
import LapByLap from '../pages/LapByLap';

function SROAlpha() {
  const [sessionData, setSessionData] = useState(null);
  const [weekendData, setWeekendData] = useState(null);
  const [selectedSession, setSelectedSession] = useState('race_2');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    loadData();
  }, [selectedSession]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Load session data
      const sessionResponse = await fetch(`/data/sessions/${selectedSession}.json`);
      if (!sessionResponse.ok) throw new Error('Failed to load session data');
      const sessionJson = await sessionResponse.json();
      setSessionData(sessionJson);

      // Load weekend summary
      const weekendResponse = await fetch('/data/weekend_summary.json');
      if (!weekendResponse.ok) throw new Error('Failed to load weekend data');
      const weekendJson = await weekendResponse.json();
      setWeekendData(weekendJson);
      
      setLoading(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleSessionChange = (e) => {
    const newSession = e.target.value;
    setSelectedSession(newSession);
    
    // Update URL with session parameter
    const params = new URLSearchParams(location.search);
    params.set('session', newSession);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  return (
    <Layout 
      featureHeader={
        <SROAlphaHeader 
          selectedSession={selectedSession}
          onSessionChange={handleSessionChange}
        />
      }
    >
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading Telemetry Data...</div>
        </div>
      ) : error ? (
        <div className="error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<Navigate to="drivers" replace />} />
          <Route path="drivers" element={<DriverLeaderboard data={sessionData} />} />
          <Route path="teams" element={<TeamLeaderboard data={sessionData} />} />
          <Route path="driver-comparison" element={<DriverComparison data={sessionData} />} />
          <Route path="team-comparison" element={<TeamComparison data={sessionData} />} />
          <Route path="driver-profile" element={<DriverProfile data={sessionData} />} />
          <Route path="weekend" element={<WeekendSummary data={weekendData} />} />
          <Route path="head-to-head" element={<HeadToHead data={weekendData} />} />
          <Route path="lap-by-lap" element={<LapByLap data={sessionData} />} />
        </Routes>
      )}
    </Layout>
  );
}

export default SROAlpha;
