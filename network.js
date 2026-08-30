window.setGameMode = (isAi) => { state.isAiMode = isAi; syncBotNames(); render(); };
window.setPlayerCount = (c) => { state.playerCount = c; syncBotNames(); render(); };
window.setLayoutKey = (k) => { state.selectedLayoutKey = k; render(); };
window.updateRoundsDOM = (val) => { document.getElementById('rounds-display-val').innerText = val; };
window.updateRoundsState = (val) => { state.maxRounds = parseInt(val); };
window.setPhase = (phase) => { state.gamePhase = phase; render(); };

window.selectColor = (pid, cId) => {
    const chosen = COLOR_OPTIONS.find(c => c.id === cId);
    const conflict = Object.keys(state.playerColors).find(k => state.playerColors[k].id === cId);
    if (conflict && parseInt(conflict) !== pid) state.playerColors[conflict] = state.playerColors[pid];
    state.playerColors[pid] = chosen;

    if (state.isOnlineGame) {
        window.updateOnlineLobbySettings();
    } else {
        syncBotNames();
        render();
    }
};
window.updateName = (pid, val) => { state.playerNames[pid] = val; };
window.updateDiff = (pid, val) => { state.botDifficulties[pid] = val; };

// --- ONLINE MULTIPLAYER LOGIC HUB ---
const ADJECTIVES = [
    "Awful", "Broken", "Crunchy", "Droopy", "Evil", "Flat", "Gooey", "Heavy",
    "Iconic", "Jealous", "Klutzy", "Lazy", "Mellow", "Naughty", "Old",
    "Puffy", "Quiet", "Random", "Spicy", "Tiny", "Unique", "Vibrant", "Wrinkly", "Young", "Zany"
];

const ANIMALS = [
    "Alpaca", "Buffalo", "Crow", "Dodo", "Emu", "Fawn", "Guppy", "Hyena",
    "Impala", "Jerboa", "Koala", "Lynx", "Moose", "Narwhal", "Orca", "Puffin",
    "Quail", "Rooster", "Stork", "Trout", "Urchin", "Vulture", "Wombat", "Yak", "Zebra"
];

function generateRoomCode() {
    const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
    const anim = ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
    return `${adj}${anim}`;
}

window.hostOnlineGame = () => {
    state.onlineErrorMsg = "";
    const hostNameInput = document.getElementById('online-host-name-input');
    const hostName = hostNameInput ? hostNameInput.value.trim() : "Host";
    if (!hostName) {
        state.onlineErrorMsg = "Enter a name to host.";
        render();
        return;
    }

    const code = generateRoomCode();
    const dbCode = code.toUpperCase();
    state.roomCode = code;
    state.localPlayerId = PLAYER_1;
    state.isOnlineGame = true;
    state.isAiMode = false;
    state.playerCount = 2;
    state.playerNames[PLAYER_1] = hostName;

    roomRef = firebase.database().ref('rooms/' + dbCode);

    roomRef.set({
        roomCode: code,
        gamePhase: 'online-lobby',
        playerCount: state.playerCount,
        maxRounds: state.maxRounds,
        selectedLayoutKey: state.selectedLayoutKey,
        playerNames: {
            [PLAYER_1]: hostName,
            [PLAYER_2]: '',
            [PLAYER_3]: ''
        },
        playerColors: {
            [PLAYER_1]: state.playerColors[PLAYER_1],
            [PLAYER_2]: state.playerColors[PLAYER_2],
            [PLAYER_3]: state.playerColors[PLAYER_3]
        },
        board: [],
        turn: 1,
        turnOrder: [],
        keystones: {},
        keystonePickerIndex: 0,
        instantWinner: '',
        cooldowns: {}
    }).then(() => {
        roomRef.onDisconnect().remove();
        state.gamePhase = 'online-lobby';
        attachRoomDatabaseListener();
    }).catch(err => {
        state.onlineErrorMsg = "Failed to create online lobby. Check your connection and try again.";
        render();
    });
};

window.joinOnlineGame = () => {
    state.onlineErrorMsg = "";
    const codeInput = document.getElementById('online-join-code-input');
    const nameInput = document.getElementById('online-join-name-input');
    const displayCode = codeInput ? codeInput.value.trim() : "";
    const dbCode = displayCode.toUpperCase();
    const name = nameInput ? nameInput.value.trim() : "";

    if (!displayCode || !name) {
        state.onlineErrorMsg = "Fill in both fields.";
        render();
        return;
    }

    const checkRef = firebase.database().ref('rooms/' + dbCode);
    checkRef.once('value').then(snapshot => {
        if (!snapshot.exists()) {
            state.onlineErrorMsg = "Invalid room code.";
            render();
            return;
        }

        const data = snapshot.val();
        if (data.gamePhase !== 'online-lobby') {
            state.onlineErrorMsg = "Game is in progress.";
            render();
            return;
        }

        const maxSlots = data.playerCount;
        let targetSlot = null;

        if (!data.playerNames[PLAYER_2]) targetSlot = PLAYER_2;
        else if (maxSlots === 3 && !data.playerNames[PLAYER_3]) targetSlot = PLAYER_3;

        if (!targetSlot) {
            state.onlineErrorMsg = "Room is currently full.";
            render();
            return;
        }

        state.roomCode = data.roomCode || displayCode;
        state.localPlayerId = targetSlot;
        state.isOnlineGame = true;
        state.isAiMode = false;
        roomRef = checkRef;

        roomRef.child('playerNames').child(targetSlot).set(name).then(() => {
            roomRef.child('playerNames').child(targetSlot).onDisconnect().set('');
            state.gamePhase = 'online-lobby';
            attachRoomDatabaseListener();
        });
    });
};

function attachRoomDatabaseListener() {
    if (!roomRef) return;
    roomRef.on('value', snapshot => {
        const data = snapshot.val();
        if (!data) {
            if (state.isOnlineGame && state.localPlayerId !== PLAYER_1) {
                state.onlineErrorMsg = "The host closed the room.";
                window.resetToSetup();
            }
            return;
        }

        state.gamePhase = data.gamePhase;
        state.playerCount = data.playerCount;
        state.maxRounds = data.maxRounds;
        state.selectedLayoutKey = data.selectedLayoutKey;

        if (data.playerNames) {
    state.playerNames = data.playerNames;

    if (state.gamePhase !== 'online-lobby') {
        let activeCount = 0;
        for (let s = 1; s <= state.playerCount; s++) {
            if (state.playerNames[s]) activeCount++;
        }
        if (activeCount < state.playerCount) {
            // We removed the error message string here so it never triggers or displays!
            state.onlineErrorMsg = ""; 
            
            if (state.localPlayerId === PLAYER_1) {
                window.resetOnlineLobbyState();
            }
            return;
        }
    }
}
        if (data.playerColors) state.playerColors = data.playerColors;

        state.board = data.board || [];
        state.turn = data.turn || 1;
        state.turnOrder = data.turnOrder || [];

        state.keystones = data.keystones ? Object.assign({}, data.keystones) : {};
        state.cooldowns = data.cooldowns ? Object.assign({}, data.cooldowns) : {};

        state.keystonePickerIndex = data.keystonePickerIndex || 0;
        state.instantWinner = data.instantWinner ? parseInt(data.instantWinner) : null;

        render();
    });
}

window.updateOnlineLobbySettings = () => {
    if (!roomRef) return;
    roomRef.update({
        playerCount: state.playerCount,
        maxRounds: state.maxRounds,
        selectedLayoutKey: state.selectedLayoutKey,
        playerColors: state.playerColors
    });
};

window.startOnlineGame = () => {
    if (!roomRef || state.localPlayerId !== PLAYER_1) return;

    const pool = state.playerCount === 3 ? [PLAYER_1, PLAYER_2, PLAYER_3] : [PLAYER_1, PLAYER_2];
    const randomizedOrder = shuffleArray(pool);
    const computedBoard = generateInitialBoard(getLayoutInfo());

    roomRef.update({
        board: computedBoard,
        turnOrder: randomizedOrder,
        keystones: {},
        keystonePickerIndex: 0,
        turn: 1,
        instantWinner: '',
        cooldowns: {},
        gamePhase: 'keystone-select'
    });
};

window.resetOnlineLobbyState = () => {
    if (!roomRef) return;
    roomRef.update({
        gamePhase: 'online-lobby',
        board: [],
        turn: 1,
        turnOrder: [],
        keystones: {},
        keystonePickerIndex: 0,
        instantWinner: '',
        cooldowns: {}
    });
};

window.resetToSetup = () => {
    clearTimeout(aiTimer);
    const wasOnline = state.isOnlineGame;
    const myId = state.localPlayerId;
    const refToClose = roomRef;

    if (wasOnline && refToClose && myId) {
        if (myId === PLAYER_1) {
            refToClose.remove();
        } else {
            refToClose.child('playerNames').child(myId).set('');
        }
    }

    if (roomRef) {
        roomRef.off();
        roomRef = null;
    }
    state.isOnlineGame = false;
    state.roomCode = null;
    state.localPlayerId = null;
    state.gamePhase = wasOnline ? 'online-menu' : 'setup';
    state.instantWinner = null;

    render();
};

// Trigger action when "Surge" button is pressed (Timed "Set in Stone Surge" Mode)
window.toggleSurgeMode = () => {
    const isCurrentlySurge = state.gamePhase === 'surge-view';
    if (isCurrentlySurge) {
        state.gamePhase = state.previousGamePhase || 'landing';
    } else {
        state.previousGamePhase = state.gamePhase;
        state.gamePhase = 'surge-view';
    }
    render();
};

window.toggleIrlCounterPhase = () => {
    if (state.gamePhase === 'irl-counter') {
        state.gamePhase = state.previousGamePhase || 'landing';
    } else {
        state.previousGamePhase = state.gamePhase;
        state.gamePhase = 'irl-counter';
    }
    render();
};

window.adjustIrlRound = (amt) => {
    const prevRound = state.irlRound;
    if (amt > 0) {
        if (state.irlRound === 0) state.irlRound = 1;
        else state.irlRound += 1;
    } else if (amt < 0) {
        if (state.irlRound > 0) state.irlRound -= 1;
    }

    const irlValEl = document.getElementById('irl-display-val');
    const btnWrapper = document.getElementById('irl-buttons-wrapper');

    if (irlValEl) {
        if (state.irlRound === 0) {
            irlValEl.textContent = "CHOOSE YOUR KEYSTONES";
            irlValEl.className = "text-xl sm:text-2xl md:text-3xl font-black tracking-normal text-[#2C2C2E] select-none block px-4";
        } else {
            irlValEl.textContent = state.irlRound;
            irlValEl.className = "text-8xl sm:text-9xl font-black tracking-tight text-[#2C2C2E] select-none";
        }
    }

    if (btnWrapper) {
        const wasZero = (prevRound === 0);
        const isZero = (state.irlRound === 0);
        if (wasZero !== isZero) {
            if (isZero) {
                btnWrapper.innerHTML = `
              <div class="w-full mb-6">
                <button onclick="window.adjustIrlRound(1)" class="w-full bg-[#2C2C2E] hover:bg-[#1a1a1c] text-white font-black text-2xl py-4 rounded-2xl transition-all active:scale-95 shadow-md select-none uppercase tracking-wider">Start</button>
              </div>`;
            } else {
                btnWrapper.innerHTML = `
              <div class="grid grid-cols-2 gap-4 mb-6">
                <button onclick="window.adjustIrlRound(-1)" class="bg-[#2C2C2E] hover:bg-[#1a1a1c] text-white font-black text-4xl py-4 rounded-2xl transition-all active:scale-95 shadow-md select-none">-</button>
                <button onclick="window.adjustIrlRound(1)" class="bg-[#2C2C2E] hover:bg-[#1a1a1c] text-white font-black text-4xl py-4 rounded-2xl transition-all active:scale-95 shadow-md select-none">+</button>
              </div>`;
            }
        }
    }
};

window.resetIrlRound = () => {
    const prevRound = state.irlRound;
    state.irlRound = 0;

    const irlValEl = document.getElementById('irl-display-val');
    const btnWrapper = document.getElementById('irl-buttons-wrapper');

    if (irlValEl) {
        irlValEl.textContent = "CHOOSE YOUR KEYSTONES";
        irlValEl.className = "text-xl sm:text-2xl md:text-3xl font-black tracking-normal text-[#2C2C2E] select-none block px-4";
    }
    if (btnWrapper && prevRound !== 0) {
        btnWrapper.innerHTML = `
          <div class="w-full mb-6">
            <button onclick="window.adjustIrlRound(1)" class="w-full bg-[#2C2C2E] hover:bg-[#1a1a1c] text-white font-black text-2xl py-4 rounded-2xl transition-all active:scale-95 shadow-md select-none uppercase tracking-wider">Start</button>
          </div>`;
    }
};

window.toggleIrlTurnOrderModal = () => {
    state.showIrlTurnOrderModal = !state.showIrlTurnOrderModal;
    if (state.showIrlTurnOrderModal) renderIrlTurnOrderModalSkeleton();
    else {
        const container = document.getElementById('irl-turn-order-container');
        if (container) container.innerHTML = '';
        render();
    }
};

window.eliminateIrlColor = (colorId) => {
    if (state.irlEliminatedColor) return;
    state.irlTurnOrder = state.irlTurnOrder.filter(id => id !== colorId);
    state.irlEliminatedColor = colorId;
    updateIrlTurnOrderList();
};

window.restoreIrlColor = (colorId) => {
    if (state.irlEliminatedColor !== colorId) return;
    state.irlTurnOrder.push(colorId);
    state.irlEliminatedColor = null;
    updateIrlTurnOrderList();
};

window.swapIrlColors = (from, to) => {
    if (from >= 0 && from < state.irlTurnOrder.length && to >= 0 && to < state.irlTurnOrder.length) {
        const temp = state.irlTurnOrder[from];
        state.irlTurnOrder[from] = state.irlTurnOrder[to];
        state.irlTurnOrder[to] = temp;
        updateIrlTurnOrderList();
    }
};

window.handleIrlDragStart = (e, id) => { draggedColorId = id; e.dataTransfer.effectAllowed = 'move'; };
window.handleIrlDragOver = (e, id) => { e.preventDefault(); };
window.handleIrlDrop = (e, id) => {
    e.preventDefault();
    if (draggedColorId && draggedColorId !== id) {
        const fromIndex = state.irlTurnOrder.indexOf(draggedColorId);
        const toIndex = state.irlTurnOrder.indexOf(id);
        if (fromIndex !== -1 && toIndex !== -1) {
            state.irlTurnOrder.splice(fromIndex, 1);
            state.irlTurnOrder.splice(toIndex, 0, draggedColorId);
            updateIrlTurnOrderList();
        }
    }
    draggedColorId = null;
};

window.handleIrlTouchStart = (e, id) => { draggedColorId = id; touchActiveY = e.touches[0].clientY; touchActiveEl = e.currentTarget; };
window.handleIrlTouchMove = (e, id) => {
    e.preventDefault();
    if (!draggedColorId) return;
    const currentY = e.touches[0].clientY;
    const diffY = currentY - touchActiveY;
    touchActiveEl.style.transform = `translateY(${diffY}px)`;
    touchActiveEl.style.zIndex = '50';

    const elements = document.querySelectorAll('[data-color-id]');
    elements.forEach(el => {
        if (el === touchActiveEl) return;
        const rect = el.getBoundingClientRect();
        if (currentY > rect.top && currentY < rect.bottom) {
            const targetId = el.getAttribute('data-color-id');
            const fromIndex = state.irlTurnOrder.indexOf(draggedColorId);
            const toIndex = state.irlTurnOrder.indexOf(targetId);
            if (fromIndex !== -1 && toIndex !== -1) {
                state.irlTurnOrder.splice(fromIndex, 1);
                state.irlTurnOrder.splice(toIndex, 0, draggedColorId);
                touchActiveY = currentY;
                touchActiveEl.style.transform = 'none';
                updateIrlTurnOrderList();
            }
        }
    });
};

window.handleIrlTouchEnd = (e) => {
    if (touchActiveEl) { touchActiveEl.style.transform = 'none'; touchActiveEl.style.zIndex = 'auto'; }
    draggedColorId = null; touchActiveEl = null;
};

function getValidMoves() {
    const valid = new Set();
    if (state.gamePhase !== 'playing' || isGameOverCheck()) return valid;
    const cp = getCurrentPlayer();

    if (state.isOnlineGame && cp !== state.localPlayerId) return valid;

    const kVals = Object.values(state.keystones);
    for (let i = 0; i < TOTAL_TILES; i++) {
        if (state.board[i] === cp) continue;
        if (state.cooldowns[i] >= state.turn) continue;
        if (kVals.includes(i)) continue;
        valid.add(i);
    }
    return valid;
}

function getWinningTiles(layoutInfo, stats) {
    const tiles = new Set();
    if (!isGameOverCheck()) return tiles;

    let winners = [];
    if (state.instantWinner) winners = [state.instantWinner];
    else {
        const l1 = stats[PLAYER_1]?.largest || 0;
        const l2 = stats[PLAYER_2]?.largest || 0;
        const l3 = state.playerCount === 3 ? (stats[PLAYER_3]?.largest || 0) : -1;
        const maxLargest = Math.max(l1, l2, l3);
        if (l1 === maxLargest) winners.push(PLAYER_1);
        if (l2 === maxLargest) winners.push(PLAYER_2);
        if (l3 === maxLargest && state.playerCount === 3) winners.push(PLAYER_3);
    }

    if (winners.length === 1) {
        const wId = winners[0];
        const kIdx = state.keystones[wId];
        if (kIdx !== undefined && kIdx !== null) {
            tiles.add(kIdx);
            getKeystoneConnectedStones(state.board, wId, kIdx, layoutInfo).forEach(t => tiles.add(t));
        }
    }
    return tiles;
}

function getWinningBorders(layoutInfo, winningTiles) {
    const borderMap = {};
    if (winningTiles.size === 0) return borderMap;

    for (let i = 0; i < TOTAL_TILES; i++) {
        if (!winningTiles.has(i)) continue;
        const coord = layoutInfo.indexToCoord[i];
        if (!coord) continue;
        const { r, c } = coord;

        const topIdx = r > 0 ? layoutInfo.matrix[r - 1][c] : null;
        const bottomIdx = r < layoutInfo.rows - 1 ? layoutInfo.matrix[r + 1][c] : null;
        const leftIdx = c > 0 ? layoutInfo.matrix[r][c - 1] : null;
        const rightIdx = c < layoutInfo.cols - 1 ? layoutInfo.matrix[r][c + 1] : null;

        borderMap[i] = {
            top: topIdx === null || !winningTiles.has(topIdx),
            bottom: bottomIdx === null || !winningTiles.has(bottomIdx),
            left: leftIdx === null || !winningTiles.has(leftIdx),
            right: rightIdx === null || !winningTiles.has(rightIdx)
        };
    }
    return borderMap;
}

window.startGame = () => {
    state.isOnlineGame = false;
    const pool = state.playerCount === 3 ? [PLAYER_1, PLAYER_2, PLAYER_3] : [PLAYER_1, PLAYER_2];
    state.turnOrder = shuffleArray(pool);
    state.board = generateInitialBoard(getLayoutInfo());
    state.keystones = {};
    state.keystonePickerIndex = 0;
    state.instantWinner = null;
    state.turn = 1;
    state.cooldowns = {};
    state.skippedTurnMsg = "";
    state.gamePhase = 'keystone-select';
    render();
    triggerAiTurn();
};

function processTurnAdvance() {
    const layout = getLayoutInfo();
    const stats = getPlayerStats(layout);
    let won = false;
    let winningId = null;

    if (state.gamePhase === 'playing' && !isGameOverCheck()) {
        for (let p = 1; p <= state.playerCount; p++) {
            if (stats[p]?.isFullyConnected && stats[p]?.total > 1) {
                winningId = p;
                won = true;
                break;
            }
        }
    }

    if (state.isOnlineGame) {
        const updates = {
            board: state.board,
            cooldowns: state.cooldowns,
            turn: state.turn
        };
        if (won) {
            updates.instantWinner = winningId;
            updates.gamePhase = 'game-over';
        } else if (state.turn > state.playerCount * state.maxRounds) {
            updates.gamePhase = 'game-over';
        }
        roomRef.update(updates);
        return;
    }

    if (won || isGameOverCheck()) {
        if (won && state.gamePhase !== 'game-over') {
            state.instantWinner = winningId;
            state.gamePhase = 'game-over';
        } else if (state.turn > state.playerCount * state.maxRounds) {
            state.gamePhase = 'game-over';
        }
        render();
        return;
    }

    if (getValidMoves().size === 0) {
        state.skippedTurnMsg = `${state.playerNames[getCurrentPlayer()]} has no valid moves. Turn skipped!`;
        render();
        setTimeout(() => {
            state.turn++;
            state.skippedTurnMsg = "";
            processTurnAdvance();
        }, 2000);
        return;
    }

    render();
    triggerAiTurn();
}

window.handleTileClick = (idx) => {
    const layout = getLayoutInfo();

    if (state.gamePhase === 'keystone-select') {
        const picker = getCurrentKeystonePicker();

        if (state.isOnlineGame && picker !== state.localPlayerId) return;

        const isPickerAi = (!state.isOnlineGame && state.isAiMode && (picker === PLAYER_2 || picker === PLAYER_3));
        if (isPickerAi || state.board[idx] !== picker || !isEdgeTileDynamic(idx, layout)) return;

        state.keystones[picker] = idx;

        if (state.isOnlineGame) {
            const updates = { keystones: state.keystones };
            if (state.keystonePickerIndex < state.playerCount - 1) {
                updates.keystonePickerIndex = state.keystonePickerIndex + 1;
            } else {
                updates.gamePhase = 'playing';
            }
            roomRef.update(updates);
        } else {
            if (state.keystonePickerIndex < state.playerCount - 1) state.keystonePickerIndex++;
            else state.gamePhase = 'playing';
            render();
            triggerAiTurn();
        }
        return;
    }

    if (state.gamePhase === 'playing' && !isGameOverCheck() && !state.skippedTurnMsg) {
        const cp = getCurrentPlayer();
        if (state.isOnlineGame && cp !== state.localPlayerId) return;

        const isAiTurn = (!state.isOnlineGame && state.isAiMode && (cp === PLAYER_2 || cp === PLAYER_3));
        if (isAiTurn || !getValidMoves().has(idx)) return;

        state.board[idx] = cp;
        state.cooldowns[idx] = state.turn + state.playerCount;
        state.turn++;
        processTurnAdvance();
    }
};

function triggerAiTurn() {
    if (state.isOnlineGame) return;
    clearTimeout(aiTimer);
    const layout = getLayoutInfo();
    const aiPlayers = getAiPlayers();

    if (state.gamePhase === 'keystone-select') {
        const picker = getCurrentKeystonePicker();
        if (aiPlayers.has(picker)) {
            aiTimer = setTimeout(() => {
                const edges = [];
                state.board.forEach((color, i) => { if (color === picker && isEdgeTileDynamic(i, layout)) edges.push(i); });
                if (edges.length > 0) {
                    state.keystones[picker] = edges[Math.floor(Math.random() * edges.length)];
                    if (state.keystonePickerIndex < state.playerCount - 1) state.keystonePickerIndex++;
                    else state.gamePhase = 'playing';
                    render();
                    triggerAiTurn();
                }
            }, 1000);
        }
        return;
    }

    if (state.gamePhase === 'playing' && !isGameOverCheck() && !state.skippedTurnMsg) {
        const cp = getCurrentPlayer();
        if (aiPlayers.has(cp)) {
            aiTimer = setTimeout(() => {
                const moves = Array.from(getValidMoves());
                if (moves.length === 0) return;

                const diff = state.botDifficulties[cp] || 'medium';
                let chosen = null;

                if (diff === 'easy' && Math.random() < 0.65) chosen = moves[Math.floor(Math.random() * moves.length)];
                else if (diff === 'medium' && Math.random() < 0.25) chosen = moves[Math.floor(Math.random() * moves.length)];

                if (!chosen) {
                    let best = moves[0], maxWt = -Infinity;
                    moves.forEach(m => {
                        let wt = 0;
                        const sim = [...state.board];
                        sim[m] = cp;
                        const mk = state.keystones[cp];
                        const oldC = getKeystoneConnectedStones(state.board, cp, mk, layout).length;
                        const newC = getKeystoneConnectedStones(sim, cp, mk, layout).length;
                        wt += (newC - oldC) * 240;

                        [PLAYER_1, PLAYER_2, PLAYER_3].filter(p => p !== cp && p <= state.playerCount).forEach(opp => {
                            const ok = state.keystones[opp];
                            const oOld = getKeystoneConnectedStones(state.board, opp, ok, layout).length;
                            const oNew = getKeystoneConnectedStones(sim, opp, ok, layout).length;
                            if (oOld - oNew > 0) wt += (oOld - oNew) * 60;
                        });

                        Object.entries(state.keystones).forEach(([pStr, kIdx]) => {
                            const pId = parseInt(pStr);
                            if (kIdx !== undefined) {
                                const rd = Math.abs(Math.floor(m / 6) - Math.floor(kIdx / 6));
                                const cd = Math.abs((m % 6) - (kIdx % 6));
                                if (rd + cd <= 1) wt += pId === cp ? 40 : 10;
                            }
                        });

                        if (diff === 'hard') wt += newC * 15;
                        if (wt > maxWt) { maxWt = wt; best = m; }
                    });
                    chosen = best;
                }

                state.board[chosen] = cp;
                state.cooldowns[chosen] = state.turn + state.playerCount;
                state.turn++;
                processTurnAdvance();
            }, 1000);
        }
    }
}
