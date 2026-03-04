/**
 * TypeRacer – offline typing speed & accuracy trainer
 *
 * Stories are embedded directly so the app works when opened
 * as a local file (file:// protocol) without any server.
 */


/* ===================================================================
   Story data  – add new entries here to add more stories
   =================================================================== */
let STORIES = [];

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
const mistakesEl = document.getElementById('mistakes');
const progressEl = document.getElementById('progress');
const timerEl    = document.getElementById('timer');

const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const backBtn  = document.getElementById('back-btn');
const retryBtn = document.getElementById('retry-btn');
const homeBtn  = document.getElementById('home-btn');

const finalWpmEl      = document.getElementById('final-wpm');
const finalAccuracyEl = document.getElementById('final-accuracy');
const finalMistakesEl = document.getElementById('final-mistakes');
const finalTimeEl     = document.getElementById('final-time');
const finalStoryEl    = document.getElementById('final-story');

/* ===================================================================
   Game state
   =================================================================== */
let currentStory   = null;   // story object
let storyWords     = [];     // array of word strings from the story
let words          = [];     // array of word DOM spans
let currentWordIndex = 0;
let totalMistakes  = 0;
let currentPaddingTop = 20;  // matches CSS padding-top
let lastInputLength = 0;
let started        = false;
let finished       = false;
let startTime      = null;
let timerInterval  = null;
let elapsedSeconds = 0;

// Typing metrics
let typedCharsCount   = 0;   // total characters in correctly typed words (for WPM)
let totalTextChars    = 0;   // total characters in the entire story text
let totalCharsTyped   = 0;   // total characters typed by the user (for accuracy)

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

/**
 * Scrolls the text display so the current word's line is at the top.
 */
function updateLineScroll() {
  const word = words[currentWordIndex];
  if (!word) return;

  // Calculate the scroll position to put the current line at the top padding
  const targetScroll = word.offsetTop - currentPaddingTop;
  
  textDisplay.scrollTo({
    top: targetScroll,
    behavior: 'smooth'
  });
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
    textDisplay.appendChild(document.createTextNode(' ')); // Add space between words
  });

  // Mark the first character as the cursor position
  if (words.length) words[0].classList.add('cursor');
}

/* ===================================================================
   Game state management
   =================================================================== */
function resetState() {
  started        = false;
  finished       = false;
  startTime      = null;
  elapsedSeconds = 0;
  currentWordIndex = 0;
  totalMistakes  = 0;
  lastInputLength = 0;
  typedCharsCount = 0;
  totalCharsTyped = 0;

  clearInterval(timerInterval);
  timerInterval = null;

  inputArea.value   = '';
  inputArea.disabled = true;

  startBtn.textContent = '▶ Start';
  startBtn.disabled    = false;

  wpmEl.textContent      = '0';
  accuracyEl.textContent = '—';
  mistakesEl.textContent = '0';
  progressEl.textContent = '0%';
  timerEl.textContent    = '0s';

  // Reset all character classes
  words.forEach(span => {
    span.className = 'word untyped';
  });
  if (words.length) words[0].classList.add('cursor');
  textDisplay.scrollTop = 0;
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

  // Standard WPM: (correctly typed characters / 5) / elapsed minutes
  const wpm = minutes > 0 ? Math.round((typedCharsCount / 5) / minutes) : 0;
  wpmEl.textContent = wpm;

  // Accuracy
  if (totalCharsTyped > 0) {
    const correctChars = totalCharsTyped - totalMistakes;
    const acc = Math.round((correctChars / totalCharsTyped) * 100);
    accuracyEl.textContent = `${acc}%`;
  } else {
    accuracyEl.textContent = '—';
  }

  // Progress
  const pct = totalTextChars > 0
    ? Math.round((typedCharsCount / totalTextChars) * 100)
    : 0;
  progressEl.textContent = `${pct}%`;
}

/* ===================================================================
   Input handling
   =================================================================== */
/**
 * Handles word submission when the user presses the spacebar.
 */
function handleWordSubmission(e) {
  if (!started || finished || e.key !== ' ') return;

  const typedWord = inputArea.value;
  const expectedWord = storyWords[currentWordIndex];
  const currentWordSpan = words[currentWordIndex];

  if (typedWord === expectedWord) {
    e.preventDefault(); // Prevent space from being typed

    // Correct word
    typedCharsCount += typedWord.length + 1; // +1 for the space

    // Mark all characters in the word as correct
    const charSpans = currentWordSpan.querySelectorAll('.char');
    charSpans.forEach(span => span.className = 'char correct');

    currentWordSpan.classList.remove('cursor');

    // Move to the next word
    currentWordIndex++;
    inputArea.value = '';
    lastInputLength = 0;

    // Check for game completion
    if (currentWordIndex === storyWords.length) {
      typedCharsCount--; // Don't count the final space
      finishGame();
      return;
    }

    // Set cursor on the new current word
    const nextWordSpan = words[currentWordIndex];
    nextWordSpan.classList.add('cursor');
    updateLineScroll();

  } else {
    // Incorrect word: Do not advance. Mistakes are counted per character in handleRealtimeValidation.
  }
}

/**
 * Provides real-time feedback on the input field for the current word.
 */
function handleRealtimeValidation() {
  if (!started || finished) return;

  const typedText = inputArea.value;
  const expectedWord = storyWords[currentWordIndex];
  const currentWordSpan = words[currentWordIndex];

  // Count mistakes for newly typed characters
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

  // 1. Character-level highlighting
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

  // Auto-submit if it's the last word and correct
  if (currentWordIndex === storyWords.length - 1 && typedText === expectedWord) {
    // Update stats
    typedCharsCount += typedText.length;

    // Mark all characters in the word as correct
    charSpans.forEach(span => span.className = 'char correct');

    currentWordSpan.classList.remove('cursor');

    // Finish game
    currentWordIndex++;
    inputArea.value = '';
    finishGame();
    return;
  }

  // Highlight input box if the current typing is not a valid prefix
  if (expectedWord.startsWith(typedText)) {
    inputArea.classList.remove('input-error');
  } else {
    inputArea.classList.add('input-error');
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
  const minutes = elapsedSeconds / 60;
  const finalWpm = Math.round((typedCharsCount / 5) / minutes);
  const correctChars = totalCharsTyped - totalMistakes;
  const finalAcc = totalCharsTyped > 0
    ? Math.round((correctChars / totalCharsTyped) * 100)
    : 100;

  finalWpmEl.textContent      = `${finalWpm} WPM`;
  finalAccuracyEl.textContent = `${finalAcc}%`;
  finalMistakesEl.textContent = totalMistakes;
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

inputArea.addEventListener('keydown', handleWordSubmission);
inputArea.addEventListener('input', handleRealtimeValidation);

// Prevent Tab from leaving the textarea during gameplay
inputArea.addEventListener('keydown', e => {
  if (e.key === 'Tab') e.preventDefault();
});

// Update scroll position if window resizes (text reflows)
window.addEventListener('resize', () => {
  if (currentStory && !finished) updateLineScroll();
});

/* ===================================================================
   Initialise
   =================================================================== */
async function initialize() {
  if (window.location.protocol === 'file:') {
    alert(
      "⚠️ Security Restriction ⚠️\n\n" +
      "Browsers block 'fetch' requests to local files for security.\n" +
      "To load stories from external files, you must run a local web server (e.g., 'python3 -m http.server')."
    );
  }

  // Fetch the list of stories from STORIES.json
  try {
    const response = await fetch('STORIES.json');
    if (!response.ok) throw new Error('Failed to load STORIES.json');
    const data = await response.json();
    STORIES = data.stories;
  } catch (error) {
    console.error('Error loading stories:', error);
  }

  // Use Promise.all to fetch all story texts in parallel at startup
  await Promise.all(STORIES.map(async (story) => {
    try {
      const response = await fetch(story.file);
      if (!response.ok) {
        throw new Error(`Network response was not ok for ${story.file}`);
      }
      story.text = await response.text();
    } catch (error) {
      console.error('There was a problem fetching the story text:', error);
      story.text = "Error: Could not load story text."; // Provide fallback
    }
  }));

  // Now that all texts are loaded, build the UI
  buildStoryGrid();
  showScreen(selectionScreen);
}

initialize();
