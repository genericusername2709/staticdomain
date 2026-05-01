import React, { useState, useEffect } from 'react';
import Board from './components/Board';
import { subscribeToGame, createGame, joinGame, updateGameState } from './firebase';
import { performMove, calculateValidMoves } from './gameLogic';
import { Dice1, Dice2, Dice3, Dice4, Dice5, Dice6, RotateCcw } from 'lucide-react';

const DiceIcon = ({ value, rolling }) => {
  if (rolling) return <RotateCcw className="animate-spin text-slate-400" size={32} />;
  switch (value) {
    case 1: return <Dice1 size={32} />;
    case 2: return <Dice2 size={32} />;
    case 3: return <Dice3 size={32} />;
    case 4: return <Dice4 size={32} />;
    case 5: return <Dice5 size={32} />;
    case 6: return <Dice6 size={32} />;
    default: return <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#cbd5e1' }} />;
  }
};

const App = () => {
  const [roomId, setRoomId] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [rolling, setRolling] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
        setGameState(state.gameState);
        if (state.players.red === myId) setMyPlayer('red');
        else if (state.players.yellow === myId) setMyPlayer('yellow');
        else if (!state.players.yellow) {
          await joinGame(room, myId);
          setMyPlayer('yellow');
        } else setMyPlayer('spectator');
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
    await updateGameState(roomId, {
      status: 'playing',
      message: "Game Started! Red's turn."
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
      nextTurn = myPlayer === 'red' ? 'yellow' : 'red';
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

      showToast(`${myPlayer.toUpperCase()} auto-moved token ${autoIdx + 1}`);

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
        nextTurn = player === 'red' ? 'yellow' : 'red';
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

  if (!gameState) return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="animate-pulse text-slate-500 font-medium">Syncing with Ludo Database...</div>
    </div>
  );

  // Use a more robust check for turns
  const isMyTurnCheck = gameState &&
    myPlayer &&
    String(gameState.turn).toLowerCase() === String(myPlayer).toLowerCase() &&
    gameState.status === 'playing';

  return (
    <div className="game-layout">
      <header className="game-header">
        <h1>Ludo Online</h1>
        <div className="room-badge">Room: {roomId}</div>
      </header>

      <main className="game-main">
        <div className="board-wrapper" style={{ zIndex: 1, pointerEvents: 'auto' }}>
          <Board gameState={gameState} myPlayer={myPlayer} onTokenClick={handleTokenClick} />
        </div>

        <aside className="game-sidebar" style={{ position: 'relative', zIndex: 9999, background: '#fff', pointerEvents: 'all' }}>
          <div className="card status-card">
            <h3>Game Status</h3>
            <div className={`player-badge ${myPlayer}`}>
              You are: {myPlayer === 'red' ? '🔴 Red' : myPlayer === 'yellow' ? '🟡 Yellow' : '👁️ Spectator'}
            </div>
            <p className="system-msg">{gameState.message}</p>
          </div>

          <div className="card controls-card" style={{ position: 'relative', zIndex: 10000 }}>
            {gameState.status === 'waiting' ? (
              <div className="waiting-area">
                <p>Waiting for Player 2...</p>
                {myPlayer === 'red' && (
                  <button className="btn-primary" onClick={handleStartGame}>Start Solo</button>
                )}
                <div className="share-link">
                  <span>Share link to invite:</span>
                  <input readOnly value={window.location.href} onClick={e => e.target.select()} />
                </div>
              </div>
            ) : (
              <div className="playing-area">
                <div className="turn-indicator">
                  Next: <span className={gameState.turn}>{(gameState.turn || '').toUpperCase()}</span>
                </div>
                <div className="flex flex-col items-center justify-center p-4 gap-2">
                  <button
                    className={`dice-btn ${rolling ? 'rolling' : ''} ${isMyTurnCheck ? 'active' : ''}`}
                    onClick={() => handleRollDice()}
                    disabled={!isMyTurnCheck || (gameState.dice !== null && gameState.dice !== undefined)}
                    style={{
                      width: 100,
                      height: 100,
                      fontSize: '2rem',
                      position: 'relative',
                      zIndex: 10001,
                      border: isMyTurnCheck ? '4px solid #ef4444' : '4px solid #cbd5e1'
                    }}
                  >
                    <DiceIcon value={gameState.dice} rolling={rolling} />
                  </button>
                </div>
                {isMyTurnCheck && !gameState.dice && <div className="hint text-red-500 animate-bounce">Your turn! Roll the dice</div>}
                {isMyTurnCheck && gameState.dice && <div className="hint text-blue-500 animate-pulse">Select a token to move</div>}
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
