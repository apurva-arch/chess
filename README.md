# Chess Web Application with Grandmaster-Level AI

## Overview
This is a browser-based chess game implemented in HTML, CSS, and JavaScript. It allows a human player to play against a powerful chess engine based on Stockfish, one of the strongest chess engines in the world. The AI can play at a grandmaster level (2700+ ELO rating) when set to maximum strength.

## How to Play
1.  Clone or download the project files.
2.  Open the `index.html` file in a modern web browser (e.g., Chrome, Firefox, Edge, Safari).
3.  The game will load, and you can start playing. White moves first. Click on a piece to select it, then click on a valid destination square to move it.

## Technologies Used
*   **HTML:** For the structure of the game board and interface.
*   **CSS:** For styling the visual appearance of the game.
*   **JavaScript:** For all game logic, including:
    *   Board representation
    *   Piece movement rules
    *   Special moves (castling, en passant, pawn promotion)
    *   Check, checkmate, and stalemate detection
*   **Stockfish Chess Engine:** A powerful open-source chess engine compiled to WebAssembly for browser execution, providing grandmaster-level play.
*   **Web Workers:** For running the chess engine in a background thread to prevent UI freezing during calculations.

## File Structure
*   `index.html`: The main HTML file that loads the game.
*   `style.css`: Contains all CSS rules for styling the game.
*   `script.js`: Contains all JavaScript code for game logic and integration with the chess engine.
*   `engine/`: Directory containing the chess engine files:
    *   `stockfish.js`: JavaScript wrapper for the Stockfish engine.
    *   `stockfish.worker.js`: Web Worker implementation for running Stockfish in a background thread.
    *   `chess-utils.js`: Utility functions for chess operations (FEN generation, move conversion, etc.).
*   `README.md`: This file, providing documentation for the project.
*   `img/`: A directory intended for chess piece images (currently using Unicode characters for pieces).

## Game Logic
### Board Representation
The chess board is represented as an 8x8 array where:
* Empty squares are represented as `null`
* Pieces are represented as objects with two properties:
  * `type`: 'p' (pawn), 'r' (rook), 'n' (knight), 'b' (bishop), 'q' (queen), 'k' (king)
  * `color`: 'w' (white), 'b' (black)

### Piece Rules
Each piece type has its own movement rules implemented in dedicated functions:
* **Pawns**: Can move forward one square (or two from starting position), and capture diagonally. Includes en passant and promotion.
* **Rooks**: Can move any number of squares horizontally or vertically.
* **Knights**: Move in an L-shape (2 squares in one direction, then 1 square perpendicular).
* **Bishops**: Can move any number of squares diagonally.
* **Queens**: Combine the movement of rooks and bishops.
* **Kings**: Move one square in any direction. Also handles castling.

### Special Moves
* **Castling**: Implemented for both kingside and queenside, with proper validation (king and rook haven't moved, no pieces between them, king not in check, king doesn't pass through check).
* **En Passant**: Captures an opponent's pawn that has just moved two squares forward.
* **Pawn Promotion**: When a pawn reaches the opposite end of the board, it can be promoted to a queen, rook, bishop, or knight.

### Check/Checkmate/Stalemate Detection
* **Check**: Detected by examining if the king's square is under attack by any opponent's piece.
* **Checkmate**: Occurs when a player is in check and has no legal moves to escape.
* **Stalemate**: Occurs when a player is not in check but has no legal moves.

## Chess Engine Features

### Stockfish Integration
The application integrates the powerful Stockfish chess engine, which is:
* One of the strongest chess engines in the world (3500+ ELO rating)
* Capable of analyzing positions to depths of 20+ moves ahead
* Optimized for browser execution using WebAssembly technology

### Advanced Algorithms
The Stockfish engine employs sophisticated algorithms:
* **Principal Variation Search**: An enhanced version of alpha-beta pruning
* **Iterative Deepening**: Progressively increasing search depth
* **Transposition Tables**: Caching previously evaluated positions
* **Null Move Pruning**: Skipping moves in non-critical positions
* **Late Move Reduction**: Searching promising moves more deeply

### Adjustable Strength
The engine's strength can be adjusted using a slider:
* **Level 20 (Grandmaster)**: Full strength, capable of beating top human players
* **Level 15-19 (Master)**: Strong play suitable for advanced players
* **Level 10-14 (Advanced)**: Challenging for club-level players
* **Level 5-9 (Intermediate)**: Appropriate for casual players
* **Level 0-4 (Beginner)**: Accessible for novices learning the game

### Real-time Analysis
During calculation, the engine provides:
* Current search depth
* Position evaluation in pawns (e.g., +1.5 means white is ahead by 1.5 pawns)
* Principal variation (the best line of play the engine has found)

## Code Structure and Key Functions
* **Initialization Functions**:
  * `initializeBoard()`: Sets up the initial board position.
  * `createBoard()`: Creates the HTML elements for the chessboard.
  * `renderBoard()`: Updates the visual representation of the board.

* **Game Logic Functions**:
  * `handleSquareClick()`: Handles user clicks on the board.
  * `makeMove()`: Executes a move, updating the board state.
  * `isValidMove()`: Checks if a move is legal.
  * `getValidMovesForPiece()`: Gets all legal moves for a specific piece.
  * `isInCheck()`: Determines if a king is in check.
  * `checkGameEnd()`: Checks for checkmate or stalemate.

* **AI Functions**:
  * `makeAIMove()`: Triggers the AI to make its best move.
  * `findBestMove()`: Finds the best move using minimax.
  * `minimax()`: Implements the minimax algorithm with alpha-beta pruning.
  * `evaluateBoard()`: Evaluates a board position.

## How the Chess Engine Works
1. When it's the engine's turn, the current board position is converted to FEN (Forsyth-Edwards Notation).
2. This position is sent to the Stockfish engine running in a Web Worker.
3. The engine analyzes the position using its advanced algorithms, searching to a depth determined by the selected skill level.
4. During analysis, the engine continuously reports its evaluation and the best line it has found.
5. Once analysis is complete, the engine returns the best move in UCI (Universal Chess Interface) format.
6. This move is converted back to the application's internal format and executed on the board.
