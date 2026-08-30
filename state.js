let state = {
    playerCount: 2,
    isAiMode: false,
    maxRounds: 10,
    selectedLayoutKey: 'square',
    gamePhase: 'landing',
    previousGamePhase: 'landing',
    playerColors: {
        [PLAYER_1]: COLOR_OPTIONS[0],
        [PLAYER_2]: COLOR_OPTIONS[1],
        [PLAYER_3]: COLOR_OPTIONS[2]
    },
    playerNames: {
        [PLAYER_1]: 'Player 1',
        [PLAYER_2]: 'Player 2',
        [PLAYER_3]: 'Player 3'
    },
    botDifficulties: {
        [PLAYER_2]: 'medium',
        [PLAYER_3]: 'medium'
    },
    board: [],
    turn: 1,
    cooldowns: {},
    skippedTurnMsg: "",
    turnOrder: [PLAYER_1, PLAYER_2],
    keystones: {},
    keystonePickerIndex: 0,
    instantWinner: null,

    // Standalone counter state for physical tracking (0 means "CHOOSE YOUR KEYSTONES")
    irlRound: 0,

    // --- STANDALONE "SET IN STONE" PHYSICAL TIMER UTILITY ---
    surgeTimerSecondsLeft: 30,  // The ticking countdown clock (in actual seconds)
    surgeTimerIsRunning: false, // Tracks if the real-life clock is active right now
    surgeTimerDuration: 30,     // The max time setting they chose (e.g. 30s, 60s)
    surgeTimerIntervalId: null, // Holds the live JavaScript clock loop background task

    // Standalone physical turn order configurations
    irlTurnOrder: ['orange', 'green', 'purple'],
    irlEliminatedColor: null,
    showIrlTurnOrderModal: false,

    // Online Networking Sync Fields
    isOnlineGame: false,
    roomCode: null,
    localPlayerId: null, // Assigned 1, 2, or 3 depending on order joined
    onlineErrorMsg: ""
};

let aiTimer = null;
let draggedColorId = null;
let touchActiveY = null;
let touchActiveEl = null;
let roomRef = null; // Holds active database reference
