import { formatTime } from './utils.js';

// DOM Elements
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const storyTitle = document.getElementById('story-title');
const textDisplay = document.getElementById('text-display');
const inputArea = document.getElementById('input-area');

const wpmEl = document.getElementById('wpm');
const accuracyEl = document.getElementById('accuracy');
const mistakesEl = document.getElementById('mistakes');
const progressEl = document.getElementById('progress');
const timerEl = document.getElementById('timer');

const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const backBtn = document.getElementById('back-btn');
const retryBtn = document.getElementById('retry-btn');
const homeBtn = document.getElementById('home-btn');

const finalWpmEl = document.getElementById('final-wpm');
const finalAccuracyEl = document.getElementById('final-accuracy');
const finalMistakesEl = document.getElementById('final-mistakes');
const finalTimeEl = document.getElementById('final-time');
const finalStoryEl = document.getElementById('final-story');

// Game State
let currentStory = null;
let storyWords = [];
let words = [];
let currentWordIndex = 0;
let totalMistakes = 0;
let currentPaddingTop = 20;
let lastInputLength = 0;
let started = false;
let finished = false;
let startTime = null;
let timerInterval = null;
let elapsedSeconds = 0;

let typedCharsCount = 0;
let totalTextChars = 0;
let totalCharsTyped = 0;

function updateLineScroll() {
  const word = words[currentWordIndex];
  if (!word) return;
  const targetScroll = word.offsetTop - currentPaddingTop;
  textDisplay.scrollTo({ top: targetScroll, behavior: 'smooth' });
}

function buildTextDisplay(text) {
  storyWords = text.trim().split(/\s+/);
  totalTextChars = text.length;
  textDisplay.innerHTML = '';
  words = [];
  storyWords.forEach(wordStr => {
    const wordSpan = document.createElement('span');
    wordSpan.className = 'word';
    for (const char of wordStr) {
      const charSpan = document.createElement('span');
      charSpan.className = 'char untyped';
      charSpan.textContent = char;
      wordSpan.appendChild(charSpan);
    }
    words.push(wordSpan);
    textDisplay.appendChild(wordSpan);
    textDisplay.appendChild(document.createTextNode(' '));
  });
  if (words.length) words[0].classList.add('cursor');
}

function resetState() {
  started = false;
  finished = false;
  startTime = null;
  elapsedSeconds = 0;
  currentWordIndex = 0;
  totalMistakes = 0;
  lastInputLength = 0;
  typedCharsCount = 0;
  totalCharsTyped = 0;

  clearInterval(timerInterval);
  timerInterval = null;

  inputArea.value = '';
  inputArea.disabled = true;
  inputArea.classList.remove('input-error');

  startBtn.textContent = '▶ Start';
  startBtn.disabled = false;

  wpmEl.textContent = '0';
  accuracyEl.textContent = '—';
  mistakesEl.textContent = '0';
  progressEl.textContent = '0%';
  timerEl.textContent = '0s';

  words.forEach(span => {
    span.className = 'word untyped';
    span.querySelectorAll('.char').forEach(c => c.className = 'char untyped');
  });
  if (words.length) words[0].classList.add('cursor');
  textDisplay.scrollTop = 0;
  
  gameScreen.classList.remove('hidden');
  resultsScreen.classList.add('hidden');
}

function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent = formatTime(elapsedSeconds);
    updateStats();
  }, 300);
}

function updateStats() {
  const minutes = (Date.now() - startTime) / 60000;
  const wpm = minutes > 0 ? Math.round((typedCharsCount / 5) / minutes) : 0;
  wpmEl.textContent = wpm;

  if (totalCharsTyped > 0) {
    const correctChars = totalCharsTyped - totalMistakes;
    const acc = Math.round((correctChars / totalCharsTyped) * 100);
    accuracyEl.textContent = `${acc}%`;
  } else {
    accuracyEl.textContent = '—';
  }

  const pct = totalTextChars > 0 ? Math.round((typedCharsCount / totalTextChars) * 100) : 0;
  progressEl.textContent = `${pct}%`;
}

function handleWordSubmission(e) {
  if (!started || finished || e.key !== ' ') return;

  const typedWord = inputArea.value;
  const expectedWord = storyWords[currentWordIndex];
  const currentWordSpan = words[currentWordIndex];

  if (typedWord === expectedWord) {
    e.preventDefault();
    typedCharsCount += typedWord.length + 1;
    const charSpans = currentWordSpan.querySelectorAll('.char');
    charSpans.forEach(span => span.className = 'char correct');
    currentWordSpan.classList.remove('cursor');
    currentWordIndex++;
    inputArea.value = '';
    lastInputLength = 0;

    if (currentWordIndex === storyWords.length) {
      typedCharsCount--;
      finishGame();
      return;
    }

    const nextWordSpan = words[currentWordIndex];
    nextWordSpan.classList.add('cursor');
    updateLineScroll();
  }
}

function handleRealtimeValidation() {
  if (!started || finished) return;

  const typedText = inputArea.value;
  const expectedWord = storyWords[currentWordIndex];
  const currentWordSpan = words[currentWordIndex];

  if (typedText.length > lastInputLength) {
    totalCharsTyped += typedText.length - lastInputLength;
    for (let i = lastInputLength; i < typedText.length; i++) {
      if (typedText[i] !== expectedWord[i]) {
        totalMistakes++;
        mistakesEl.textContent = totalMistakes;
      }
    }
  }
  lastInputLength = typedText.length;

  const charSpans = currentWordSpan.querySelectorAll('.char');
  charSpans.forEach((span, i) => {
    const char = span.textContent;
    if (i < typedText.length) {
      if (typedText[i] === char) {
        span.className = 'char correct';
      } else {
        span.className = 'char incorrect';
      }
    } else {
      span.className = 'char untyped';
    }
  });

  if (currentWordIndex === storyWords.length - 1 && typedText === expectedWord) {
    typedCharsCount += typedText.length;
    charSpans.forEach(span => span.className = 'char correct');
    currentWordSpan.classList.remove('cursor');
    currentWordIndex++;
    inputArea.value = '';
    finishGame();
    return;
  }

  if (expectedWord.startsWith(typedText)) {
    inputArea.classList.remove('input-error');
  } else {
    inputArea.classList.add('input-error');
  }
}

function startGame() {
  if (started) return;
  started = true;
  startBtn.disabled = true;
  startBtn.textContent = 'Typing…';
  inputArea.disabled = false;
  inputArea.value = '';
  inputArea.focus();
  startTimer();
}

function finishGame() {
  finished = true;
  clearInterval(timerInterval);
  inputArea.disabled = true;

  elapsedSeconds = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
  const minutes = elapsedSeconds / 60;
  const finalWpm = Math.round((typedCharsCount / 5) / minutes);
  const correctChars = totalCharsTyped - totalMistakes;
  const finalAcc = totalCharsTyped > 0 ? Math.round((correctChars / totalCharsTyped) * 100) : 100;

  finalWpmEl.textContent = `${finalWpm} WPM`;
  finalAccuracyEl.textContent = `${finalAcc}%`;
  finalMistakesEl.textContent = totalMistakes;
  finalTimeEl.textContent = formatTime(elapsedSeconds);
  finalStoryEl.textContent = currentStory.title;

  gameScreen.classList.add('hidden');
  resultsScreen.classList.remove('hidden');
}

async function initGame() {
  const urlParams = new URLSearchParams(window.location.search);
  const storyId = urlParams.get('id');

  if (!storyId) {
    window.location.href = 'index.html';
    return;
  }

  try {
    const response = await fetch('data/STORIES.json');
    const data = await response.json();
    const story = data.stories.find(s => s.id === storyId);

    if (!story) throw new Error('Story not found');

    const textRes = await fetch(story.file);
    story.text = await textRes.text();
    currentStory = story;
    storyTitle.textContent = story.title;
    buildTextDisplay(story.text.trim());
    resetState();
  } catch (err) {
    console.error(err);
    alert('Could not load story.');
    window.location.href = 'index.html';
  }
}

startBtn.addEventListener('click', startGame);
resetBtn.addEventListener('click', () => resetState());
backBtn.addEventListener('click', () => window.location.href = 'index.html');
retryBtn.addEventListener('click', () => resetState());
homeBtn.addEventListener('click', () => window.location.href = 'index.html');
inputArea.addEventListener('keydown', handleWordSubmission);
inputArea.addEventListener('input', handleRealtimeValidation);
inputArea.addEventListener('keydown', e => { if (e.key === 'Tab') e.preventDefault(); });
window.addEventListener('resize', () => { if (currentStory && !finished) updateLineScroll(); });

initGame();