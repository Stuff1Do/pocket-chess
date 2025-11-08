// ===============================
// Pocket-Chess Cell Script (rectangle crop, crop only once, fixed SAN, show cropped coords, auto-flip black)
// ===============================

// Global puzzle data
let puzzlesData = [];

// Fetch puzzle data from puzzle.json
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

// ===============================
// Helper Functions
// ===============================
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

// ===============================
// Puzzle Initialization
// ===============================
function initializePuzzle() {
  const coord = getParam('coord') || 'a8';
  const levelNumber = coordToLevelNumber(coord);

  // Update UI
  document.getElementById('level-number').textContent = levelNumber;
  document.title = `Pocket-Chess - Level ${levelNumber}`;

  // Find the puzzle from data
  const puzzle = puzzlesData.find(p => p.id === parseInt(levelNumber));
  console.log('Loaded puzzle:', puzzle);

  if (!puzzle) {
    document.getElementById('status').textContent = 'Puzzle not found';
    document.getElementById('status').style.display = 'block';
    return;
  }

  document.querySelector('.objective').textContent = puzzle.description || puzzle.objective || '';

  // Initialize chess.js game
  const game = new Chess(puzzle.fen);

  // Setup board
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

  // ===============================
  // Debounce Helper
  // ===============================
  function debounce(fn, wait = 120) {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), wait);
    };
  }

  // ===============================
  // Auto-flip board if black to move (crop after flip)
  // ===============================
  if (puzzle.side_to_move && puzzle.side_to_move.toLowerCase() === 'black') {
    if (typeof board.flip === 'function') board.flip();
    else if (typeof board.orientation === 'function') board.orientation('black');
  }

  // ===============================
  // Rectangle Crop Function
  // ===============================
  // ===============================
// Rectangle Crop Function (handles flipped orientation)
// ===============================
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

  // board() returns ranks from 8 -> 1 as rows [0..7], and files a -> h as cols [0..7]
  const b = game.board();

  // Find bounding box of pieces in array coordinates
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

  // No pieces fallback: center a reasonable square
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

  // Clamp target min indices (array coordinates)
  const targetMinCol = Math.max(0, Math.min(minCol - pad, 8 - totalCols));
  const targetMinRow = Math.max(0, Math.min(minRow - pad, 8 - totalRows));
  const targetMaxCol = targetMinCol + totalCols - 1;
  const targetMaxRow = targetMinRow + totalRows - 1;

  // If the board is visually flipped (black to move), DOM indices are reversed:
  const isFlipped = !!(puzzle && puzzle.side_to_move && puzzle.side_to_move.toLowerCase() === 'black');

  // Convert array indices -> DOM indices (used for pixel offsets)
  // When not flipped: DOM_col = array_col, DOM_row = array_row
  // When flipped: DOM_col = 7 - array_col, DOM_row = 7 - array_row
  const domMinCol = isFlipped ? 7 - targetMaxCol : targetMinCol;
  const domMinRow = isFlipped ? 7 - targetMaxRow : targetMinRow;

  const leftPx = -Math.round(domMinCol * cellSize);
  const topPx = -Math.round(domMinRow * cellSize);
  const newWidthPx = totalCols * cellSize;
  const newHeightPx = totalRows * cellSize;

  // Apply sizes to container so it crops to the rectangle
  container.style.width = `${newWidthPx}px`;
  container.style.height = `${newHeightPx}px`;
  container.style.minWidth = `${newWidthPx}px`;
  container.style.minHeight = `${newHeightPx}px`;
  container.style.maxWidth = `${newWidthPx}px`;
  container.style.maxHeight = `${newHeightPx}px`;

  innerTable.style.left = `${leftPx}px`;
  innerTable.style.top = `${topPx}px`;

  // Now compute the algebraic coordinates to display.
  // Array coordinates: cols 0..7 => files a..h ; rows 0..7 => ranks 8..1 (rank = 8 - row)
  // Visible top-left (algebraic) depends on flip:
  // - not flipped: top-left is array (targetMinRow, targetMinCol)
  // - flipped: top-left is array (targetMaxRow, targetMaxCol)  (mirror)
  let topLeftFileIdx, topLeftRankIdx, bottomRightFileIdx, bottomRightRankIdx;

  if (!isFlipped) {
    topLeftFileIdx = targetMinCol;
    topLeftRankIdx = targetMinRow;
    bottomRightFileIdx = targetMaxCol;
    bottomRightRankIdx = targetMaxRow;
  } else {
    // visual top-left corresponds to array (targetMaxRow, targetMaxCol)
    topLeftFileIdx = targetMaxCol;
    topLeftRankIdx = targetMaxRow;
    bottomRightFileIdx = targetMinCol;
    bottomRightRankIdx = targetMinRow;
  }

  const fileChar = idx => String.fromCharCode(97 + idx); // 0 -> 'a'
  const rankNum = idx => 8 - idx; // array row -> rank number

  const topLeft = `${fileChar(topLeftFileIdx)}${rankNum(topLeftRankIdx)}`;
  const bottomRight = `${fileChar(bottomRightFileIdx)}${rankNum(bottomRightRankIdx)}`;

  const coordsEl = document.getElementById('croppped-coords');
  if (coordsEl) coordsEl.textContent = `Cropped board: ${topLeft} - ${bottomRight}`;
}


  // Crop **once** after board renders (wait a bit for flip)
  setTimeout(() => {
    try { cropBoardToPiecesRectangle(game); } catch (e) { console.warn(e); }
  }, 100);

  // ===============================
  // Chessboard Callbacks
  // ===============================
  function onDragStart(source, piece) {
    if (game.game_over()) return false;
    if ((game.turn() === 'w' && piece.startsWith('b')) ||
        (game.turn() === 'b' && piece.startsWith('w'))) return false;
  }

  let solutionQueue = [...puzzle.solution];

  function onDrop(source, target) {
    const statusEl = document.getElementById('status');

    const move = game.move({ from: source, to: target, promotion: 'q' });
    if (!move) {
      console.log('Illegal move detected:', source, target);
      console.log('Current FEN:', game.fen());
      statusEl.textContent = 'Invalid Move';
      statusEl.style.display = 'block';
      setTimeout(() => (statusEl.style.display = 'none'), 1500);
      return 'snapback';
    }

    const expectedMove = solutionQueue[0];
    const normalizeSAN = san => san.replace(/[=+#]/g, '').toUpperCase();

    if (normalizeSAN(move.san) !== normalizeSAN(expectedMove)) {
      game.undo();
      console.log('Wrong move! Attempted:', move.san, 'Expected:', expectedMove);
      statusEl.textContent = 'Wrong move!';
      statusEl.style.display = 'block';
      setTimeout(() => (statusEl.style.display = 'none'), 1500);
      return 'snapback';
    }

    solutionQueue.shift();
    board.position(game.fen());
    updateTurnIndicator(game);

    // Auto-play black's move if puzzle expects it
    if (solutionQueue.length > 0 && game.turn() !== puzzle.side_to_move[0]) {
      const nextMove = solutionQueue[0];
      const moves = game.moves({ verbose: true });
      const foundMove = moves.find(m => normalizeSAN(m.san) === normalizeSAN(nextMove));
      if (foundMove) {
        game.move(foundMove.san);
        solutionQueue.shift();
        board.position(game.fen());
        updateTurnIndicator(game);
      }
    }

    if (solutionQueue.length === 0) {
      statusEl.textContent = 'Puzzle Solved!';
      statusEl.style.display = 'block';
      statusEl.style.color = 'green';
      const nextLevel = parseInt(levelNumber) + 1;
      if (nextLevel <= 64) {
        const nextCoord = levelNumberToCoord(nextLevel);
        setTimeout(() => {
          window.location.href = `cell.html?coord=${nextCoord}`;
        }, 1000);
      }
    }
  }

  function onSnapEnd() {
    board.position(game.fen());
  }

  function updateTurnIndicator(game) {
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    document.getElementById('turn').textContent = `${turn} to move`;
  }

  // ===============================
  // Controls (Hint and Solution Buttons)
  // ===============================
  const hintButton = document.querySelector('.hint-button');
  if (hintButton) {
    hintButton.addEventListener('click', () => {
      if (!solutionQueue || solutionQueue.length === 0) {
        alert('Puzzle already solved or no moves left!');
        return;
      }
      const nextMove = solutionQueue[0];
      let hintEl = document.getElementById('hint-display');
      if (!hintEl) {
        hintEl = document.createElement('div');
        hintEl.id = 'hint-display';
        document.body.appendChild(hintEl);
      }
      hintEl.textContent = `Next move: ${nextMove}`;
      setTimeout(() => { hintEl.textContent = ''; }, 5000);
    });
  }

  const dialogDisplay = document.querySelector('.solution-display');
  const solutionButton = document.querySelector('.solution-button');
  const closeModal = document.querySelector('.x-mark');

  if (solutionButton && dialogDisplay) solutionButton.addEventListener('click', () => dialogDisplay.showModal());
  if (closeModal && dialogDisplay) closeModal.addEventListener('click', () => dialogDisplay.close());

  const solutionContent = document.querySelector('.solution-content');
  if (solutionContent) {
    solutionContent.innerHTML = `<ol>${puzzle.solution.filter((_, i, arr) => i === 0 || i % 2 !== 0 || i === arr.length - 1).map(m => `<li>${m}</li>`).join('')}</ol>`;
  }

  // ===============================
  // Navigation Buttons
  // ===============================
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
