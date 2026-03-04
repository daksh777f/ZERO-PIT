import { useNavigate } from 'react-router-dom';
import './PageStyles.css';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="page">
      <div className="error-page">
        <div className="error-code">404</div>
        <div className="error-title">Track Not Found</div>
        <div className="error-message">
          The page you're looking for has gone off-track.
        </div>
        <button 
          className="error-button"
          onClick={() => navigate('/drivers')}
        >
          Return to Pit Lane
        </button>
      </div>
    </div>
  );
};

export default NotFound;
