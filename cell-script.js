// ===============================
// Pocket-Chess Cell Script (no cropping version)
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

  console.log('Loaded puzzle:', puzzle); // Debugging

  if (!puzzle) {
    document.getElementById('status').textContent = 'Puzzle not found';
    document.getElementById('status').style.display = 'block';
    return;
  }

  // Update objective
  document.querySelector('.objective').textContent = puzzle.objective;

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

    // Crop the displayed board to only show squares that contain pieces
// Debounce helper
function debounce(fn, wait = 120) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

// Crop to a square that contains all pieces and center it
function cropBoardToPiecesSquare(game, opts = {}) {
  const boardEl = document.getElementById('board');
  if (!boardEl) return;

  const container = document.querySelector('.board-container');
  const wrapper = document.querySelector('.board-wrapper');

  // chess.js board() returns array of 8 ranks (rank 8 down to rank 1)
  const b = game.board();

  // find bounding box (cols: 0..7 left to right, rows: 0..7 top to bottom)
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

  const innerTable = boardEl.querySelector('table') || boardEl.querySelector('.board') || boardEl.firstElementChild;
  if (!innerTable) return;

  // If no pieces, show a fallback square (use default cell-size or current board size)
  if (maxCol === -1) {
    // no pieces: fallback to a nice square sized by current board or default 480px
    const fallback = Math.max(innerTable.offsetWidth || 480, innerTable.offsetHeight || 480);
    container.style.width = `${fallback}px`;
    container.style.height = `${fallback}px`;
    innerTable.style.left = `${Math.round((fallback - (innerTable.offsetWidth || fallback)) / 2)}px`;
    innerTable.style.top = `${Math.round((fallback - (innerTable.offsetHeight || fallback)) / 2)}px`;
    return;
  }

  const fullWidth = innerTable.offsetWidth || innerTable.getBoundingClientRect().width;
  const fullHeight = innerTable.offsetHeight || innerTable.getBoundingClientRect().height;
  // protect against zero measurements
  const measured = Math.max(fullWidth, fullHeight, 1);

  // square cells assumed
  const cellSize = Math.round(measured / 8);

  // current bounding box size in squares
  const cols = (maxCol - minCol + 1);
  const rows = (maxRow - minRow + 1);

  // make it square by taking the larger dimension
  const dim = Math.max(cols, rows);

  // optional padding squares around the crop (default 0)
  const pad = typeof opts.padding === 'number' ? opts.padding : 0;

  // total square dimension in squares
  const sq = Math.min(8, dim + 2 * pad);

  // final visible size in pixels
  const newSizePx = Math.round(sq * cellSize);

  // compute how many extra squares are left/right and top/bottom to center the original bbox
  const extraCols = sq - cols;
  const extraRows = sq - rows;

  // distribute extra squares evenly (left bias uses Math.floor)
  const padLeft = Math.floor(extraCols / 2);
  const padTop = Math.floor(extraRows / 2);

  // target minimum column/row to align to top-left of the square window
  let targetMinCol = minCol - padLeft - pad;
  let targetMinRow = minRow - padTop - pad;

  // clamp so targetMinCol/Row ∈ [0, 8 - sq]
  targetMinCol = Math.max(0, Math.min(targetMinCol, 8 - sq));
  targetMinRow = Math.max(0, Math.min(targetMinRow, 8 - sq));

  // compute pixel offsets to position the full board so targetMinCol/Row is at (0,0) of container
  const leftPx = -Math.round(targetMinCol * cellSize);
  const topPx = -Math.round(targetMinRow * cellSize);

  // apply container size and center it in wrapper (wrapper is flex center)
  container.style.width = `${newSizePx}px`;
  container.style.height = `${newSizePx}px`;
  container.style.minWidth = `${newSizePx}px`;
  container.style.minHeight = `${newSizePx}px`;
  container.style.maxWidth = `${newSizePx}px`;
  container.style.maxHeight = `${newSizePx}px`;

  // ensure the inner table is absolute and shifted
  innerTable.style.position = 'absolute';
  innerTable.style.left = `${leftPx}px`;
  innerTable.style.top = `${topPx}px`;

  // make wrapper clip (should already)
  if (wrapper) wrapper.style.overflow = 'hidden';
}
// initial crop once board is rendered
setTimeout(() => {
  try { cropBoardToPiecesSquare(game); } catch (e) { console.warn(e); }
}, 0);

// recrop after every move / snap end
const recrop = debounce(() => {
  try { cropBoardToPiecesSquare(game); } catch (e) { console.warn(e); }
}, 120);

// call recrop after the player or engine moves
function safeRecropAfterMove() {
  // slight delay so DOM/board updates settle
  setTimeout(recrop, 40);
}

// integrate with your existing callbacks
// inside onDrop(), after game.move succeeded and board.position called, add:
safeRecropAfterMove();

safeRecropAfterMove();


function onSnapEnd() {
  board.position(game.fen());
  safeRecropAfterMove();
}


window.addEventListener('resize', debounce(() => {
  try { cropBoardToPiecesSquare(game); } catch (e) { console.warn(e); }
}, 150));


  function onDragStart(source, piece, position, orientation) {
    if (game.game_over()) return false;
    if ((game.turn() === 'w' && piece.startsWith('b')) ||
        (game.turn() === 'b' && piece.startsWith('w'))) {
      return false;
    }
  }
let solutionQueue = [];
solutionQueue = [...puzzle.solution]; 
function onDrop(source, target) {
  const statusEl = document.getElementById('status');

  // Attempt player's move
  const move = game.move({
    from: source,
    to: target,
    promotion: 'q'
  });

  if (move === null) {
    statusEl.textContent = 'Invalid Move';
    statusEl.style.display = 'block';
    setTimeout(() => (statusEl.style.display = 'none'), 1500);
    return 'snapback';
  }

  // Check if player's move matches the next solution move
  const expectedMove = solutionQueue[0];

  // Normalize SAN for comparison
  const normalizeSAN = san => san.replace('=', '').toUpperCase();
  if (!normalizeSAN(move.san).includes(normalizeSAN(expectedMove))) {
    game.undo();
    statusEl.textContent = 'Wrong move! Try again.';
    statusEl.style.display = 'block';
    setTimeout(() => (statusEl.style.display = 'none'), 1500);
    return 'snapback';
  }

  // Correct move → remove from queue
  solutionQueue.shift();
  board.position(game.fen());
  updateTurnIndicator(game);

  // Auto-play opponent move if next in solutionQueue
  if (solutionQueue.length > 0 && game.turn() !== puzzle.side_to_move[0]) {
    const nextMove = solutionQueue.shift();
    const moves = game.moves({ verbose: true });
    const foundMove = moves.find(m => normalizeSAN(m.san).includes(normalizeSAN(nextMove)));

    if (foundMove) {
      game.move(foundMove.san);
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
    }, 1000); // optional delay
  }
}

}



  function onSnapEnd() {
    board.position(game.fen());
  }

  function autoPlayNext() {
  if (solutionQueue.length === 0) return;

  const autoMove = solutionQueue.shift();
  game.move(autoMove);
  board.position(game.fen());
  updateTurnIndicator(game);

  // If next move is also for the other side, recurse
  if (solutionQueue.length > 0 && solutionQueue[0][0] !== autoMove[0]) {
    setTimeout(autoPlayNext, 400);
  } else if (solutionQueue.length === 0) {
    setTimeout(() => {
      alert('Puzzle Solved!\nPress OK to continue to the next level.');
      const nextLevel = parseInt(levelNumber) + 1;
      if (nextLevel <= 64) {
        const nextCoord = levelNumberToCoord(nextLevel);
        window.location.href = `cell.html?coord=${nextCoord}`;
      }
    }, 400);
  }
}

  function updateTurnIndicator(game) {
    const turn = game.turn() === 'w' ? 'White' : 'Black';
    document.getElementById('turn').textContent = `${turn} to move`;
  }

  function handleGameOver(game) {
    const statusEl = document.getElementById('status');
    statusEl.style.display = 'block';

    if (game.in_checkmate()) {
  statusEl.textContent = 'Puzzle Solved!';
  statusEl.style.display = 'block';
  statusEl.style.color = 'green';

  const nextLevel = parseInt(levelNumber) + 1;
  if (nextLevel <= 64) {
    const nextCoord = levelNumberToCoord(nextLevel);
    setTimeout(() => {
      window.location.href = `cell.html?coord=${nextCoord}`;
    }, 500);
  }
}

  }


  const backBtn = document.querySelector('.back-button');
  const forwardBtn = document.querySelector('.forward-button');

  backBtn.onclick = () => {
    const prevLevel = parseInt(levelNumber) - 1;
    if (prevLevel >= 1) {
      const prevCoord = levelNumberToCoord(prevLevel);
      window.location.href = `cell.html?coord=${prevCoord}`;
    } else {
      window.location.href = 'index.html';
    }
  };

  forwardBtn.onclick = () => {
    const nextLevel = parseInt(levelNumber) + 1;
    if (nextLevel <= 64) {
      const nextCoord = levelNumberToCoord(nextLevel);
      window.location.href = `cell.html?coord=${nextCoord}`;
    }
  };

  backBtn.disabled = levelNumber === '1';
  forwardBtn.disabled = levelNumber === '64';
}
