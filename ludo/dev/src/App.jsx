import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import { subscribeToGame, createGame, joinGame, updateGameState } from './firebase';
import { performMove, calculateValidMoves } from './gameLogic';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RotateCcw, Copy } from 'lucide-react';

const DiceIcon = ({ value, rolling }) => {
  if (rolling) return <div className="dice-rolling" style={{ fontSize: '3rem' }}>🎲</div>;
  const s = 64;
  switch (value) {
    case 1: return <Dice1 size={s} />;
    case 2: return <Dice2 size={s} />;
    case 3: return <Dice3 size={s} />;
    case 4: return <Dice4 size={s} />;
    case 5: return <Dice5 size={s} />;
    case 6: return <Dice6 size={s} />;
    default: return <div style={{ width: s, height: s, borderRadius: '12px', background: '#f1f5f9', border: '2px dashed #cbd5e1' }} />;
  }
};

const App = () => {
  const [roomId, setRoomId] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [roomData, setRoomData] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Keep a ref to the latest roomData for closures
  const roomDataRef = React.useRef(roomData);
  useEffect(() => { roomDataRef.current = roomData; }, [roomData]);

  useEffect(() => {
    const hash = window.location.hash.replace('#', '');
    const myId = localStorage.getItem('playerId') || Math.random().toString(36).substr(2, 9);
    localStorage.setItem('playerId', myId);

    const setupGame = async (room) => {
      setRoomId(room);
      subscribeToGame(room, async (state) => {
        if (!state) {
          await createGame(room, myId);
          return;
        }
        setRoomData(state);
        setGameState(state.gameState);
        
        const myColor = Object.keys(state.players || {}).find(c => state.players[c] === myId);
        if (myColor) {
          setMyPlayer(myColor);
        } else {
          setMyPlayer('spectator');
        }
      });
    };

    if (hash) setupGame(hash);
    else {
      const newRoom = Math.random().toString(36).substr(2, 6);
      window.location.hash = newRoom;
      setupGame(newRoom);
    }
  }, []);

  const handleStartGame = async () => {
    console.log("Starting game manually...");
    const activeColors = ['red', 'green', 'yellow', 'blue'].filter(c => roomData?.players?.[c]);
    if (activeColors.length < 1) {
      showToast("Need at least 1 player to start!");
      return;
    }
    await updateGameState(roomId, {
      status: 'playing',
      turn: activeColors[0],
      message: `Game Started! ${activeColors[0].toUpperCase()}'s turn.`
    });
  };

  const handlePlayAgain = async () => {
    const activeColors = ['red', 'green', 'yellow', 'blue'].filter(c => roomData?.players?.[c]);
    if (activeColors.length < 1) {
      showToast("Need players to start!");
      return;
    }
    await updateGameState(roomId, {
      status: 'playing',
      turn: activeColors[0],
      dice: null,
      tokens: {
        red: [0, 0, 0, 0],
        yellow: [0, 0, 0, 0],
        green: [0, 0, 0, 0],
        blue: [0, 0, 0, 0]
      },
      message: `Game Restarted! ${activeColors[0].toUpperCase()}'s turn.`
    });
  };

  const handleRollDice = async () => {
    console.log("[Dice Clicked]");
    if (!gameState) { console.log("Aborting: No gameState"); return; }
    if (gameState.turn !== myPlayer) { console.log(`Aborting: Wrong turn. Current turn: ${gameState.turn}, You are: ${myPlayer}`); return; }

    const hasRolled = gameState.dice !== null && gameState.dice !== undefined;
    if (hasRolled) { console.log("Aborting: Already rolled. Value:", gameState.dice); return; }

    if (gameState.status !== 'playing') { console.log("Aborting: Game not started. Status:", gameState.status); return; }

    setRolling(true);
    await new Promise(r => setTimeout(r, 600));
    const val = Math.floor(Math.random() * 6) + 1;
    const validMoves = calculateValidMoves(gameState, myPlayer, val);

    let nextTurn = myPlayer;
    let newDice = val;
    let msg = `${myPlayer.toUpperCase()} rolled a ${val}!`;

    console.log("Rolled:", val, "Valid moves:", validMoves.length);

    if (validMoves.length === 0) {
      const activeColors = ['red', 'green', 'yellow', 'blue'].filter(c => roomDataRef.current?.players?.[c]);
      const currentIndex = activeColors.indexOf(myPlayer);
      nextTurn = activeColors[(currentIndex + 1) % activeColors.length];
      newDice = null;
      msg = `No moves for ${myPlayer}. ${nextTurn}'s turn.`;
      showToast(`No valid moves with ${val}`);

      await updateGameState(roomId, {
        dice: newDice,
        turn: nextTurn,
        message: msg
      });
    } else if (validMoves.length === 1) {
      // AUTO MOVE
      const autoIdx = validMoves[0];
      const newState = performMove(gameState, myPlayer, autoIdx, val);

      showToast(`${myPlayer.toUpperCase()} auto-moved ${val} steps`);

      // Short delay so they see the dice number first
      await new Promise(r => setTimeout(r, 800));
      await finalizeMove(newState, myPlayer, val);
    } else {
      // Let user pick
      await updateGameState(roomId, {
        dice: newDice,
        message: `Select a token to move ${val} steps`
      });
    }

    setRolling(false);
  };

  const finalizeMove = async (newState, player, diceUsed) => {
    const allFinished = newState.tokens[player].every(pos => pos === 57);
    console.log(`[Finalizing Move] Player: ${player}, Dice: ${diceUsed}, ExtraTurn: ${newState.extraTurn}`);

    if (allFinished) {
      newState.status = 'finished';
      newState.message = `🏆 ${player.toUpperCase()} WINS!`;
    } else {
      let nextTurn = player;
      let msg = newState.message || "";

      if (newState.extraTurn) {
        console.log("REWARD: Extra turn granted!");
        delete newState.extraTurn;
        nextTurn = player; // Should already be player
        if (!msg.includes("Extra turn")) msg += " Extra turn!";
      } else if (diceUsed === 6) {
        console.log("REWARD: Rolled a 6! Extra turn.");
        nextTurn = player;
        msg = "Rolled a 6! Roll again.";
      } else {
        console.log("PASS: Changing turn.");
        const activeColors = ['red', 'green', 'yellow', 'blue'].filter(c => roomDataRef.current?.players?.[c]);
        const currentIndex = activeColors.indexOf(player);
        nextTurn = activeColors[(currentIndex + 1) % activeColors.length];
        msg = `${nextTurn.toUpperCase()}'s turn.`;
      }

      newState.turn = nextTurn;
      newState.message = msg;
    }

    newState.dice = null;
    console.log("Finalizing Turn. Result Turn:", newState.turn);
    await updateGameState(roomId, newState);
  };

  const showToast = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 3000);
  };

  const handleTokenClick = async (player, tokenIdx) => {
    if (gameState.turn !== myPlayer || myPlayer !== player || gameState.dice === null) return;

    // Validate move
    const validMoves = calculateValidMoves(gameState, player, gameState.dice);
    if (!validMoves.includes(tokenIdx)) {
      showToast("Invalid move - need exact number for finish!");
      return;
    }

    const newState = performMove(gameState, player, tokenIdx, gameState.dice);
    await finalizeMove(newState, player, gameState.dice);
  };

  if (!gameState || !roomData) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-pulse text-slate-500 font-medium">Syncing with Ludo Database...</div>
    </div>
  );

  const isMyTurnCheck = gameState &&
    myPlayer &&
    String(gameState.turn).toLowerCase() === String(myPlayer).toLowerCase() &&
    gameState.status === 'playing';

  const myId = localStorage.getItem('playerId');

  return (
    <div className="game-layout">
      <header className="game-header">
        <h1>Ludo Online</h1>
        <div className="room-badge">Room: {roomId}</div>
      </header>

      <main className="game-main">
        <div className="board-wrapper" style={{ zIndex: 1, pointerEvents: 'auto' }}>
          <Board gameState={gameState} myPlayer={myPlayer} onTokenClick={handleTokenClick} roomData={roomData} />
        </div>

        <aside className="game-sidebar" style={{ position: 'relative', zIndex: 9999, background: '#fff', pointerEvents: 'all' }}>
          <div className="card status-card">
            <p className="system-msg" style={{ fontSize: '1.2rem', fontWeight: '900', color: '#1e293b', marginBottom: '12px' }}>
              {gameState.message}
            </p>
            {gameState.status === 'playing' && (
              <div className="flex flex-wrap gap-2">
                <div className={`player-badge ${gameState.turn}`} style={{ fontWeight: 'bold' }}>
                  TURN: {gameState.turn?.toUpperCase()}
                </div>
                {myPlayer !== 'spectator' && (
                  <div className={`player-badge ${myPlayer}`} style={{ opacity: 0.8 }}>
                    YOU: {myPlayer?.toUpperCase()}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card controls-card" style={{ position: 'relative', zIndex: 10000 }}>
            {gameState.status === 'waiting' ? (
              <div className="waiting-area">
                <h3 style={{ marginBottom: '16px', fontWeight: 'bold', color: '#475569' }}>Select Your Color</h3>
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '24px' }}>
                   {['red', 'green', 'yellow', 'blue'].map(c => {
                      const isTaken = !!roomData?.players?.[c];
                      const isMine = myPlayer === c;
                      return (
                        <button 
                           key={c}
                           onClick={() => joinGame(roomId, myId, c)}
                           disabled={isTaken && !isMine}
                           style={{
                             width: 48, height: 48, borderRadius: '50%',
                             background: `var(--${c})`,
                             opacity: (isTaken && !isMine) ? 0.2 : 1,
                             border: isMine ? '4px solid #1e293b' : 'none',
                             cursor: (isTaken && !isMine) ? 'not-allowed' : 'pointer',
                             boxShadow: isMine ? '0 0 0 4px rgba(0,0,0,0.1)' : 'none',
                             transition: 'all 0.2s'
                           }}
                        />
                      );
                   })}
                </div>

                {roomData?.creator === myId && (
                  <button className="btn-primary" onClick={handleStartGame}>Start Game</button>
                )}
                
                <div className="share-link" style={{ marginTop: '24px' }}>
                  <span style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: '600' }}>Share link to invite:</span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      readOnly 
                      value={window.location.href} 
                      onClick={e => e.target.select()} 
                      style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', color: '#475569' }}
                    />
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        showToast('Link copied!');
                      }}
                      style={{ padding: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569' }}
                    >
                      <Copy size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="playing-area">
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: '24px', width: '100%' }}>
                    <button
                      className={`dice-btn ${rolling ? 'rolling' : ''} ${isMyTurnCheck ? 'active' : ''}`}
                      onClick={() => handleRollDice()}
                      disabled={!isMyTurnCheck || (gameState.dice !== null && gameState.dice !== undefined)}
                      style={{
                        width: 100,
                        height: 100,
                        fontSize: '2rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        zIndex: 10001,
                        border: isMyTurnCheck ? '4px solid #ef4444' : '4px solid #cbd5e1',
                        background: '#fff',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                        flexShrink: 0
                      }}
                    >
                      <DiceIcon value={gameState.dice} rolling={rolling} />
                    </button>
                    {gameState.dice && !rolling && (
                      <div style={{ fontSize: '3.5rem', fontWeight: '900', color: '#1e293b', whiteSpace: 'nowrap' }} className="animate-pulse">
                        = {gameState.dice}
                      </div>
                    )}
                  </div>
                </div>
                {isMyTurnCheck && !gameState.dice && <div className="hint text-red-500 animate-bounce font-bold mt-2" style={{ color: '#ef4444', textAlign: 'center' }}>Your turn! Roll the dice</div>}
                {isMyTurnCheck && gameState.dice && <div className="hint text-blue-500 animate-pulse font-bold mt-2" style={{ color: '#3b82f6', textAlign: 'center' }}>Select a token to move</div>}
                
                {gameState.status === 'finished' && (
                  <button 
                    className="btn-primary mt-4" 
                    onClick={handlePlayAgain} 
                    style={{ background: '#22c55e', marginTop: '20px' }}
                  >
                    Play Again
                  </button>
                )}
              </div>
            )}
          </div>
        </aside>
      </main>

      {errorMsg && <div className="toast">{errorMsg}</div>}
    </div>
  );
};

export default App;
