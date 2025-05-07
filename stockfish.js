/*
 * Stockfish.js - A JavaScript implementation of the UCI chess engine Stockfish
 * Copyright (C) 2023 The Stockfish developers
 *
 * This file is a wrapper for the Stockfish WebAssembly engine.
 */

class StockfishEngine {
    constructor() {
        this.engine = null;
        this.isReady = false;
        this.onMessage = null;
        this.worker = null;
        this.resolveInitPromise = null;
    }

    // Initialize the engine
    init() {
        return new Promise((resolve, reject) => {
            try {
                console.log("StockfishEngine: Starting initialization");
                this.resolveInitPromise = resolve;
                
                // Create a Web Worker to run Stockfish in a separate thread
                // Try multiple paths with better error handling
                const tryWorkerPaths = () => {
                    const paths = [
                        'engine/stockfish.worker.js',
                        './engine/stockfish.worker.js',
                        '/engine/stockfish.worker.js'
                    ];
                    
                    let workerCreated = false;
                    
                    for (const path of paths) {
                        if (workerCreated) break;
                        
                        try {
                            console.log(`StockfishEngine: Trying to load worker from: ${path}`);
                            this.worker = new Worker(path);
                            workerCreated = true;
                            console.log(`StockfishEngine: Successfully loaded worker from: ${path}`);
                            
                            // Set up error handling for this worker
                            this.worker.onerror = (error) => {
                                console.error("StockfishEngine: Worker error:", error);
                                if (this.isReady) return; // If already initialized, don't reject
                                reject(new Error(`Worker error: ${error.message}`));
                            };
                            
                            this.setupWorkerHandlers();
                        } catch (error) {
                            console.warn(`StockfishEngine: Failed to load worker from ${path}:`, error);
                        }
                    }
                    
                    if (!workerCreated) {
                        console.error("StockfishEngine: All worker loading attempts failed");
                        reject(new Error("Failed to create Stockfish worker"));
                    }
                };
                
                // Try to create the worker
                tryWorkerPaths();
                
                // Set a timeout to reject if initialization takes too long
                setTimeout(() => {
                    if (!this.isReady) {
                        console.error("StockfishEngine: Initialization timed out");
                        reject(new Error("Stockfish initialization timed out"));
                    }
                }, 5000);
            } catch (error) {
                console.error("StockfishEngine: Initialization error:", error);
                reject(error);
            }
        });
    }
    
    // Set up message handling for the worker
    setupWorkerHandlers() {
        if (!this.worker) return;
        
        console.log("StockfishEngine: Setting up worker message handlers");
        
        this.worker.onmessage = (e) => {
            const message = e.data;
            
            // Log important messages for debugging
            if (message.includes('uciok') || message.includes('readyok') || message.includes('Stockfish')) {
                console.log(`StockfishEngine received: ${message}`);
            }
            
            // Check if the engine is ready
            if (message.includes('uciok')) {
                this.isReady = true;
                this.sendCommand('isready');
            }
            
            // Notify when engine is fully ready
            if (message.includes('readyok') && !this.engine) {
                this.engine = true;
                console.log("StockfishEngine: Engine is fully ready");
                if (this.resolveInitPromise) {
                    this.resolveInitPromise();
                }
            }
            
            // Call the message callback if set
            if (this.onMessage) {
                this.onMessage(message);
            }
        };
        
        // Initialize UCI mode
        console.log("StockfishEngine: Sending UCI command");
        this.sendCommand('uci');
    }

    // Send a command to the engine
    sendCommand(command) {
        if (this.worker) {
            try {
                this.worker.postMessage(command);
            } catch (error) {
                console.error(`StockfishEngine: Error sending command "${command}":`, error);
                // If we can't send commands, the engine is not working
                if (this.onMessage) {
                    this.onMessage(`Error: Failed to send command to engine: ${error.message}`);
                }
            }
        } else {
            console.warn(`StockfishEngine: Cannot send command "${command}" - worker not initialized`);
        }
    }

    // Set the position on the board using FEN notation
    setPosition(fen) {
        this.sendCommand(`position fen ${fen}`);
    }

    // Set the position from the starting position and apply moves
    setPositionFromMoves(moves = []) {
        if (moves.length === 0) {
            this.sendCommand('position startpos');
        } else {
            this.sendCommand(`position startpos moves ${moves.join(' ')}`);
        }
    }

    // Start calculating the best move
    // depth: search depth (higher = stronger but slower)
    // movetime: time in milliseconds to search
    calculateBestMove(depth = 20, movetime = 1000) {
        if (depth) {
            this.sendCommand(`go depth ${depth}`);
        } else if (movetime) {
            this.sendCommand(`go movetime ${movetime}`);
        } else {
            this.sendCommand('go');
        }
    }

    // Stop the calculation
    stopCalculation() {
        this.sendCommand('stop');
    }

    // Set a new game
    newGame() {
        this.sendCommand('ucinewgame');
        this.sendCommand('isready');
    }

    // Set the skill level (0-20, where 20 is the strongest)
    setSkillLevel(level) {
        // Ensure level is between 0 and 20
        level = Math.max(0, Math.min(20, level));
        
        // Set skill level
        this.sendCommand(`setoption name Skill Level value ${level}`);
        
        // Adjust search depth based on skill level
        const depth = Math.max(1, Math.min(20, Math.floor(level * 1.5)));
        return depth;
    }

    // Clean up resources
    destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.engine = null;
        this.isReady = false;
    }
}
