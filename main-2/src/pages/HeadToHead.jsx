import { useState } from 'react';
import { formatLapTime } from '../utils/dataUtils';
import { Flag } from 'lucide-react';
import './PageStyles.css';
import './HeadToHead.css';

const HeadToHead = ({ data }) => {
  const [selectedTeam, setSelectedTeam] = useState(null);

  if (!data || !data.teammate_head_to_head) {
    return <div className="error">No head-to-head data available</div>;
  }

  const { teammate_head_to_head } = data;

  // Sort teams alphabetically for selection
  const sortedTeams = [...teammate_head_to_head].sort((a, b) =>
    a.team_name.localeCompare(b.team_name)
  );

  const handleTeamSelect = (team) => {
    setSelectedTeam(team);
  };

  const sessions = ['practice_1', 'practice_2', 'qualifying', 'qualifying_2', 'race_1', 'race_2'];
  const sessionLabels = {
    'practice_1': 'Practice 1',
    'practice_2': 'Practice 2',
    'qualifying': 'Qualifying',
    'qualifying_2': 'Qualifying 2',
    'race_1': 'Race 1',
    'race_2': 'Race 2'
  };

  const renderTeamData = (team) => {
    // Calculate total sessions won by each driver
    const driverWins = {};
    team.drivers.forEach(driver => {
      driverWins[driver] = 0;
    });

    sessions.forEach(session => {
      if (team.sessions[session]) {
        const winner = team.sessions[session].winner;
        if (Object.prototype.hasOwnProperty.call(driverWins, winner)) {
          driverWins[winner]++;
        }
      }
    });

    return (
      <div className="h2h-data-container">
        {/* Weekend Score Summary */}
        <div className="h2h-summary-grid">
          <div className="h2h-summary-card card">
            <div className="h2h-summary-label">Total Sessions</div>
            <div className="h2h-summary-value">{sessions.length}</div>
          </div>

          <div className="h2h-summary-card card">
            <div className="h2h-summary-label">Average Gap</div>
            <div className="h2h-summary-value">{formatLapTime(team.average_gap)}</div>
          </div>

          <div className="h2h-summary-card card">
            <div className="h2h-summary-label">Drivers</div>
            <div className="h2h-summary-value">{team.drivers.length}</div>
          </div>
        </div>

        {/* Driver Weekend Scores */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Weekend Score</h2>
          </div>
          <div className="h2h-scores">
            {team.drivers.map((driver) => {
              const wins = team.weekend_score[driver] || 0;
              const percentage = (wins / sessions.length) * 100;

              return (
                <div key={driver} className="h2h-score-row">
                  <div className="h2h-driver-name">{driver}</div>
                  <div className="h2h-score-bar-container">
                    <div
                      className="h2h-score-bar"
                      style={{ width: `${percentage}%` }}
                    >
                      <span className="h2h-score-text">{wins} / {sessions.length}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Session by Session Breakdown */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Session Breakdown</h2>
          </div>
          <div className="h2h-sessions-table">
            <table className="h2h-table">
              <thead>
                <tr>
                  <th className="h2h-th">Session</th>
                  <th className="h2h-th">Winner</th>
                  <th className="h2h-th">Gap</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((session) => {
                  const sessionData = team.sessions[session];
                  if (!sessionData) return null;

                  return (
                    <tr key={session} className="h2h-tr">
                      <td className="h2h-td session-name">{sessionLabels[session]}</td>
                      <td className="h2h-td winner-name">{sessionData.winner}</td>
                      <td className="h2h-td gap-value">{formatLapTime(sessionData.gap)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Driver Comparison Grid */}
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Driver Metrics</h2>
          </div>
          <div className="h2h-metrics-grid">
            {team.drivers.map((driver) => {
              const wins = team.weekend_score[driver] || 0;

              return (
                <div key={driver} className="h2h-metric-card">
                  <div className="h2h-metric-driver">{driver}</div>
                  <div className="h2h-metric-stats">
                    <div className="h2h-metric-item">
                      <div className="h2h-metric-label">Sessions Won</div>
                      <div className="h2h-metric-value">{wins}</div>
                    </div>
                    <div className="h2h-metric-item">
                      <div className="h2h-metric-label">Win Rate</div>
                      <div className="h2h-metric-value">
                        {((wins / sessions.length) * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Head to Head</h1>
        <p className="page-description">
          Teammate comparison across all weekend sessions
        </p>
      </div>

      {/* Team Selection */}
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Select Team</h2>
          <div className="stat-badge">
            {teammate_head_to_head.length} Teams
          </div>
        </div>
        <div className="driver-selector">
          {sortedTeams.map((team) => (
            <button
              key={team.team_name}
              className={`driver-chip ${selectedTeam?.team_name === team.team_name ? 'selected' : ''}`}
              onClick={() => handleTeamSelect(team)}
            >
              {team.team_name}
            </button>
          ))}
        </div>
      </div>

      {/* Team Head to Head Data */}
      {selectedTeam && (
        <div className="h2h-content">
          <div className="card h2h-team-header">
            <div className="card-header">
              <div>
                <h2 className="card-title">{selectedTeam.team_name}</h2>
                <p className="h2h-team-drivers">
                  {selectedTeam.drivers.join(' • ')}
                </p>
              </div>
            </div>
          </div>
          {renderTeamData(selectedTeam)}
        </div>
      )}

      {!selectedTeam && (
        <div className="card empty-state">
          <div className="empty-state-content">
            <div className="empty-state-icon"><Flag className="empty-state-icon-svg" size={64} /></div>
            <h3 className="empty-state-title">No Team Selected</h3>
            <p className="empty-state-text">
              Select a team from the list above to view head-to-head comparison between teammates
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeadToHead;
