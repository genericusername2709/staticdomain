function createBoard(flip=false) {
    const board = document.querySelector('[data-board="Board"]');
    const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const ranks = ['1', '2', '3', '4', '5', '6', '7', '8'];
    if(flip) {
        files.reverse();
    } else {
        ranks.reverse();
    }
    board.innerHTML = '';
    for(let rank of ranks) {
        const row = document.createElement('div');
        row.classList.add('Row');
        row.dataset.row = rank;
        for(let file of files) {
            const square = document.createElement('div');
            square.classList.add('Square');
            if((files.indexOf(file) + ranks.indexOf(rank)) % 2 === 0) {
                square.classList.add('Light');
            } else {
                square.classList.add('Dark');
            }
            if(files.indexOf(file) === 0) {
                let rankLabel = document.createElement('span');
                rankLabel.classList.add('RowLabel', 'Label');
                rankLabel.dataset.rank = rank;
                rankLabel.innerHTML = rank;
                square.appendChild(rankLabel);
            }
            if(ranks.indexOf(rank) === 7) {
                let fileLabel = document.createElement('span');
                fileLabel.classList.add('ColumnLabel', 'Label');
                fileLabel.dataset.file = file;
                fileLabel.innerHTML = file;
                square.appendChild(fileLabel);
            }
            square.dataset.square = `${file}${rank}`;
            row.appendChild(square);
        }
        board.appendChild(row);
    }
}

function renderBoard(fenBoard=startingPosition) {
    peiceString = fenBoard.split(' ')[0];
    let currentFile = 1;
    let currentRank = 8;
    for(let i = 0; i < peiceString.length; i++) {
        const char = peiceString[i];
        if(char >= '1' && char <= '8') {
            currentFile = currentFile + parseInt(char);
        } else if(char === '/') {
            currentRank--;
            currentFile = 1;
        } else {
            const piece = peiceMap[char];
            let charCurrentFile = String.fromCharCode('a'.charCodeAt(0) + currentFile - 1);
            let square = document.querySelector(`[data-square="${charCurrentFile}${currentRank}"] .Piece`);
            if(!square) {
                let sqaureWrapper = document.querySelector(`[data-square="${charCurrentFile}${currentRank}"]`);
                sqaureWrapper.innerHTML = sqaureWrapper.innerHTML + `<span class="Piece"></span>`;
                square = sqaureWrapper.querySelector('.Piece');
            }
            square.innerHTML = piece;
            currentFile++;
        }
    }
}

function handleClick(event) {
    square = event.target.closest('.Square');
    if(!square) return;
    console.log('clicked', square.dataset.square);
    handleClickOnSquare(square.dataset.square);
}

function hideStartScreen() {
    const board = document.querySelector('[data-board="Board"]');
    const overlay = document.querySelector('.StartScreenOverlay');
    if (overlay) overlay.remove();
    board.classList.remove('hidden');
}

async function copyUrlToClipboard() {
    try {
        await navigator.clipboard.writeText(window.location.href);
        const message = document.querySelector('.StartScreenMessage');
        if (message) message.textContent = 'URL copied to clipboard!';
    } catch (err) {
        alert('Could not copy URL. Please copy the link manually.');
    }
}

function renderStartScreen() {
    const board = document.querySelector('[data-board="Board"]');
    const boardContainer = board.closest('.BoardContainer');
    hideStartScreen();
    board.classList.add('hidden');

    const overlay = document.createElement('div');
    overlay.className = 'StartScreenOverlay';
    overlay.innerHTML = `
      <div class="StartScreen">
        <h2>Waiting for opponent...</h2>
        <p class="StartScreenMessage">Share this URL to join:</p>
        <p><code class="RoomId">${window.location.href}</code></p>
        <div class="StartControls">
          <label class="ColorLabel">
            Choose color:
            <select id="colorSelect">
              <option value="white">White</option>
              <option value="black">Black</option>
            </select>
          </label>
          <div class="ButtonRow">
            <button id="copyUrlBtn" type="button">Copy URL</button>
            <button id="startGameBtn" type="button">Start Game</button>
          </div>
        </div>
      </div>
    `;

    boardContainer.appendChild(overlay);
    document.getElementById('copyUrlBtn').addEventListener('click', copyUrlToClipboard);
    document.getElementById('startGameBtn').addEventListener('click', async () => {
        const color = document.getElementById('colorSelect').value;
        await startGame(window.location.hash.replace('#', ''), color);
    });
}

function init() {
    const hash = window.location.hash.replace('#', '');
    const myId = localStorage.getItem('playerId') || Math.random().toString(36).substr(2, 9);
    localStorage.setItem('playerId', myId);
    if (hash) setupGame(hash);
    else {
      const newRoom = Math.random().toString(36).substr(2, 6);
      window.location.hash = newRoom;
      setupGame(newRoom);
    }
}

function switchColorsButtonListener() {
    const roomId = window.location.hash.replace('#', '');
    switchPlayers(roomId);
}

function randomizeColorsButtonListener() {
    const roomId = window.location.hash.replace('#', '');
    switchPlayers(roomId, 'random');
}

function renderSwitchColorsPanel() {
    const panel = document.getElementById('SwitchColorsPanel');
    panel.innerHTML = `
        <button id="switchColorsBtn" type="button">Switch Colors</button>
        <button id="randomizeColorsBtn" type="button">Randomize Colors</button>
    `;
    document.getElementById('switchColorsBtn').addEventListener('click', switchColorsButtonListener);
    document.getElementById('randomizeColorsBtn').addEventListener('click', randomizeColorsButtonListener);
}

function hideSwitchColorsPanel() {
    const panel = document.getElementById('SwitchColorsPanel');
    panel.innerHTML = '';
}

function highlightSquares(squares) {
    clearHighlights();
    squares.forEach(square => {
        const squareElement = document.querySelector(`[data-square="${square}"]`);
        if(squareElement) {
            squareElement.classList.add('Highlighted');
        }
    });
}

function clearHighlights() {
    document.querySelectorAll('.Square').forEach(sq => sq.classList.remove('Highlighted'));
}

function renderMoveHistory(moveHistory) {
    const container = document.getElementById('MoveHistory');
    container.innerHTML = '';
    console.log('Rendering move history:', moveHistory);
    for (let i = 0; i < moveHistory.length; i += 2) {
        const moveElement = document.createElement('div');
        moveElement.classList.add('Move');
        const whiteMove = moveHistory[i] || '';
        const blackMove = moveHistory[i + 1] || '';
        const moveNumber = Math.floor(i / 2) + 1;
        moveElement.textContent = `${moveNumber}. ${whiteMove} ${blackMove}`;
        container.appendChild(moveElement);
    }
}

function showRestartPanel(message) {
    const panel = document.getElementById('restartDialog');
    panel.innerHTML = `
        <p>${message}</p>
        <button id="restartButton" type="button">Restart Game</button>
    `;
    document.getElementById('restartButton').addEventListener('click', () => {
        const roomId = window.location.hash.replace('#', '');
        createGame(roomId, localStorage.getItem('playerId'), true, players);
        panel.innerHTML = '';
    });
}

function hideRestartPanel() {
    const panel = document.getElementById('restartDialog');
    panel.innerHTML = '';
}

init();