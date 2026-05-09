import React from 'react';
import { getTokenPosition, basePositions, isSafe, homePaths } from '../gameLogic';
import { Star } from 'lucide-react';

const Board = ({ gameState, myPlayer, onTokenClick, roomData }) => {
  const cells = Array.from({ length: 225 }, (_, i) => {
    const row = Math.floor(i / 15);
    const col = i % 15;
    return { row, col };
  });

  const activePlayers = ['red', 'green', 'yellow', 'blue'].filter(c => roomData?.players?.[c]);

  const renderTokens = (player) => {
    if (!gameState.tokens[player]) return null;

    // Group tokens by their derived grid coordinates to detect overlaps
    const positionsMap = {};

    ['red', 'green', 'yellow', 'blue'].forEach(p => {
      if (!gameState.tokens[p]) return;
      gameState.tokens[p].forEach((pos, idx) => {
        if (pos === 57) return;
        let r, c;
        if (pos === 0) {
          [r, c] = basePositions[p][idx];
        } else {
          const coord = getTokenPosition(p, pos);
          if (!coord) return;
          [r, c] = coord;
        }
        const key = `${r}-${c}`;
        if (!positionsMap[key]) positionsMap[key] = [];
        positionsMap[key].push({ player: p, tokenIdx: idx });
      });
    });

    return gameState.tokens[player].map((pos, idx) => {
      if (pos === 57) return null;
      let r, c;
      if (pos === 0) {
        [r, c] = basePositions[player][idx];
      } else {
        const coord = getTokenPosition(player, pos);
        if (!coord) return null;
        [r, c] = coord;
      }

      const key = `${r}-${c}`;
      const tokensOnThisSquare = positionsMap[key] || [];
      const myTokenSubIndex = tokensOnThisSquare.findIndex(t => t.player === player && t.tokenIdx === idx);

      // Calculate offset based on number of tokens on square
      const offset = tokensOnThisSquare.length > 1 ? (myTokenSubIndex - (tokensOnThisSquare.length - 1) / 2) * 5 : 0;

      const isMyTurn = gameState.turn === player;
      const isMe = myPlayer === player;
      let isHighlight = false;

      if (isMyTurn && isMe && gameState.dice !== null) {
        if (pos === 0 && gameState.dice === 6) isHighlight = true;
        if (pos > 0 && pos + gameState.dice <= 57) isHighlight = true;
      }

      const styles = {
        left: `calc(12px + var(--cell-size) * ${c} + var(--cell-size) * 0.1)`,
        top: `calc(12px + var(--cell-size) * ${r} + var(--cell-size) * 0.1)`,
        width: `calc(var(--cell-size) * 0.8)`,
        height: `calc(var(--cell-size) * 0.8)`,
        position: 'absolute',
        transform: `translate(${offset}px, ${offset}px)`,
        zIndex: isHighlight ? 20 : 10 + myTokenSubIndex,
        transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
      };

      return (
        <div
          key={`${player}-${idx}`}
          className={`token ${player} ${isHighlight ? 'highlight' : ''}`}
          style={styles}
          onClick={() => {
            if (isHighlight) onTokenClick(player, idx);
          }}
        />
      );
    });
  };

  const getCellClass = (r, c) => {
    let cls = 'cell ';
    if (isSafe(r, c)) cls += 'safe ';

    // Highlight home paths
    if (homePaths.red.some(p => p[0] === r && p[1] === c)) cls += 'red-path ';
    if (homePaths.yellow.some(p => p[0] === r && p[1] === c)) cls += 'yellow-path ';
    if (homePaths.green.some(p => p[0] === r && p[1] === c)) cls += 'green-path ';
    if (homePaths.blue.some(p => p[0] === r && p[1] === c)) cls += 'blue-path ';

    // Ignore painting center block as separate grid cells since we have a .center overlay
    if (r >= 6 && r <= 8 && c >= 6 && c <= 8) cls += 'hidden ';

    return cls;
  };

  return (
    <div className="board" style={{ position: 'relative' }}>
      {cells.map(({ row, col }) => {
        if (row >= 6 && row <= 8 && col >= 6 && col <= 8) return null; // center handled separately
        if (row < 6 && col < 6) return null; // red base handled
        if (row < 6 && col > 8) return null; // green base
        if (row > 8 && col < 6) return null; // blue base
        if (row > 8 && col > 8) return null; // yellow base

        return (
          <div
            key={`${row}-${col}`}
            className={getCellClass(row, col)}
            style={{ gridColumn: col + 1, gridRow: row + 1 }}
          >
            {isSafe(row, col) && <Star color="#cbd5e1" size={16} />}
          </div>
        );
      })}

      {/* Bases */}
      <div className="base red" style={{ gridRow: '1/7', gridColumn: '1/7' }} />
      <div className="base-inner-slots" style={{ gridRow: '1/7', gridColumn: '1/7', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', pointerEvents: 'none' }}>
        {basePositions.red.map((p, i) => (
          <div key={i} className="base-slot" style={{ gridRow: (p[0] % 6) + 1, gridColumn: (p[1] % 6) + 1, justifySelf: 'center', alignSelf: 'center' }} />
        ))}
      </div>

      <div className="base green" style={{ gridRow: '1/7', gridColumn: '10/16' }} />
      <div className="base-inner-slots" style={{ gridRow: '1/7', gridColumn: '10/16', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', pointerEvents: 'none' }}>
        {basePositions.green.map((p, i) => (
          <div key={i} className="base-slot" style={{ gridRow: (p[0] % 6) + 1, gridColumn: (p[1] - 9) + 1, justifySelf: 'center', alignSelf: 'center' }} />
        ))}
      </div>

      <div className="base blue" style={{ gridRow: '10/16', gridColumn: '1/7' }} />
      <div className="base-inner-slots" style={{ gridRow: '10/16', gridColumn: '1/7', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', pointerEvents: 'none' }}>
        {basePositions.blue.map((p, i) => (
          <div key={i} className="base-slot" style={{ gridRow: (p[0] - 9) + 1, gridColumn: (p[1] % 6) + 1, justifySelf: 'center', alignSelf: 'center' }} />
        ))}
      </div>

      <div className="base yellow" style={{ gridRow: '10/16', gridColumn: '10/16' }} />
      <div className="base-inner-slots" style={{ gridRow: '10/16', gridColumn: '10/16', display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gridTemplateRows: 'repeat(6, 1fr)', pointerEvents: 'none' }}>
        {basePositions.yellow.map((p, i) => (
          <div key={i} className="base-slot" style={{ gridRow: (p[0] - 9) + 1, gridColumn: (p[1] - 9) + 1, justifySelf: 'center', alignSelf: 'center' }} />
        ))}
      </div>

      <div className="center" style={{ position: 'relative' }}>
        {/* Render finished tokens here */}
        {['red', 'green', 'yellow', 'blue'].map(player => 
          gameState.tokens[player]?.map((pos, idx) => {
            if (pos !== 57) return null;
            
            // Positioning within triangles
            let posStyle = {};
            if (player === 'red') posStyle = { left: '10%', top: '37.5%' };
            if (player === 'yellow') posStyle = { right: '10%', top: '37.5%' };
            if (player === 'green') posStyle = { left: '37.5%', top: '10%' };
            if (player === 'blue') posStyle = { left: '37.5%', bottom: '10%' };

            return (
              <div 
                key={`${player}-won-${idx}`}
                className={`token ${player}`}
                style={{
                  position: 'absolute',
                  width: '25%',
                  height: '25%',
                  ...posStyle,
                  zIndex: 20,
                  transform: (player === 'red' || player === 'yellow') 
                    ? `translateX(${idx * 4}px)` 
                    : `translateY(${idx * 4}px)`,
                  border: '2px solid white'
                }}
              />
            );
          })
        )}
      </div>

      {/* Tokens */}
      {['red', 'green', 'yellow', 'blue'].map(p => renderTokens(p))}
    </div>
  );
};

export default Board;
