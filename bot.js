function syncBotNames() {
    if (state.isAiMode) {
        if (state.playerCount === 2) {
            state.playerNames[PLAYER_2] = `${state.playerColors[PLAYER_2].name} Bot`;
        } else {
            state.playerNames[PLAYER_2] = `${state.playerColors[PLAYER_2].name} Bot`;
            state.playerNames[PLAYER_3] = `${state.playerColors[PLAYER_3].name} Bot`;
        }
    } else {
        if (state.playerNames[PLAYER_2] === 'Bot' || state.playerNames[PLAYER_2].endsWith(' Bot')) {
            state.playerNames[PLAYER_2] = 'Player 2';
        }
        if (state.playerNames[PLAYER_3] === 'Bot' || state.playerNames[PLAYER_3].endsWith(' Bot') || state.playerNames[PLAYER_3] === 'Bot 2') {
            state.playerNames[PLAYER_3] = 'Player 3';
        }
    }
}

function getPlayerNames() {
    return { ...state.playerNames };
}

// Identify active AI player loops
function getAiPlayers() {
    const set = new Set();
    if (!state.isAiMode || state.isOnlineGame) return set;
    set.add(PLAYER_2);
    if (state.playerCount === 3) set.add(PLAYER_3);
    return set;
}

function getLayoutInfo() {
    const config = BOARD_LAYOUTS[state.selectedLayoutKey];
    const blocks = config.blocks;
    const minR = Math.min(...blocks.map(b => b.r));
    const minC = Math.min(...blocks.map(b => b.c));
    const normalizedBlocks = blocks.map(b => ({ r: b.r - minR, c: b.c - minC }));
    const maxR = Math.max(...normalizedBlocks.map(b => b.r));
    const maxC = Math.max(...normalizedBlocks.map(b => b.c));

    const rows = (maxR + 1) * 3;
    const cols = (maxC + 1) * 3;
    const matrix = Array(rows).fill(null).map(() => Array(cols).fill(null));
    const indexToCoord = Array(TOTAL_TILES).fill(null);

    normalizedBlocks.forEach((block, blockIdx) => {
        const startR = block.r * 3;
        const startC = block.c * 3;
        for (let s = 0; s < 9; s++) {
            const sr = Math.floor(s / 3);
            const sc = s % 3;
            const tileIdx = blockIdx * 9 + s;
            const globalR = startR + sr;
            const globalC = startC + sc;
            matrix[globalR][globalC] = tileIdx;
            indexToCoord[tileIdx] = { r: globalR, c: globalC };
        }
    });
    return { rows, cols, matrix, indexToCoord };
}

function getNeighborsDynamic(index, layoutInfo) {
    const coord = layoutInfo.indexToCoord[index];
    if (!coord) return [];
    const { r, c } = coord;
    const candidates = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];
    const neighbors = [];
    candidates.forEach(cand => {
        if (cand.r >= 0 && cand.r < layoutInfo.rows && cand.c >= 0 && cand.c < layoutInfo.cols) {
            const neighborIdx = layoutInfo.matrix[cand.r][cand.c];
            if (neighborIdx !== null) neighbors.push(neighborIdx);
        }
    });
    return neighbors;
}

function isEdgeTileDynamic(index, layoutInfo) {
    const coord = layoutInfo.indexToCoord[index];
    if (!coord) return false;
    const { r, c } = coord;
    const checkDirs = [{ r: r - 1, c }, { r: r + 1, c }, { r, c: c - 1 }, { r, c: c + 1 }];
    return checkDirs.some(dir => {
        if (dir.r < 0 || dir.r >= layoutInfo.rows || dir.c < 0 || dir.c >= layoutInfo.cols) return true;
        return layoutInfo.matrix[dir.r][dir.c] === null;
    });
}

function generateInitialBoard(layoutInfo) {
    const targetCounts = state.playerCount === 3 ? { 1: 12, 2: 12, 3: 12 } : { 1: 18, 2: 18 };
    let finalBoard = Array(TOTAL_TILES).fill(null);
    let solved = false, retries = 0;

    while (!solved && retries < 100) {
        let attempts = 0;
        const counts = { ...targetCounts };
        const boardState = Array(TOTAL_TILES).fill(null);

        const solve = (index) => {
            attempts++;
            if (attempts > 500) return false;
            if (index === TOTAL_TILES) return true;

            const neighbors = getNeighborsDynamic(index, layoutInfo);
            const adjacentColors = neighbors.map(n => boardState[n]).filter(c => c !== null);
            let availableColors = Object.keys(counts).map(Number).filter(c => counts[c] > 0 && !adjacentColors.includes(c));
            availableColors = shuffleArray(availableColors);

            for (const color of availableColors) {
                boardState[index] = color;
                counts[color]--;
                if (solve(index + 1)) return true;
                boardState[index] = null;
                counts[color]++;
            }
            return false;
        };

        solved = solve(0);
        if (solved) finalBoard = boardState;
        retries++;
    }

    if (!solved) {
        const counts = { ...targetCounts };
        for (let i = 0; i < TOTAL_TILES; i++) {
            const neighbors = getNeighborsDynamic(i, layoutInfo);
            const adjacentColors = neighbors.map(n => finalBoard[n]).filter(c => c !== null);
            let bestColor = Object.keys(counts).map(Number).filter(c => counts[c] > 0).sort((a, b) => {
                const aConflict = adjacentColors.includes(a) ? 1 : 0;
                const bConflict = adjacentColors.includes(b) ? 1 : 0;
                if (aConflict !== bConflict) return aConflict - bConflict;
                return counts[b] - counts[a];
            })[0];
            if (bestColor !== undefined) {
                finalBoard[i] = bestColor;
                counts[bestColor]--;
            } else finalBoard[i] = PLAYER_1;
        }
    }
    return finalBoard;
}

function getKeystoneConnectedStones(boardState, playerColor, keystoneIdx, layoutInfo) {
    if (keystoneIdx === undefined || keystoneIdx === null) return [];
    if (boardState[keystoneIdx] !== playerColor) return [];
    const visited = new Set(), queue = [keystoneIdx];
    visited.add(keystoneIdx);

    while (queue.length > 0) {
        const current = queue.shift();
        const neighbors = getNeighborsDynamic(current, layoutInfo);
        for (const neighbor of neighbors) {
            if (boardState[neighbor] === playerColor && !visited.has(neighbor)) {
                visited.add(neighbor);
                queue.push(neighbor);
            }
        }
    }
    visited.delete(keystoneIdx);
    return Array.from(visited);
}

function getPlayerStats(layoutInfo) {
    const stats = {};
    const keystoneIndices = Object.values(state.keystones);
    [PLAYER_1, PLAYER_2, PLAYER_3].forEach(player => {
        const keystoneIdx = state.keystones[player];
        const connectedStones = getKeystoneConnectedStones(state.board, player, keystoneIdx, layoutInfo);
        const totalStones = state.board.filter((t, idx) => t === player && !keystoneIndices.includes(idx)).length;
        stats[player] = {
            total: totalStones,
            largest: connectedStones.length,
            isFullyConnected: connectedStones.length === totalStones && totalStones > 0
        };
    });
    return stats;
}

function getCurrentPlayer() { return state.turnOrder[(state.turn - 1) % state.playerCount]; }
function getCurrentKeystonePicker() { return state.turnOrder[state.keystonePickerIndex] || state.turnOrder[0]; }
function isGameOverCheck() { return state.gamePhase === 'game-over' || state.instantWinner !== null || (state.gamePhase === 'playing' && state.turn > state.playerCount * state.maxRounds); }

function getPlayerNameByColorId(colorId) {
    const key = Object.keys(state.playerColors).find(k => state.playerColors[k].id === colorId);
    return key ? state.playerNames[key] : colorId.toUpperCase();
}