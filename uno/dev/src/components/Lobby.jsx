import { useEffect } from 'react';
import { createGame } from '../firebase';

export default function Lobby() {

  useEffect(() => {
    let auth = localStorage.getItem('uno_playerAuth');
    if (!auth) {
      auth = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('uno_playerAuth', auth);
    }
    
    // Auto generate a random room and join it
    const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    createGame(newRoomId, auth).then(() => {
      window.location.hash = newRoomId;
    });
  }, []);

  return (
    <div className="lobby-container">
      <div className="lobby-card">
        <h1 className="title">UNO</h1>
        <p className="subtitle">Creating room...</p>
      </div>
    </div>
  );
}
