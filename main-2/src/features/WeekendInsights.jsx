import { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import WeekendInsightsHeader from '../components/WeekendInsightsHeader';
import ExecutiveSummary from '../components/insights/ExecutiveSummary';
import TechnicalCompliance from '../components/insights/TechnicalCompliance';
import TalentDevelopment from '../components/insights/TalentDevelopment';
import BattlePerformance from '../components/insights/BattlePerformance';
import FieldDynamics from '../components/insights/FieldDynamics';
import './WeekendInsights.css';

function WeekendInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSection, setActiveSection] = useState('summary');

  useEffect(() => {
    loadComparativeAnalytics();
  }, []);

  const loadComparativeAnalytics = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/data/telemetry/comparative_analytics_complete.json');
      if (!response.ok) throw new Error('Failed to load comparative analytics');
      const analyticsData = await response.json();
      
      console.log('Comparative analytics loaded:', {
        hasExecutiveSummary: !!analyticsData.executive_summary,
        hasTechnicalCompliance: !!analyticsData.technical_compliance,
        hasTalentDevelopment: !!analyticsData.talent_development,
        hasBattlePerformance: !!analyticsData.battle_performance,
        hasFieldDynamics: !!analyticsData.field_dynamics
      });

      setData(analyticsData);
      setLoading(false);
    } catch (err) {
      console.error('Error loading comparative analytics:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const renderSection = () => {
    if (!data) return null;

    switch (activeSection) {
      case 'summary':
        return <ExecutiveSummary data={data.executive_summary} />;
      case 'technical':
        return <TechnicalCompliance data={data.technical_compliance} />;
      case 'talent':
        return <TalentDevelopment data={data.talent_development} />;
      case 'battle':
        return <BattlePerformance data={data.battle_performance} />;
      case 'field':
        return <FieldDynamics data={data.field_dynamics} />;
      default:
        return <ExecutiveSummary data={data.executive_summary} />;
    }
  };

  return (
    <Layout
      featureHeader={
        <WeekendInsightsHeader
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
      }
    >
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          <div className="loading-text">Loading Weekend Insights...</div>
        </div>
      ) : error ? (
        <div className="error">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <p className="error-hint">
            Make sure comparative analytics have been generated and placed in /public/data/telemetry/
          </p>
        </div>
      ) : (
        <div className="weekend-insights-container">
          {renderSection()}
        </div>
      )}
    </Layout>
  );
}

export default WeekendInsights;
