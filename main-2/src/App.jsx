import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';
import SROAlpha from './features/SROAlpha';
import RaceReplay from './features/RaceReplay';
import RaceCompare from './features/RaceCompare';
import WeekendInsights from './features/WeekendInsights';
import Schedule from './features/Schedule';
import LandingPage from './pages/LandingPage';
import NotFound from './pages/NotFound';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<Navigate to="/sro-alpha" replace />} />
        <Route path="/sro-alpha/*" element={<SROAlpha />} />
        <Route path="/race-replay/*" element={<RaceReplay />} />
        <Route path="/race-compare/*" element={<RaceCompare />} />
        <Route path="/weekend-insights/*" element={<WeekendInsights />} />
        <Route path="/schedule" element={<Schedule />} />
        {/* Add more feature routes here as they're developed */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;
