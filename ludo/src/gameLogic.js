export const mainTrack = [
  [6,1], [6,2], [6,3], [6,4], [6,5], 
  [5,6], [4,6], [3,6], [2,6], [1,6], [0,6],
  [0,7], 
  [0,8], [1,8], [2,8], [3,8], [4,8], [5,8], 
  [6,9], [6,10], [6,11], [6,12], [6,13], [6,14], 
  [7,14], 
  [8,14], [8,13], [8,12], [8,11], [8,10], [8,9], 
  [9,8], [10,8], [11,8], [12,8], [13,8], [14,8], 
  [14,7], 
  [14,6], [13,6], [12,6], [11,6], [10,6], [9,6], 
  [8,5], [8,4], [8,3], [8,2], [8,1], [8,0], 
  [7,0], [6,0] 
];

export const safeSquares = [
  [6,1], [2,6], [1,8], [6,12], [8,13], [12,8], [13,6], [8,2]
];

export const homePaths = {
  red: [ [7,1], [7,2], [7,3], [7,4], [7,5] ],
  yellow: [ [7,13], [7,12], [7,11], [7,10], [7,9] ],
  green: [ [1,7], [2,7], [3,7], [4,7], [5,7] ],
  blue: [ [13,7], [12,7], [11,7], [10,7], [9,7] ]
};

export const basePositions = {
  red: [ [2,2], [2,3], [3,2], [3,3] ],
  yellow: [ [11,11], [11,12], [12,11], [12,12] ],
  green: [ [2,11], [2,12], [3,11], [3,12] ],
  blue: [ [11,2], [11,3], [12,2], [12,3] ]
};

export const START_OFFSETS = {
  red: 0,
  yellow: 26
};

// Returns {row, col} or null if out of bounds (base is null here, handled separately)
// pos: 0 = base, 1-51 = track, 52-56 = home, 57 = won
export const getTokenPosition = (player, pos) => {
  if (pos === 0) return null; // Base
  if (pos === 57) return [7,7]; // Central victory pool
  
  if (pos <= 51) {
    let offset = START_OFFSETS[player];
    let trackIndex = (offset + pos - 1) % 52;
    return mainTrack[trackIndex];
  } else {
    // 52 = index 0 of home path
    let homeIndex = pos - 52;
    return homePaths[player][homeIndex];
  }
};

export const isSafe = (row, col) => {
  return safeSquares.some(s => s[0] === row && s[1] === col);
};

export const calculateValidMoves = (gameState, player, diceValue) => {
  const tokens = gameState.tokens[player];
  const validMoves = [];
  
  tokens.forEach((pos, idx) => {
    if (pos === 0) {
      if (diceValue === 6) {
        validMoves.push(idx); // Can enter board
      }
    } else if (pos > 0 && pos < 57) {
      if (pos + diceValue <= 57) {
        validMoves.push(idx); // Can move forward
      }
    }
  });
  
  return validMoves;
};

// Calculate the new state after moving a specific token
export const performMove = (gameState, player, tokenIdx, diceValue) => {
  let newState = JSON.parse(JSON.stringify(gameState)); // Deep copy
  let currPos = newState.tokens[player][tokenIdx];
  let newPos;
  
  if (currPos === 0 && diceValue === 6) {
    newPos = 1;
  } else {
    newPos = currPos + diceValue;
  }
  
  newState.tokens[player][tokenIdx] = newPos;

  // Extra turn if reached end
  if (newPos === 57) {
    newState.extraTurn = true;
    newState.message = `Fantastic! ${player.toUpperCase()} finished a token! Extra turn.`;
  }
  
  // Calculate Catch / Kill logic
  // Only matters if new position is <= 51 
  if (newPos > 0 && newPos <= 51) {
    let newCoord = getTokenPosition(player, newPos);
    
    // Check if another player is on this square and it is NOT safe
    if (!isSafe(newCoord[0], newCoord[1])) {
      let opponent = player === 'red' ? 'yellow' : 'red';
      
      // Iterate opponent tokens to see if they are killed
      newState.tokens[opponent].forEach((oppPos, oppIdx) => {
        if (oppPos > 0 && oppPos <= 51) {
          let oppCoord = getTokenPosition(opponent, oppPos);
          if (oppCoord[0] === newCoord[0] && oppCoord[1] === newCoord[1]) {
            // KILL! Send to base
            newState.tokens[opponent][oppIdx] = 0;
            // Also giving an extra turn is a classic rule, we can just log it or pass it.
            newState.message = `Oh snap! ${player.toUpperCase()} sent ${opponent.toUpperCase()} home!`;
            newState.extraTurn = true; 
          }
        }
      });
    }
  }
  
  return newState;
};
