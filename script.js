/**
 * TypeRacer – offline typing speed & accuracy trainer
 *
 * Stories are embedded directly so the app works when opened
 * as a local file (file:// protocol) without any server.
 */

'use strict';

/* ===================================================================
   Story data  – add new entries here to add more stories
   =================================================================== */
const STORIES = [
  {
    id: 'the_raven',
    title: 'The Raven',
    author: 'Edgar Allan Poe',
    file: 'texts/the_raven.txt',
    text: 'Once upon a midnight dreary, while I pondered, weak and weary, over many a quaint and curious volume of forgotten lore, while I nodded, nearly napping, suddenly there came a tapping, as of someone gently rapping, rapping at my chamber door. Tis some visitor, I muttered, tapping at my chamber door, only this and nothing more.'
  },
  {
    id: 'great_expectations',
    title: 'Great Expectations',
    author: 'Charles Dickens',
    file: 'texts/great_expectations.txt',
    text: "My father's family name being Pirrip, and my Christian name Philip, my infant tongue could make of both names nothing longer or more explicit than Pip. So, I called myself Pip, and came to be called Pip. I give Pirrip as my father's family name, on the authority of his tombstone and my sister, Mrs. Joe Gargery, who married the blacksmith."
  },
  {
    id: 'the_road_not_taken',
    title: 'The Road Not Taken',
    author: 'Robert Frost',
    file: 'texts/the_road_not_taken.txt',
    text: 'Two roads diverged in a yellow wood, and sorry I could not travel both and be one traveler, long I stood and looked down one as far as I could to where it bent in the undergrowth. Then took the other, as just as fair, and having perhaps the better claim, because it was grassy and wanted wear. Though as for that the passing there had worn them really about the same.'
  },
  {
    id: 'moby_dick',
    title: 'Moby Dick',
    author: 'Herman Melville',
    file: 'texts/moby_dick.txt',
    text: 'Call me Ishmael. Some years ago, never mind how long precisely, having little money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation. Whenever I find myself growing grim about the mouth, I take to the sea.'
  },
  {
    id: 'pride_and_prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    file: 'texts/pride_and_prejudice.txt',
    text: 'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife. However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered as the rightful property of some one or other of their daughters.'
  }
];

/* ===================================================================
   DOM references
   =================================================================== */
const selectionScreen = document.getElementById('selection-screen');
const gameScreen      = document.getElementById('game-screen');
const resultsScreen   = document.getElementById('results-screen');

const storyGrid   = document.getElementById('story-grid');
const storyTitle  = document.getElementById('story-title');
const textDisplay = document.getElementById('text-display');
const inputArea   = document.getElementById('input-area');

const wpmEl      = document.getElementById('wpm');
const accuracyEl = document.getElementById('accuracy');
const progressEl = document.getElementById('progress');
const timerEl    = document.getElementById('timer');

const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const backBtn  = document.getElementById('back-btn');
const retryBtn = document.getElementById('retry-btn');
const homeBtn  = document.getElementById('home-btn');

const finalWpmEl      = document.getElementById('final-wpm');
const finalAccuracyEl = document.getElementById('final-accuracy');
const finalTimeEl     = document.getElementById('final-time');
const finalStoryEl    = document.getElementById('final-story');

/* ===================================================================
   Game state
   =================================================================== */
let currentStory   = null;   // story object
let chars          = [];     // array of char DOM spans
let started        = false;
let finished       = false;
let startTime      = null;
let timerInterval  = null;
let elapsedSeconds = 0;

// Typing metrics
let typedIndex        = 0;   // how far the user has progressed
let totalKeysPressed  = 0;   // every keydown that produced a character
let correctKeys       = 0;   // keys that matched the expected character

/* ===================================================================
   Utility helpers
   =================================================================== */

/** Show one screen, hide the others */
function showScreen(screen) {
  [selectionScreen, gameScreen, resultsScreen].forEach(s => {
    s.classList.toggle('hidden', s !== screen);
  });
}

/** Format seconds as "1m 23s" or "45s" */
function formatTime(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

/** Convert a filename like "the_road_not_taken.txt" to "The Road Not Taken" */
function fileToTitle(filename) {
  return filename
    .replace(/\.txt$/, '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/* ===================================================================
   Story selection screen
   =================================================================== */
function buildStoryGrid() {
  storyGrid.innerHTML = '';
  STORIES.forEach(story => {
    const wordCount = story.text.trim().split(/\s+/).length;
    const card = document.createElement('div');
    card.className = 'story-card';
    card.innerHTML = `
      <h3>${story.title}</h3>
      <div class="card-meta">${story.author} &mdash; ${wordCount} words</div>
    `;
    card.addEventListener('click', () => loadStory(story));
    storyGrid.appendChild(card);
  });
}

/* ===================================================================
   Load a story into the game screen
   =================================================================== */
function loadStory(story) {
  currentStory = story;
  storyTitle.textContent = story.title;
  buildTextDisplay(story.text.trim());
  resetState();
  showScreen(gameScreen);
  inputArea.focus();
}

/** Wrap every character of the text in a <span> for per-char highlighting */
function buildTextDisplay(text) {
  textDisplay.innerHTML = '';
  chars = [];
  for (let i = 0; i < text.length; i++) {
    const span = document.createElement('span');
    span.className = 'char untyped';
    // Use a non-breaking space so whitespace renders visibly
    span.textContent = text[i];
    // Store the expected character
    span.dataset.char = text[i];
    textDisplay.appendChild(span);
    chars.push(span);
  }
  // Mark the first character as the cursor position
  if (chars.length) chars[0].classList.add('cursor');
}

/* ===================================================================
   Game state management
   =================================================================== */
function resetState() {
  started        = false;
  finished       = false;
  startTime      = null;
  elapsedSeconds = 0;
  typedIndex     = 0;
  totalKeysPressed = 0;
  correctKeys      = 0;

  clearInterval(timerInterval);
  timerInterval = null;

  inputArea.value   = '';
  inputArea.disabled = true;

  startBtn.textContent = '▶ Start';
  startBtn.disabled    = false;

  wpmEl.textContent      = '0';
  accuracyEl.textContent = '—';
  progressEl.textContent = '0%';
  timerEl.textContent    = '0s';

  // Reset all character classes
  chars.forEach(span => {
    span.className = 'char untyped';
  });
  if (chars.length) chars[0].classList.add('cursor');
}

/* ===================================================================
   Timer
   =================================================================== */
function startTimer() {
  startTime = Date.now();
  timerInterval = setInterval(() => {
    elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
    timerEl.textContent = formatTime(elapsedSeconds);
    updateStats();
  }, 300);
}

/* ===================================================================
   WPM & accuracy calculation
   =================================================================== */
function updateStats() {
  const minutes = (Date.now() - startTime) / 60000;

  // Standard WPM: typed characters / 5 / elapsed minutes
  const typedChars = typedIndex;
  const wpm = minutes > 0 ? Math.round((typedChars / 5) / minutes) : 0;
  wpmEl.textContent = wpm;

  // Accuracy
  if (totalKeysPressed > 0) {
    const acc = Math.round((correctKeys / totalKeysPressed) * 100);
    accuracyEl.textContent = `${acc}%`;
  }

  // Progress
  const pct = Math.round((typedIndex / chars.length) * 100);
  progressEl.textContent = `${pct}%`;
}

/* ===================================================================
   Input handling
   =================================================================== */
function handleInput() {
  if (!started || finished) return;

  const typed = inputArea.value;
  const newLength = typed.length;

  if (newLength === 0) {
    // User cleared the field – reset all highlighting
    typedIndex     = 0;
    totalKeysPressed = 0;
    correctKeys    = 0;
    chars.forEach(span => {
      span.className = 'char untyped';
    });
    chars[0].classList.add('cursor');
    updateStats();
    return;
  }

  // Process each character position up to what's been typed
  let allCorrectSoFar = true;
  for (let i = 0; i < chars.length; i++) {
    const span = chars[i];
    if (i < newLength) {
      const expected = span.dataset.char;
      const actual   = typed[i];
      span.classList.remove('untyped', 'correct', 'incorrect', 'cursor');
      if (actual === expected) {
        span.classList.add('correct');
      } else {
        span.classList.add('incorrect');
        allCorrectSoFar = false;
      }
    } else if (i === newLength) {
      span.className = 'char untyped cursor';
    } else {
      span.className = 'char untyped';
    }
  }

  // Count this key press
  if (newLength > typedIndex) {
    // Characters were added
    for (let i = typedIndex; i < newLength; i++) {
      totalKeysPressed++;
      if (typed[i] === chars[i].dataset.char) {
        correctKeys++;
      }
    }
  } else if (newLength < typedIndex) {
    // Characters were deleted – re-tally from scratch for accuracy
    totalKeysPressed = 0;
    correctKeys = 0;
    for (let i = 0; i < newLength; i++) {
      totalKeysPressed++;
      if (typed[i] === chars[i].dataset.char) {
        correctKeys++;
      }
    }
  }

  typedIndex = newLength;
  updateStats();

  // Scroll the cursor character into view
  if (typedIndex < chars.length) {
    chars[typedIndex].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  // Check for completion: user has typed all characters
  if (typedIndex === chars.length) {
    finishGame();
  }
}

/* ===================================================================
   Game lifecycle
   =================================================================== */
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

  // Final elapsed time in whole seconds
  elapsedSeconds = Math.max(1, Math.floor((Date.now() - startTime) / 1000));
  const minutes  = elapsedSeconds / 60;
  const finalWpm = Math.round((chars.length / 5) / minutes);
  const finalAcc = totalKeysPressed > 0
    ? Math.round((correctKeys / totalKeysPressed) * 100)
    : 100;

  finalWpmEl.textContent      = `${finalWpm} WPM`;
  finalAccuracyEl.textContent = `${finalAcc}%`;
  finalTimeEl.textContent     = formatTime(elapsedSeconds);
  finalStoryEl.textContent    = currentStory.title;

  showScreen(resultsScreen);
}

/* ===================================================================
   Event listeners
   =================================================================== */
startBtn.addEventListener('click', startGame);

resetBtn.addEventListener('click', () => {
  if (currentStory) loadStory(currentStory);
});

backBtn.addEventListener('click', () => {
  clearInterval(timerInterval);
  showScreen(selectionScreen);
});

retryBtn.addEventListener('click', () => {
  if (currentStory) loadStory(currentStory);
});

homeBtn.addEventListener('click', () => {
  showScreen(selectionScreen);
});

inputArea.addEventListener('input', handleInput);

// Prevent Tab from leaving the textarea during gameplay
inputArea.addEventListener('keydown', e => {
  if (e.key === 'Tab') e.preventDefault();
});

/* ===================================================================
   Initialise
   =================================================================== */
buildStoryGrid();
showScreen(selectionScreen);
