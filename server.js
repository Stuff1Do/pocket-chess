// ============================================
// server.js - Backend server for chess puzzle
// Run with: node server.js
// ============================================

const express = require('express');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.')); // Serve all files in current directory

// API endpoint to get best move
app.post('/api/best-move', (req, res) => {
  const { fen, depth = 3 } = req.body;
  
  if (!fen) {
    return res.status(400).json({ error: 'FEN string required' });
  }
  
  const position = { fen, depth };
  const timestamp = Date.now();
  const jsonPath = path.join(__dirname, `position_${timestamp}.json`);
  const pythonScript = path.join(__dirname, 'minimax-chess-engine.py');
  
  try {
    fs.writeFileSync(jsonPath, JSON.stringify(position));
    
    // Use python command with quoted paths for Windows spaces
    const command = `python "${pythonScript}" "${jsonPath}"`;
    exec(command, (error, stdout, stderr) => {
      // Clean up temporary file
      try {
        fs.unlinkSync(jsonPath);
      } catch (e) {
        console.warn('Could not delete temp file:', e.message);
      }
      
      if (error) {
        console.error('Python execution error:', error);
        return res.status(500).json({ error: error.message });
      }
      
      if (stderr) {
        console.warn('Python stderr:', stderr);
      }
      
      // Parse Python output
      try {
        const lines = stdout.trim().split('\n');
        
        if (lines[0] === "No legal moves (game over).") {
          return res.json({ gameOver: true });
        }
        
        const result = {};
        lines.forEach(line => {
          const [key, value] = line.split(': ');
          if (key === 'best_move_uci') result.uci = value;
          if (key === 'best_move_san') result.san = value;
          if (key === 'score_estimate_cp') result.score = parseInt(value);
          if (key === 'search_nodes(root_moves_tried)') result.nodes = parseInt(value);
          if (key === 'depth_used') result.depth = parseInt(value);
          if (key === 'elapsed_seconds') result.elapsed = parseFloat(value);
        });
        
        console.log('✓ Best move found:', result.san);
        res.json(result);
      } catch (parseError) {
        console.error('Parse error:', parseError);
        return res.status(500).json({ 
          error: 'Failed to parse output', 
          output: stdout 
        });
      }
    });
  } catch (fileError) {
    console.error('File error:', fileError);
    res.status(500).json({ error: fileError.message });
  }
});

app.listen(PORT, () => {
  console.log('═══════════════════════════════════════════════');
  console.log('  ♔  Chess Puzzle Server Running  ♔');
  console.log('═══════════════════════════════════════════════');
  console.log(`  🌐 Server: http://localhost:${PORT}`);
  console.log(`  📂 Files being served from: ${__dirname}`);
  console.log('');
  console.log('  To play:');
  console.log(`  👉 Open: http://localhost:${PORT}/cell.html?coord=a8`);
  console.log('');
  console.log('  Press Ctrl+C to stop the server');
  console.log('═══════════════════════════════════════════════');
});