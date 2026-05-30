let playerColor = null;
let isCreator = false;
let isStarted = false;
let playerInteractable = false;
let chessGame = null;
let selected = null;
let gameState = null;
let players = null;

const gameLogic = async (gameData) => {
    playerInteractable = false;
    console.log('Game data updated:', gameData);
    const roomId = window.location.hash.replace('#', '');
    if (!gameData) {
        await createGame(roomId, localStorage.getItem('playerId'));
        isCreator = true;
        return;
    };
    players = gameData.players || {};
    gameState = gameData.gameState || {};
    playerColor = Object.keys(players).find(key => players[key] === localStorage.getItem('playerId'));
    if (localStorage.getItem('playerId') === gameData.creator) {
        isCreator = true;
    }
    isStarted = Object.values(players).length === 2;
    if (!isStarted && isCreator) {
        renderStartScreen(playerColor || 'random');
        return;
    } else if (!isStarted && !playerColor) {
        joinAsFirstAvailableColor(roomId, players);
        return;
    } else {
        hideStartScreen();
    }
    createBoard(playerColor == 'black')
    renderBoard(gameState.fenBoard);
    if(gameState.fenBoard == startingPosition && isCreator) {
        renderSwitchColorsPanel();
    } else {
        hideSwitchColorsPanel();
    }
    chessGame = new chess(gameState.fenBoard);
    if(chessGame.isGameOver()) {
        const result = chessGame.isCheckmate() ? 'Checkmate' : chessGame.isStalemate() ? 'Stalemate' : chessGame.isDraw() ? 'Draw' : 'Game Over';
        showRestartPanel('Game over: ' + result);
    } else {
        hideRestartPanel();
    }
    var isPlayersTurn = gameState.fenBoard[gameState.fenBoard.indexOf(' ')+1] === 'w' ? playerColor === 'white' : playerColor === 'black';
    if(isPlayersTurn) {
        enablePlayerInteraction();
    }
    renderMoveHistory(gameState.moveHistory || []);
};

function joinAsFirstAvailableColor(roomId, players) {
    if (!players.white) {
        startGame(roomId, 'white');
    } else if (!players.black) {
        startGame(roomId, 'black');
    }
}

function enablePlayerInteraction() {
    playerInteractable = true;
}

async function setupGame(roomId) {
    subscribeToGame(roomId, gameLogic);
}

async function startGame(roomId, color) {
    if(color === 'random') {
        color = Math.random() < 0.5 ? 'white' : 'black';
        console.log(`Assigned color: ${color}`);
    }
    await joinGame(roomId, localStorage.getItem('playerId'), color);
}

function handleClickOnSquare(square) {
    if(!playerInteractable) return;
    const moves = chessGame.moves({square, verbose: true});
    const toMoves = !selected ? [] : chessGame.moves({square: selected, verbose: true});
    if(moves.length === 0 && toMoves.length === 0) return;
    if(!selected) {
        selected = square;
        highlightSquares(moves.map(m => m.to));
    } else {
        const move = toMoves.find(m => m.to === square);
        if(move) {
            chessGame.move({from: selected, to: square, promotion: 'q'});
            updateGameState(window.location.hash.replace('#', ''), {fenBoard: chessGame.fen()});
            addMoveToHistory(gameState, move);
            selected = null;
            clearHighlights();
        } else {
            if(moves.length > 0) {
                selected = square;
                highlightSquares(moves.map(m => m.to));
            } else {
                selected = null;
                clearHighlights();
            }
        }
    }
}