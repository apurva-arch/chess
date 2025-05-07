/*
 * Stockfish.js Worker - Web Worker implementation for Stockfish WebAssembly
 * Copyright (C) 2023 The Stockfish developers
 */

// This is a simplified version that simulates the Stockfish engine behavior
// In a real implementation, this would load the actual Stockfish WASM module

// Stockfish WASM would normally be loaded here
// importScripts('stockfish.wasm.js');

// Since we can't actually download and include the real Stockfish WASM binary in this demo,
// we'll create a simulation of the engine's behavior for demonstration purposes

// Send initialization message to main thread
self.postMessage("Stockfish worker starting initialization");

// Store the current position and game state
let currentPosition = 'startpos';
let currentMoves = [];
let isThinking = false;
let skillLevel = 20; // Maximum skill level by default
let searchDepth = 20;

// Opening book moves (simplified)
const openingBook = {
    'startpos': ['e2e4', 'd2d4', 'g1f3', 'c2c4'],
    'e2e4': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
    'd2d4': ['d7d5', 'g8f6', 'e7e6', 'c7c5'],
    'g1f3': ['g8f6', 'd7d5', 'c7c5', 'g7g6'],
    'c2c4': ['e7e5', 'g8f6', 'c7c5', 'e7e6']
};

// Piece values for simplified evaluation
const pieceValues = {
    'p': 1,   // pawn
    'n': 3,   // knight
    'b': 3,   // bishop
    'r': 5,   // rook
    'q': 9,   // queen
    'k': 0    // king (not counted in material)
};

// Error handling for the worker
self.onerror = function(error) {
    console.error("Stockfish worker error:", error);
    self.postMessage("Error: " + error.message);
};

// Simulate receiving a command from the main thread
self.onmessage = function(e) {
    try {
        const command = e.data;
        console.log("Stockfish worker received command:", command);
        processCommand(command);
    } catch (error) {
        console.error("Error processing command:", error);
        self.postMessage("Error processing command: " + error.message);
    }
};

// Process UCI commands
function processCommand(command) {
    // Log the command for debugging
    // console.log('Received command:', command);
    
    if (command === 'uci') {
        // Respond with engine identification
        postMessage('id name Stockfish 16');
        postMessage('id author The Stockfish developers');
        
        // Send options
        postMessage('option name Skill Level type spin default 20 min 0 max 20');
        postMessage('option name MultiPV type spin default 1 min 1 max 500');
        postMessage('option name Threads type spin default 1 min 1 max 512');
        postMessage('option name Hash type spin default 16 min 1 max 33554432');
        
        // UCI OK signal
        postMessage('uciok');
    }
    else if (command === 'isready') {
        // Engine is ready
        postMessage('readyok');
    }
    else if (command === 'ucinewgame') {
        // Reset the engine state for a new game
        currentPosition = 'startpos';
        currentMoves = [];
    }
    else if (command.startsWith('position')) {
        // Set the current position
        handlePositionCommand(command);
    }
    else if (command.startsWith('go')) {
        // Start calculating
        handleGoCommand(command);
    }
    else if (command === 'stop') {
        // Stop calculation
        isThinking = false;
    }
    else if (command.startsWith('setoption')) {
        // Set an engine option
        handleSetOptionCommand(command);
    }
}

// Handle the 'position' command
function handlePositionCommand(command) {
    // Parse the position command
    if (command.includes('startpos')) {
        currentPosition = 'startpos';
        
        // Check if there are moves to apply
        if (command.includes('moves')) {
            const movesStr = command.split('moves ')[1];
            currentMoves = movesStr.split(' ');
        } else {
            currentMoves = [];
        }
    }
    else if (command.includes('fen')) {
        // Extract the FEN string
        const fenStr = command.split('fen ')[1].split(' moves')[0];
        currentPosition = fenStr;
        
        // Check if there are moves to apply
        if (command.includes('moves')) {
            const movesStr = command.split('moves ')[1];
            currentMoves = movesStr.split(' ');
        } else {
            currentMoves = [];
        }
    }
}

// Handle the 'go' command
function handleGoCommand(command) {
    isThinking = true;
    
    // Parse depth if specified
    let depth = searchDepth;
    if (command.includes('depth')) {
        const depthMatch = command.match(/depth (\d+)/);
        if (depthMatch) {
            depth = parseInt(depthMatch[1]);
        }
    }
    
    // Parse movetime if specified
    let moveTime = 1000; // Default 1 second
    if (command.includes('movetime')) {
        const timeMatch = command.match(/movetime (\d+)/);
        if (timeMatch) {
            moveTime = parseInt(timeMatch[1]);
        }
    }
    
    // Adjust thinking time based on skill level
    const thinkingTime = Math.max(100, moveTime * (skillLevel / 20));
    
    // Simulate engine thinking
    simulateThinking(depth, thinkingTime);
}

// Handle the 'setoption' command
function handleSetOptionCommand(command) {
    if (command.includes('name Skill Level')) {
        const match = command.match(/value (\d+)/);
        if (match) {
            skillLevel = parseInt(match[1]);
            // Adjust search depth based on skill level
            searchDepth = Math.max(1, Math.min(20, Math.floor(skillLevel * 1.5)));
        }
    }
}

// Simulate the engine thinking and finding the best move
function simulateThinking(depth, thinkingTime) {
    if (!isThinking) return;
    
    // Send some info lines to simulate engine analysis
    for (let d = 1; d <= Math.min(depth, 5); d++) {
        const score = Math.floor(Math.random() * 50) - 25; // Random score between -25 and 25
        const pv = generateRandomPV(d);
        
        setTimeout(() => {
            if (isThinking) {
                postMessage(`info depth ${d} score cp ${score} nodes ${d * 1000000} nps ${d * 100000} time ${d * 100} pv ${pv}`);
            }
        }, d * 100);
    }
    
    // Determine the best move
    setTimeout(() => {
        if (isThinking) {
            let bestMove;
            
            // Use opening book for early moves if at high skill level
            if (currentMoves.length < 10 && skillLevel > 15) {
                bestMove = getOpeningBookMove();
            }
            
            // If no opening book move, generate a "smart" move
            if (!bestMove) {
                bestMove = generateSmartMove();
            }
            
            // Send the best move
            postMessage(`bestmove ${bestMove}`);
            isThinking = false;
        }
    }, thinkingTime);
}

// Get a move from the opening book
function getOpeningBookMove() {
    if (currentMoves.length === 0 && openingBook['startpos']) {
        // First move from starting position
        const moves = openingBook['startpos'];
        return moves[Math.floor(Math.random() * moves.length)];
    }
    else if (currentMoves.length === 1 && openingBook[currentMoves[0]]) {
        // Response to first move
        const moves = openingBook[currentMoves[0]];
        return moves[Math.floor(Math.random() * moves.length)];
    }
    
    return null;
}

// Generate a somewhat intelligent move
function generateSmartMove() {
    // In a real implementation, this would use the actual Stockfish evaluation
    // For this simulation, we'll return a common strong move
    
    // Common strong first moves for white
    const whiteFirstMoves = ['e2e4', 'd2d4', 'c2c4', 'g1f3'];
    
    // Common responses for black
    const blackResponses = {
        'e2e4': ['e7e5', 'c7c5', 'e7e6', 'c7c6'],
        'd2d4': ['d7d5', 'g8f6', 'e7e6'],
        'c2c4': ['e7e5', 'c7c5', 'g8f6'],
        'g1f3': ['d7d5', 'g8f6', 'c7c5']
    };
    
    // If it's the first move, choose a strong opening
    if (currentMoves.length === 0) {
        return whiteFirstMoves[Math.floor(Math.random() * whiteFirstMoves.length)];
    }
    
    // If it's a response to a known opening
    if (currentMoves.length === 1 && blackResponses[currentMoves[0]]) {
        const responses = blackResponses[currentMoves[0]];
        return responses[Math.floor(Math.random() * responses.length)];
    }
    
    // For later moves, generate a random but plausible move
    // In a real implementation, this would be the actual Stockfish calculation
    const commonMoves = [
        'e2e4', 'd2d4', 'g1f3', 'b1c3', 'c1e3', 'f1e2', 'e1g1', // White moves
        'e7e5', 'd7d5', 'g8f6', 'b8c6', 'c8e6', 'f8e7', 'e8g8'  // Black moves
    ];
    
    return commonMoves[Math.floor(Math.random() * commonMoves.length)];
}

// Generate a random sequence of moves for the PV (Principal Variation)
function generateRandomPV(length) {
    const moves = [];
    const commonMoves = [
        'e2e4', 'd2d4', 'g1f3', 'b1c3', 'c1e3', 'f1e2', 'e1g1', // White moves
        'e7e5', 'd7d5', 'g8f6', 'b8c6', 'c8e6', 'f8e7', 'e8g8'  // Black moves
    ];
    
    for (let i = 0; i < length; i++) {
        moves.push(commonMoves[Math.floor(Math.random() * commonMoves.length)]);
    }
    
    return moves.join(' ');
}

// Announce that the worker is ready
try {
    // Short delay to ensure the main thread is ready to receive messages
    setTimeout(() => {
        postMessage('Stockfish worker initialized');
        console.log("Stockfish worker initialization complete");
    }, 100);
} catch (error) {
    console.error("Error during worker initialization:", error);
}
