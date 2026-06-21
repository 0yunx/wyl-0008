const ALL_EMOJIS = ['🐶', '🐱', '🐼', '🦊', '🦁', '🐸', '🐵', '🐰', '🐨', '🐯', '🐮', '🐷', '🐹', '🐻', '🦝', '🐺', '🐴', '🦓', '🐘', '🦒'];

const DIFFICULTY_CONFIG = {
    easy:      { pairs: 6,  cols: 3, rows: 4, name: '简单' },
    normal:    { pairs: 8,  cols: 4, rows: 4, name: '普通' },
    hard:      { pairs: 10, cols: 5, rows: 4, name: '困难' },
    challenge: { pairs: 10, cols: 5, rows: 4, name: '限时挑战', timeLimit: 120 }
};

let currentDifficulty = 'easy';
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let flipCount = 0;
let isLocked = false;
let timerInterval = null;
let startTime = null;
let elapsedSeconds = 0;
let gameStarted = false;
let history = [];
let streak = 0;
let soundEnabled = true;
let audioCtx = null;
let countdownInterval = null;
let remainingSeconds = 0;
let gameFailed = false;

const gameBoard = document.getElementById('game-board');
const flipCountEl = document.getElementById('flip-count');
const matchCountEl = document.getElementById('match-count');
const timerEl = document.getElementById('timer');
const bestRecordEl = document.getElementById('best-record');
const resetBtn = document.getElementById('reset-btn');
const winModal = document.getElementById('win-modal');
const failModal = document.getElementById('fail-modal');
const finalFlipsEl = document.getElementById('result-flips');
const finalTimeEl = document.getElementById('result-time');
const finalDiffEl = document.getElementById('result-difficulty');
const newRecordEl = document.getElementById('new-record');
const playAgainBtn = document.getElementById('play-again-btn');
const changeDiffBtn = document.getElementById('change-diff-btn');
const starsContainer = document.getElementById('stars');
const historyList = document.getElementById('history-list');
const clearHistoryBtn = document.getElementById('clear-history-btn');
const diffButtons = document.querySelectorAll('.diff-btn');
const streakCountEl = document.getElementById('streak-count');
const soundToggleBtn = document.getElementById('sound-toggle-btn');
const retryBtn = document.getElementById('retry-btn');
const changeDiffFailBtn = document.getElementById('change-diff-fail-btn');
const failDiffEl = document.getElementById('fail-difficulty');
const failProgressEl = document.getElementById('fail-progress');
const failFlipsEl = document.getElementById('fail-flips');

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playTone(freq, duration, type, volume, detune) {
    if (!soundEnabled) return;
    try {
        const ctx = getAudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type || 'sine';
        osc.frequency.value = freq;
        if (detune) osc.detune.value = detune;
        gain.gain.setValueAtTime(volume || 0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
    } catch (e) {}
}

function playFlipSound() {
    playTone(800, 0.08, 'sine', 0.12);
    setTimeout(() => playTone(1000, 0.06, 'sine', 0.08), 40);
}

function playMatchSound() {
    playTone(523, 0.12, 'sine', 0.15);
    setTimeout(() => playTone(659, 0.12, 'sine', 0.15), 80);
    setTimeout(() => playTone(784, 0.18, 'sine', 0.18), 160);
}

function playMismatchSound() {
    playTone(300, 0.15, 'sawtooth', 0.08);
    setTimeout(() => playTone(250, 0.2, 'sawtooth', 0.06), 100);
}

function playWinSound() {
    const notes = [523, 587, 659, 784, 880, 1047];
    notes.forEach((freq, i) => {
        setTimeout(() => playTone(freq, 0.2, 'sine', 0.15), i * 100);
    });
}

function playFailSound() {
    playTone(400, 0.2, 'sawtooth', 0.1);
    setTimeout(() => playTone(300, 0.2, 'sawtooth', 0.1), 200);
    setTimeout(() => playTone(200, 0.4, 'sawtooth', 0.08), 400);
}

function toggleSound() {
    soundEnabled = !soundEnabled;
    soundToggleBtn.textContent = soundEnabled ? '🔊' : '🔇';
    soundToggleBtn.classList.toggle('muted', !soundEnabled);
    if (soundEnabled) {
        playTone(600, 0.1, 'sine', 0.1);
    }
}

function showComboFloat(streakCount, x, y) {
    const el = document.createElement('div');
    el.className = 'combo-float';
    el.textContent = `Combo x${streakCount}`;
    const fontSize = Math.min(1.2 + streakCount * 0.3, 3.5);
    el.style.fontSize = `${fontSize}rem`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    document.body.appendChild(el);
    el.addEventListener('animationend', () => el.remove());
}

function initGame() {
    stopTimer();
    stopCountdown();
    elapsedSeconds = 0;
    gameStarted = false;
    gameFailed = false;
    cards = [];
    flippedCards = [];
    matchedPairs = 0;
    flipCount = 0;
    isLocked = false;
    history = [];
    streak = 0;

    timerEl.textContent = '00:00';
    timerEl.classList.remove('countdown-warning');
    flipCountEl.textContent = '0';
    streakCountEl.textContent = '0';
    matchCountEl.textContent = `0 / ${DIFFICULTY_CONFIG[currentDifficulty].pairs}`;
    winModal.classList.remove('show');
    failModal.classList.remove('show');

    updateBoardClass();
    updateBestRecordDisplay();
    renderHistory();

    const selectedEmojis = shuffleArray([...ALL_EMOJIS]).slice(0, DIFFICULTY_CONFIG[currentDifficulty].pairs);
    selectedEmojis.forEach(emoji => {
        cards.push({ emoji, matched: false });
        cards.push({ emoji, matched: false });
    });

    shuffleArray(cards);
    renderBoard();
}

function updateBoardClass() {
    gameBoard.classList.remove('diff-easy', 'diff-normal', 'diff-hard', 'diff-challenge');
    gameBoard.classList.add(`diff-${currentDifficulty}`);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function renderBoard() {
    gameBoard.innerHTML = '';

    cards.forEach((card, index) => {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        cardEl.dataset.index = index;
        cardEl.innerHTML = `
            <div class="card-face card-back">❓</div>
            <div class="card-face card-front">${card.emoji}</div>
        `;
        cardEl.addEventListener('click', () => flipCard(index));
        gameBoard.appendChild(cardEl);
    });
}

function flipCard(index) {
    if (isLocked) return;
    if (gameFailed) return;
    if (cards[index].matched) return;
    if (flippedCards.includes(index)) return;

    if (!gameStarted) {
        gameStarted = true;
        if (currentDifficulty === 'challenge') {
            startCountdown();
        } else {
            startTimer();
        }
    }

    playFlipSound();

    const cardEl = gameBoard.children[index];
    cardEl.classList.add('flipped');
    flippedCards.push(index);

    if (flippedCards.length === 1) {
        return;
    }

    flipCount++;
    flipCountEl.textContent = flipCount;

    const firstIndex = flippedCards[0];
    const secondIndex = flippedCards[1];
    const firstEmoji = cards[firstIndex].emoji;
    const secondEmoji = cards[secondIndex].emoji;
    const isMatch = firstEmoji === secondEmoji;

    addHistory(firstEmoji, secondEmoji, isMatch);

    if (isMatch) {
        handleMatch(firstIndex, secondIndex);
    } else {
        handleMismatch(firstIndex, secondIndex);
    }
}

function handleMatch(firstIndex, secondIndex) {
    cards[firstIndex].matched = true;
    cards[secondIndex].matched = true;

    const firstEl = gameBoard.children[firstIndex];
    const secondEl = gameBoard.children[secondIndex];

    streak++;
    streakCountEl.textContent = streak;

    if (streak >= 2) {
        const rect = secondEl.getBoundingClientRect();
        const cx = rect.left + rect.width / 2 - 50;
        const cy = rect.top;
        showComboFloat(streak, cx, cy);
    }

    playMatchSound();

    setTimeout(() => {
        firstEl.classList.add('matched');
        secondEl.classList.add('matched');
    }, 50);

    matchedPairs++;
    matchCountEl.textContent = `${matchedPairs} / ${DIFFICULTY_CONFIG[currentDifficulty].pairs}`;

    flippedCards = [];

    if (matchedPairs === DIFFICULTY_CONFIG[currentDifficulty].pairs) {
        stopTimer();
        stopCountdown();
        playWinSound();
        setTimeout(showWinModal, 900);
    }
}

function handleMismatch(firstIndex, secondIndex) {
    streak = 0;
    streakCountEl.textContent = '0';

    playMismatchSound();

    isLocked = true;

    const firstEl = gameBoard.children[firstIndex];
    const secondEl = gameBoard.children[secondIndex];

    setTimeout(() => {
        firstEl.classList.add('shake');
        secondEl.classList.add('shake');
    }, 200);

    setTimeout(() => {
        firstEl.classList.remove('flipped', 'shake');
        secondEl.classList.remove('flipped', 'shake');
        flippedCards = [];
        isLocked = false;
    }, 1100);
}

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(() => {
        elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        timerEl.textContent = formatTime(elapsedSeconds);
    }, 250);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function startCountdown() {
    remainingSeconds = DIFFICULTY_CONFIG.challenge.timeLimit;
    timerEl.textContent = formatTime(remainingSeconds);
    startTime = Date.now();

    countdownInterval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        remainingSeconds = Math.max(0, DIFFICULTY_CONFIG.challenge.timeLimit - elapsed);
        timerEl.textContent = formatTime(remainingSeconds);
        elapsedSeconds = elapsed;

        if (remainingSeconds <= 10 && remainingSeconds > 0) {
            timerEl.classList.add('countdown-warning');
        } else {
            timerEl.classList.remove('countdown-warning');
        }

        if (remainingSeconds <= 0) {
            stopCountdown();
            gameFailed = true;
            isLocked = true;
            playFailSound();
            showFailModal();
        }
    }, 250);
}

function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
    timerEl.classList.remove('countdown-warning');
}

function formatTime(totalSeconds) {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function addHistory(emoji1, emoji2, matched) {
    history.unshift({
        turn: flipCount,
        emoji1,
        emoji2,
        matched
    });
    if (history.length > 8) {
        history = history.slice(0, 8);
    }
    renderHistory();
}

function renderHistory() {
    if (history.length === 0) {
        historyList.innerHTML = '<div class="history-empty">暂无翻牌记录</div>';
        return;
    }

    historyList.innerHTML = history.map(item => `
        <div class="history-item">
            <span class="history-turn">第${item.turn}次</span>
            <span class="history-cards">${item.emoji1} ${item.emoji2}</span>
            <span class="history-result ${item.matched ? 'match' : 'miss'}">
                ${item.matched ? '✓ 匹配' : '✗ 未匹配'}
            </span>
        </div>
    `).join('');
}

function clearHistory() {
    history = [];
    renderHistory();
}

function calculateStars() {
    const pairs = DIFFICULTY_CONFIG[currentDifficulty].pairs;
    if (flipCount <= pairs * 1.5) return 3;
    if (flipCount <= pairs * 2.5) return 2;
    return 1;
}

function getBestRecord() {
    try {
        const key = `memory-card-best-${currentDifficulty}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

function saveBestRecord(stars, flips, time) {
    try {
        const key = `memory-card-best-${currentDifficulty}`;
        const current = getBestRecord();
        if (!current || stars > current.stars ||
            (stars === current.stars && flips < current.flips) ||
            (stars === current.stars && flips === current.flips && time < current.time)) {
            localStorage.setItem(key, JSON.stringify({ stars, flips, time }));
            return true;
        }
        return false;
    } catch (e) {
        return false;
    }
}

function updateBestRecordDisplay() {
    const record = getBestRecord();
    if (record) {
        const starStr = '⭐'.repeat(record.stars);
        bestRecordEl.textContent = `${starStr} ${record.flips}次`;
        bestRecordEl.title = `${starStr} · ${record.flips}次翻牌 · ${formatTime(record.time)}`;
    } else {
        bestRecordEl.textContent = '-';
        bestRecordEl.title = '暂无记录';
    }
}

function showWinModal() {
    const stars = calculateStars();
    const isNewRecord = saveBestRecord(stars, flipCount, elapsedSeconds);

    finalDiffEl.textContent = DIFFICULTY_CONFIG[currentDifficulty].name;
    finalTimeEl.textContent = formatTime(elapsedSeconds);
    finalFlipsEl.textContent = `${flipCount}次`;

    const starEls = starsContainer.querySelectorAll('.star');
    starEls.forEach((star, idx) => {
        star.classList.remove('earned');
        if (idx < stars) {
            setTimeout(() => star.classList.add('earned'), idx * 200 + 100);
        }
    });

    if (isNewRecord) {
        newRecordEl.classList.add('show');
    } else {
        newRecordEl.classList.remove('show');
    }

    updateBestRecordDisplay();
    winModal.classList.add('show');
}

function showFailModal() {
    const total = DIFFICULTY_CONFIG[currentDifficulty].pairs;
    const percent = Math.round((matchedPairs / total) * 100);

    failDiffEl.textContent = DIFFICULTY_CONFIG[currentDifficulty].name;
    failProgressEl.textContent = `${matchedPairs}/${total} (${percent}%)`;
    failFlipsEl.textContent = `${flipCount}次`;

    failModal.classList.add('show');
}

diffButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        diffButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentDifficulty = btn.dataset.diff;
        initGame();
    });
});

resetBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);
retryBtn.addEventListener('click', initGame);
soundToggleBtn.addEventListener('click', toggleSound);
changeDiffBtn.addEventListener('click', () => {
    winModal.classList.remove('show');
});
changeDiffFailBtn.addEventListener('click', () => {
    failModal.classList.remove('show');
});
clearHistoryBtn.addEventListener('click', clearHistory);

initGame();
