import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, get } from 'firebase/database';

// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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

export const subscribeToGame = (roomId, callback) => {
  const gameRef = ref(db, `games/${roomId}`);
  return onValue(gameRef, (snapshot) => {
    callback(snapshot.val());
  });
};

export const createGame = async (roomId, initialPlayerAuth) => {
  const gameRef = ref(db, `games/${roomId}`);
  const snap = await get(gameRef);
  if (!snap.exists()) {
    await set(gameRef, {
      players: {
        red: initialPlayerAuth, // Red creates the game
        yellow: null
      },
      gameState: {
        turn: 'red',
        dice: null,
        tokens: {
          red: [0, 0, 0, 0],
          yellow: [0, 0, 0, 0]
        },
        status: 'waiting',
        message: 'Waiting for Player 2 (Yellow) to join...'
      }
    });
  }
};

export const joinGame = async (roomId, playerAuth) => {
  const gameRef = ref(db, `games/${roomId}`);
  const snap = await get(gameRef);
  if (snap.exists()) {
    const data = snap.val();
    if (!data.players.yellow && data.players.red !== playerAuth) {
      await update(gameRef, {
        'players/yellow': playerAuth,
        'gameState/status': 'playing',
        'gameState/message': 'Game Started! Red\'s turn.'
      });
    }
  }
};

export const updateGameState = async (roomId, partialState) => {
  const gameRef = ref(db, `games/${roomId}/gameState`);
  await update(gameRef, partialState);
};
