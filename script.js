const ALL_EMOJIS = ['🐶', '🐱', '🐼', '🦊', '🦁', '🐸', '🐵', '🐰', '🐨', '🐯', '🐮', '🐷', '🐹', '🐻', '🦝', '🐺', '🐴', '🦓', '🐘', '🦒'];

const DIFFICULTY_CONFIG = {
    easy:   { pairs: 6,  cols: 3, rows: 4, name: '简单' },
    normal: { pairs: 8,  cols: 4, rows: 4, name: '普通' },
    hard:   { pairs: 10, cols: 5, rows: 4, name: '困难' }
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

const gameBoard = document.getElementById('game-board');
const flipCountEl = document.getElementById('flip-count');
const matchCountEl = document.getElementById('match-count');
const timerEl = document.getElementById('timer');
const bestRecordEl = document.getElementById('best-record');
const resetBtn = document.getElementById('reset-btn');
const winModal = document.getElementById('win-modal');
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

function initGame() {
    stopTimer();
    elapsedSeconds = 0;
    gameStarted = false;
    cards = [];
    flippedCards = [];
    matchedPairs = 0;
    flipCount = 0;
    isLocked = false;
    history = [];

    timerEl.textContent = '00:00';
    flipCountEl.textContent = '0';
    matchCountEl.textContent = `0 / ${DIFFICULTY_CONFIG[currentDifficulty].pairs}`;
    winModal.classList.remove('show');

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
    gameBoard.classList.remove('diff-easy', 'diff-normal', 'diff-hard');
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
    if (cards[index].matched) return;
    if (flippedCards.includes(index)) return;

    if (!gameStarted) {
        startTimer();
        gameStarted = true;
    }

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

    setTimeout(() => {
        firstEl.classList.add('matched');
        secondEl.classList.add('matched');
    }, 50);

    matchedPairs++;
    matchCountEl.textContent = `${matchedPairs} / ${DIFFICULTY_CONFIG[currentDifficulty].pairs}`;

    flippedCards = [];

    if (matchedPairs === DIFFICULTY_CONFIG[currentDifficulty].pairs) {
        stopTimer();
        setTimeout(showWinModal, 900);
    }
}

function handleMismatch(firstIndex, secondIndex) {
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
changeDiffBtn.addEventListener('click', () => {
    winModal.classList.remove('show');
});
clearHistoryBtn.addEventListener('click', clearHistory);

initGame();
