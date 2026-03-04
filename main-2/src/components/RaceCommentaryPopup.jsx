import { useEffect, useState } from 'react';
import './RaceCommentaryPopup.css';

/**
 * RaceCommentaryPopup Component
 * 
 * Displays race commentary messages as an overlay on the map.
 * Strips out persona tags like [PROJECTED], [HIGH ENERGY], etc.
 */
function RaceCommentaryPopup({ message, isVisible, onComplete }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible && message) {
      setShow(true);
    } else {
      setShow(false);
    }
  }, [isVisible, message]);

  // Strip out persona tags from message
  const cleanMessage = (text) => {
    if (!text) return '';
    // Remove all content within square brackets
    return text.replace(/\[.*?\]/g, '').trim();
  };

  if (!show || !message) {
    return null;
  }

  return (
    <div className={`race-commentary-popup ${show ? 'visible' : ''}`}>
      <div className="commentary-content">
        <div className="commentary-icon">🎙️</div>
        <div className="commentary-text">{cleanMessage(message)}</div>
      </div>
    </div>
  );
}

export default RaceCommentaryPopup;
