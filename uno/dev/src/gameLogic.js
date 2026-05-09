export const COLORS = ['Red', 'Yellow', 'Green', 'Blue'];
export const VALUES = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'Skip', 'Reverse', 'Draw Two'];
export const WILD_CARDS = ['Wild', 'Wild Draw Four'];

export const generateDeck = () => {
  let deck = [];
  
  // Add colored cards
  for (let color of COLORS) {
    for (let value of VALUES) {
      deck.push({ color, value, type: 'normal' }); // 1 zero
      if (value !== '0') {
        deck.push({ color, value, type: 'normal' }); // 2 of each 1-9 and action cards
      }
    }
  }

  // Add wild cards
  for (let wild of WILD_CARDS) {
    for (let i = 0; i < 4; i++) {
      deck.push({ color: 'Wild', value: wild, type: 'wild' });
    }
  }

  // Shuffle deck
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
};

export const isValidPlay = (cardToPlay, currentTopCard, currentColor, drawPenalty = 0) => {
  if (drawPenalty > 0) {
    if (currentTopCard.value === 'Draw Two' && cardToPlay.value === 'Draw Two') return true;
    if (currentTopCard.value === 'Wild Draw Four' && cardToPlay.value === 'Wild Draw Four') return true;
    return false;
  }

  if (cardToPlay.type === 'wild') return true;
  
  // If the top card was a wild card that changed the color
  if (currentTopCard.type === 'wild') {
      return cardToPlay.color === currentColor;
  }

  // Otherwise, match color or value
  return cardToPlay.color === currentTopCard.color || cardToPlay.value === currentTopCard.value;
};
