
const PIECE_VALUES = {
  p: 100,   // pawn
  n: 320,   // knight
  b: 330,   // bishop
  r: 500,   // rook
  q: 900,   // queen
  k: 20000  // king
};

const PAWN_PST_WHITE = [
   0,  5, 10, 10, 10, 10,  5,  0,
   5, 10, 10, -5, -5, 10, 10,  5,
   5, -5, -5,  0,  0, -5, -5,  5,
   0,  0,  0, 20, 20,  0,  0,  0,
   5,  5, 10, 25, 25, 10,  5,  5,
  10, 10, 20, 30, 30, 20, 10, 10,
  50, 50, 50, 50, 50, 50, 50, 50,
   0,  0,  0,  0,  0,  0,  0,  0
];

const KNIGHT_PST = [
  -50, -40, -30, -30, -30, -30, -40, -50,
  -40, -20,   0,   5,   5,   0, -20, -40,
  -30,   5,  10,  15,  15,  10,   5, -30,
  -30,   0,  15,  20,  20,  15,   0, -30,
  -30,   5,  15,  20,  20,  15,   5, -30,
  -30,   0,  10,  15,  15,  10,   0, -30,
  -40, -20,   0,   0,   0,   0, -20, -40,
  -50, -40, -30, -30, -30, -30, -40, -50
];

const BISHOP_PST = [
  -20, -10, -10, -10, -10, -10, -10, -20,
  -10,   5,   0,   0,   0,   0,   5, -10,
  -10,  10,  10,  10,  10,  10,  10, -10,
  -10,   0,  10,  10,  10,  10,   0, -10,
  -10,   5,   5,  10,  10,   5,   5, -10,
  -10,   0,   5,  10,  10,   5,   0, -10,
  -10,   0,   0,   0,   0,   0,   0, -10,
  -20, -10, -10, -10, -10, -10, -10, -20
];

const ROOK_PST = [
   0,   0,   0,   5,   5,   0,   0,   0,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
  -5,   0,   0,   0,   0,   0,   0,  -5,
   5,  10,  10,  10,  10,  10,  10,   5,
   0,   0,   0,   0,   0,   0,   0,   0
];

const QUEEN_PST = [
  -20, -10, -10,  -5,  -5, -10, -10, -20,
  -10,   0,   5,   0,   0,   0,   0, -10,
  -10,   5,   5,   5,   5,   5,   0, -10,
    0,   0,   5,   5,   5,   5,   0,  -5,
   -5,   0,   5,   5,   5,   5,   0,  -5,
  -10,   0,   5,   5,   5,   5,   0, -10,
  -10,   0,   0,   0,   0,   0,   0, -10,
  -20, -10, -10,  -5,  -5, -10, -10, -20
];

const KING_PST_MIDDLEGAME = [
   20,  30,  10,   0,   0,  10,  30,  20,
   20,  20,   0,   0,   0,   0,  20,  20,
  -10, -20, -20, -20, -20, -20, -20, -10,
  -20, -30, -30, -40, -40, -30, -30, -20,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30,
  -30, -40, -40, -50, -50, -40, -40, -30
];

const KING_PST_ENDGAME = [
  -50, -30, -30, -30, -30, -30, -30, -50,
  -30, -30,   0,   0,   0,   0, -30, -30,
  -30, -10,  20,  30,  30,  20, -10, -30,
  -30, -10,  30,  40,  40,  30, -10, -30,
  -30, -10,  30,  40,  40,  30, -10, -30,
  -30, -10,  20,  30,  30,  20, -10, -30,
  -30, -20, -10,   0,   0, -10, -20, -30,
  -50, -40, -30, -20, -20, -30, -40, -50
];

let transpositionTable = new Map();
let historyTable = {};
let killerMoves = Array(64).fill(null).map(() => [null, null]);
let nodesSearched = 0;
let globalSearch = { startTime: 0, maxTime: 0, abort: false };

function pstMirrorIndex(square) {
  const row = Math.floor(square / 8);
  const col = square % 8;
  return (7 - row) * 8 + col;
}

function getPSTValue(piece, square, isEndgame = false) {
  const idx = pstMirrorIndex(square);
  let pst = 0;
  switch (piece.type) {
    case 'p': pst = PAWN_PST_WHITE[idx]; break;
    case 'n': pst = KNIGHT_PST[idx]; break;
    case 'b': pst = BISHOP_PST[idx]; break;
    case 'r': pst = ROOK_PST[idx]; break;
    case 'q': pst = QUEEN_PST[idx]; break;
    case 'k': pst = isEndgame ? KING_PST_ENDGAME[idx] : KING_PST_MIDDLEGAME[idx]; break;
    default: pst = 0;
  }
  return piece.color === 'w' ? pst : -pst;
}

function isEndgame(board) {
  let pieceCount = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (p && p.type !== 'k') pieceCount++;
    }
  }
  return pieceCount <= 12;
}

function evaluatePawnStructure(board) {
  let score = 0;
  const whitePawns = [];
  const blackPawns = [];

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'p') {
        if (piece.color === 'w') whitePawns.push({ row, col });
        else blackPawns.push({ row, col });
      }
    }
  }

  const checkDoubledPawns = (pawns, penalty) => {
    const columns = {};
    pawns.forEach(p => {
      columns[p.col] = (columns[p.col] || 0) + 1;
    });
    Object.values(columns).forEach(count => {
      if (count > 1) score += penalty * (count - 1);
    });
  };
  checkDoubledPawns(whitePawns, -10);
  checkDoubledPawns(blackPawns, 10);

  const checkIsolatedPawns = (pawns, penalty) => {
    pawns.forEach(p => {
      const hasNeighbor = pawns.some(other => Math.abs(other.col - p.col) === 1);
      if (!hasNeighbor) score += penalty;
    });
  };
  checkIsolatedPawns(whitePawns, -15);
  checkIsolatedPawns(blackPawns, 15);

  const checkPassedPawns = (pawns, opponents, bonus) => {
    pawns.forEach(p => {
      const isPassed = !opponents.some(opp =>
        Math.abs(opp.col - p.col) <= 1 &&
        (bonus > 0 ? opp.row < p.row : opp.row > p.row)
      );
      if (isPassed) {
        const rank = bonus > 0 ? p.row : 7 - p.row;
        score += bonus * (rank + 1);
      }
    });
  };
  checkPassedPawns(whitePawns, blackPawns, 20);
  checkPassedPawns(blackPawns, whitePawns, -20);

  return score;
}

function evaluateKingSafety(game, board, isEndgame) {
  if (isEndgame) return 0;
  let score = 0;
  let whiteKing = null, blackKing = null;
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (piece && piece.type === 'k') {
        if (piece.color === 'w') whiteKing = { row, col };
        else blackKing = { row, col };
      }
    }
  }

  const evaluatePawnShield = (king, color, penalty) => {
    if (!king) return;
    const direction = color === 'w' ? -1 : 1;
    let shieldCount = 0;
    for (let colOffset = -1; colOffset <= 1; colOffset++) {
      const shieldRow = king.row + direction;
      const shieldCol = king.col + colOffset;
      if (shieldRow >= 0 && shieldRow < 8 && shieldCol >= 0 && shieldCol < 8) {
        const piece = board[shieldRow][shieldCol];
        if (piece && piece.type === 'p' && piece.color === color) shieldCount++;
      }
    }
    score += penalty * (3 - shieldCount) * 10;
  };

  evaluatePawnShield(whiteKing, 'w', -1);
  evaluatePawnShield(blackKing, 'b', 1);

  return score;
}

function evaluateBoard(game) {
  if (globalSearch.abort) return 0;

  if (game.game_over()) {
    if (game.in_checkmate()) {
      return game.turn() === 'w' ? -99999 : 99999;
    }
    return 0; 
  }

  let score = 0;
  const board = game.board();
  const endgame = isEndgame(board);

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const piece = board[row][col];
      if (!piece) continue;
      const square = row * 8 + col;
      const material = PIECE_VALUES[piece.type] || 0;
      const pstValue = getPSTValue(piece, square, endgame);
      const color = piece.color === 'w' ? 1 : -1;
      score += color * material + pstValue;
    }
  }

  const currentTurn = game.turn();
  const moves = game.moves().length;
  score += (currentTurn === 'w' ? moves : -moves) * 10;

  score += evaluateKingSafety(game, board, endgame);
  score += evaluatePawnStructure(board);

  return score;
}

function givesCheck(game, move) {
  try {
    game.move(move);
    const inCheck = game.in_check();
    game.undo();
    return inCheck;
  } catch (e) {
    return false;
  }
}

function orderMoves(game, moves, ply = 0) {
  return moves.map(m => {
    let priority = 0;
    const moveStr = `${m.from}${m.to}`;

    if (m.captured) {
      const victim = PIECE_VALUES[m.captured] || 0;
      const attacker = PIECE_VALUES[m.piece] || 0;
      priority += 10000 + (10 * victim - Math.floor(attacker / 10));
    }

    if (m.promotion) {
      priority += 9000 + (PIECE_VALUES[m.promotion] || 0);
    }

    const killer0 = killerMoves[ply] && killerMoves[ply][0];
    const killer1 = killerMoves[ply] && killerMoves[ply][1];
    if (!m.captured && (killer0 === moveStr || killer1 === moveStr)) {
      priority += 8000;
    }

    if (givesCheck(game, m)) priority += 500;

    priority += (historyTable[moveStr] || 0);

    const centerSquares = ['e4', 'e5', 'd4', 'd5'];
    if (centerSquares.includes(m.to)) priority += 30;

    return { move: m, priority };
  })
  .sort((a, b) => b.priority - a.priority)
  .map(x => x.move);
}

function updateHistory(move, depth) {
  const moveStr = `${move.from}${move.to}`;
  historyTable[moveStr] = (historyTable[moveStr] || 0) + depth * depth;
}

function storeKiller(move, ply) {
  const moveStr = `${move.from}${move.to}`;
  if (killerMoves[ply][0] !== moveStr) {
    killerMoves[ply][1] = killerMoves[ply][0];
    killerMoves[ply][0] = moveStr;
  }
}

function quiescence(game, alpha, beta, color, ply = 0) {
  nodesSearched++;

  if (globalSearch.abort) return 0;

  const standPat = color * evaluateBoard(game);
  if (standPat >= beta) return beta;
  if (alpha < standPat) alpha = standPat;

  const allMoves = game.moves({ verbose: true });
  const tactical = allMoves.filter(m => m.captured || m.promotion || givesCheck(game, m));
  const ordered = orderMoves(game, tactical, ply);

  for (const mv of ordered) {
    game.move(mv);
    const score = -quiescence(game, -beta, -alpha, -color, ply + 1);
    game.undo();

    if (score >= beta) return beta;
    if (score > alpha) alpha = score;
  }

  return alpha;
}

function negamax(game, depth, alpha, beta, color, ply = 0) {
  nodesSearched++;

  if (globalSearch.abort) return 0;
  if (performance.now() - globalSearch.startTime > globalSearch.maxTime) {
    globalSearch.abort = true;
    return 0;
  }

  const fen = game.fen();
  const ttKey = `${fen}-${depth}`;

  if (transpositionTable.has(ttKey)) {
    const tt = transpositionTable.get(ttKey);
    if (tt.depth >= depth) return tt.score;
  }

  if (depth === 0 || game.game_over()) {
    return quiescence(game, alpha, beta, color, ply);
  }

  let maxScore = -Infinity;
  let moves = game.moves({ verbose: true });
  if (moves.length === 0) return color * evaluateBoard(game);

  moves = orderMoves(game, moves, ply);

  for (const mv of moves) {
    game.move(mv);
    const score = -negamax(game, depth - 1, -beta, -alpha, -color, ply + 1);
    game.undo();

    if (score > maxScore) maxScore = score;
    if (score > alpha) {
      alpha = score;
      if (!mv.captured) updateHistory(mv, depth);
    }
    if (alpha >= beta) {
      if (!mv.captured) storeKiller(mv, ply);
      break;
    }
  }

  transpositionTable.set(ttKey, { score: maxScore, depth });
  return maxScore;
}

function findBestMove(fen, maxDepth = 5, maxTime = 5000) {
  const game = new Chess(fen);
  const rootMoves = game.moves({ verbose: true });
  if (rootMoves.length === 0) return { gameOver: true };


  transpositionTable = new Map();
  historyTable = {};
  killerMoves = Array(64).fill(null).map(() => [null, null]);
  nodesSearched = 0;
  globalSearch = { startTime: performance.now(), maxTime, abort: false };

  let bestMove = null;
  let bestScore = -Infinity;
  let completedDepth = 0;
  const rootColor = game.turn() === 'w' ? 1 : -1;

  for (let depth = 1; depth <= maxDepth; depth++) {
    if (performance.now() - globalSearch.startTime > maxTime) break;
    let depthBestMove = null;
    let depthBestScore = -Infinity;

    let moves = game.moves({ verbose: true });
    moves = orderMoves(game, moves, 0);

    for (const mv of moves) {
      if (globalSearch.abort) break;
      game.move(mv);
      const score = -negamax(game, depth - 1, -Infinity, Infinity, -rootColor, 1);
      game.undo();

      if (score > depthBestScore) {
        depthBestScore = score;
        depthBestMove = mv;
      }

      if (performance.now() - globalSearch.startTime > maxTime) {
        globalSearch.abort = true;
        break;
      }
    }

    if (!globalSearch.abort && depthBestMove) {
      bestMove = depthBestMove;
      bestScore = depthBestScore;
      completedDepth = depth;
    } else {
      break;
    }

    if (Math.abs(bestScore) > 90000) break; 
  }

  const elapsed = (performance.now() - globalSearch.startTime) / 1000;

  if (!bestMove) return { gameOver: false };

  return {
    san: bestMove.san,
    uci: bestMove.from + bestMove.to + (bestMove.promotion || ''),
    score: bestScore,
    nodes: nodesSearched,
    depth: completedDepth,
    elapsed
  };
}

async function getBestMove(fen, depth = 5, maxTime = 5000) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const res = findBestMove(fen, depth, maxTime);
      resolve(res);
    }, 10);
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { findBestMove, getBestMove };
}
