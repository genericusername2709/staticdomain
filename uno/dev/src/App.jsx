import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useParams } from 'react-router-dom';
import Lobby from './components/Lobby';
import GameBoard from './components/GameBoard';
import './App.css';

function App() {
  return (
    <BrowserRouter basename="/uno">
      <div className="app-container">
        <Routes>
          <Route path="/" element={<Lobby />} />
          <Route path="/game/:roomId" element={<GameWrapper />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

function GameWrapper() {
  const { roomId } = useParams();
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
