const emojis = ['🐶', '🐱', '🐼', '🦊', '🦁', '🐸', '🐵', '🐰'];

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let flipCount = 0;
let isLocked = false;

const gameBoard = document.getElementById('game-board');
const flipCountEl = document.getElementById('flip-count');
const matchCountEl = document.getElementById('match-count');
const resetBtn = document.getElementById('reset-btn');
const winModal = document.getElementById('win-modal');
const finalFlipsEl = document.getElementById('final-flips');
const playAgainBtn = document.getElementById('play-again-btn');

function initGame() {
    cards = [];
    flippedCards = [];
    matchedPairs = 0;
    flipCount = 0;
    isLocked = false;
    
    flipCountEl.textContent = '0';
    matchCountEl.textContent = '0 / 8';
    winModal.classList.remove('show');
    
    emojis.forEach(emoji => {
        cards.push({ emoji, matched: false });
        cards.push({ emoji, matched: false });
    });
    
    shuffleArray(cards);
    renderBoard();
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
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
    
    if (cards[firstIndex].emoji === cards[secondIndex].emoji) {
        cards[firstIndex].matched = true;
        cards[secondIndex].matched = true;
        
        gameBoard.children[firstIndex].classList.add('matched');
        gameBoard.children[secondIndex].classList.add('matched');
        
        matchedPairs++;
        matchCountEl.textContent = `${matchedPairs} / 8`;
        
        flippedCards = [];
        
        if (matchedPairs === 8) {
            setTimeout(showWinModal, 500);
        }
    } else {
        isLocked = true;
        setTimeout(() => {
            gameBoard.children[firstIndex].classList.remove('flipped');
            gameBoard.children[secondIndex].classList.remove('flipped');
            flippedCards = [];
            isLocked = false;
        }, 1000);
    }
}

function showWinModal() {
    finalFlipsEl.textContent = flipCount;
    winModal.classList.add('show');
}

resetBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);

initGame();
