import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, get } from 'firebase/database';

// Using the same credentials as ludo but pointing to a different path
const firebaseConfig = {
  apiKey: "AIzaSyCeoUenYWDpaE_l17NLtGX0tDOMV4HQY2g",
  authDomain: "onlinegames-ffc1d.firebaseapp.com",
  databaseURL: "https://onlinegames-ffc1d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "onlinegames-ffc1d",
  storageBucket: "onlinegames-ffc1d.firebasestorage.app",
  messagingSenderId: "847217962634",
  appId: "1:847217962634:web:bf4daf8b5802a201fc4773",
  measurementId: "G-X23W06120S"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// Prefixing all games with 'uno_games/' to prevent corruption with ludo's 'games/'
export const subscribeToGame = (roomId, callback) => {
  const gameRef = ref(db, `uno_games/${roomId}`);
  return onValue(gameRef, (snapshot) => {
    callback(snapshot.val());
  });
};

export const createGame = async (roomId, initialPlayerAuth) => {
  const gameRef = ref(db, `uno_games/${roomId}`);
  const snap = await get(gameRef);
  if (!snap.exists()) {
    await set(gameRef, {
      players: {
        player1: initialPlayerAuth, // Creator is player1
        player2: null,
        player3: null,
        player4: null
      },
      creator: initialPlayerAuth,
      gameState: {
        status: 'waiting', // 'waiting' or 'playing' or 'finished'
        turn: 'player1',
        direction: 1, // 1 for clockwise, -1 for counter-clockwise
        hands: {
          player1: [],
          player2: [],
          player3: [],
          player4: []
        },
        discardPile: [],
        drawPile: [],
        currentColor: null,
        drawPenalty: 0,
        message: 'Waiting for players to join...'
      }
    });
  }
};

export const joinGame = async (roomId, playerAuth, slotId) => {
  const gameRef = ref(db, `uno_games/${roomId}`);
  const snap = await get(gameRef);
  if (snap.exists()) {
    const data = snap.val();
    const players = data.players || {};
    
    // Check if player is already in another slot and remove them
    const updates = {};
    Object.keys(players).forEach(p => {
        if (players[p] === playerAuth) updates[`players/${p}`] = null;
    });
    
    // Assign to new slot if it's available or if it's their own previous slot
    if (!players[slotId] || players[slotId] === playerAuth) {
      updates[`players/${slotId}`] = playerAuth;
      await update(gameRef, updates);
    }
  }
};

export const updateGameState = async (roomId, partialState) => {
  const gameRef = ref(db, `uno_games/${roomId}/gameState`);
  await update(gameRef, partialState);
};

export const setFullState = async (roomId, fullData) => {
  const gameRef = ref(db, `uno_games/${roomId}`);
  await update(gameRef, fullData);
};
