import { useState, useEffect } from 'react';
import { subscribeToGame, joinGame, updateGameState, setFullState } from '../firebase';
import { generateDeck, isValidPlay, COLORS } from '../gameLogic';
import UnoCard from './UnoCard';

const SLOTS = ['player1', 'player2', 'player3', 'player4'];

export default function GameBoard({ roomId, playerAuth }) {
  const [gameData, setGameData] = useState(null);
  const [mySlot, setMySlot] = useState(null);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState(null);
  const [snackbarMsg, setSnackbarMsg] = useState('');

  useEffect(() => {
    const unsubscribe = subscribeToGame(roomId, (data) => {
      setGameData(data);
      if (data && data.players) {
        const slot = Object.keys(data.players).find(k => data.players[k] === playerAuth);
        setMySlot(slot);
      }
    });
    return () => unsubscribe();
  }, [roomId, playerAuth]);

  if (!gameData) return <div className="loading">Loading game...</div>;

  const players = gameData.players || {};
  const gameState = gameData.gameState || {};

  const handleJoinSlot = async (slotId) => {
    await joinGame(roomId, playerAuth, slotId);
  };

  const startGame = async () => {
    let deck = generateDeck();
    let hands = { player1: [], player2: [], player3: [], player4: [] };
    
    // Deal 7 cards to each active player
    for (let slot of SLOTS) {
      if (players[slot]) {
        hands[slot] = deck.splice(0, 7);
      }
    }

    // Top card shouldn't be a wild card ideally, but for simplicity we allow it or pop until valid
    let topCard = deck.pop();
    while (topCard.type === 'wild' || topCard.value === 'Skip' || topCard.value === 'Reverse' || topCard.value === 'Draw Two') {
      deck.unshift(topCard);
      topCard = deck.pop();
    }

    const firstPlayer = SLOTS.find(s => players[s]);

    await updateGameState(roomId, {
      status: 'playing',
      turn: firstPlayer,
      direction: 1,
      hands,
      discardPile: [topCard],
      drawPile: deck,
      currentColor: topCard.color,
      hasDrawn: false,
      drawPenalty: 0,
      message: 'Game started!'
    });
  };

  const getNextPlayer = (currentTurn, direction) => {
    const activePlayers = SLOTS.filter(s => players[s]);
    let currentIndex = activePlayers.indexOf(currentTurn);
    let nextIndex = (currentIndex + direction + activePlayers.length) % activePlayers.length;
    return activePlayers[nextIndex];
  };

  const handlePlayCard = async (cardIndex) => {
    if (gameState.turn !== mySlot) return;

    const hand = [...gameState.hands[mySlot]];
    const cardToPlay = hand[cardIndex];
    const topCard = gameState.discardPile[gameState.discardPile.length - 1];

    if (!isValidPlay(cardToPlay, topCard, gameState.currentColor, gameState.drawPenalty)) {
      return;
    }

    if (cardToPlay.type === 'wild') {
      setPendingWildCard(cardIndex);
      setShowColorPicker(true);
      return;
    }

    executePlayCard(cardIndex, cardToPlay.color);
  };

  const executePlayCard = async (cardIndex, selectedColor) => {
    const hand = [...gameState.hands[mySlot]];
    const cardToPlay = hand.splice(cardIndex, 1)[0];
    
    let newDirection = gameState.direction;
    let nextTurn = getNextPlayer(mySlot, newDirection);
    let newDrawPile = [...gameState.drawPile];
    let newHands = { ...gameState.hands, [mySlot]: hand };
    let newPenalty = gameState.drawPenalty || 0;

    const activePlayers = SLOTS.filter(s => players[s]);

    if (cardToPlay.value === 'Reverse') {
      newDirection *= -1;
      if (activePlayers.length === 2) {
        nextTurn = mySlot; // In 2-player game, reverse acts exactly like a skip
      } else {
        nextTurn = getNextPlayer(mySlot, newDirection);
      }
    } else if (cardToPlay.value === 'Skip') {
      if (activePlayers.length === 2) {
        nextTurn = mySlot;
      } else {
        nextTurn = getNextPlayer(nextTurn, newDirection); // Skip next player
      }
    } else if (cardToPlay.value === 'Draw Two') {
      newPenalty += 2;
    } else if (cardToPlay.value === 'Wild Draw Four') {
      newPenalty += 4;
    }

    let winner = null;
    if (hand.length === 0) {
      winner = mySlot;
    }

    await updateGameState(roomId, {
      turn: winner ? null : nextTurn,
      direction: newDirection,
      hands: newHands,
      discardPile: [...gameState.discardPile, cardToPlay],
      drawPile: newDrawPile,
      currentColor: selectedColor,
      hasDrawn: false,
      drawPenalty: newPenalty,
      status: winner ? 'finished' : 'playing',
      message: winner ? `${mySlot} wins!` : `${nextTurn}'s turn`
    });

    setShowColorPicker(false);
    setPendingWildCard(null);
  };

  const handleDrawCard = async () => {
    if (gameState.turn !== mySlot || gameState.hasDrawn || gameState.drawPenalty > 0) return;

    let newDrawPile = [...gameState.drawPile];
    let newHands = { ...gameState.hands };
    
    if (newDrawPile.length === 0) {
       const discard = [...gameState.discardPile];
       const topCard = discard.pop();
       newDrawPile = discard.sort(() => Math.random() - 0.5);
       await updateGameState(roomId, { discardPile: [topCard] });
    }

    const card = newDrawPile.shift();
    newHands[mySlot] = [...newHands[mySlot], card];

    await updateGameState(roomId, {
      hands: newHands,
      drawPile: newDrawPile,
      hasDrawn: true,
    });
  };

  const handleDrawPenalty = async () => {
    if (gameState.turn !== mySlot || !gameState.drawPenalty) return;

    let currentDrawPile = [...gameState.drawPile];
    let currentDiscardPile = [...gameState.discardPile];
    let newHand = [...gameState.hands[mySlot]];

    for (let i = 0; i < gameState.drawPenalty; i++) {
      if (currentDrawPile.length === 0) {
        if (currentDiscardPile.length <= 1) break; 
        const topCard = currentDiscardPile.pop();
        currentDrawPile = currentDiscardPile.sort(() => Math.random() - 0.5);
        currentDiscardPile = [topCard];
      }
      if (currentDrawPile.length > 0) {
         newHand.push(currentDrawPile.shift());
      }
    }

    await updateGameState(roomId, {
      hands: { ...gameState.hands, [mySlot]: newHand },
      drawPile: currentDrawPile,
      discardPile: currentDiscardPile,
      drawPenalty: 0,
      turn: getNextPlayer(mySlot, gameState.direction),
      hasDrawn: false,
      message: `${getNextPlayer(mySlot, gameState.direction)}'s turn`
    });
  };

  const handlePass = async () => {
    if (gameState.turn !== mySlot || !gameState.hasDrawn) return;
    await updateGameState(roomId, {
      turn: getNextPlayer(mySlot, gameState.direction),
      hasDrawn: false,
      message: `${getNextPlayer(mySlot, gameState.direction)}'s turn`
    });
  };

  const topCard = gameState.discardPile ? gameState.discardPile[gameState.discardPile.length - 1] : null;

  return (
    <div className="game-board">
      <div className="header">
        <h2>Room: {roomId}</h2>
        <div className="status-msg">{gameState.message}</div>
      </div>

      {gameState.status === 'waiting' && (
        <div className="lobby-slots">
          <h3>Select a Slot</h3>
          <div className="slots-container">
            {SLOTS.map(slot => (
              <button 
                key={slot} 
                className={`slot-btn ${players[slot] === playerAuth ? 'my-slot' : players[slot] ? 'taken' : ''}`}
                onClick={() => handleJoinSlot(slot)}
                disabled={players[slot] && players[slot] !== playerAuth}
              >
                {slot}: {players[slot] === playerAuth ? 'You' : players[slot] ? 'Joined' : 'Empty'}
              </button>
            ))}
          </div>
          
          <button 
            className="secondary-btn mt-4" 
            onClick={() => {
              navigator.clipboard.writeText(window.location.href);
              setSnackbarMsg('Invite link copied!');
              setTimeout(() => setSnackbarMsg(''), 3000);
            }}
          >
            Copy Invite Link
          </button>

          <button 
            className="primary-btn mt-4" 
            onClick={startGame}
            disabled={Object.values(players).filter(Boolean).length < 2}
          >
            {Object.values(players).filter(Boolean).length < 2 ? 'Waiting for 2+ players...' : 'Start Game'}
          </button>
        </div>
      )}

      {gameState && gameState.status === 'finished' && (
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button className="primary-btn" onClick={startGame}>Play Again</button>
        </div>
      )}

      {gameState && gameState.status !== 'waiting' && (
        <div className="play-area">
          <div className="opponents">
            {SLOTS.filter(s => s !== mySlot && players[s]).map(slot => (
              <div key={slot} className={`opponent ${gameState.turn === slot ? 'active-turn' : ''}`}>
                <div className="opponent-name">{slot}</div>
                <div className="opponent-cards-stack">
                  {Array.from({ length: gameState.hands[slot]?.length || 0 }).map((_, i) => (
                    <div key={i} className="mini-card-back" style={{ marginLeft: i === 0 ? 0 : '-15px' }}>
                      <UnoCard isBack={true} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="center-table">
            <div className="draw-pile" onClick={handleDrawCard}>
              <div className="card-container">
                <UnoCard isBack={true} />
              </div>
            </div>
            {topCard && (
              <div className="discard-pile">
                <div className="card-container">
                  <UnoCard color={topCard.color} value={topCard.value} type={topCard.type} />
                </div>
              </div>
            )}
            <div className="current-color-indicator" style={{ backgroundColor: gameState.currentColor === 'Red' ? '#e53935' : gameState.currentColor === 'Blue' ? '#1e88e5' : gameState.currentColor === 'Green' ? '#43a047' : gameState.currentColor === 'Yellow' ? '#fdd835' : '#ccc' }}></div>
          </div>

          {mySlot && gameState.hands[mySlot] && (
            <div className={`my-hand ${gameState.turn === mySlot ? 'my-turn' : ''}`}>
              <h3>
                My Hand
                {gameState.turn === mySlot && gameState.drawPenalty > 0 && (
                  <button className="primary-btn" style={{ marginLeft: '1rem', width: 'auto', padding: '0.4rem 1rem', backgroundColor: '#e53935' }} onClick={handleDrawPenalty}>
                    Accept Penalty (+{gameState.drawPenalty})
                  </button>
                )}
                {gameState.turn === mySlot && gameState.hasDrawn && (!gameState.drawPenalty || gameState.drawPenalty === 0) && (
                  <button className="secondary-btn" style={{ marginLeft: '1rem', width: 'auto', padding: '0.4rem 1rem' }} onClick={handlePass}>Pass Turn</button>
                )}
              </h3>
              <div className="cards-container">
                {gameState.hands[mySlot].map((card, idx) => (
                  <div 
                    key={idx} 
                    className="card-container clickable"
                    onClick={() => handlePlayCard(idx)}
                  >
                    <UnoCard color={card.color} value={card.value} type={card.type} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {showColorPicker && (
            <div className="color-picker-overlay">
              <div className="color-picker">
                <h3>Select Color</h3>
                {COLORS.map(c => (
                  <button key={c} className={`color-btn ${c.toLowerCase()}`} onClick={() => executePlayCard(pendingWildCard, c)}>{c}</button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {gameState.status === 'finished' && (
        <div className="finished">
          <h2>Game Over</h2>
          <p>{gameState.message}</p>
        </div>
      )}
      
      {snackbarMsg && <div className="snackbar">{snackbarMsg}</div>}
    </div>
  );
}
