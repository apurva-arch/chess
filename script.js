// Chess Web Application - Game Logic with Stockfish Integration

// ==================== BOARD REPRESENTATION ====================

// Chess board representation: 8x8 array
// Empty squares: null
// Pieces: Objects with properties: type, color
// Piece types: 'p' (pawn), 'r' (rook), 'n' (knight), 'b' (bishop), 'q' (queen), 'k' (king)
// Colors: 'w' (white), 'b' (black)

// Initialize the board with starting positions
let board = Array(8).fill().map(() => Array(8).fill(null));

// Game state variables
let selectedPiece = null;
let selectedSquare = null;
let currentPlayer = 'w'; // 'w' for white, 'b' for black
let gameOver = false;
let playerColor = 'w'; // Default player color is white
let castlingRights = {
    w: { kingSide: true, queenSide: true },
    b: { kingSide: true, queenSide: true }
};
let enPassantTarget = null;
let moveHistory = [];
let promotionPending = null;

// Stockfish engine variables
let stockfish = null;
let engineLevel = 20; // Default to maximum strength
let engineThinking = false;
let engineDepth = 0;
let engineScore = 0;

// Unicode chess pieces
const PIECES = {
    'w': {
        'p': '♙', // white pawn
        'r': '♖', // white rook
        'n': '♘', // white knight
        'b': '♗', // white bishop
        'q': '♕', // white queen
        'k': '♔'  // white king
    },
    'b': {
        'p': '♟', // black pawn
        'r': '♜', // black rook
        'n': '♞', // black knight
        'b': '♝', // black bishop
        'q': '♛', // black queen
        'k': '♚'  // black king
    }
};

// ==================== INITIALIZATION FUNCTIONS ====================

// Initialize the board with starting positions
function initializeBoard() {
    // Initialize empty board
    board = Array(8).fill().map(() => Array(8).fill(null));
    
    // Set up pawns
    for (let i = 0; i < 8; i++) {
        board[1][i] = { type: 'p', color: 'b' };
        board[6][i] = { type: 'p', color: 'w' };
    }
    
    // Set up rooks
    board[0][0] = { type: 'r', color: 'b' };
    board[0][7] = { type: 'r', color: 'b' };
    board[7][0] = { type: 'r', color: 'w' };
    board[7][7] = { type: 'r', color: 'w' };
    
    // Set up knights
    board[0][1] = { type: 'n', color: 'b' };
    board[0][6] = { type: 'n', color: 'b' };
    board[7][1] = { type: 'n', color: 'w' };
    board[7][6] = { type: 'n', color: 'w' };
    
    // Set up bishops
    board[0][2] = { type: 'b', color: 'b' };
    board[0][5] = { type: 'b', color: 'b' };
    board[7][2] = { type: 'b', color: 'w' };
    board[7][5] = { type: 'b', color: 'w' };
    
    // Set up queens
    board[0][3] = { type: 'q', color: 'b' };
    board[7][3] = { type: 'q', color: 'w' };
    
    // Set up kings
    board[0][4] = { type: 'k', color: 'b' };
    board[7][4] = { type: 'k', color: 'w' };
    
    // Reset game state
    selectedPiece = null;
    selectedSquare = null;
    currentPlayer = 'w';
    gameOver = false;
    castlingRights = {
        w: { kingSide: true, queenSide: true },
        b: { kingSide: true, queenSide: true }
    };
    enPassantTarget = null;
    moveHistory = [];
    promotionPending = null;
    
    // Update the UI
    renderBoard();
    updateStatus();
}

// Create the chessboard in the DOM
function createBoard() {
    const chessboard = document.getElementById('chessboard');
    chessboard.innerHTML = '';
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'white' : 'black'}`;
            square.dataset.row = row;
            square.dataset.col = col;
            
            square.addEventListener('click', () => handleSquareClick(row, col));
            
            chessboard.appendChild(square);
        }
    }
}

// Render the current board state
function renderBoard() {
    const squares = document.querySelectorAll('.square');
    
    squares.forEach(square => {
        // Clear any previous piece
        square.innerHTML = '';
        square.classList.remove('selected', 'valid-move', 'check');
        
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        
        // Add piece if there is one
        const piece = board[row][col];
        if (piece) {
            const pieceElement = document.createElement('div');
            pieceElement.className = 'piece';
            pieceElement.textContent = PIECES[piece.color][piece.type];
            square.appendChild(pieceElement);
        }
        
        // Highlight selected square
        if (selectedSquare && row === selectedSquare.row && col === selectedSquare.col) {
            square.classList.add('selected');
        }
        
        // Highlight king in check
        if (piece && piece.type === 'k' && isInCheck(piece.color)) {
            square.classList.add('check');
        }
        
        // Highlight valid moves if a piece is selected
        if (selectedPiece && isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
            square.classList.add('valid-move');
        }
    });
}

// ==================== GAME LOGIC FUNCTIONS ====================

// Handle square click event
function handleSquareClick(row, col) {
    if (gameOver) return;
    
    const piece = board[row][col];
    
    // If promotion is pending, ignore clicks except on promotion modal
    if (promotionPending) return;
    
    // If no piece is selected yet
    if (!selectedPiece) {
        // Can only select own pieces
        if (piece && piece.color === currentPlayer) {
            selectedPiece = piece;
            selectedSquare = { row, col };
            renderBoard();
        }
    } 
    // If a piece is already selected
    else {
        // If clicking on own piece again, select that piece instead
        if (piece && piece.color === currentPlayer) {
            selectedPiece = piece;
            selectedSquare = { row, col };
            renderBoard();
        } 
        // If clicking on a valid move square
        else if (isValidMove(selectedSquare.row, selectedSquare.col, row, col)) {
            // Check if it's a pawn promotion move
            if (selectedPiece.type === 'p' && (row === 0 || row === 7)) {
                promotionPending = { from: selectedSquare, to: { row, col } };
                showPromotionModal();
            } else {
                makeMove(selectedSquare.row, selectedSquare.col, row, col);
            }
        } 
        // If clicking on an invalid square, deselect
        else {
            selectedPiece = null;
            selectedSquare = null;
            renderBoard();
        }
    }
}

// Make a move on the board
function makeMove(fromRow, fromCol, toRow, toCol, promotionPiece = null) {
    const piece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // Store move in history for potential undo
    moveHistory.push({
        from: { row: fromRow, col: fromCol },
        to: { row: toRow, col: toCol },
        piece: { ...piece },
        captured: capturedPiece ? { ...capturedPiece } : null,
        castlingRights: JSON.parse(JSON.stringify(castlingRights)),
        enPassantTarget: enPassantTarget ? { ...enPassantTarget } : null,
        isPromotion: !!promotionPiece,
        promotionPiece: promotionPiece
    });
    
    // Handle en passant capture
    if (piece.type === 'p' && enPassantTarget && 
        toRow === enPassantTarget.row && toCol === enPassantTarget.col) {
        // Remove the captured pawn
        board[fromRow][toCol] = null;
    }
    
    // Update en passant target
    enPassantTarget = null;
    if (piece.type === 'p' && Math.abs(fromRow - toRow) === 2) {
        enPassantTarget = { 
            row: (fromRow + toRow) / 2, 
            col: fromCol 
        };
    }
    
    // Handle castling
    if (piece.type === 'k' && Math.abs(fromCol - toCol) === 2) {
        // Kingside castling
        if (toCol === 6) {
            board[fromRow][5] = board[fromRow][7]; // Move rook
            board[fromRow][7] = null;
        } 
        // Queenside castling
        else if (toCol === 2) {
            board[fromRow][3] = board[fromRow][0]; // Move rook
            board[fromRow][0] = null;
        }
    }
    
    // Update castling rights
    if (piece.type === 'k') {
        castlingRights[piece.color].kingSide = false;
        castlingRights[piece.color].queenSide = false;
    } else if (piece.type === 'r') {
        if (fromRow === 0 || fromRow === 7) {
            if (fromCol === 0) { // Queenside rook
                castlingRights[piece.color].queenSide = false;
            } else if (fromCol === 7) { // Kingside rook
                castlingRights[piece.color].kingSide = false;
            }
        }
    }
    
    // Handle promotion
    if (promotionPiece && piece.type === 'p' && (toRow === 0 || toRow === 7)) {
        piece.type = promotionPiece;
    }
    
    // Move the piece
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = null;
    
    // Reset selection
    selectedPiece = null;
    selectedSquare = null;
    promotionPending = null;
    
    // Switch player
    currentPlayer = currentPlayer === 'w' ? 'b' : 'w';
    
    // Check for game end conditions
    checkGameEnd();
    
    // Update the UI
    renderBoard();
    updateStatus();
    
    // If it's AI's turn, make AI move
    if (!gameOver && currentPlayer !== playerColor) {
        setTimeout(makeAIMove, 500);
    }
}

// Check if a move is valid
function isValidMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    if (!piece) return false;
    
    // Can't move to a square with own piece
    const targetPiece = board[toRow][toCol];
    if (targetPiece && targetPiece.color === piece.color) return false;
    
    // Get all valid moves for the piece
    const validMoves = getValidMovesForPiece(fromRow, fromCol);
    
    // Check if the target square is in the valid moves
    return validMoves.some(move => move.row === toRow && move.col === toCol);
}

// Get all valid moves for a piece
function getValidMovesForPiece(row, col) {
    const piece = board[row][col];
    if (!piece) return [];
    
    let moves = [];
    
    switch (piece.type) {
        case 'p':
            moves = getPawnMoves(row, col, piece.color);
            break;
        case 'r':
            moves = getRookMoves(row, col, piece.color);
            break;
        case 'n':
            moves = getKnightMoves(row, col, piece.color);
            break;
        case 'b':
            moves = getBishopMoves(row, col, piece.color);
            break;
        case 'q':
            moves = getQueenMoves(row, col, piece.color);
            break;
        case 'k':
            moves = getKingMoves(row, col, piece.color);
            break;
    }
    
    // Filter out moves that would leave the king in check
    return moves.filter(move => {
        // Make temporary move
        const originalPiece = board[move.row][move.col];
        board[move.row][move.col] = piece;
        board[row][col] = null;
        
        // Check if king is in check after the move
        const inCheck = isInCheck(piece.color);
        
        // Undo temporary move
        board[row][col] = piece;
        board[move.row][move.col] = originalPiece;
        
        return !inCheck;
    });
}

// Get valid moves for a pawn
function getPawnMoves(row, col, color) {
    const moves = [];
    const direction = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    
    // Forward move (1 square)
    if (isInBounds(row + direction, col) && !board[row + direction][col]) {
        moves.push({ row: row + direction, col });
        
        // Forward move (2 squares from start)
        if (row === startRow && !board[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col });
        }
    }
    
    // Capture moves (diagonal)
    for (let colOffset of [-1, 1]) {
        const newCol = col + colOffset;
        if (isInBounds(row + direction, newCol)) {
            // Regular capture
            if (board[row + direction][newCol] && board[row + direction][newCol].color !== color) {
                moves.push({ row: row + direction, col: newCol });
            }
            
            // En passant capture
            if (enPassantTarget && 
                row + direction === enPassantTarget.row && 
                newCol === enPassantTarget.col) {
                moves.push({ row: row + direction, col: newCol });
            }
        }
    }
    
    return moves;
}

// Get valid moves for a rook
function getRookMoves(row, col, color) {
    const moves = [];
    const directions = [
        { row: -1, col: 0 }, // up
        { row: 1, col: 0 },  // down
        { row: 0, col: -1 }, // left
        { row: 0, col: 1 }   // right
    ];
    
    for (const dir of directions) {
        let newRow = row + dir.row;
        let newCol = col + dir.col;
        
        while (isInBounds(newRow, newCol)) {
            if (!board[newRow][newCol]) {
                // Empty square
                moves.push({ row: newRow, col: newCol });
            } else {
                // Square has a piece
                if (board[newRow][newCol].color !== color) {
                    // Can capture opponent's piece
                    moves.push({ row: newRow, col: newCol });
                }
                break; // Stop in this direction
            }
            
            newRow += dir.row;
            newCol += dir.col;
        }
    }
    
    return moves;
}

// Get valid moves for a knight
function getKnightMoves(row, col, color) {
    const moves = [];
    const knightOffsets = [
        { row: -2, col: -1 },
        { row: -2, col: 1 },
        { row: -1, col: -2 },
        { row: -1, col: 2 },
        { row: 1, col: -2 },
        { row: 1, col: 2 },
        { row: 2, col: -1 },
        { row: 2, col: 1 }
    ];
    
    for (const offset of knightOffsets) {
        const newRow = row + offset.row;
        const newCol = col + offset.col;
        
        if (isInBounds(newRow, newCol)) {
            if (!board[newRow][newCol] || board[newRow][newCol].color !== color) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    }
    
    return moves;
}

// Get valid moves for a bishop
function getBishopMoves(row, col, color) {
    const moves = [];
    const directions = [
        { row: -1, col: -1 }, // up-left
        { row: -1, col: 1 },  // up-right
        { row: 1, col: -1 },  // down-left
        { row: 1, col: 1 }    // down-right
    ];
    
    for (const dir of directions) {
        let newRow = row + dir.row;
        let newCol = col + dir.col;
        
        while (isInBounds(newRow, newCol)) {
            if (!board[newRow][newCol]) {
                // Empty square
                moves.push({ row: newRow, col: newCol });
            } else {
                // Square has a piece
                if (board[newRow][newCol].color !== color) {
                    // Can capture opponent's piece
                    moves.push({ row: newRow, col: newCol });
                }
                break; // Stop in this direction
            }
            
            newRow += dir.row;
            newCol += dir.col;
        }
    }
    
    return moves;
}

// Get valid moves for a queen (combination of rook and bishop)
function getQueenMoves(row, col, color) {
    return [...getRookMoves(row, col, color), ...getBishopMoves(row, col, color)];
}

// Get valid moves for a king
function getKingMoves(row, col, color) {
    const moves = [];
    
    // Regular king moves (1 square in any direction)
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let colOffset = -1; colOffset <= 1; colOffset++) {
            if (rowOffset === 0 && colOffset === 0) continue;
            
            const newRow = row + rowOffset;
            const newCol = col + colOffset;
            
            if (isInBounds(newRow, newCol)) {
                if (!board[newRow][newCol] || board[newRow][newCol].color !== color) {
                    moves.push({ row: newRow, col: newCol });
                }
            }
        }
    }
    
    // Castling moves
    if (castlingRights[color].kingSide && canCastle(row, col, true)) {
        moves.push({ row, col: col + 2 });
    }
    
    if (castlingRights[color].queenSide && canCastle(row, col, false)) {
        moves.push({ row, col: col - 2 });
    }
    
    return moves;
}

// Check if castling is possible
function canCastle(row, col, kingSide) {
    const color = board[row][col].color;
    
    // King must not be in check
    if (isInCheck(color)) return false;
    
    // Squares between king and rook must be empty
    if (kingSide) {
        if (board[row][col + 1] || board[row][col + 2]) return false;
        // King must not pass through check
        if (isSquareAttacked(row, col + 1, color)) return false;
    } else {
        if (board[row][col - 1] || board[row][col - 2] || board[row][col - 3]) return false;
        // King must not pass through check
        if (isSquareAttacked(row, col - 1, color)) return false;
    }
    
    return true;
}

// Check if a square is attacked by opponent
function isSquareAttacked(row, col, color) {
    const opponentColor = color === 'w' ? 'b' : 'w';
    
    // Check for pawn attacks
    const pawnDirection = color === 'w' ? 1 : -1;
    for (let colOffset of [-1, 1]) {
        const attackRow = row + pawnDirection;
        const attackCol = col + colOffset;
        
        if (isInBounds(attackRow, attackCol) && 
            board[attackRow][attackCol] && 
            board[attackRow][attackCol].type === 'p' && 
            board[attackRow][attackCol].color === opponentColor) {
            return true;
        }
    }
    
    // Check for knight attacks
    const knightOffsets = [
        { row: -2, col: -1 },
        { row: -2, col: 1 },
        { row: -1, col: -2 },
        { row: -1, col: 2 },
        { row: 1, col: -2 },
        { row: 1, col: 2 },
        { row: 2, col: -1 },
        { row: 2, col: 1 }
    ];
    
    for (const offset of knightOffsets) {
        const attackRow = row + offset.row;
        const attackCol = col + offset.col;
        
        if (isInBounds(attackRow, attackCol) && 
            board[attackRow][attackCol] && 
            board[attackRow][attackCol].type === 'n' && 
            board[attackRow][attackCol].color === opponentColor) {
            return true;
        }
    }
    
    // Check for king attacks (1 square away)
    for (let rowOffset = -1; rowOffset <= 1; rowOffset++) {
        for (let colOffset = -1; colOffset <= 1; colOffset++) {
            if (rowOffset === 0 && colOffset === 0) continue;
            
            const attackRow = row + rowOffset;
            const attackCol = col + colOffset;
            
            if (isInBounds(attackRow, attackCol) && 
                board[attackRow][attackCol] && 
                board[attackRow][attackCol].type === 'k' && 
                board[attackRow][attackCol].color === opponentColor) {
                return true;
            }
        }
    }
    
    // Check for attacks along ranks, files, and diagonals (queen, rook, bishop)
    const directions = [
        { row: -1, col: 0, pieces: ['r', 'q'] },  // up
        { row: 1, col: 0, pieces: ['r', 'q'] },   // down
        { row: 0, col: -1, pieces: ['r', 'q'] },  // left
        { row: 0, col: 1, pieces: ['r', 'q'] },   // right
        { row: -1, col: -1, pieces: ['b', 'q'] }, // up-left
        { row: -1, col: 1, pieces: ['b', 'q'] },  // up-right
        { row: 1, col: -1, pieces: ['b', 'q'] },  // down-left
        { row: 1, col: 1, pieces: ['b', 'q'] }    // down-right
    ];
    
    for (const dir of directions) {
        let attackRow = row + dir.row;
        let attackCol = col + dir.col;
        
        while (isInBounds(attackRow, attackCol)) {
            if (board[attackRow][attackCol]) {
                if (board[attackRow][attackCol].color === opponentColor && 
                    dir.pieces.includes(board[attackRow][attackCol].type)) {
                    return true;
                }
                break; // Stop in this direction
            }
            
            attackRow += dir.row;
            attackCol += dir.col;
        }
    }
    
    return false;
}

// Check if a king is in check
function isInCheck(color) {
    // Find the king
    let kingRow, kingCol;
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (board[row][col] && 
                board[row][col].type === 'k' && 
                board[row][col].color === color) {
                kingRow = row;
                kingCol = col;
                break;
            }
        }
    }
    
    // Check if the king's square is attacked
    return isSquareAttacked(kingRow, kingCol, color);
}

// Check if a player is in checkmate or stalemate
function checkGameEnd() {
    // Get all valid moves for the current player
    let hasValidMoves = false;
    
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && piece.color === currentPlayer) {
                const moves = getValidMovesForPiece(row, col);
                if (moves.length > 0) {
                    hasValidMoves = true;
                    break;
                }
            }
        }
        if (hasValidMoves) break;
    }
    
    if (!hasValidMoves) {
        gameOver = true;
        if (isInCheck(currentPlayer)) {
            // Checkmate
            updateStatus(`Checkmate! ${currentPlayer === 'w' ? 'Black' : 'White'} wins!`);
        } else {
            // Stalemate
            updateStatus('Stalemate! The game is a draw.');
        }
    }
}

// Helper function to check if coordinates are within the board
function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Update the game status display
function updateStatus() {
    const statusElement = document.getElementById('status');
    
    if (gameOver) {
        // Status is already set in checkGameEnd
    } else if (isInCheck(currentPlayer)) {
        statusElement.textContent = `Check! ${currentPlayer === 'w' ? 'White' : 'Black'} to move.`;
    } else {
        statusElement.textContent = `${currentPlayer === 'w' ? 'White' : 'Black'} to move.`;
    }
}

// Show the pawn promotion modal
function showPromotionModal() {
    const modal = document.getElementById('promotion-modal');
    modal.style.display = 'block';
    
    const pieces = document.querySelectorAll('.promotion-piece');
    pieces.forEach(piece => {
        // Update the piece color to match the current player
        if (currentPlayer === 'w') {
            piece.textContent = PIECES['w'][piece.dataset.piece];
        } else {
            piece.textContent = PIECES['b'][piece.dataset.piece];
        }
        
        // Add click event
        piece.onclick = () => {
            modal.style.display = 'none';
            makeMove(
                promotionPending.from.row, 
                promotionPending.from.col, 
                promotionPending.to.row, 
                promotionPending.to.col, 
                piece.dataset.piece
            );
        };
    });
}

// ==================== STOCKFISH ENGINE INTEGRATION ====================

// Initialize the Stockfish engine
function initializeEngine() {
    try {
        console.log("Starting engine initialization");
        // Update engine status
        document.getElementById('engine-status').textContent = 'Engine: Initializing...';
        
        // Create a new Stockfish engine instance
        stockfish = new StockfishEngine();
        
        // Set up message handler
        stockfish.onMessage = handleEngineMessage;
        
        // Initialize the engine with a timeout and retry mechanism
        let retryCount = 0;
        const maxRetries = 2;
        
        const tryInitEngine = () => {
            console.log(`Engine initialization attempt ${retryCount + 1}`);
            
            const enginePromise = stockfish.init();
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error("Engine initialization timed out")), 5000);
            });
            
            Promise.race([enginePromise, timeoutPromise])
                .then(() => {
                    console.log("Engine initialized successfully");
                    // Engine is ready
                    document.getElementById('engine-status').textContent = 'Engine: Ready (Stockfish 16)';
                    
                    // Set initial skill level
                    setEngineLevel(engineLevel);
                    
                    // If it's AI's turn, make a move
                    if (currentPlayer !== playerColor && !gameOver) {
                        makeAIMove();
                    }
                })
                .catch(error => {
                    console.error(`Error initializing Stockfish (attempt ${retryCount + 1}):`, error);
                    
                    if (retryCount < maxRetries) {
                        // Try again
                        retryCount++;
                        document.getElementById('engine-status').textContent = `Engine: Retrying (${retryCount}/${maxRetries})...`;
                        
                        // Clean up previous instance
                        if (stockfish) {
                            try {
                                stockfish.destroy();
                            } catch (e) {
                                console.error("Error destroying engine:", e);
                            }
                        }
                        
                        // Create a new instance
                        stockfish = new StockfishEngine();
                        stockfish.onMessage = handleEngineMessage;
                        
                        // Retry after a short delay
                        setTimeout(tryInitEngine, 1000);
                    } else {
                        // All retries failed, fall back to simple AI
                        document.getElementById('engine-status').textContent = 'Engine: Error initializing';
                        fallbackToSimpleAI();
                    }
                });
        };
        
        // Start the initialization process
        tryInitEngine();
    } catch (error) {
        console.error('Error creating Stockfish instance:', error);
        document.getElementById('engine-status').textContent = 'Engine: Failed to load';
        
        // Fall back to simple AI if Stockfish fails
        fallbackToSimpleAI();
    }
}

// Fall back to a simple AI implementation if Stockfish fails to load
function fallbackToSimpleAI() {
    console.log("Falling back to simple AI implementation");
    document.getElementById('engine-status').textContent = 'Engine: Using simple AI (Stockfish unavailable)';
    
    // Clean up any existing Stockfish instance
    if (stockfish) {
        try {
            stockfish.destroy();
        } catch (e) {
            console.error("Error destroying engine during fallback:", e);
        }
        stockfish = null;
    }
    
    // Redefine makeAIMove to use a simple algorithm
    makeAIMove = function() {
        if (gameOver) return;
        
        console.log("Simple AI making a move");
        
        // Show thinking status
        document.getElementById('engine-thinking').classList.remove('hidden');
        document.getElementById('engine-depth').textContent = 'Depth 1';
        document.getElementById('engine-score').textContent = 'Score 0.0';
        
        // Simple AI: randomly select a valid move with some basic intelligence
        const validMoves = [];
        const captureMoves = []; // Prioritize captures
        const checkMoves = [];   // Prioritize checks
        
        // Collect all valid moves for the current player
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = board[row][col];
                if (piece && piece.color === currentPlayer) {
                    const moves = getValidMovesForPiece(row, col);
                    for (const move of moves) {
                        const moveData = {
                            fromRow: row,
                            fromCol: col,
                            toRow: move.row,
                            toCol: move.col
                        };
                        
                        // Check if this is a capture move
                        if (board[move.row][move.col]) {
                            captureMoves.push(moveData);
                        } else {
                            validMoves.push(moveData);
                        }
                        
                        // Check if this move puts opponent in check
                        // Make temporary move
                        const originalPiece = board[move.row][move.col];
                        board[move.row][move.col] = piece;
                        board[row][col] = null;
                        
                        // Check if opponent is in check after this move
                        if (isInCheck(currentPlayer === 'w' ? 'b' : 'w')) {
                            checkMoves.push(moveData);
                        }
                        
                        // Undo temporary move
                        board[row][col] = piece;
                        board[move.row][move.col] = originalPiece;
                    }
                }
            }
        }
        
        // Simulate "thinking" with a delay
        setTimeout(() => {
            // Hide thinking status
            document.getElementById('engine-thinking').classList.add('hidden');
            
            // Prioritize moves: check > capture > random
            let selectedMove;
            if (checkMoves.length > 0) {
                selectedMove = checkMoves[Math.floor(Math.random() * checkMoves.length)];
            } else if (captureMoves.length > 0) {
                selectedMove = captureMoves[Math.floor(Math.random() * captureMoves.length)];
            } else if (validMoves.length > 0) {
                selectedMove = validMoves[Math.floor(Math.random() * validMoves.length)];
            }
            
            if (selectedMove) {
                // Check for promotion
                if (board[selectedMove.fromRow][selectedMove.fromCol].type === 'p' && 
                    (selectedMove.toRow === 0 || selectedMove.toRow === 7)) {
                    // Always promote to queen
                    makeMove(selectedMove.fromRow, selectedMove.fromCol, selectedMove.toRow, selectedMove.toCol, 'q');
                } else {
                    makeMove(selectedMove.fromRow, selectedMove.fromCol, selectedMove.toRow, selectedMove.toCol);
                }
            }
        }, 500); // Simulate half-second thinking time
    };
}

// Handle messages from the Stockfish engine
function handleEngineMessage(message) {
    console.log('Engine message:', message);
    
    // Check for error messages
    if (message.startsWith('Error:')) {
        console.error('Engine error:', message);
        document.getElementById('engine-status').textContent = 'Engine: Error occurred';
        
        // If we're still thinking, we need to fall back to simple AI for this move
        if (engineThinking) {
            engineThinking = false;
            document.getElementById('engine-thinking').classList.add('hidden');
            
            // Use simple AI for this move
            console.log("Using simple AI for this move due to engine error");
            fallbackToSimpleAI();
            makeAIMove();
        }
        return;
    }
    
    // Parse info messages (evaluation, depth, etc.)
    if (message.startsWith('info')) {
        // Extract depth
        const depthMatch = message.match(/depth (\d+)/);
        if (depthMatch) {
            engineDepth = parseInt(depthMatch[1]);
            document.getElementById('engine-depth').textContent = `Depth ${engineDepth}`;
        }
        
        // Extract score
        const scoreMatch = message.match(/score cp ([-\d]+)/);
        if (scoreMatch) {
            engineScore = parseInt(scoreMatch[1]) / 100; // Convert centipawns to pawns
            document.getElementById('engine-score').textContent = `Score ${engineScore > 0 ? '+' : ''}${engineScore.toFixed(2)}`;
        }
        
        // Show thinking info
        if (engineThinking) {
            document.getElementById('engine-thinking').classList.remove('hidden');
        }
    }
    
    // Parse bestmove messages
    if (message.startsWith('bestmove')) {
        // Hide thinking info
        document.getElementById('engine-thinking').classList.add('hidden');
        engineThinking = false;
        
        // Extract and make the best move
        const bestMove = parseBestMove(message);
        if (bestMove) {
            // Check for promotion
            if (board[bestMove.fromRow][bestMove.fromCol] && 
                board[bestMove.fromRow][bestMove.fromCol].type === 'p' && 
                (bestMove.toRow === 0 || bestMove.toRow === 7)) {
                // Use the promotion piece from UCI or default to queen
                makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol, bestMove.promotion || 'q');
            } else {
                makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol);
            }
        } else {
            console.error("Failed to parse best move from:", message);
            // Fall back to simple AI for this move
            fallbackToSimpleAI();
            makeAIMove();
        }
    }
}

// Set the engine skill level
function setEngineLevel(level) {
    if (!stockfish) return;
    
    // Set the skill level in the engine
    const depth = stockfish.setSkillLevel(level);
    
    // Update the display
    let levelText;
    if (level >= 20) {
        levelText = `Grandmaster (Level ${level})`;
    } else if (level >= 15) {
        levelText = `Master (Level ${level})`;
    } else if (level >= 10) {
        levelText = `Advanced (Level ${level})`;
    } else if (level >= 5) {
        levelText = `Intermediate (Level ${level})`;
    } else {
        levelText = `Beginner (Level ${level})`;
    }
    
    document.getElementById('level-display').textContent = levelText;
    
    return depth;
}

// Make an AI move using Stockfish
function makeAIMove() {
    if (gameOver) return;
    
    if (!stockfish) {
        // If stockfish is not available, use the fallback AI
        console.log("Using fallback AI for move");
        // The fallback implementation of makeAIMove will be called
        return;
    }
    
    try {
        console.log("Making AI move with Stockfish");
        // Set engine as thinking
        engineThinking = true;
        
        // Get the current position as FEN
        const fen = generateFEN(board, currentPlayer, castlingRights, enPassantTarget);
        console.log("Current position FEN:", fen);
        
        // Set the position in the engine
        stockfish.setPosition(fen);
        
        // Calculate the best move with appropriate depth based on skill level
        const depth = setEngineLevel(engineLevel);
        console.log(`Calculating best move with depth ${depth}`);
        
        // Show thinking UI
        document.getElementById('engine-thinking').classList.remove('hidden');
        document.getElementById('engine-depth').textContent = 'Calculating...';
        document.getElementById('engine-score').textContent = '';
        
        // Set a timeout to fall back to simple AI if Stockfish takes too long
        const moveTimeout = setTimeout(() => {
            if (engineThinking) {
                console.error('Move calculation timed out');
                document.getElementById('engine-status').textContent = 'Engine: Calculation timed out';
                
                // Hide thinking info
                document.getElementById('engine-thinking').classList.add('hidden');
                engineThinking = false;
                
                // Stop the current calculation
                try {
                    stockfish.stopCalculation();
                } catch (e) {
                    console.error("Error stopping calculation:", e);
                }
                
                // Fall back to simple AI for this move
                fallbackToSimpleAI();
                makeAIMove();
            }
        }, 10000); // 10 second timeout
        
        // Start the calculation
        stockfish.calculateBestMove(depth);
        
        // Clear the timeout when we get a response (in handleEngineMessage)
        const originalHandleEngineMessage = stockfish.onMessage;
        stockfish.onMessage = (message) => {
            if (message.startsWith('bestmove')) {
                clearTimeout(moveTimeout);
            }
            originalHandleEngineMessage(message);
        };
    } catch (error) {
        console.error('Error making AI move:', error);
        document.getElementById('engine-status').textContent = 'Engine: Error during calculation';
        
        // Hide thinking info
        document.getElementById('engine-thinking').classList.add('hidden');
        engineThinking = false;
        
        // Fall back to simple AI if there's an error
        fallbackToSimpleAI();
        makeAIMove();
    }
}

// ==================== EVENT LISTENERS AND INITIALIZATION ====================

// Event listener for the "New Game" button
document.getElementById('new-game').addEventListener('click', () => {
    if (stockfish) {
        stockfish.newGame();
    }
    initializeBoard();
});

// Event listener for player color selection
document.querySelectorAll('input[name="player-color"]').forEach(radio => {
    radio.addEventListener('change', (e) => {
        playerColor = e.target.value === 'white' ? 'w' : 'b';
        initializeBoard();
        
        // If AI's turn (player is black, it's white's turn), make AI move
        if (currentPlayer !== playerColor && !gameOver) {
            setTimeout(makeAIMove, 500);
        }
    });
});

// Event listener for engine level slider
document.getElementById('engine-level').addEventListener('input', (e) => {
    engineLevel = parseInt(e.target.value);
    setEngineLevel(engineLevel);
});

// Initialize the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log("DOM content loaded, initializing game");
    try {
        createBoard();
        initializeBoard();
        
        // Delay engine initialization slightly to ensure DOM is fully ready
        setTimeout(() => {
            try {
                initializeEngine();
            } catch (error) {
                console.error("Error during engine initialization:", error);
                fallbackToSimpleAI();
            }
        }, 500);
    } catch (error) {
        console.error("Error during game initialization:", error);
        document.getElementById('status').textContent = "Error initializing game. Please refresh the page.";
    }
});

// Add window error handler
window.addEventListener('error', (event) => {
    console.error("Global error caught:", event.error);
    document.getElementById('engine-status').textContent = 'Engine: Error occurred';
    
    // Try to recover if possible
    if (!stockfish || !stockfish.isReady) {
        fallbackToSimpleAI();
    }
});
