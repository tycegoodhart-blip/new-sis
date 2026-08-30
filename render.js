// ==========================================
// 5. RENDER LOOP GENERATORS & SCREEN DISPATCH
// ==========================================
const appEl = document.getElementById('app');

const parseActionArgs = (action) => {
  const [fn, ...rest] = action.split(':');
  const args = rest.length ? rest.join(':').split(',').map((arg) => {
    if (arg === 'true') return true;
    if (arg === 'false') return false;
    if (arg !== '' && !Number.isNaN(Number(arg))) return Number(arg);
    return arg;
  }) : [];
  return { fn, args };
};

const dispatchDataAction = (action, value) => {
  const { fn, args } = parseActionArgs(action || '');
  if (!fn || typeof window[fn] !== 'function') return;
  if (value === undefined) {
    window[fn](...args);
  } else {
    window[fn](...args, value);
  }
};

const delegateDataEvent = (event, datasetName, valueProvider) => {
  const target = event.target.closest(`[data-${datasetName}]`);
  if (!target) return;
  const action = target.dataset[datasetName] || '';
  if (!action) return;
  const value = typeof valueProvider === 'function' ? valueProvider(target, event) : undefined;
  if (value === undefined && datasetName === 'key-action') return;
  dispatchDataAction(action, value);
};

document.addEventListener('click', (e) => delegateDataEvent(e, 'action'));
document.addEventListener('keydown', (e) => delegateDataEvent(e, 'key-action', (target, event) => {
  const expected = target.dataset.keycode || 'Enter';
  if (event.key !== expected) return undefined;
  return target.value;
}));
document.addEventListener('input', (e) => delegateDataEvent(e, 'input-action', (target) => target.value));
document.addEventListener('change', (e) => delegateDataEvent(e, 'change-action', (target) => target.value));

window.setLayoutKeyAndUpdate = (key) => {
  window.setLayoutKey(key);
  if (typeof window.updateOnlineLobbySettings === 'function') window.updateOnlineLobbySettings();
};
window.setPlayerCountAndUpdate = (count) => {
  window.setPlayerCount(Number(count));
  if (typeof window.updateOnlineLobbySettings === 'function') window.updateOnlineLobbySettings();
};
window.updateRoundsStateAndUpdate = (value) => {
  window.updateRoundsState(value);
  if (typeof window.updateOnlineLobbySettings === 'function') window.updateOnlineLobbySettings();
};
window.handleSurgeTimerInput = (value) => {
  if (state.surgeTimerIsRunning) {
    clearInterval(state.surgeTimerIntervalId);
    state.surgeTimerIntervalId = null;
    state.surgeTimerIsRunning = false;
  }
  state.surgeTimerSecondsLeft = parseInt(value);
  const liveClock = document.getElementById('live-clock');
  if (liveClock) {
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    liveClock.innerText = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }
  const btn = document.getElementById('start-pause-btn');
  if (btn) {
    btn.innerText = 'Start';
    btn.className = btn.className.replace('bg-[#b597f0]', 'bg-[#8dd586]');
  }
};
window.handleSurgeTimerChange = (value) => {
  if (state.surgeTimerIsRunning) {
    clearInterval(state.surgeTimerIntervalId);
    state.surgeTimerIntervalId = null;
    state.surgeTimerIsRunning = false;
  }
};
window.resetSurgeTimerLayout = () => {
  clearInterval(state.surgeTimerIntervalId);
  state.surgeTimerIntervalId = null;
  state.surgeTimerIsRunning = false;
  const sliderEl = document.querySelector('input[type=range]');
  if (sliderEl) {
    state.surgeTimerSecondsLeft = parseInt(sliderEl.value);
  } else {
    state.surgeTimerSecondsLeft = 60;
  }
  const liveClock = document.getElementById('live-clock');
  if (liveClock) {
    liveClock.classList.remove('critical-shake');
    const clockContainer = liveClock.parentElement;
    if (clockContainer) {
      clockContainer.classList.remove('critical-pulse');
      clockContainer.style.borderColor = '';
    }
    const minutes = Math.floor(state.surgeTimerSecondsLeft / 60);
    const seconds = state.surgeTimerSecondsLeft % 60;
    liveClock.innerText = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }
  const startPauseBtn = document.getElementById('start-pause-btn');
  const btnContainer = startPauseBtn?.parentElement;
  if (startPauseBtn) {
    startPauseBtn.innerText = 'Start';
    startPauseBtn.className = startPauseBtn.className.replace('bg-[#b597f0]', 'bg-[#8dd586]');
    startPauseBtn.style.display = 'block';
  }
  if (btnContainer) {
    btnContainer.style.display = '';
    btnContainer.classList.remove('flex');
    btnContainer.classList.add('grid', 'grid-cols-2');
  }
};
window.topGameBarAction = () => {
  if (!state.isOnlineGame) {
    return window.resetToSetup();
  }
  if (state.localPlayerId === 1 || state.localPlayerId === 'PLAYER_1' || state.localPlayerId === PLAYER_1) {
    return window.resetOnlineLobbyState();
  }
  return window.resetToSetup();
};

function render() {
  appEl.innerHTML = '';

  const header = document.getElementById('game-header-area');
  const floatBtnsContainer = document.getElementById('floating-buttons-container');
  const floatBtn = document.getElementById('floating-action-btn');
  const floatBtnIcon = document.getElementById('floating-btn-icon');
  const floatBtnLabel = document.getElementById('floating-btn-label');
  const surgeBtn = document.getElementById('surge-action-btn');
  const surgeBtnIcon = document.getElementById('surge-btn-icon');
  const surgeBtnLabel = document.getElementById('surge-btn-label');

  // Centralized Floating Buttons Management
  if (floatBtnsContainer) {
    if (state.gamePhase === 'landing') {
      floatBtnsContainer.style.display = 'flex';
      if (floatBtn) {
        floatBtn.style.display = 'flex';
        floatBtnIcon.innerHTML = `<svg class="w-8 h-8 sm:w-12 sm:h-12 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`;
        floatBtnLabel.innerHTML = 'Round<br/>Counter';
      }
      if (surgeBtn) {
        surgeBtn.style.display = 'flex';
        surgeBtnIcon.innerHTML = `<svg class="w-8 h-8 sm:w-12 sm:h-12 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>`;
        surgeBtnLabel.innerHTML = 'Surge';
        
        surgeBtn.onclick = () => window.renderSurgeTimerUI();
      }
    } else if (state.gamePhase === 'irl-counter') {
      // --- ROUND COUNTER VIEW ---
      floatBtnsContainer.style.display = 'flex';
      
      // Hide the surge button completely on this screen
      if (surgeBtn) surgeBtn.style.display = 'none';
      
      // Show the main action button and morph it into the Menu button
      if (floatBtn) {
        floatBtn.style.display = 'flex';
        floatBtnIcon.innerHTML = '<svg class="w-8 h-8 sm:w-12 sm:h-12 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>';
      }
      if (floatBtnLabel) floatBtnLabel.innerHTML = 'Menu';

    } else if (state.gamePhase === 'surge-view') {
      // --- SURGE TIMER VIEW ---
      floatBtnsContainer.style.display = 'flex';
      
      // Hide the main round counter action button completely on this screen
      if (floatBtn) floatBtn.style.display = 'none';
      
      // Show the surge action button and morph it into the Menu button
      if (surgeBtn) {
        // Change the real button to dark gray and add the mid-gray border directly
        surgeBtn.style.backgroundColor = '#2C2C2E';
        surgeBtn.style.borderColor = '#48484A';
        
        surgeBtn.style.display = 'flex';
        if (surgeBtnIcon) {
          // FORCE WHITE ON THE SVG: Explicitly sets the lines drawing the house to white
          surgeBtnIcon.innerHTML = '<svg class="w-8 h-8 sm:w-12 sm:h-12 mb-1.5" fill="none" viewBox="0 0 24 24" stroke="#EDE2D3" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>';
        }
        
        surgeBtn.onclick = () => {
          // RESET BUTTON STYLE: Clear these style values so it drops back to its original tan layout
          surgeBtn.style.backgroundColor = '';
          surgeBtn.style.borderColor = '';
          
          // RESET LABEL COLOR: Clean up the white text style so it goes back to its original color!
          if (surgeBtnLabel) {
            surgeBtnLabel.style.color = '';
          }
          
          if (state.surgeTimerIsRunning) {
            clearInterval(state.surgeTimerIntervalId);
            state.surgeTimerIntervalId = null;
            state.surgeTimerIsRunning = false;
          }
          window.toggleSurgeMode();
        };
      }
      
      if (surgeBtnLabel) {
        surgeBtnLabel.innerHTML = 'Menu';
        surgeBtnLabel.style.color = '#EDE2D3'; // Forces the text label to turn white on the surge screen
      }
    } else {
      // --- SAFE FALLBACK ZONE ---
      // Forcefully hide the floating panel completely if we are playing online or locally!
      floatBtnsContainer.style.display = 'none';
    }
  }

  // SURGE VIEW: Clean header and standalone companion countdown timer layout
  if (state.gamePhase === 'surge-view') {
    document.body.className = "min-h-screen bg-[#ede2d3] flex flex-col items-center py-8 px-4 font-sans text-gray-100 transition-colors duration-500 overflow-y-auto relative surge-menu";
    if (header) header.style.display = 'none';

    // 1. Clean Single Header: Just one set of words right next to the neon Surge logo
    const combinedHeader = document.createElement('div');
    combinedHeader.className = "w-full max-w-6xl mt-24 sm:mt-16 mb-4 flex flex-row flex-wrap items-center justify-center gap-x-8 sm:gap-x-12 gap-y-6 z-10 pointer-events-none animate-fade-in px-4";
    combinedHeader.innerHTML = `
          <h1 class="text-4xl md:text-5xl font-black tracking-widest drop-shadow-sm uppercase whitespace-nowrap">
            <span class="text-[#f8b572]">Set</span>
            <span class="text-[#8dd586]">in</span>
            <span class="text-[#b597f0]">Stone</span>
          </h1>

          <div class="relative inline-flex flex-col items-stretch transform scale-75 sm:scale-100 origin-center">
            <div class="w-full h-3 sm:h-4 bg-[#f8b572] rounded-full mb-2 sm:mb-4" style="transform: skewX(-20deg); box-shadow: 0 0 8px #f8b572, 0 0 16px #f8b572, inset 0 0 4px white;"></div>
            
            <h2 class="text-4xl sm:text-6xl font-black tracking-widest text-[#8dd586] uppercase leading-none" style="transform: skewX(-20deg); text-shadow: 0 0 12px #8dd586, 0 0 24px #8dd586, 0 0 4px white;">
              SURGE
            </h2>
            
            <div class="w-full h-3 sm:h-4 bg-[#b597f0] rounded-full mt-2 sm:mt-4" style="transform: skewX(-20deg); box-shadow: 0 0 8px #b597f0, 0 0 16px #b597f0, inset 0 0 4px white;"></div>
          </div>
        `;
    appEl.appendChild(combinedHeader);

   // 2. The Companion Timer Display (No white card background!)
const timerContainer = document.createElement('div');
timerContainer.className = "w-full max-w-md text-center font-sans mt-20 text-[#ede2d3] z-10 select-none surge-menu";

// FORCE DEFAULT TO 1 MINUTE ONLY ON THE FIRST LOAD
   if (!window.hasForcedSurgeDefault) {
     if (state.surgeTimerSecondsLeft === 30) {
       state.surgeTimerSecondsLeft = 60;
     }
     window.hasForcedSurgeDefault = true; // Mark it as done so it stays out of your way!
   }

// Big Clock Display Math
const timeString = window.formatSurgeTime(state.surgeTimerSecondsLeft);

// Trigger our premium warning style when time dips to 10 seconds or lower
const isCritical = state.surgeTimerSecondsLeft <= 10 && state.surgeTimerSecondsLeft > 0;

// Inject custom shaking & pulse keyframes safely right onto the layout stage
const criticalStyles = `
  <style>
    @keyframes lowTimePulse {
      0% { box-shadow: 0 0 0 0 rgba(248, 181, 114, 0.7); }
      70% { box-shadow: 0 0 0 15px rgba(248, 181, 114, 0); }
      100% { box-shadow: 0 0 0 0 rgba(248, 181, 114, 0); }
    }
    @keyframes textScaleShake {
      0% { transform: scale(1); }
      10% { transform: scale(1.15) rotate(-2deg); }
      20% { transform: scale(1.15) rotate(2deg); }
      30% { transform: scale(1); transform: rotate(0deg); }
      100% { transform: scale(1); }
    }
    .critical-pulse {
      animation: lowTimePulse 1s infinite ease-in-out !important;
      border-color: #f8b572 !important;
    }
    .critical-shake {
      animation: textScaleShake 1s infinite ease-in-out !important;
      color: #f8b572 !important;
    }
  </style>
`;

    
    // Decide what button text/style to show depending on if it's running (Using exact theme Hex codes)
    // Dynamic button text: Pause if running, Resume if it ticked down, Start if fresh
  let startPauseText = 'Start';
  if (state.surgeTimerIsRunning) {
    startPauseText = 'Pause';
  } else {
    // Check if the timer has ticked down below its starting value or slider choice
    const sliderEl = document.querySelector('input[type=range]');
    if (sliderEl && state.surgeTimerSecondsLeft < parseInt(sliderEl.value)) {
      startPauseText = 'Resume';
    } else if (!sliderEl && state.surgeTimerSecondsLeft < 60) {
      // Backup safety check if slider element isn't built yet
      startPauseText = 'Resume';
    } else {
      startPauseText = 'Start';
    }
  }
    const startPauseBg = state.surgeTimerIsRunning ? 'bg-[#b597f0] hover:opacity-90' : 'bg-[#8dd586] hover:opacity-90';

    // The Reset button is now first (left side), and Start/Pause button is second (right side)
    timerContainer.innerHTML = `
${criticalStyles}
<div class="w-full max-w-sm mx-auto bg-[#2C2C2E] py-8 px-6 rounded-3xl shadow-xl border-4 transition-all duration-300 text-center mb-6 ${isCritical ? 'critical-pulse' : 'border-[#1a1a1c]'}" > 
  <div id="live-clock" class="text-7xl sm:text-8xl timer-font font-black tracking-tight font-mono drop-shadow-sm select-none transition-all duration-300 ${isCritical ? 'critical-shake' : 'text-[#ede2d3]'}" > 
    ${timeString} 
  </div> 
</div>

     <div class="grid grid-cols-2 gap-4 mt-24">
        
        <button data-action="resetSurgeTimerLayout" class="bg-[#f8b572] hover:opacity-90 text-[#2C2C2E] py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-md border-none cursor-pointer">
              Reset
            </button>

        <button id="start-pause-btn" data-action="toggleSurgeTimer" class="${startPauseBg} text-[#2C2C2E] py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 shadow-md border-none cursor-pointer">
          ${startPauseText}
        </button>
      </div>

      <div class="w-full max-w-md mx-auto px-4 mt-8 mb-4">
        <input 
          type="range" 
          min="15" 
          max="180" 
          step="15" 
          value="${state.surgeTimerSecondsLeft}" 
          class="w-full h-2 rounded-lg appearance-none cursor-pointer bg-[#8dd586] [&::-webkit-slider-runnable-track]:bg-transparent [&::-moz-range-track]:bg-transparent"
          data-input-action="handleSurgeTimerInput"
          data-change-action="handleSurgeTimerChange"
        />
        <div class="relative w-full text-[10px] font-black text-[#797570] mt-2 h-6 tracking-normal">
          <span class="absolute text-left" style="left: 0%; transform: none;">15s</span>
          <span class="absolute text-center" style="left: 11.00%; transform: translateX(-50%);">30s</span>
          <span class="absolute text-center" style="left: 19.50%; transform: translateX(-50%);">45s</span>
          <span class="absolute text-center" style="left: 28.28%; transform: translateX(-50%);">1m</span>
          <span class="absolute text-center" style="left: 45.45%; transform: translateX(-50%);">1:30</span>
          <span class="absolute text-center" style="left: 63.00%; transform: translateX(-50%);">2m</span>
          <span class="absolute text-center" style="left: 80.50%; transform: translateX(-50%);">2:30</span>
          <span class="absolute text-right" style="left: 100%; transform: translateX(-100%);">3m</span>
        </div>
      </div>
    `;
    appEl.appendChild(timerContainer);

    // Neutralized background: It is now just safe empty space that does nothing when clicked!
    const backDetector = document.createElement('div');
    backDetector.className = "absolute inset-0 z-0"; // Removed 'cursor-pointer'
    // backDetector.onclick = () => { ... }; // Removed click trigger entirely
    appEl.appendChild(backDetector);
    return;
  }

  // Restore header and floating buttons visibility for all standard phases
  if (header) header.style.display = 'flex';

  // Dynamic Body Background color toggle based on active UI phase AND game status
  if (state.gamePhase === 'online-menu' || state.gamePhase === 'online-lobby' || state.isOnlineGame) {
    document.body.className = "min-h-screen bg-[#ede2d3] flex flex-col items-center py-8 px-4 font-sans text-gray-100 transition-colors duration-500 overflow-y-auto relative online-menu";
  } else if (state.gamePhase === 'setup') {
    document.body.className = "min-h-screen bg-[#2C2C2E] flex flex-col items-center py-8 px-4 font-sans text-gray-100 transition-colors duration-500 overflow-y-auto relative play-local-menu";
  } else {
    document.body.className = "min-h-screen bg-[#2C2C2E] flex flex-col items-center py-8 px-4 font-sans text-gray-100 transition-colors duration-500 overflow-y-auto relative";
  }

  if (state.gamePhase === 'landing') renderLanding();
  else if (state.gamePhase === 'online-menu') renderOnlineMenu();
  else if (state.gamePhase === 'online-lobby') renderOnlineLobby();
  else if (state.gamePhase === 'setup') renderSetup();
  else if (state.gamePhase === 'color-select') renderColorSelect();
  else if (state.gamePhase === 'irl-counter') renderIrlCounter();
  else renderGame();
}

// New Landing screen with Play Online & Play Locally cards
function renderLanding() {
  const container = document.createElement('div');
  container.className = "w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 animate-fade-in text-[#2C2C2E]";

  container.innerHTML = `
        <!-- Play Online Card -->
        <button data-action="setPhase:online-menu" class="group flex flex-col items-center justify-center p-8 bg-[#ede2d3] hover:bg-[#dfc3a3] border-4 border-[#dfc3a3] rounded-3xl shadow-2xl transition-all transform active:scale-95 text-center select-none min-h-[220px]">
          <div class="text-[#2C2C2E] mb-4 transition-transform group-hover:scale-110">
            <!-- Computer SVG Icon -->
            <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <span class="text-xl font-black uppercase tracking-wider">Play Online</span>
          <span class="text-xs text-[#2C2C2E]/60 mt-2 font-medium">Play with friends in an online room</span>
        </button>

        <!-- Play Locally Card (Starts game setup flow) -->
        <button data-action="setPhase:setup" class="group flex flex-col items-center justify-center p-8 bg-[#ede2d3] hover:bg-[#dfc3a3] border-4 border-[#dfc3a3] rounded-3xl shadow-2xl transition-all transform active:scale-95 text-center select-none min-h-[220px]">
          <div class="text-[#2C2C2E] mb-4 transition-transform group-hover:scale-110">
            <svg class="w-16 h-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 116 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <span class="text-xl font-black uppercase tracking-wider">Play Locally</span>
          <span class="text-xs text-[#2C2C2E]/60 mt-2 font-medium">Pass and play or play with AI</span>
        </button>
      `;
  container.style.marginTop = "2rem";
  appEl.appendChild(container);
}

// Reverted screen: A single big dark gray box with Host inputs on the Left and Join inputs on the Right.
function renderOnlineMenu() {
  // Big bold Back button positioned at the absolute top left of the entire viewport
  const backBtn = document.createElement('button');
  backBtn.onclick = () => {
    state.onlineErrorMsg = null;
    window.setPhase('landing');
  };
  backBtn.className = "absolute top-6 left-6 sm:top-8 sm:left-8 z-40 bg-[#2C2C2E] hover:bg-[#1a1a1c] text-[#ede2d3] font-black text-sm sm:text-base uppercase tracking-widest px-6 py-3.5 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center gap-2 select-none";
  backBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      `;
  appEl.appendChild(backBtn);

  const container = document.createElement('div');
  container.className = "w-full max-w-4xl bg-[#2C2C2E] text-[#ede2d3] p-6 sm:p-10 rounded-3xl shadow-2xl border-4 border-[#1a1a1c] grid grid-cols-1 md:grid-cols-2 gap-10 mt-12 sm:mt-6 animate-fade-in";

  container.innerHTML = `
        <!-- Left Column: Host Game Module -->
        <div class="flex flex-col justify-between space-y-6 pb-6 md:pb-0 md:border-r border-[#ede2d3]/20 md:pr-10">
          <div class="flex flex-col items-center text-center">
            <!-- SVG Icon: Person and Computer (Perfect match with Join/People style) -->
            <svg class="w-14 h-14 text-[#ede2d3] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="7" cy="9" r="3.5" />
              <path d="M2 18a5 5 0 0110 0v1H2v-1z" />
              <rect x="13" y="6" width="9" height="7" rx="1" />
              <path d="M17.5 13v3" />
              <path d="M15 16h5" />
            </svg>
            <h2 class="text-2xl font-black uppercase tracking-wider">Host Online Game</h2>
            <p class="text-xs text-[#ede2d3]/60 mt-1">Set up a room and play with friends</p>
          </div>
          <div class="space-y-3 text-left">
            <label class="block text-xs font-black uppercase tracking-widest text-[#ede2d3]/70">Your Name</label>
            <!-- Removed placeholder text and added onkeydown Enter key listener -->
            <input type="text" id="online-host-name-input" maxlength="14" data-key-action="hostOnlineGame" data-keycode="Enter" class="player-name w-full bg-white/10 border border-[#ede2d3]/30 rounded-xl px-4 py-3 font-bold text-[#ede2d3] text-sm focus:outline-none focus:ring-2 focus:ring-[#f8b572]" />
          </div>
          <button data-action="hostOnlineGame" class="w-full bg-[#f8b572] hover:bg-[#e09a58] text-[#2C2C2E] py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-md active:scale-95">
            Host Game
          </button>
        </div>

        <!-- Right Column: Join Game Module -->
        <div class="flex flex-col justify-between space-y-6">
          <div class="flex flex-col items-center text-center">
            <!-- SVG Icon: Person and Rounded Plus Sign -->
            <svg class="w-14 h-14 text-[#ede2d3] mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="10" cy="9" r="4" />
              <path d="M4 19a6 6 0 0112 0v1H4v-1z" />
              <path d="M19 8v6" />
              <path d="M16 11h6" />
            </svg>
            <h2 class="text-2xl font-black uppercase tracking-wider">Join Online Game</h2>
            <p class="text-xs text-[#ede2d3]/60 mt-1">Enter a code shared by your friend</p>
          </div>
          <div class="space-y-4 text-left">
            <div>
              <label class="block text-xs font-black uppercase tracking-widest text-[#ede2d3]/70 mb-1.5">Room Code</label>
              <!-- Removed placeholder text and added onkeydown Enter key listener -->
              <input type="text" id="online-join-code-input" placeholder="" maxlength="25" data-key-action="joinOnlineGame" data-keycode="Enter" class="room-code w-full bg-white/10 border border-[#ede2d3]/30 rounded-xl px-4 py-3 font-black text-[#ede2d3] text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#8dd586]" />
            </div>
            <div>
              <label class="block text-xs font-black uppercase tracking-widest text-[#ede2d3]/70 mb-1.5">Your Name</label>
              <!-- Removed placeholder text and added onkeydown Enter key listener -->
              <input type="text" id="online-join-name-input" placeholder="" maxlength="14" data-key-action="joinOnlineGame" data-keycode="Enter" class="player-name w-full bg-white/10 border border-[#ede2d3]/30 rounded-xl px-4 py-3 font-bold text-[#ede2d3] text-sm focus:outline-none focus:ring-2 focus:ring-[#8dd586]" />
            </div>
          </div>
          <button data-action="joinOnlineGame" class="w-full bg-[#8dd586] hover:bg-[#6fb069] text-[#2C2C2E] py-4 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-md active:scale-95">
            Join Game
          </button>
        </div>
      `;

  if (state.onlineErrorMsg) {
    const errAlert = document.createElement('div');
    errAlert.className = "col-span-1 md:col-span-2 text-center py-2 px-4 bg-[#7656af]/40 text-[#b597f0] font-bold text-xs rounded-xl border border-purple-500/30 -mt-4";
    errAlert.innerText = state.onlineErrorMsg;
    container.insertBefore(errAlert, container.firstChild);
  }

  appEl.appendChild(container);
}

window.shareOnlineLobby = async function() {
  const roomCode = state.roomCode || 'unknown';
  const shareText = `Join my game of Set in Stone! The room code is ${roomCode}! https://ryan-damm.github.io/Set-in-Stone/`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Set in Stone',
        text: shareText,
      });
      return;
    } catch (err) {
      // User may have cancelled or share is not available; fallback to clipboard
    }
  }

  const copyToClipboard = async text => {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  };

  const copied = await copyToClipboard(shareText);
  if (copied) {
    alert('Share text copied to clipboard!');
  } else {
    const textarea = document.createElement('textarea');
    textarea.value = shareText;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    alert('Share text copied to clipboard!');
  }
};

// Upgraded design matching swapped theme: Entire Host box is now Dark Gray with contrast layout
// REMOVED "animate-fade-in" from the container to prevent visual flash on every setting click
function renderOnlineLobby() {
  const isHost = (state.localPlayerId === PLAYER_1);

  // Grab the host's name cleanly (PLAYER_1 is always the host)
  const hostName = state.playerNames[PLAYER_1] || "Host";
  const displayTitle = hostName.endsWith('s') ? `${hostName}' Room` : `${hostName}'s Room`;

  // Create a separate container for the Title text with a top-right Share button
  const titleHeader = document.createElement('div');
  titleHeader.className = "w-full relative mb-6";
  titleHeader.innerHTML = `
    <button data-action="shareOnlineLobby" class="absolute right-0 top-0 rounded-2xl bg-[#2c2c2e] text-[#ede2d3] px-6 py-4 font-black text-base uppercase tracking-wider hover:bg-[#3a3a3c] transition-all shadow-sm min-w-[110px]">
      Share
    </button>
    <h1 class="mx-auto max-w-[90%] text-center text-3xl sm:text-4xl font-black uppercase tracking-widest text-[#2C2C2E] drop-shadow-sm">${displayTitle}</h1>
  `;
  appEl.appendChild(titleHeader);

  const container = document.createElement('div');
  container.className = "w-full max-w-xl md:max-w-4xl bg-[#2C2C2E] p-6 sm:p-8 rounded-3xl shadow-2xl border-4 border-[#1a1a1c] text-[#ede2d3] grid grid-cols-1 md:grid-cols-2 gap-8";

  // Render layout icon grid inside online dashboard settings panel with swapped light borders & hover states
  let layoutsHtml = '';
  Object.entries(BOARD_LAYOUTS).forEach(([key, config]) => {
    const isSelected = state.selectedLayoutKey === key;
    layoutsHtml += `
          <button data-action="${isHost ? `setLayoutKeyAndUpdate:${key}` : ''}" class="flex items-center gap-2 p-2 rounded-xl text-left border-2 font-bold transition-all w-full ${isHost ? 'cursor-pointer' : 'cursor-default pointer-events-none'} ${isSelected ? 'border-[#ede2d3] bg-[#ede2d3]/20 text-[#ede2d3]' : 'border-[#ede2d3]/10 hover:border-[#ede2d3]/40 text-[#ede2d3]/50'}" >
            <div class="shrink-0">${config.icon}</div>
            <div class="min-w-0 flex-1">
              <div class="font-black text-xs leading-none">${config.name}</div>
            </div>
          </button>
        `;
  });

  // Prepare connected user rosters rows with matching contrasting container panels
  let membersHtml = '';
  const slotsCount = state.playerCount;
  for (let slot = 1; slot <= slotsCount; slot++) {
    const pName = state.playerNames[slot];
    const hexColor = state.playerColors[slot]?.hex || '#d1d5db';
    const isSlotMe = (state.localPlayerId === slot);

    let colorPills = '';
    COLOR_OPTIONS.forEach(opt => {
      const isPillChosen = state.playerColors[slot]?.id === opt.id;
      colorPills += `
            <button 
              data-action="${isSlotMe ? `selectColor:${slot},${opt.id}` : ''}" 
              class="w-6 h-6 rounded-full border border-black/20 ${isSlotMe ? 'cursor-pointer' : 'cursor-default pointer-events-none'} ${isPillChosen ? 'scale-110 ring-2 ring-offset-1 ring-[#ede2d3] opacity-100' : 'opacity-40 hover:opacity-75'}" 
              style="background-color: ${opt.hex}">
            </button>`;
    });

    // Outlined/Text Host color now changes dynamically on everyone's screens with the host color
    membersHtml += `
          <div class="flex items-center justify-between p-3.5 bg-[#1a1a1c]/60 border border-[#dfc3a3]/10 rounded-2xl shadow-sm">
            <div class="flex items-center gap-3">
              <div class="w-8 h-8 rounded-xl shadow-inner shrink-0 relative flex items-center justify-center font-black text-[#2C2C2E] text-xs" style="background-color: ${hexColor}">
                ${slot}
              </div>
              <div>
                <div class="text-sm font-black flex items-center gap-1.5 text-[#ede2d3]">
                  ${pName ? `<span class="player-name">${pName}</span>` : `<span class="text-[#ede2d3]/40 font-medium italic animate-pulse">Waiting...</span>`}
                  ${isSlotMe ? `<span class="text-[8px] bg-[#ede2d3] text-[#2C2C2E] px-1.5 py-0.5 rounded uppercase tracking-wider font-bold">You</span>` : ''}
                  ${slot === 1 ? `<span class="text-[8px] px-1.5 py-0.5 rounded uppercase font-bold" style="border: 1px solid ${hexColor}; color: ${hexColor}">Host</span>` : ''}
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">${colorPills}</div>
          </div>
        `;
  }

  // Check room validation before letting host trigger engine spin up
  let missingPlayers = false;
  for (let s = 1; s <= state.playerCount; s++) {
    if (!state.playerNames[s]) missingPlayers = true;
  }

  container.innerHTML = `
        <!-- Left Dashboard Config Side Panel -->
        <div class="space-y-5 md:border-r border-[#dfc3a3]/10 md:pr-8 text-left">
          <div>
            <!-- LABEL CHANGE: Active Connection Code -> Room Code -->
            <span class="text-[10px] font-black uppercase tracking-widest text-[#ede2d3]/50 block mb-1">Room Code</span>
            <div class="room-code ${(state.roomCode || '').length > 13 ? 'text-xl sm:text-2xl tracking-wide' : (state.roomCode || '').length > 11 ? 'text-2xl sm:text-3xl tracking-wider' : 'text-3xl sm:text-4xl tracking-widest'} font-black text-[#ede2d3] bg-[#1a1a1c] border border-[#dfc3a3]/10 rounded-2xl py-3 px-5 text-center shadow-inner select-all whitespace-nowrap">
              ${state.roomCode}
            </div>
          </div>

          <div class="space-y-1.5">
            <!-- LABEL CHANGE: Player Maximum Size -> Number of Players -->
            <label class="block text-xs font-black uppercase tracking-widest text-[#ede2d3]/60">Number of Players</label>
            <div class="grid grid-cols-2 gap-2">
              <button data-action="${isHost ? 'setPlayerCountAndUpdate:2' : ''}" class="py-2.5 rounded-xl font-black text-xs uppercase border-2 transition-all ${!isHost ? 'pointer-events-none' : ''} ${state.playerCount === 2 ? 'border-[#ede2d3] bg-[#ede2d3] text-[#2C2C2E]' : 'border-[#ede2d3]/20 text-[#ede2d3]/50 bg-transparent'}" >2 Players</button>
              <button data-action="${isHost ? 'setPlayerCountAndUpdate:3' : ''}" class="py-2.5 rounded-xl font-black text-xs uppercase border-2 transition-all ${!isHost ? 'pointer-events-none' : ''} ${state.playerCount === 3 ? 'border-[#ede2d3] bg-[#ede2d3] text-[#2C2C2E]' : 'border-[#ede2d3]/20 text-[#ede2d3]/50 bg-transparent'}" >3 Players</button>
            </div>
          </div>

          <div class="space-y-1.5">
            <!-- LABEL CHANGE & BUG FIX: Session Limit -> Rounds, and corrected {state.maxRounds} to ${state.maxRounds} -->
            <label class="block text-xs font-black uppercase tracking-widest text-[#ede2d3]/60">
              Rounds: <span class="font-white font-black" id="rounds-display-val">${state.maxRounds}</span>
            </label>
            <!-- FIX: Added 'range-tan' class to style scrollbar track/thumb with premium colors -->
            <input type="range" min="5" max="20" step="1" value="${state.maxRounds}" ${!isHost ? 'disabled pointer-events-none' : ''} data-input-action="updateRoundsDOM" data-change-action="updateRoundsStateAndUpdate" class="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none range-tan" />
            <!-- Milestones with custom light-aligned styling for dark background -->
            <div class="relative w-full flex justify-between text-[10px] font-bold text-[#ede2d3]/60 mt-2">
              <span class="absolute left-[2.5%] -translate-x-1/2 flex flex-col items-center"><span class="w-1 h-1 bg-[#2C2C2E]/40 rounded-full mb-0.5"></span><span>5</span></span>
              <span class="absolute left-[34.17%] -translate-x-1/2 flex flex-col items-center"><span class="w-1 h-1 bg-[#2C2C2E]/40 rounded-full mb-0.5"></span><span>10 (Default)</span></span>
              <span class="absolute left-[65.82%] -translate-x-1/2 flex flex-col items-center"><span class="w-1 h-1 bg-[#2C2C2E]/40 rounded-full mb-0.5"></span><span>15</span></span>
              <span class="absolute left-[97.65%] -translate-x-1/2 flex flex-col items-center"><span class="w-1 h-1 bg-[#2C2C2E]/40 rounded-full mb-0.5"></span><span>20</span></span>
            </div>
          </div>

          <div class="space-y-1.5 pt-2">
            <!-- LABEL CHANGE: Board Map Shape -> Board Layout -->
            <label class="block text-xs font-black uppercase tracking-widest text-[#ede2d3]/60">Board Layout</label>
            <div class="grid grid-cols-2 gap-2">${layoutsHtml}</div>
          </div>
        </div>

        <!-- Right Lobby Player Status Panel -->
        <div class="flex flex-col justify-between text-left space-y-6">
          <div class="space-y-3">
            <!-- LABEL CHANGE: Lobby Roster Status -> Players -->
            <span class="text-xs font-black uppercase tracking-widest text-[#ede2d3]/60 block">Players</span>
            <div class="space-y-2.5">${membersHtml}</div>
          </div>

          <div class="space-y-2.5 pt-4">
            ${isHost ? `
              <!-- BUTTON COLOR CHANGE: Swapped to Purple background and text white, text changed to Start Online Game -->
              <button data-action="startOnlineGame" ${missingPlayers ? 'disabled' : ''} class="w-full text-center py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md active:scale-95 ${missingPlayers ? 'bg-[#1a1a1c]/60 border border-[#dfc3a3]/10 rounded-xl text-center text-xs font-black tracking-wider text-[#ede2d3]/40 uppercase' : 'bg-[#f8b572] hover:bg-[#e09a58] text-[#2C2C2E]'}" >
                ${missingPlayers ? 'Waiting for players...' : 'Start Online Game'}
              </button>
            ` : `
              <div class="w-full py-4 bg-[#1a1a1c]/60 border border-[#dfc3a3]/10 rounded-xl text-center text-xs font-black tracking-wider text-[#ede2d3]/40 uppercase">
                Waiting for host to start game...
              </div>
            `}
            <button data-action="resetToSetup" class="w-full border border-[#ede2d3]/20 bg-transparent hover:bg-[#ede2d3]/5 text-[#ede2d3] py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all text-center">
              Disconnect & Exit
            </button>
          </div>
        </div>
      `;

  appEl.appendChild(container);
}

// Skeleton is drawn strictly ONCE upon opening. Removed the absolute ✕ Close button.
function renderIrlTurnOrderModalSkeleton() {
  const container = document.getElementById('irl-turn-order-container');
  if (!container) return;

  container.innerHTML = `
        <div class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" data-action="toggleIrlTurnOrderModal">
          <div class="bg-[#ede2d3] border-2 border-[#dfc3a3] w-full max-w-xs p-6 rounded-3xl shadow-2xl text-center text-[#2C2C2E] relative irl-modal-inner">
            <h2 class="text-xl font-black uppercase tracking-wider mb-5 text-[#2C2C2E]">Turn Order</h2>
            
            <!-- Static Targeted Sub-List Container Wrapper -->
            <div id="irl-turn-order-list-wrapper" class="space-y-2.5"></div>
            
            <!-- Eliminated targeted section -->
            <div id="irl-eliminated-wrapper"></div>
            
            <button data-action="toggleIrlTurnOrderModal" class="w-full bg-[#2C2C2E] hover:bg-[#1a1a1c] text-[#ede2d3] font-black text-xs uppercase tracking-widest py-3 rounded-xl transition-all active:scale-95 shadow-md mt-6 select-none">
              Save Turn Order
            </button>
          </div>
        </div>
      `;
  const innerModal = container.querySelector('.irl-modal-inner');
  if (innerModal) {
    innerModal.addEventListener('click', (event) => event.stopPropagation());
  }
  updateIrlTurnOrderList();
}

// Updates strictly the inner dynamic parts of the turn order modal list with zero layout adjustments or slide animations
function updateIrlTurnOrderList() {
  const listWrapper = document.getElementById('irl-turn-order-list-wrapper');
  const eliminatedWrapper = document.getElementById('irl-eliminated-wrapper');
  if (!listWrapper || !eliminatedWrapper) return;

  const hasEliminated = !!state.irlEliminatedColor;

  // Generate sequence blocks cleanly
  let listItemsHtml = '';
  state.irlTurnOrder.forEach((colorId, index) => {
    // 1. Look for the color in your main configuration array
    let colorOpt = COLOR_OPTIONS.find(c => c.id === colorId || c.name?.toLowerCase() === String(colorId).toLowerCase() || c.key === colorId);
    
    let hex = '#f8b572'; // Default theme orange fallback
    
    if (colorOpt) {
      hex = colorOpt.hex;
    } else {
      // 2. Map raw color strings to your exact premium hex palettes
      const lowerColor = String(colorId).toLowerCase();
      if (lowerColor === 'green')  hex = '#8dd586'; // Your signature theme green
      if (lowerColor === 'purple') hex = '#a78bfa'; // Your signature theme purple
      if (lowerColor === 'orange') hex = '#f8b572'; // Your signature theme orange
      if (lowerColor === 'tan')    hex = '#ede2d3'; // Your signature theme tan
    }

    listItemsHtml += `
          <div 
            draggable="true"
            data-color-id="${colorId}"
            ondragstart="window.handleIrlDragStart(event, '${colorId}')"
            ondragover="window.handleIrlDragOver(event, '${colorId}')"
            ondrop="window.handleIrlDrop(event, '${colorId}')"
            class="flex items-center gap-3 justify-center py-1 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
          >
            <svg class="w-4 h-4 text-[#2C2C2E]/40" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 6a1 1 0 100-2 1 1 0 000 2zM7 11a1 1 0 100-2 1 1 0 000 2zM7 16a1 1 0 100-2 1 1 0 000 2zM13 6a1 1 0 100-2 1 1 0 000 2zM13 11a1 1 0 100-2 1 1 0 000 2zM13 16a1 1 0 100-2 1 1 0 000 2z" />
            </svg>

            <div 
              class="w-14 h-14 rounded-2xl shadow-md shrink-0 relative flex items-center justify-center select-none" 
              style="background-color: ${hex}"
              ontouchstart="window.handleIrlTouchStart(event, '${colorId}')"
              ontouchmove="window.handleIrlTouchMove(event, '${colorId}')"
              ontouchend="window.handleIrlTouchEnd(event)"
            >
              <span class="text-white font-black text-lg filter drop-shadow-[0_1.5px_1.5px_rgba(0,0,0,0.4)]">${index + 1}</span>
            </div>
            
            <div class="flex items-center gap-2">
              <div class="flex flex-col">
                ${index > 0 ? `
                  <button data-action="swapIrlColors:${index},${index - 1}" class="text-[#2C2C2E]/50 hover:text-[#2C2C2E] p-0.5 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M5 15l7-7 7 7" />
                    </svg>
                  </button>
                ` : '<div class="w-4 h-4"></div>'}
                ${index < state.irlTurnOrder.length - 1 ? `
                  <button data-action="swapIrlColors:${index},${index + 1}" class="text-[#2C2C2E]/50 hover:text-[#2C2C2E] p-0.5 transition-colors">
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3.5">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                ` : '<div class="w-4 h-4"></div>'}
              </div>

              ${!hasEliminated ? `
                <button data-action="eliminateIrlColor:${colorId}" class="w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white font-bold flex items-center justify-center transition-all shadow-md text-xs select-none active:scale-95">
                  ✕
                </button>
              ` : ''}
            </div>
          </div>
        `;
  });

  listWrapper.innerHTML = listItemsHtml;

  // Handle eliminated rendering block dynamically without reloading container skeleton
  let eliminatedHtml = '';
  if (state.irlEliminatedColor) {
    const colorId = state.irlEliminatedColor;
    
    // 1. Look for the color in your main configuration array
    const colorOpt = COLOR_OPTIONS.find(c => c.id === colorId || c.name?.toLowerCase() === String(colorId).toLowerCase() || c.key === colorId);
    
    let hex = '#f8b572'; // Default theme orange fallback
    
    if (colorOpt) {
      hex = colorOpt.hex;
    } else {
      // 2. Map raw color strings to your exact premium hex palettes
      const lowerColor = String(colorId).toLowerCase();
      if (lowerColor === 'green')  hex = '#8dd586'; // Your signature theme green
      if (lowerColor === 'purple') hex = '#a78bfa'; // Your signature theme purple
      if (lowerColor === 'orange') hex = '#f8b572'; // Your signature theme orange
      if (lowerColor === 'tan')    hex = '#ede2d3'; // Your signature theme tan
    }

    eliminatedHtml = `
          <div class="mt-6 border-t border-[#dfc3a3]/40 pt-4 flex flex-col items-center">
            <h4 class="text-[10px] font-black uppercase tracking-widest text-[#2C2C2E]/50 mb-3">Eliminated Color</h4>
            <div class="flex items-center gap-3">
              <div class="w-14 h-14 rounded-2xl shadow-md opacity-50 shrink-0 relative flex items-center justify-center select-none" style="background-color: ${hex}"></div>
              
              <button data-action="restoreIrlColor:${colorId}" class="bg-[#2C2C2E] hover:bg-[#1A1A1C] text-[#ede2d3] font-black px-4 py-2 rounded-xl transition-all text-xs tracking-wider uppercase shadow-md select-none active:scale-95 border-none cursor-pointer">
                ADD
              </button>
            </div>
          </div>
        `;
  }

  eliminatedWrapper.innerHTML = eliminatedHtml;
}

// Dynamic, beautiful dedicated Round Counter screen
// REMOVED "animate-fade-in" from the container to prevent visual flash on increment/decrement
function renderIrlCounter() {
  const container = document.createElement('div');
  container.className = "w-full max-w-xl relative flex flex-col items-center justify-center";

  // Render Turn Order indicators stacked vertically (or horizontally on mobile) next to the box - ENLARGED SIZES!
  let turnSquaresHtml = '';
  state.irlTurnOrder.forEach((colorId, index) => {
    // 1. Look for the color in your main configuration array
    const colorOpt = COLOR_OPTIONS.find(c => c.id === colorId || c.name?.toLowerCase() === String(colorId).toLowerCase() || c.key === colorId);
    
    let hex = '#f8b572'; // Default theme orange fallback
    
    if (colorOpt) {
      hex = colorOpt.hex;
    } else {
      // 2. Map raw color strings to your exact premium hex palettes
      const lowerColor = String(colorId).toLowerCase();
      if (lowerColor === 'green')  hex = '#8dd586'; // Your signature theme green
      if (lowerColor === 'purple') hex = '#a78bfa'; // Your signature theme purple
      if (lowerColor === 'orange') hex = '#f8b572'; // Your signature theme orange
      if (lowerColor === 'tan')    hex = '#ede2d3'; // Your signature theme tan
    }

    turnSquaresHtml += `
          <div class="w-24 h-24 sm:w-28 sm:h-28 rounded-3xl shadow-lg flex items-center justify-center relative select-none shrink-0" style="background-color: ${hex}">
            <span class="text-white font-black text-2xl sm:text-3xl filter drop-shadow-[0_2px_2px_rgba(0,0,0,0.4)]">${index + 1}</span>
          </div>
        `;
  });

  const displayVal = state.irlRound === 0 ? "CHOOSE YOUR KEYSTONES" : state.irlRound;
  const fontClass = state.irlRound === 0
    ? "text-xl sm:text-2xl md:text-3xl font-black tracking-normal text-[#2C2C2E] select-none block px-4"
    : "text-8xl sm:text-9xl font-black tracking-tight text-[#2C2C2E] select-none";

  let buttonsHtml = '';
  if (state.irlRound === 0) {
    buttonsHtml = `
          <div class="w-full mb-5">
            <button data-action="adjustIrlRound:1" class="w-full bg-[#2C2C2E] hover:bg-[#1a1a1c] text-[#ede2d3] font-black text-2xl py-4 rounded-2xl transition-all active:scale-95 shadow-md select-none uppercase tracking-wider">Start</button>
          </div>`;
  } else {
    buttonsHtml = `
          <div class="grid grid-cols-2 gap-4 mb-5">
            <button data-action="adjustIrlRound:-1" class="bg-[#2C2C2E] hover:bg-[#1a1a1c] text-[#ede2d3] font-black text-4xl py-4 rounded-2xl transition-all active:scale-95 shadow-md select-none">-</button>
            <button data-action="adjustIrlRound:1" class="bg-[#2C2C2E] hover:bg-[#1a1a1c] text-[#ede2d3] font-black text-4xl py-4 rounded-2xl transition-all active:scale-95 shadow-md select-none">+</button>
          </div>`;
  }

  container.innerHTML = `
        <!-- LEFT SIDE: Vertical Sequence List of Turn Order Squares (Absolute on desktop to keep tan box perfectly centered) -->
        <div class="flex flex-col gap-2 justify-center items-center shrink-0 mb-6 md:mb-0 md:absolute md:right-full md:mr-8 md:top-1/2 md:-translate-y-1/2">
          <div class="text-[10px] sm:text-xs font-black uppercase tracking-wider text-gray-400 select-none">Turn Order</div>
          <!-- Wrapped inside flex container for responsive side-by-side on mobile, stacked on desktop -->
          <div class="flex flex-row md:flex-col gap-3 justify-center items-center">
            ${turnSquaresHtml}
          </div>
          <!-- The relocated "Change" button placed directly under the sequence squares - White, larger size, clear border -->
          <button data-action="toggleIrlTurnOrderModal" class="w-full bg-[#ede2d3] hover:bg-[#dfc3a3] border border-gray-300 text-[#2C2C2E] text-[11px] sm:text-xs font-black uppercase tracking-widest py-2.5 px-4 rounded-xl transition-all active:scale-95 shadow-md mt-1">
            Change
          </button>
        </div>

        <!-- MAIN CENTER: Dedicated Round Counter tan box container (Optimized to max-w-lg for balanced size) -->
        <div class="w-full max-w-lg bg-[#ede2d3] p-8 rounded-3xl shadow-xl border border-[#dfc3a3] text-center text-[#2C2C2E] relative z-10">
          <h2 class="text-2xl font-black uppercase tracking-wider mb-5 text-[#2C2C2E]">Round Counter</h2>
          
          <!-- Giant counter output -->
          <div class="bg-white/50 border border-[#dfc3a3] rounded-2xl py-10 mb-5 shadow-inner flex items-center justify-center min-h-[130px] sm:min-h-[160px]">
            <span id="irl-display-val" class="${fontClass}">${displayVal}</span>
          </div>
          
          <!-- Dynamic math adjustment buttons container -->
          <div id="irl-buttons-wrapper">
            ${buttonsHtml}
          </div>
          
          <!-- Action bar - One single long white Reset button -->
          <div class="w-full">
            <button data-action="resetIrlRound" class="w-full bg-[#2c2c2e] hover:bg-[#1a1a1c] text-[#ede2d3] font-black text-sm uppercase tracking-wider py-4 rounded-2xl border border-gray-300 transition-all active:scale-95 shadow-md">
              Reset
            </button>
          </div>
        </div>
      `;
  appEl.appendChild(container);
}

function renderSetup() {
  // Big bold Back button positioned at the absolute top left of the entire viewport
  const backBtn = document.createElement('button');
  backBtn.onclick = () => {
    state.onlineErrorMsg = null;
    window.setPhase('landing');
  };
  backBtn.className = "absolute top-6 left-6 sm:top-8 sm:left-8 z-40 bg-[#ede2d3] hover:bg-[#dfc3a3] text-[#2C2C2E] font-black text-sm sm:text-base uppercase tracking-widest px-6 py-3.5 rounded-2xl shadow-2xl transition-all active:scale-95 flex items-center gap-2 select-none";
  backBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back
      `;
  appEl.appendChild(backBtn);

  const container = document.createElement('div');
  container.className = "w-full max-w-xl md:max-w-3xl bg-[#ede2d3] p-8 rounded-3xl shadow-xl border border-[#dfc3a3] text-center text-[#2C2C2E] relative play-local-menu";

  let layoutsHtml = '';
  Object.entries(BOARD_LAYOUTS).forEach(([key, config]) => {
    const isSelected = state.selectedLayoutKey === key;
    layoutsHtml += `
          <button data-action="setLayoutKey:${key}" class="flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl text-left border-2 font-bold transition-all w-full ${isSelected ? 'border-[#2C2C2E] bg-[#dfc3a3]/30' : 'border-[#2C2C2E]/20 hover:border-[#2C2C2E]/40 text-[#2C2C2E]'}" >
            <div class="shrink-0 ${isSelected ? 'text-[#2C2C2E]' : 'text-[#2C2C2E]/50'}">${config.icon}</div>
            <div class="min-w-0 flex-1">
              <div class="font-black text-[#2C2C2E] text-[11px] sm:text-xs md:text-sm leading-tight whitespace-normal">${config.name}</div>
              <div class="text-[8px] sm:text-[10px] text-[#2C2C2E]/60 uppercase font-medium mt-0.5">Modular</div>
            </div>
          </button>
        `;
  });

  container.innerHTML = `
        <h2 class="text-2xl font-black text-[#2C2C2E] mb-6 uppercase tracking-wider">Game Setup</h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 text-[#2C2C2E]">
          <div class="space-y-6">
            <div class="text-left">
              <label class="block text-xs font-black uppercase tracking-widest text-[#2C2C2E]/70 mb-2">Game Mode</label>
              <div class="grid grid-cols-2 gap-3">
                <button data-action="setGameMode:false" class="relative h-12 rounded-xl font-bold text-[9px] sm:text-xs border-2 transition-all ${!state.isAiMode ? 'border-[#2C2C2E] bg-[#2C2C2E] text-[#ede2d3] shadow-md' : 'border-[#2C2C2E]/30 text-[#2C2C2E]/60 hover:border-[#2C2C2E]/60'}" >
                  <div class="absolute inset-0 flex items-center justify-center gap-2 px-2">
                    <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                    <span class="whitespace-nowrap">Play With Friends</span>
                  </div>
                </button>
                
                <button data-action="setGameMode:true" class="relative h-12 rounded-xl font-bold text-[11px] sm:text-sm border-2 transition-all ${state.isAiMode ? 'border-[#2C2C2E] bg-[#2C2C2E] text-[#ede2d3] shadow-md' : 'border-[#2C2C2E]/30 text-[#2C2C2E]/60 hover:border-[#2C2C2E]/60'}" >
                  <div class="absolute inset-0 flex items-center justify-center gap-2 px-2">
                    <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="8" width="14" height="11" rx="3" /><path d="M12 8V4" /><circle cx="12" cy="3" r="1" fill="currentColor" /><circle cx="9" cy="13" r="1" fill="currentColor" /><circle cx="15" cy="13" r="1" fill="currentColor" /><path d="M2 13h3" /><path d="M19 13h3" /></svg>
                    <span class="whitespace-nowrap">Play With AI</span>
                  </div>
                </button>
              </div>
            </div>
            <div class="text-left">
              <label class="block text-xs font-black uppercase tracking-widest text-[#2C2C2E]/70 mb-2">Number of Players</label>
              <div class="grid grid-cols-2 gap-3">
                <button data-action="setPlayerCount:2" class="py-3 rounded-xl font-bold text-[11px] sm:text-sm border-2 transition-all ${state.playerCount === 2 ? 'border-[#2C2C2E] bg-[#2C2C2E] text-[#ede2d3] shadow-md' : 'border-[#2C2C2E]/30 text-[#2C2C2E]/60 hover:border-[#2C2C2E]/60'}" >2 Players</button>
                <button data-action="setPlayerCount:3" class="py-3 rounded-xl font-bold text-[11px] sm:text-sm border-2 transition-all ${state.playerCount === 3 ? 'border-[#2C2C2E] bg-[#2C2C2E] text-[#ede2d3] shadow-md' : 'border-[#2C2C2E]/30 text-[#2C2C2E]/60 hover:border-[#2C2C2E]/60'}" >3 Players</button>
              </div>
            </div>
            <div class="text-left">
              <label class="block text-xs font-black uppercase tracking-widest text-[#2C2C2E]/70 mb-1">
                Rounds: <span class="text-sm font-black text-[#2C2C2E] ml-1" id="rounds-display-val">${state.maxRounds}</span>
              </label>
              <div class="relative mt-2 mb-6 px-1">
                <input type="range" min="5" max="20" step="1" value="${state.maxRounds}" data-input-action="updateRoundsDOM" data-change-action="updateRoundsState" class="w-full h-2 rounded-lg appearance-none cursor-pointer focus:outline-none" />
                <div class="relative w-full flex justify-between text-[10px] font-bold text-[#2C2C2E]/60 mt-2">
                  <span class="absolute left-[2.5%] -translate-x-1/2 flex flex-col items-center"><span class="w-1 h-1 bg-[#2C2C2E]/40 rounded-full mb-0.5"></span><span>5</span></span>
                  <span class="absolute left-[34.17%] -translate-x-1/2 flex flex-col items-center"><span class="w-1 h-1 bg-[#2C2C2E]/40 rounded-full mb-0.5"></span><span>10 (Default)</span></span>
                  <span class="absolute left-[65.82%] -translate-x-1/2 flex flex-col items-center"><span class="w-1 h-1 bg-[#2C2C2E]/40 rounded-full mb-0.5"></span><span>15</span></span>
                  <span class="absolute left-[97.65%] -translate-x-1/2 flex flex-col items-center"><span class="w-1 h-1 bg-[#2C2C2E]/40 rounded-full mb-0.5"></span><span>20</span></span>
                </div>
              </div>
            </div>
          </div>
          <div class="text-left">
            <label class="block text-xs font-black uppercase tracking-widest text-[#2C2C2E]/70 mb-2">Board Layout</label>
            <div class="grid grid-cols-2 gap-2">${layoutsHtml}</div>
          </div>
        </div>
        
        <!-- Simplified Clean Full Width Bottom Card Button -->
        <div class="w-full mt-6">
          <button data-action="setPhase:color-select" class="w-full bg-[#b597f0] hover:bg-[#a586e3] active:scale-95 text-[#2C2C2E] py-4 rounded-xl font-black text-sm uppercase tracking-widest transition-all shadow-md border-none">
            Customize Colors & Names →
          </button>
        </div>
      `;
  appEl.appendChild(container);
}

function renderColorSelect() {
  const container = document.createElement('div');
  container.className = "w-full max-w-xl md:max-w-3xl bg-[#ede2d3] p-8 rounded-3xl shadow-xl border border-[#dfc3a3] text-center text-[#2C2C2E]";

  const aiPlayers = getAiPlayers();
  const names = getPlayerNames();
  const pids = [1, 2];
  if (state.playerCount === 3) pids.push(3);

  let playersHtml = '';
  pids.forEach(pid => {
    const isAi = aiPlayers.has(pid);
    const activeColor = state.playerColors[pid];

    let colorButtons = '';
    COLOR_OPTIONS.forEach(opt => {
      const isSelected = activeColor.id === opt.id;
      colorButtons += `<button data-action="selectColor:${pid},${opt.id}" class="w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 active:scale-90 ${isSelected ? 'border-[#2C2C2E] scale-105 shadow-md' : 'border-transparent'}" style="background-color: ${opt.hex}"></button>`;
    });

    playersHtml += `
          <div class="p-4 bg-[#dfc3a3]/20 rounded-2xl border border-[#dfc3a3]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div class="flex items-center gap-3 flex-1 min-w-0">
              <div class="w-8 h-8 rounded-lg shadow-inner border border-gray-400/20 shrink-0" style="background-color: ${activeColor.hex}"></div>
              <div class="flex-1 min-w-0">
                <input type="text" value="${names[pid]}" data-input-action="updateName:${pid}" ${isAi ? 'disabled' : ''} placeholder="Player ${pid}" maxlength="16" class="player-name w-full font-bold text-sm rounded-lg px-2.5 py-1 focus:outline-none focus:ring-2 focus:ring-[#2C2C2E]/50 transition-all ${isAi ? 'bg-transparent border-transparent text-[#2C2C2E]/60 cursor-not-allowed select-none pl-0' : 'bg-white/60 border border-gray-300 text-[#2C2C2E] focus:bg-white'}" />
                <p class="text-[9px] text-[#2C2C2E]/60 font-bold uppercase tracking-wider mt-1 pl-1">
                  Player ${pid} ${isAi ? '<span class="bg-[#2C2C2E]/10 text-[#2C2C2E]/80 px-1.5 py-0.5 rounded ml-1 font-semibold normal-case text-[8px]">AI Bot</span>' : ''}
                </p>
              </div>
            </div>
            <div class="flex flex-col items-end gap-2 shrink-0">
              <div class="flex gap-2 flex-wrap">${colorButtons}</div>
              ${isAi ? `
                <div class="flex items-center gap-1.5 mt-1">
                  <label class="text-[10px] font-black uppercase tracking-wider text-[#2C2C2E]/60">Difficulty:</label>
                  <select data-change-action="updateDiff:${pid}" class="bg-white/80 border border-gray-300 text-[#2C2C2E] font-bold text-xs rounded-md px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#2C2C2E]/50 cursor-pointer">
                    <option value="easy" ${state.botDifficulties[pid] === 'easy' ? 'selected' : ''}>Easy</option>
                    <option value="medium" ${state.botDifficulties[pid] === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="hard" ${state.botDifficulties[pid] === 'hard' ? 'selected' : ''}>Hard</option>
                  </select>
                </div>
              ` : ''}
            </div>
          </div>
        `;
  });

  container.innerHTML = `
        <h2 class="text-2xl font-black text-[#2C2C2E] mb-6 uppercase tracking-wider">Choose Names & Colors</h2>
        <div class="space-y-6 mb-8 text-left">${playersHtml}</div>
        <div class="flex gap-3">
          <button data-action="setPhase:setup" class="w-1/3 bg-[#2C2C2E] hover:bg-[#1a1a1c] text-[#ede2d3] py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all shadow-md">← Back</button>
          <button data-action="startGame" class="w-2/3 bg-[#b597f0] hover:bg-[#a586e3] text-[#2C2C2E] py-3 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md border-none">Start Game!</button>
        </div>
      `;
  appEl.appendChild(container);
}

function renderGame() {
  const layout = getLayoutInfo();
  const isGameOver = isGameOverCheck();
  const cr = Math.ceil(state.turn / state.playerCount);
  const rf = state.gamePhase === 'keystone-select' ? `0/${state.maxRounds}` : `${Math.min(cr, state.maxRounds)}/${state.maxRounds}`;
  const cp = getCurrentPlayer();
  const cPicker = getCurrentKeystonePicker();
  const aiPlayers = getAiPlayers();
  const valid = getValidMoves();
  const stats = getPlayerStats(layout);
  const winTiles = getWinningTiles(layout, stats);
  const winBorders = getWinningBorders(layout, winTiles);
  const names = getPlayerNames();
  const activeNL = names[cp]?.length || 0;
  const ans = activeNL > 12 ? "text-[7px] sm:text-[8px]" : activeNL > 8 ? "text-[8px] sm:text-[9px]" : "text-[9px] sm:text-[11px]";

  // ONLY draw light dots if it is dynamically this client's turn to play (locks out guest hints when waiting!)
  const isMyTurnActive = !state.isOnlineGame || (state.gamePhase === 'keystone-select' ? cPicker === state.localPlayerId : cp === state.localPlayerId);

  let boardHtml = '';
  for (let rIdx = 0; rIdx < layout.rows; rIdx++) {
    for (let cIdx = 0; cIdx < layout.cols; cIdx++) {
      const tIdx = layout.matrix[rIdx][cIdx];
      if (tIdx === null) {
        boardHtml += `<div class="bg-transparent pointer-events-none opacity-0 aspect-square" style="aspect-ratio: 1/1;"></div>`;
        continue;
      }

      const c = state.board[tIdx];
      const isValid = valid.has(tIdx);
      const isCd = state.cooldowns[tIdx] >= state.turn;
      const isK = state.keystones[c] === tIdx;
      const isCPStone = state.gamePhase === 'keystone-select' && c === cPicker;
      const cpAi = state.gamePhase === 'keystone-select' && aiPlayers.has(cPicker);
      const isE = isEdgeTileDynamic(tIdx, layout);
      const bdr = winBorders[tIdx];

      const isOnlineTurnLocked = state.isOnlineGame && (state.gamePhase === 'keystone-select' ? cPicker !== state.localPlayerId : cp !== state.localPlayerId);
      const isClickable = !isOnlineTurnLocked && ((state.gamePhase === 'keystone-select' && isCPStone && isE && !cpAi) || isValid);
      const sHex = c === PLAYER_1 ? state.playerColors[1].hex : c === PLAYER_2 ? state.playerColors[2].hex : c === PLAYER_3 ? state.playerColors[3].hex : '#D1D5DB';

      let tileInner = '';
      if (state.gamePhase === 'keystone-select' && isCPStone && isE && !isOnlineTurnLocked) {
        tileInner += `<div class="absolute inset-0 rounded-sm sm:rounded-md border border-dashed border-gray-800/80 animate-pulse pointer-events-none"></div>`;
      }
      // Dynamic Fix: Guard valid movement dot drawing to render ONLY when it is this client's active online turn.
      if (isValid && isMyTurnActive && !aiPlayers.has(cp)) {
        tileInner += `<div class="absolute w-2 h-2 sm:w-2.5 sm:h-2.5 bg-gray-500 rounded-full animate-pulse shadow-sm pointer-events-none"></div>`;
      }
      if (isK) {
        tileInner += `<div class="absolute inset-0 flex items-center justify-center pointer-events-none p-[20%]"><div class="w-full h-full rounded-[4px] sm:rounded-[6px] shadow-[inset_0_2px_4px_rgba(0,0,0,0.35)] transition-colors duration-300" style="background-color: ${getDarkerColor(state.playerColors[c]?.id)}"></div></div>`;
      }
      if (isCd && c !== cp && !isValid && !isGameOver) {
        tileInner += `<div class="absolute w-1.5 h-1.5 sm:w-2 sm:h-2 bg-white/40 rounded-full shadow-inner pointer-events-none"></div>`;
      }
      if (bdr) {
        let bs = '';
        if (bdr.top) bs += 'border-top: 3.5px solid #ff0000; ';
        if (bdr.bottom) bs += 'border-bottom: 3.5px solid #ff0000; ';
        if (bdr.left) bs += 'border-left: 3.5px solid #ff0000; ';
        if (bdr.right) bs += 'border-right: 3.5px solid #ff0000; ';
        if (bs) tileInner += `<div class="absolute inset-0 pointer-events-none z-20" style="${bs} filter: drop-shadow(0 0 3px rgba(255,255,255,0.85))"></div>`;
      }

      boardHtml += `<div data-action="handleTileClick:${tIdx}" class="game-tile relative rounded-sm sm:rounded-md w-full h-full aspect-square shadow-[inset_0_-2px_0_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.3)] transition-all duration-200 flex items-center justify-center ${isClickable ? 'cursor-pointer hover:scale-105 hover:brightness-105' : 'cursor-default'} ${isCd && c !== cp && !isGameOver ? 'opacity-90' : ''}" style="background-color: ${sHex}; aspect-ratio: 1/1;">${tileInner}</div>`;
    }
  }

  let scorecardsHtml = '';
  state.turnOrder.forEach(pid => {
    if (pid > state.playerCount) return;

    const ps = stats[pid] || { total: 0, largest: 0 };
    const isC = state.gamePhase === 'playing' && cp === pid && !isGameOver;
    const isAi = aiPlayers.has(pid);
    const nl = names[pid]?.length || 0;
    const sns = nl > 12 ? "text-[7px] sm:text-[9px]" : nl > 8 ? "text-[8px] sm:text-[10px]" : "text-[9px] sm:text-xs";
    const diffStr = isAi ? (state.botDifficulties[pid] || 'medium') : '';
    const isMeLabel = state.isOnlineGame && state.localPlayerId === pid;

    const nonCurrentBg = state.isOnlineGame ? 'bg-[#2C2C2E] border-[#1a1a1c]' : 'bg-[#ede2d3] border-[#dfc3a3]/60';
    const nonCurrentText = state.isOnlineGame ? 'text-red' : 'text-[#2C2C2E]';

    scorecardsHtml += `
          <div class="border rounded-2xl p-2 sm:p-3 text-center w-full shadow-sm transition-all duration-300 font-sans ${isC ? 'border-[#2C2C2E] scale-105 shadow-md' : nonCurrentBg}" style="${isC ? `background-color: ${state.playerColors[pid].hex}` : ''}">
            <div class="${sns} font-black tracking-wider uppercase flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 font-sans transition-colors duration-300" style="color: ${isC ? '#ff0000' : state.playerColors[pid].hex}">
              <span class="max-w-full font-sans text-center truncate">${names[pid]} ${isMeLabel ? '(YOU)' : ''}</span>
            </div>
            <div class="text-xl sm:text-3xl md:text-5xl font-black mt-0.5 font-sans transition-colors duration-300 ${isC ? 'text-red' : nonCurrentText}">
              ${state.gamePhase === 'keystone-select' ? '—' : (ps.largest || 0)}
            </div>
          </div>
        `;
  });

  let goHtml = '';
  if (isGameOver) {
    let wt = "It's a Tie!";
    if (state.instantWinner) wt = `${names[state.instantWinner]} wins by connecting all stones!`;
    else {
      const l1 = stats[PLAYER_1]?.largest || 0, l2 = stats[PLAYER_2]?.largest || 0, l3 = state.playerCount === 3 ? (stats[PLAYER_3]?.largest || 0) : -1;
      const ml = Math.max(l1, l2, l3);
      const w = [];
      if (l1 === ml) w.push(names[PLAYER_1]);
      if (l2 === ml) w.push(names[PLAYER_2]);
      if (l3 === ml && state.playerCount === 3) w.push(names[PLAYER_3]);
      if (w.length === 1) wt = `${w[0]} Wins with ${ml} connected!`;
      else wt = `Tie: ${w.join(' & ')} (${ml} connected)`;
    }

    let fSt = '';
    state.turnOrder.forEach(pid => {
      if (pid > state.playerCount) return;
      // Added text-sm sm:text-base to make the text bigger, and px-3 py-1 for clean spacing
      fSt += `<span class="text-sm sm:text-base font-black uppercase tracking-wider px-3 py-1 player-name" style="color: ${state.playerColors[pid].hex}">${names[pid]}: ${stats[pid]?.largest || 0}</span>`;
    });

    // Online game buttons must only appear for the Host (PLAYER_1). Guests see a friendly notice.
    let buttonsHtml = '';
    if (state.isOnlineGame) {
      if (state.localPlayerId === PLAYER_1) {
        buttonsHtml = `
              <button data-action="resetOnlineLobbyState" class="bg-[#ede2d3] hover:bg-[#dfc3a3] text-[#2C2C2E] px-5 py-2.5 rounded-xl font-black uppercase tracking-wider transition-all text-[10px] sm:text-xs shadow-md">Back to Lobby</button>
              <button data-action="startOnlineGame" class="bg-[#f8b572] hover:bg-[#e09a58] text-[#2C2C2E] px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md text-[10px] sm:text-xs">Play Again</button>
            `;
      } else {
        buttonsHtml = `
              <span class="text-xs font-black uppercase tracking-widest ${state.isOnlineGame ? 'text-[#ede2d3]/60' : 'text-[#2C2C2E]/60'}">Waiting for host...</span>
            `;
      }
    } else {
      // Local play setup - FIXED: Swapped Play Again to premium purple styling
      buttonsHtml = `
            <button data-action="resetToSetup" class="bg-[#2C2C2E] hover:bg-[#1a1a1c] text-[#ede2d3] px-5 py-2.5 rounded-xl font-bold uppercase tracking-wider transition-all text-[10px] sm:text-xs font-sans">Game Setup</button>
            <button data-action="startGame" class="bg-[#b597f0] hover:bg-[#a586e3] text-[#2C2C2E] px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-md text-[10px] sm:text-xs font-sans">Play Again</button>
          `;
    }

    const goBgClass = state.isOnlineGame ? 'bg-[#2C2C2E] border-[#1a1a1c] text-[#ede2d3]' : 'bg-[#ede2d3] border-[#dfc3a3] text-[#2C2C2E]';
    const goIconClass = state.isOnlineGame ? 'text-[#ede2d3]' : 'text-[#2C2C2E]';
    const goInnerBgClass = state.isOnlineGame ? 'bg-[#1a1a1c]/60 border-[#ede2d3]/10' : 'bg-[#dfc3a3]/30 border-[#dfc3a3]/50';

    // Check if the current message includes the word "Tie" or "It's a Tie!"
    const isGameATie = wt.includes("Tie") || wt.includes("Tie:");

    goHtml = `
          <div class="w-full mt-6 ${goBgClass} rounded-2xl p-5 shadow-lg animate-fade-in text-center font-sans">
            ${!isGameATie ? `
            <svg class="w-12 h-12 mx-auto mb-3" viewBox="0 0 24 24" fill="${state.isOnlineGame ? '#ede2d3' : '#2C2C2E'}">
              <defs><mask id="medal-mask-retro"><rect width="24" height="24" fill="#ff0000" /><text x="12" y="15.2" font-size="7.5" font-family="system-ui, -apple-system, sans-serif" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="#000000" stroke="#000000" stroke-width="0.5" stroke-linejoin="round">1</text></mask></defs>
              <g mask="url(#medal-mask-retro)"><polygon points="7,2 10.5,2 12,11.5 9.5,11.5" /><polygon points="17,2 13.5,2 12,11.5 14.5,11.5" /><circle cx="12" cy="15" r="5.5" /></g>
            </svg>
            ` : ''}
            <h2 class="text-base sm:text-lg font-black mb-3 uppercase tracking-wider ${goIconClass}">${wt}</h2>
            <div class="flex flex-wrap gap-x-6 gap-y-2 mb-4 text-center justify-center font-sans">${fSt}</div>
            <div class="flex gap-3 justify-center items-center font-sans">
              ${buttonsHtml}
            </div>
          </div>
        `;
  }

  const topBtnStyle = state.isOnlineGame
    ? "text-[#ede2d3] bg-[#2c2c2e] hover:bg-[#1a1a1c] shadow-md border-transparent"
    : "text-gray-300 hover:text-[#ede2d3] bg-white/10 border-white/20 shadow-sm";

  const panelBgClass = state.isOnlineGame ? 'bg-[#2C2C2E]' : 'bg-[#ede2d3]';
  const panelBorderClass = state.isOnlineGame ? 'border-[#1a1a1c]' : 'border-[#dfc3a3]';
  const textMainClass = state.isOnlineGame ? 'text-[#ede2d3]' : 'text-gray-800';
  const textSubClass = state.isOnlineGame ? 'text-[#ede2d3]/60' : 'text-gray-500';
  const textMutedClass = state.isOnlineGame ? 'text-[#ede2d3]' : 'text-gray-700';
  const dividerClass = state.isOnlineGame ? 'border-[#ede2d3]/20' : 'border-gray-400/20';

  appEl.innerHTML = `
        ${!isGameOver ? `
          <div class="mb-6 font-sans">
            <button data-action="topGameBarAction" class="inline-flex items-center gap-1.5 transition-colors border px-4 py-1.5 rounded-full font-bold text-[11px] uppercase tracking-widest active:scale-95 font-sans ${topBtnStyle}">
              ${
                !state.isOnlineGame 
                  ? 'Quit Game' 
                  : (state.localPlayerId === 1 || state.localPlayerId === 'PLAYER_1' || state.localPlayerId === PLAYER_1)
                    ? 'Back to Lobby' 
                    : 'Disconnect & Exit'
              }
            </button>
          </div>` : ''}
        <div class="flex flex-row items-stretch justify-center gap-3 sm:gap-6 md:gap-8 lg:gap-12 w-full max-w-5xl px-2">
          <div class="flex flex-col justify-center items-center w-20 sm:w-28 md:w-36 text-center">
            <div class="${panelBgClass} border ${panelBorderClass} rounded-2xl p-2 sm:p-3 text-center w-full shadow-sm ${textMainClass}">
              <div class="text-[9px] sm:text-xs font-black tracking-wider uppercase ${textSubClass} font-sans">Round</div>
              <div class="text-xl sm:text-3xl md:text-5xl font-black ${textMainClass} mt-1 sm:mt-1.5 md:mt-2">${rf}</div>
              ${state.gamePhase === 'playing' && !isGameOver ? `
                <div class="mt-3 flex flex-col items-center justify-center gap-1 border-t ${dividerClass} pt-2">
                  <div class="w-2.5 h-2.5 rounded-full animate-pulse" style="background-color: ${state.playerColors[cp]?.hex}"></div>
                  <span class="text-[8px] sm:text-[9px] uppercase tracking-wider font-bold ${textSubClass} font-sans">Active</span>
                  <span class="${ans} font-black ${textMutedClass} max-w-full text-center block truncate">${names[cp]} ${state.isOnlineGame && state.localPlayerId === cp ? '(YOU)' : ''}</span>
                </div>` : ''}
              ${state.gamePhase === 'keystone-select' && !isGameOver ? `
                <div class="mt-3 flex flex-col items-center justify-center gap-1 border-t ${dividerClass} pt-2 text-center">
                  <div class="w-2.5 h-2.5 rounded-full animate-pulse" style="background-color: ${state.playerColors[cPicker]?.hex}"></div>
                  <span class="text-[8px] uppercase font-black tracking-wider ${textSubClass} font-sans">Selecting Keystone</span>
                  <span class="${ans} font-black ${textMutedClass} truncate max-w-full block">${names[cPicker]} ${state.isOnlineGame && state.localPlayerId === cPicker ? '(YOU)' : ''}</span>
                </div>` : ''}
            </div>
          </div>
          <div class="flex-1 flex flex-col items-center justify-start max-w-[540px] self-center">
            ${state.skippedTurnMsg ? `<div class="mb-3 py-1 px-4 bg-red-100 text-red-700 font-bold rounded-full animate-bounce shadow-sm border border-red-200 text-xs text-center">${state.skippedTurnMsg}</div>` : ''}
            <div id="board-container" class="${panelBgClass} p-2 sm:p-4 rounded-3xl shadow-2xl relative w-full flex items-center justify-center overflow-hidden self-center border ${panelBorderClass}" style="aspect-ratio: ${layout.cols} / ${layout.rows}; max-width: min(100%, calc(60vh * ${layout.cols} / ${layout.rows})); height: auto;">
              <div class="grid w-full h-full p-1" style="grid-template-columns: repeat(${layout.cols}, minmax(0, 1fr)); grid-template-rows: repeat(${layout.rows}, minmax(0, 1fr)); gap: 2px; aspectRatio: ${layout.cols} / ${layout.rows};">${boardHtml}</div>
            </div>
            ${goHtml}
          </div>
          <div class="flex flex-col justify-center items-center w-20 sm:w-28 md:w-36 gap-2 sm:gap-4">${scorecardsHtml}</div>
        </div>
      `;
}

document.addEventListener('DOMContentLoaded', () => {
  render();
});

// Note: data-action delegation is handled centrally via delegateDataEvent above.

// Function to format raw seconds into a beautiful MM:SS clock string
window.formatSurgeTime = (totalSeconds) => {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

// TOGGLE: Start / Pause Action Logic (Corrected Colors Version)
window.toggleSurgeTimer = () => {
  const startPauseBtn = document.getElementById('start-pause-btn');
  
  if (state.surgeTimerIsRunning) {
    // PAUSE: Stop the interval loop
    clearInterval(state.surgeTimerIntervalId);
    state.surgeTimerIntervalId = null;
    state.surgeTimerIsRunning = false;
    
    // Smooth update: update button text to Resume and turn it back to GREEN
    if (startPauseBtn) {
      startPauseBtn.innerText = 'Resume';
      // Use classList for reliable class swapping
      startPauseBtn.classList.remove('bg-[#b597f0]');
      startPauseBtn.classList.remove('bg-[#a78bfa]');
      startPauseBtn.classList.add('bg-[#8dd586]');
    }
  } else {
    // START/RESUME: Start running the clock every 1 second
    state.surgeTimerIsRunning = true;
    
    // Instantly change button text to Pause and turn it PURPLE right when clicked
    if (startPauseBtn) {
      startPauseBtn.innerText = 'Pause';
      // Ensure the green class is removed and purple class is added
      startPauseBtn.classList.remove('bg-[#8dd586]');
      startPauseBtn.classList.add('bg-[#b597f0]');
    }

    state.surgeTimerIntervalId = setInterval(() => {
      if (state.surgeTimerSecondsLeft > 0) {
        state.surgeTimerSecondsLeft--;
        
        // TARGETED TEXT REPLACEMENT: Update clock numbers directly
      const liveClock = document.getElementById('live-clock');
      
      if (liveClock) {
        const minutes = Math.floor(state.surgeTimerSecondsLeft / 60);
        const seconds = state.surgeTimerSecondsLeft % 60;
        liveClock.innerText = minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
        
        // Handle the 10-second warning effects safely
        const clockContainer = liveClock.parentElement;
        
        if (state.surgeTimerSecondsLeft <= 10 && state.surgeTimerSecondsLeft > 0) {
          liveClock.classList.add('critical-shake');
          if (clockContainer) {
            clockContainer.classList.add('critical-pulse');
          }
        } else {
          liveClock.classList.remove('critical-shake');
          if (clockContainer) {
            clockContainer.classList.remove('critical-pulse');
            clockContainer.style.borderColor = '';
          }
        }
      }
      } else {
        // TIMER HIT 0: Clean up and stop
        clearInterval(state.surgeTimerIntervalId);
        state.surgeTimerIntervalId = null;
        state.surgeTimerIsRunning = false;
        
        // Target the container and the buttons directly without a full page refresh
        const btnContainer = document.getElementById('start-pause-btn')?.parentElement;
        const startPauseBtn = document.getElementById('start-pause-btn');
        const resetBtn = startPauseBtn?.previousElementSibling;
        
        if (startPauseBtn) {
          startPauseBtn.style.display = 'none'; // Completely hide the start button
        }
        if (resetBtn) {
          resetBtn.classList.add('w-full'); // Stretch the reset button full width
        }
        if (btnContainer) {
          btnContainer.classList.remove('grid', 'grid-cols-2');
          btnContainer.classList.add('flex');
        }
      }
    }, 1000);
  }
};

// RESET: Puts everything back to the starting duration
window.resetSurgeTimer = () => {
  clearInterval(state.surgeTimerIntervalId);
  state.surgeTimerIntervalId = null;
  state.surgeTimerIsRunning = false;
  state.surgeTimerSecondsLeft = state.surgeTimerDuration; // Back to default (e.g. 90s)
  window.renderSurgeTimerUI();
};

// Visual UI Renderer for the Surge Tool Screen
window.renderSurgeTimerUI = () => {
  // Instead of drawing the HTML directly here, we trigger the master supervisor loop!
  state.gamePhase = 'surge-view'; 
  render(); 
};
