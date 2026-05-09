import { useState, useEffect } from 'react';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import './App.css';

function App() {
  const [roomId, setRoomId] = useState(window.location.hash.replace('#', ''));

  useEffect(() => {
    const handleHashChange = () => {
      setRoomId(window.location.hash.replace('#', ''));
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  return (
    <div className="app-container">
      {!roomId ? (
        <Lobby />
      ) : (
        <GameWrapper roomId={roomId} />
      )}
    </div>
  );
}

function GameWrapper({ roomId }) {
  const [playerAuth, setPlayerAuth] = useState(localStorage.getItem('uno_playerAuth'));

  useEffect(() => {
    if (!playerAuth) {
      const auth = Math.random().toString(36).substring(2, 15);
      localStorage.setItem('uno_playerAuth', auth);
      setPlayerAuth(auth);
    }
  }, [playerAuth]);

  if (!playerAuth) return null;

  return <GameBoard roomId={roomId} playerAuth={playerAuth} />;
}

export default App;
