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

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

const subscribeToGame = (roomId, callback) => {
  const gameRef = db.ref(`chess/${roomId}`);
  return gameRef.on('value', (snapshot) => {
    callback(snapshot.val());
  });
};

const readGameData = async (roomId) => {
  const gameRef = db.ref(`chess/${roomId}`);
  const snap = await gameRef.get();
  return snap.val();
}

const createGame = async (roomId, initialPlayerAuth, forceUpdate=false, players={}) => {
  const gameRef = db.ref(`chess/${roomId}`);
  const snap = await gameRef.get();
  if (!snap.exists() || forceUpdate) {
    await gameRef.set({
      players: {
        white: players.white || null,
        black: players.black || null
      },
      creator: initialPlayerAuth,
      gameState: {
        fenBoard: startingPosition,
        moveHistory: [],
      }
    });
  }
};

const joinGame = async (roomId, playerAuth, color) => {
  const gameRef = db.ref(`chess/${roomId}`);
  const snap = await gameRef.get();
  if (snap.exists()) {
    const data = snap.val();
    const players = data.players || {};
    if (!players[color]) {
      const updates = {};
      Object.keys(players).forEach(c => {
         if (players[c] === playerAuth) updates[`players/${c}`] = null;
      });
      updates[`players/${color}`] = playerAuth;
      await gameRef.update(updates);
    }
  }
};

const updateGameState = async (roomId, partialState) => {
  const gameRef = db.ref(`chess/${roomId}/gameState`);
  await gameRef.update(partialState);
};

const switchPlayers = async (roomId, random = false) => {
    const gameRef = db.ref(`chess/${roomId}`);
    const snap = await gameRef.get();
    if (snap.exists()) {
        const data = snap.val();
        const players = data.players || {};
        const updates = random && Math.random() > 0.5 ? {} : {
            players: {
                white: players.black || null,
                black: players.white || null
            }
        };
        console.log('Switching players with updates:', updates);
        await gameRef.update(updates); 
      }
};

const addMoveToHistory = async (gameState, move) => {
    const roomId = window.location.hash.replace('#', '');
    updateGameState(roomId, {
        moveHistory: gameState.moveHistory ? [...gameState.moveHistory, move.san] : [move.san]
    });
}
