const TOTAL_TILES = 36;
const PLAYER_1 = 1, PLAYER_2 = 2, PLAYER_3 = 3;

const COLOR_OPTIONS = [
    { id: 'amber', name: 'Amber', hex: '#f8b572' },
    { id: 'emerald', name: 'Emerald', hex: '#8dd586' },
    { id: 'amethyst', name: 'Amethyst', hex: '#b597f0' }
];

const getDarkerColor = (colorId) => {
    switch (colorId) {
        case 'amber': return '#b77435';
        case 'emerald': return '#589852';
        case 'amethyst': return '#7656af';
        default: return '#4b5563';
    }
};

const BOARD_LAYOUTS = {
    square: {
        name: "Classic Square (6x6)",
        blocks: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }],
        icon: `<svg class="w-10 h-10" viewBox="0 0 24 24" fill="none"><rect x="2" y="2" width="9" height="9" rx="1.5" fill="currentColor" /><rect x="13" y="2" width="9" height="9" rx="1.5" fill="currentColor" /><rect x="2" y="13" width="9" height="9" rx="1.5" fill="currentColor" /><rect x="13" y="13" width="9" height="9" rx="1.5" fill="currentColor" /></svg>`
    },
    line: {
        name: "Long Line (3x12)",
        blocks: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 0, c: 2 }, { r: 0, c: 3 }],
        icon: `<svg class="w-10 h-10" viewBox="0 0 24 24" fill="none"><rect x="1" y="9.5" width="5" height="5" rx="1" fill="currentColor" /><rect x="6.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" /><rect x="12" y="9.5" width="5" height="5" rx="1" fill="currentColor" /><rect x="17.5" y="9.5" width="5" height="5" rx="1" fill="currentColor" /></svg>`
    },
    lshape: {
        name: "L-Bend",
        blocks: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 2, c: 0 }, { r: 2, c: 1 }],
        icon: `<svg class="w-10 h-10" viewBox="0 0 24 24" fill="none"><rect x="6" y="2" width="5" height="5" rx="1" fill="currentColor" /><rect x="6" y="8" width="5" height="5" rx="1" fill="currentColor" /><rect x="6" y="14" width="5" height="5" rx="1" fill="currentColor" /><rect x="12.5" y="14" width="5" height="5" rx="1" fill="currentColor" /></svg>`
    },
    zshape: {
        name: "Zigzag",
        blocks: [{ r: 0, c: 0 }, { r: 0, c: 1 }, { r: 1, c: 1 }, { r: 1, c: 2 }],
        icon: `<svg class="w-10 h-10" viewBox="0 0 24 24" fill="none"><rect x="1.5" y="5" width="6" height="6" rx="1" fill="currentColor" /><rect x="9" y="5" width="6" height="6" rx="1" fill="currentColor" /><rect x="9" y="12.5" width="6" height="6" rx="1" fill="currentColor" /><rect x="16.5" y="12.5" width="6" height="6" rx="1" fill="currentColor" /></svg>`
    }
};

const shuffleArray = (array) => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};