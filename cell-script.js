
let puzzlesData = [];

fetch('puzzle.json')
  .then(response => response.json())
  .then(data => {
    puzzlesData = data;
    initializePuzzle();
  })
  .catch(error => {
    console.error('Error loading puzzles:', error);
    document.getElementById('status').textContent = 'Error loading puzzle data';
    document.getElementById('status').style.display = 'block';
  });

async function getBestMove(fen, depth = 4, maxTime = 3000) {
  
  return new Promise((resolve, reject) => {
    try {
      if (typeof findBestMove === 'undefined') {
        reject(new Error('chess engine not loaded'));
        return;
      }

      const timeout = setTimeout(() => {
        reject(new Error('engine timeout'));
      }, maxTime + 1000);

      // Run engine calculation
      const result = findBestMove(fen, depth, maxTime);
      
      clearTimeout(timeout);
      resolve(result);
    } catch (error) {
      reject(error);
    }
  });
}

function getParam(name) {
  const p = new URLSearchParams(window.location.search);
  return p.get(name);
}

function coordToLevelNumber(coord) {
  if (!coord || coord === 'unknown') return 'unknown';
  const file = coord.charAt(0).toLowerCase();
  const rank = parseInt(coord.charAt(1));
  if (file < 'a' || file > 'h' || rank < 1 || rank > 8) return 'unknown';
  const fileIndex = file.charCodeAt(0) - 'a'.charCodeAt(0);
  const rankIndex = 8 - rank;
  return (rankIndex * 8 + fileIndex + 1).toString();
}

function levelNumberToCoord(level) {
  if (level < 1 || level > 64) return null;
  level = parseInt(level);
  const row = Math.floor((level - 1) / 8);
  const col = (level - 1) % 8;
  const file = String.fromCharCode('a'.charCodeAt(0) + col);
  const rank = 8 - row;
  return `${file}${rank}`;
}

function initializePuzzle() {
  const coord = getParam('coord') || 'a8';
  const levelNumber = coordToLevelNumber(coord);

  document.getElementById('level-number').textContent = levelNumber;
  document.title = `Pocket-Chess - Level ${levelNumber}`;

  const puzzle = puzzlesData.find(p => p.id === parseInt(levelNumber));
  console.log('Loaded puzzle:', puzzle);

  if (!puzzle) {
    document.getElementById('status').textContent = 'Puzzle not found';
    document.getElementById('status').style.display = 'block';
    return;
  }

  document.querySelector('.objective').textContent = puzzle.description || puzzle.objective || '';

  const game = new Chess(puzzle.fen);

  const config = {
    draggable: true,
    position: puzzle.fen,
    onDragStart,
    onDrop,
    onSnapEnd,
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
  };
  const board = Chessboard('board', config);

  updateTurnIndicator(game);

  if (puzzle.side_to_move && puzzle.side_to_move.toLowerCase() === 'black') {
    if (typeof board.flip === 'function') board.flip();
    else if (typeof board.orientation === 'function') board.orientation('black');
  }

  function cropBoardToPiecesRectangle(game, opts = {}) {
    const boardEl = document.getElementById('board');
    if (!boardEl) return;

    const container = document.querySelector('.board-container');
    const wrapper = document.querySelector('.board-wrapper');
    const innerTable = boardEl.querySelector('table') || boardEl.querySelector('.board') || boardEl.firstElementChild;
    if (!innerTable || !container) return;

    if (wrapper) {
      wrapper.style.overflow = 'hidden';
      wrapper.style.position = 'relative';
    }

    innerTable.style.position = 'absolute';

    const b = game.board();

    let minCol = 8, maxCol = -1, minRow = 8, maxRow = -1;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if (b[r][c] !== null) {
          if (c < minCol) minCol = c;
          if (c > maxCol) maxCol = c;
          if (r < minRow) minRow = r;
          if (r > maxRow) maxRow = r;
        }
      }
    }

    if (maxCol === -1) {
      const fallback = Math.max(innerTable.offsetWidth || 480, innerTable.offsetHeight || 480);
      container.style.width = `${fallback}px`;
      container.style.height = `${fallback}px`;
      innerTable.style.left = `${Math.round((fallback - (innerTable.offsetWidth || fallback)) / 2)}px`;
      innerTable.style.top = `${Math.round((fallback - (innerTable.offsetHeight || fallback)) / 2)}px`;
      const coordsEl = document.getElementById('croppped-coords');
      if (coordsEl) coordsEl.textContent = `Cropped board: a1 - h8`;
      return;
    }

    const fullWidth = innerTable.offsetWidth || innerTable.getBoundingClientRect().width;
    const fullHeight = innerTable.offsetHeight || innerTable.getBoundingClientRect().height;
    const measured = Math.max(fullWidth, fullHeight, 1);
    const cellSize = Math.round(measured / 8);

    const pad = typeof opts.padding === 'number' ? opts.padding : 0;
    const totalCols = Math.min(8, maxCol - minCol + 1 + 2 * pad);
    const totalRows = Math.min(8, maxRow - minRow + 1 + 2 * pad);

    const targetMinCol = Math.max(0, Math.min(minCol - pad, 8 - totalCols));
    const targetMinRow = Math.max(0, Math.min(minRow - pad, 8 - totalRows));
    const targetMaxCol = targetMinCol + totalCols - 1;
    const targetMaxRow = targetMinRow + totalRows - 1;

    const isFlipped = !!(puzzle && puzzle.side_to_move && puzzle.side_to_move.toLowerCase() === 'black');

    const domMinCol = isFlipped ? 7 - targetMaxCol : targetMinCol;
    const domMinRow = isFlipped ? 7 - targetMaxRow : targetMinRow;

    const leftPx = -Math.round(domMinCol * cellSize);
    const topPx = -Math.round(domMinRow * cellSize);
    const newWidthPx = totalCols * cellSize;
    const newHeightPx = totalRows * cellSize;

    container.style.width = `${newWidthPx}px`;
    container.style.height = `${newHeightPx}px`;
    container.style.minWidth = `${newWidthPx}px`;
    container.style.minHeight = `${newHeightPx}px`;
    container.style.maxWidth = `${newWidthPx}px`;
    container.style.maxHeight = `${newHeightPx}px`;

    innerTable.style.left = `${leftPx}px`;
    innerTable.style.top = `${topPx}px`;

    let topLeftFileIdx, topLeftRankIdx, bottomRightFileIdx, bottomRightRankIdx;

    if (!isFlipped) {
      topLeftFileIdx = targetMinCol;
      topLeftRankIdx = targetMinRow;
      bottomRightFileIdx = targetMaxCol;
      bottomRightRankIdx = targetMaxRow;
    } else {
      topLeftFileIdx = targetMaxCol;
      topLeftRankIdx = targetMaxRow;
      bottomRightFileIdx = targetMinCol;
      bottomRightRankIdx = targetMinRow;
    }

    const fileChar = idx => String.fromCharCode(97 + idx);
    const rankNum = idx => 8 - idx;

    const topLeft = `${fileChar(topLeftFileIdx)}${rankNum(topLeftRankIdx)}`;
    const bottomRight = `${fileChar(bottomRightFileIdx)}${rankNum(bottomRightRankIdx)}`;

    const coordsEl = document.getElementById('croppped-coords');
    if (coordsEl) coordsEl.textContent = `Cropped board: ${topLeft} - ${bottomRight}`;
  }

  setTimeout(() => {
    try { cropBoardToPiecesRectangle(game); } catch (e) { console.warn(e); }
  }, 100);

  
  function onDragStart(source, piece) {
    if (game.game_over()) return false;
    if ((game.turn() === 'w' && piece.startsWith('b')) ||
        (game.turn() === 'b' && piece.startsWith('w'))) return false;
  }

  let solutionQueue = [...puzzle.solution];
  let moveHistory = []; 
  let historyIndex = -1; 

  function onDrop(source, target) {
    const statusEl = document.getElementById('status');

    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (!move) {
      statusEl.textContent = 'Invalid Move';
      statusEl.style.display = 'block';
      setTimeout(() => (statusEl.style.display = 'none'), 1500);
      return 'snapback';
    }

    const expectedMove = solutionQueue[0];
    const normalizeSAN = san => san.replace(/[=+#]/g, '').toUpperCase();

    if (normalizeSAN(move.san) !== normalizeSAN(expectedMove)) {
      game.undo();
      statusEl.textContent = 'Wrong move!';
      statusEl.style.display = 'block';
      setTimeout(() => (statusEl.style.display = 'none'), 1500);
      return 'snapback';
    }

    solutionQueue.shift();
    board.position(game.fen());
    updateTurnIndicator(game);

    moveHistory.push({
      move: move,
      fen: game.fen(),
      solutionQueueState: [...solutionQueue]
    });
    historyIndex = moveHistory.length - 1;

    if (solutionQueue.length > 0 && game.turn() !== puzzle.side_to_move[0]) {
      const nextMove = solutionQueue[0];
      const moves = game.moves({ verbose: true });
      const foundMove = moves.find(m => normalizeSAN(m.san) === normalizeSAN(nextMove));
      if (foundMove) {
        game.move(foundMove.san);
        solutionQueue.shift();
        board.position(game.fen());
        updateTurnIndicator(game);
        
        moveHistory.push({
          move: foundMove,
          fen: game.fen(),
          solutionQueueState: [...solutionQueue]
        });
        historyIndex = moveHistory.length - 1;
      }
    }

    if (solutionQueue.length === 0) {
      statusEl.textContent = 'Puzzle Solved!';
      statusEl.style.display = 'block';
      statusEl.style.color = 'green';

    }
  }

  function onSnapEnd() {
    board.position(game.fen());
  }

  function updateTurnIndicator(game) {
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    document.getElementById('turn').textContent = `${turn} to move`;
  }

  
  function goBackOneMove() {
    if (historyIndex < 0) return;
    game.undo();
    historyIndex--;
    
    if (historyIndex >= 0) {
      board.position(moveHistory[historyIndex].fen);
      solutionQueue = [...moveHistory[historyIndex].solutionQueueState];
    } else {
      game.reset();
      game.load(puzzle.fen);
      board.position(puzzle.fen);
      solutionQueue = [...puzzle.solution];
    }
    
    updateTurnIndicator(game);
    
    const statusEl = document.getElementById('status');
    if (statusEl.textContent.includes('Puzzle Solved')) {
      statusEl.style.display = 'none';
    }
  }
  
  function goForwardOneMove() {
    if (historyIndex >= moveHistory.length - 1) return; 
    
    historyIndex++;
    const historyEntry = moveHistory[historyIndex];
    
    game.move(historyEntry.move.san);
    board.position(historyEntry.fen);
    solutionQueue = [...historyEntry.solutionQueueState];
    updateTurnIndicator(game);
    
    if (solutionQueue.length === 0) {
      const statusEl = document.getElementById('status');
      statusEl.textContent = 'Puzzle Solved! ';
      statusEl.style.display = 'block';
      statusEl.style.color = 'green';
    }
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      goBackOneMove();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      goForwardOneMove();
    }
  });

  const hintButton = document.querySelector('.hint-button');
  if (hintButton) {
    hintButton.addEventListener('click', async () => {
      const statusEl = document.getElementById('status');
      
      if (!solutionQueue || solutionQueue.length === 0) {
        statusEl.textContent = 'Puzzle already solved!';
        statusEl.style.display = 'block';
        statusEl.style.color = 'orange';
        setTimeout(() => (statusEl.style.display = 'none'), 2000);
        return;
      }
      
      try {
        statusEl.textContent = 'Calculating best move...';
        statusEl.style.display = 'block';
        statusEl.style.color = 'blue';
        
        const result = await getBestMove(game.fen(), 4, 3000);
        
        if (result.gameOver) {
          statusEl.textContent = 'Game is over!';
          statusEl.style.color = 'red';
          return;
        }
        
        let hintEl = document.getElementById('hint-display');
        
        hintEl.textContent = `Best move: ${result.san}`;
        hintEl.style.display = 'block';
        
        statusEl.style.display = 'none';
        
        console.log('Engine analysis:', result);
        
        setTimeout(() => {
          hintEl.style.display = 'none';
        }, 1000);
        
      } catch (error) {
        statusEl.textContent = error.message || 'Error calculating move';
        statusEl.style.color = 'red';
        console.error('Hint error:', error);
        
        setTimeout(() => {
          statusEl.style.display = 'none';
        }, 3000);
      }
    });
  }


const dialogDisplay = document.querySelector('.solution-display');
const solutionButton = document.querySelector('.solution-button');
const closeModal = document.querySelector('.x-mark');

if (solutionButton && dialogDisplay) {
  solutionButton.addEventListener('click', () => {
    const solutionContent = document.querySelector('.solution-content');
    
    if (solutionContent) {
      let html = '<ol>';
      puzzle.solution.forEach((move, index) => {
        if (index % 2 === 0) {
          html += `<li>${move}</li>`;
        }
      });
      html += '</ol>';
      solutionContent.innerHTML = html;
    }
    
    dialogDisplay.showModal();
  });
}

if (closeModal && dialogDisplay) {
  closeModal.addEventListener('click', () => dialogDisplay.close());
}

  const backBtn = document.querySelector('.back-button');
  const forwardBtn = document.querySelector('.forward-button');

  if (backBtn) backBtn.onclick = () => {
    const prevLevel = parseInt(levelNumber) - 1;
    if (prevLevel >= 1) {
      const prevCoord = levelNumberToCoord(prevLevel);
      window.location.href = `cell.html?coord=${prevCoord}`;
    } else {
      window.location.href = 'index.html';
    }
  };
  if (forwardBtn) forwardBtn.onclick = () => {
    const nextLevel = parseInt(levelNumber) + 1;
    if (nextLevel <= 64) {
      const nextCoord = levelNumberToCoord(nextLevel);
      window.location.href = `cell.html?coord=${nextCoord}`;
    }
  };

  backBtn.disabled = levelNumber === '1';
  forwardBtn.disabled = levelNumber === '64';
}