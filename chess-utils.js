/*
 * Chess Utilities - Helper functions for chess operations
 */

// Convert board coordinates to algebraic notation (e.g., [0, 0] -> "a8")
function coordsToAlgebraic(row, col) {
    const files = 'abcdefgh';
    const ranks = '87654321';
    return files[col] + ranks[row];
}

// Convert algebraic notation to board coordinates (e.g., "a8" -> [0, 0])
function algebraicToCoords(algebraic) {
    const files = 'abcdefgh';
    const ranks = '87654321';
    const file = algebraic[0];
    const rank = algebraic[1];
    return {
        row: ranks.indexOf(rank),
        col: files.indexOf(file)
    };
}

// Convert a move in our format to UCI format (e.g., [0,0] to [1,0] -> "a8a7")
function moveToUCI(fromRow, fromCol, toRow, toCol, promotion = null) {
    const from = coordsToAlgebraic(fromRow, fromCol);
    const to = coordsToAlgebraic(toRow, toCol);
    return from + to + (promotion ? promotion : '');
}

// Convert a UCI move to our format (e.g., "a8a7" -> { fromRow: 0, fromCol: 0, toRow: 1, toCol: 0 })
function UCIToMove(uciMove) {
    const from = uciMove.substring(0, 2);
    const to = uciMove.substring(2, 4);
    const promotion = uciMove.length > 4 ? uciMove[4] : null;
    
    const fromCoords = algebraicToCoords(from);
    const toCoords = algebraicToCoords(to);
    
    return {
        fromRow: fromCoords.row,
        fromCol: fromCoords.col,
        toRow: toCoords.row,
        toCol: toCoords.col,
        promotion
    };
}

// Generate FEN (Forsyth-Edwards Notation) string from board state
function generateFEN(board, currentPlayer, castlingRights, enPassantTarget) {
    let fen = '';
    
    // Board position
    for (let row = 0; row < 8; row++) {
        let emptyCount = 0;
        
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            
            if (piece) {
                // If there were empty squares before this piece, add the count
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
                
                // Add the piece character
                let pieceChar = piece.type;
                if (piece.color === 'w') {
                    pieceChar = pieceChar.toUpperCase();
                }
                fen += pieceChar;
            } else {
                // Empty square
                emptyCount++;
            }
        }
        
        // If there are empty squares at the end of the row
        if (emptyCount > 0) {
            fen += emptyCount;
        }
        
        // Add row separator (except for the last row)
        if (row < 7) {
            fen += '/';
        }
    }
    
    // Active color
    fen += ' ' + currentPlayer;
    
    // Castling availability
    let castling = '';
    if (castlingRights.w.kingSide) castling += 'K';
    if (castlingRights.w.queenSide) castling += 'Q';
    if (castlingRights.b.kingSide) castling += 'k';
    if (castlingRights.b.queenSide) castling += 'q';
    fen += ' ' + (castling || '-');
    
    // En passant target square
    if (enPassantTarget) {
        fen += ' ' + coordsToAlgebraic(enPassantTarget.row, enPassantTarget.col);
    } else {
        fen += ' -';
    }
    
    // Halfmove clock and fullmove number (simplified)
    fen += ' 0 1';
    
    return fen;
}

// Convert our move history to UCI move list
function moveHistoryToUCI(moveHistory) {
    return moveHistory.map(move => 
        moveToUCI(move.from.row, move.from.col, move.to.row, move.to.col, move.promotionPiece)
    );
}

// Parse UCI bestmove response
function parseBestMove(bestMoveString) {
    // Extract the move part from "bestmove e2e4" format
    const match = bestMoveString.match(/bestmove\s+(\w+)/);
    if (match && match[1]) {
        return UCIToMove(match[1]);
    }
    return null;
}
