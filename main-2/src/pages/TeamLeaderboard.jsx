import LeaderboardTable from '../components/LeaderboardTable';
import './PageStyles.css';

const TeamLeaderboard = ({ data }) => {
  if (!data || !data.team_performance) {
    return <div className="error">No team data available</div>;
  }

  const { team_performance } = data;

  return (
    <div className="page">
      <div className="page-header">
        <h1 className="page-title">Team Leaderboard</h1>
        <p className="page-description">
          Team performance rankings and combined telemetry analysis
        </p>
      </div>

      <div className="card">
        <div className="card-header">
          <h2 className="card-title">Team Rankings</h2>
          <div className="stat-badge">
            {team_performance.length} Teams
          </div>
        </div>
        <LeaderboardTable data={team_performance} type="team" />
      </div>
    </div>
  );
};

export default TeamLeaderboard;
