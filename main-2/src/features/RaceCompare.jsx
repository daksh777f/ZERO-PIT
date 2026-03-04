import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import RaceCompareHeader from '../components/RaceCompareHeader';
import RaceCompareEmptyState from '../components/RaceCompareEmptyState';
import PerformanceMode from '../components/modes/PerformanceMode';
import BattleMode from '../components/modes/BattleMode';
import FlowMode from '../components/modes/FlowMode';
import ConsistencyMode from '../components/modes/ConsistencyMode';
import { useRaceCompareData } from '../hooks/useRaceCompareData';
import './RaceCompare.css';

function RaceCompare() {
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [driver1, setDriver1] = useState(null);
  const [driver2, setDriver2] = useState(null);
  const [mode, setMode] = useState('performance');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load race compare data
  const data = useRaceCompareData(selectedSession, driver1, driver2);

  // Load available sessions on mount
  useEffect(() => {
    loadSessions();
  }, []);

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
          } catch {
            // Session doesn't exist, skip
          }
        })
      );

      if (availableSessions.length > 0) {
        setSessions(availableSessions);
        setSelectedSession(availableSessions[0]);
      } else {
        throw new Error('No sessions found');
      }

      setLoading(false);
    } catch {
      setError('No telemetry sessions found');
      setLoading(false);
    }
  };

  const handleSessionChange = (session) => {
    setSelectedSession(session);
    // Reset drivers when session changes
    setDriver1(null);
    setDriver2(null);
  };

  const handleDriver1Change = (driverNumber) => {
    setDriver1(driverNumber);
  };

  const handleDriver2Change = (driverNumber) => {
    setDriver2(driverNumber);
  };

  const handleModeChange = (newMode) => {
    setMode(newMode);
  };

  // Determine if we should show content
  const shouldShowContent = () => {
    if (mode === 'performance' || mode === 'battle') {
      return driver1 && driver2 && data.driver1.base && data.driver2.base;
    }
    if (mode === 'flow') {
      return driver1 && data.driver1.timeline;
    }
    if (mode === 'consistency') {
      return driver1 && data.driver1.base;
    }
    return false;
  };

  // Render mode content
  const renderModeContent = () => {
    if (!shouldShowContent()) {
      return <RaceCompareEmptyState driver1={driver1} driver2={driver2} mode={mode} />;
    }

    switch (mode) {
      case 'performance':
        return (
          <PerformanceMode
            driver1Data={data.driver1}
            driver2Data={data.driver2}
            manifest={data.manifest}
          />
        );
      case 'battle':
        return (
          <BattleMode
            driver1Data={data.driver1}
            driver2Data={data.driver2}
            manifest={data.manifest}
          />
        );
      case 'flow':
        return (
          <FlowMode
            driver1Data={data.driver1}
            manifest={data.manifest}
          />
        );
      case 'consistency':
        return (
          <ConsistencyMode
            driver1Data={data.driver1}
            manifest={data.manifest}
          />
        );
      default:
        return <RaceCompareEmptyState driver1={driver1} driver2={driver2} mode={mode} />;
    }
  };

  return (
    <Layout
      featureHeader={
        <RaceCompareHeader
          sessions={sessions}
          selectedSession={selectedSession}
          onSessionChange={handleSessionChange}
          manifest={data.manifest}
          driver1={driver1}
          driver2={driver2}
          onDriver1Change={handleDriver1Change}
          onDriver2Change={handleDriver2Change}
          mode={mode}
          onModeChange={handleModeChange}
        />
      }
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
        <div className="race-compare-container">
          {data.loading && shouldShowContent() && (
            <div className="data-loading-overlay">
              <div className="loading-spinner"></div>
              <div className="loading-text">Loading driver data...</div>
            </div>
          )}
          {renderModeContent()}
        </div>
      )}
    </Layout>
  );
}

export default RaceCompare;
