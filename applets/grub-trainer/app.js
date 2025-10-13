// State
const state = {
  mode: null,
  currentProblem: 0,
  problems: [],
  answers: [],
  times: [],
  startTime: null,
  problemStartTime: null,
  isMuted: false,
  timerInterval: null,
  endTime: null
};

// Configuration
const TESTING_MODE = false; // Set to true for testing (8 problems)
const TOTAL_PROBLEMS = TESTING_MODE ? 8 : 46;
const MILESTONES = TESTING_MODE
  ? { checkpoint1: 2, checkpoint2: 4, checkpoint3: 6, final: 8 }
  : { checkpoint1: 11, checkpoint2: 23, checkpoint3: 35, final: 46 };
const WINNING_TIME_THRESHOLD = 90000; // 90 seconds in ms

// Audio
const sounds = {
  ding: new Audio('assets/sounds/ding-402325.mp3'),
  buzzer: new Audio('assets/sounds/wrong-47985.mp3'),
  shatter: new Audio('assets/sounds/glass-break-3-102271.mp3'),
  success: new Audio('assets/sounds/success.wav'),
  checkpoint1: new Audio('assets/sounds/checkpoint_1.wav'),
  checkpoint2: new Audio('assets/sounds/checkpoint_2.wav'),
  checkpoint3: new Audio('assets/sounds/checkpoint_3.wav')
};

// Preload sounds and set volume
Object.values(sounds).forEach(sound => {
  sound.load();
  sound.volume = 0.4; // 40% volume
});

// DOM Elements
const modeScreen = document.getElementById('mode-screen');
const gameScreen = document.getElementById('game-screen');
const resultsScreen = document.getElementById('results-screen');
const practiceBtn = document.getElementById('practice-btn');
const steelGrubBtn = document.getElementById('steel-grub-btn');
const muteCheckbox = document.getElementById('mute-checkbox');
const progressBar = document.getElementById('progress-bar');
const problemDisplay = document.getElementById('problem-display');
const answerInput = document.getElementById('answer-input');
const resultsContent = document.getElementById('results-content');
const timerDisplay = document.getElementById('timer-display');
const practiceCountDropdown = document.getElementById('practice-count');

// Event Listeners
practiceBtn.addEventListener('click', () => {
  const practiceCount = parseInt(practiceCountDropdown.value);
  startGame('practice', practiceCount);
});
steelGrubBtn.addEventListener('click', () => startGame('steel-grub'));
muteCheckbox.addEventListener('change', () => {
  state.isMuted = muteCheckbox.checked;
});
answerInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') submitAnswer();
});

// Problem Generation
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateProblem(type) {
  let a, b, answer, question;

  switch(type) {
    case 'add':
      a = rand(2, 50);
      b = rand(2, 50);
      answer = a + b;
      question = `${a} + ${b}`;
      break;
    case 'subtract':
      a = rand(2, 50);
      b = rand(2, 50);
      answer = a - b;
      question = `${a} - ${b}`;
      break;
    case 'multiply':
      a = rand(2, 12);
      b = rand(2, 12);
      answer = a * b;
      question = `${a} × ${b}`;
      break;
    case 'divide':
      b = rand(2, 12);
      answer = rand(2, 12);
      a = b * answer;
      question = `${a} ÷ ${b}`;
      break;
  }

  return { question, answer, type };
}

function generateAllProblems(count = TOTAL_PROBLEMS) {
  const types = ['add', 'subtract', 'multiply', 'divide'];
  const problems = [];

  // Generate problems with even distribution
  for (let i = 0; i < count; i++) {
    const type = types[i % 4];
    problems.push(generateProblem(type));
  }

  // Shuffle using Fisher-Yates
  for (let i = problems.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [problems[i], problems[j]] = [problems[j], problems[i]];
  }

  return problems;
}

// Game Control
function startGame(mode, customCount = null) {
  state.mode = mode;
  state.currentProblem = 0;

  // Use custom count for practice mode, otherwise use TOTAL_PROBLEMS
  const problemCount = (mode === 'practice' && customCount) ? customCount : TOTAL_PROBLEMS;
  state.problems = generateAllProblems(problemCount);
  state.answers = [];
  state.times = [];
  state.startTime = performance.now();
  state.problemStartTime = performance.now();

  // Initialize progress bar
  progressBar.innerHTML = '';
  progressBar.className = problemCount === 46 ? 'progress-bar progress-bar-46' : 'progress-bar';
  for (let i = 0; i < problemCount; i++) {
    const circle = document.createElement('div');
    circle.className = 'progress-circle';
    circle.id = `circle-${i}`;
    progressBar.appendChild(circle);
  }

  // Start timer display
  updateTimerDisplay();

  showScreen('game');
  displayProblem();
  answerInput.focus();
}

function displayProblem() {
  const problem = state.problems[state.currentProblem];
  problemDisplay.textContent = problem.question;
  answerInput.value = '';
}

function submitAnswer() {
  const userAnswer = parseInt(answerInput.value);
  if (isNaN(userAnswer)) return;

  const problem = state.problems[state.currentProblem];
  const correct = userAnswer === problem.answer;
  const timeTaken = performance.now() - state.problemStartTime;

  state.answers.push({ userAnswer, correct, expected: problem.answer });
  state.times.push(timeTaken);

  // Update UI
  updateProgress(state.currentProblem, correct);
  playFeedbackSound(correct, state.currentProblem + 1);
  flashInput(correct);

  // Check game end conditions
  if (state.mode === 'steel-grub' && !correct) {
    state.endTime = performance.now(); // Capture end time before animations
    setTimeout(() => {
      playShatterAnimation();
      setTimeout(() => endGame(), 1500);
    }, 500);
  } else if (state.currentProblem === state.problems.length - 1) {
    state.endTime = performance.now(); // Capture end time before animations
    setTimeout(() => endGame(), 800);
  } else {
    state.currentProblem++;
    state.problemStartTime = performance.now();
    setTimeout(() => displayProblem(), 300);
  }

  answerInput.focus();
}

function updateProgress(index, correct) {
  const circle = document.getElementById(`circle-${index}`);

  if (state.mode === 'practice') {
    circle.classList.add(correct ? 'correct' : 'incorrect');
  } else {
    if (correct) {
      // Check for special milestones
      const milestone = checkMilestone(index + 1);
      if (milestone) {
        const img = document.createElement('img');
        img.src = milestone;
        circle.appendChild(img);
      } else {
        const img = document.createElement('img');
        img.src = 'assets/images/grub_icon.png';
        circle.appendChild(img);
      }
      circle.classList.add('correct', 'has-icon');
    }
  }
}

function checkMilestone(problemNumber) {
  if (problemNumber === MILESTONES.checkpoint2) return 'assets/images/grubsong_charm.png';
  if (problemNumber === MILESTONES.final) return 'assets/images/grubberfly_charm.png';
  return null;
}

function playFeedbackSound(correct, problemNumber) {
  if (state.isMuted) return;

  if (correct) {
    if (state.mode === 'steel-grub') {
      if (problemNumber === MILESTONES.checkpoint1) {
        sounds.checkpoint1.play();
      } else if (problemNumber === MILESTONES.checkpoint2) {
        sounds.checkpoint2.play();
      } else if (problemNumber === MILESTONES.checkpoint3) {
        sounds.checkpoint3.play();
      } else if (problemNumber === MILESTONES.final) {
        sounds.success.play();
      } else {
        sounds.ding.play();
      }
    } else {
      sounds.ding.play();
    }
  } else {
    sounds.buzzer.play();
  }
}

function flashInput(correct) {
  answerInput.classList.add(correct ? 'correct-flash' : 'incorrect-flash');
  setTimeout(() => {
    answerInput.classList.remove('correct-flash', 'incorrect-flash');
  }, 500);
}

function playShatterAnimation() {
  if (!state.isMuted) sounds.shatter.play();

  const circles = document.querySelectorAll('.progress-circle');
  circles.forEach((circle, index) => {
    setTimeout(() => {
      circle.classList.add('shatter');
    }, index * 20);
  });
}

function endGame() {
  showScreen('results');
  renderResults();
}

// Results
function renderResults() {
  const totalTime = (state.endTime || performance.now()) - state.startTime;
  const incorrectCount = state.answers.filter(a => !a.correct).length;
  const problemsCompleted = state.currentProblem + (state.answers[state.currentProblem]?.correct !== false ? 1 : 0);

  let html = '<div class="results-header">';

  // Special images for Steel-Grub
  if (state.mode === 'steel-grub') {
    if (incorrectCount > 0) {
      html += '<img src="assets/images/grub_bottle.png" alt="Disappointed Grub">';
      html += '<h2>Oh no! The grubs are still trapped!</h2>';

      // Encouragement based on how far they got
      const correctCount = state.answers.filter(a => a.correct).length;
      if (correctCount <= 5) {
        html += '<p class="encouragement-message">Tough run, huh? Maybe hit practice mode to get back in the groove.</p>';
      } else if (correctCount > 35) {
        html += '<p class="encouragement-message">That was close! I believe you can do it!</p>';
      }
    } else if (totalTime <= WINNING_TIME_THRESHOLD) {
      // Winner ticket!
      html += '<img src="assets/images/grub_freed.gif" alt="Freed Grub">';
      html += '<h2>You freed all the grubs!</h2>';
      html += '<p class="encouragement-message">Look at him, he\'s so happy.</p>';
      html += '<div class="ticket">';
      html += '<h3>🐛🎉 CERTIFICATE OF COMPLETION 🎉🐛</h3>';
      html += `<p>You saved all ${state.problems.length} grubs in record time, without making a single mistake! You're a true master of the grubbly arts. Print this certificate and present it to your boyfriend to win a special Grub Plush!</p>`;
      html += `<p style="margin-top: 20px; font-weight: bold;">Time: ${formatTime(totalTime)}</p>`;
      html += '</div>';
    } else {
      html += '<img src="assets/images/grub_freed.gif" alt="Freed Grub">';
      html += '<h2>You freed all the grubs!</h2>';
      html += '<p class="encouragement-message">Look at him, he\'s so happy.</p>';
      html += '<p class="completion-message">Good job, you\'ve finished Steel-Grub mode! You could stop here...</p>';
      html += '<p class="hint-message">Or, if you manage to save all the grubs in less than 90 seconds, you could win yourself a special prize...</p>';
    }
  } else {
    html += '<h2>Practice Complete!</h2>';

    // Perfect score encouragement for Practice mode
    if (incorrectCount === 0) {
      const nextTier = state.problems.length === 5 ? 10 :
                       state.problems.length === 10 ? 20 :
                       state.problems.length === 20 ? 46 : null;

      if (nextTier) {
        html += `<p class="perfect-message">You got all ${state.problems.length} right! Next up: Do it with ${nextTier}!</p>`;
      } else if (state.problems.length === 46) {
        html += '<p class="perfect-message">Incredible! With skills like that, you might even manage to save the grubs in Steel-Grub mode!</p>';
      }
    }
  }

  html += '</div>';

  // Summary
  html += '<div class="results-summary">';
  const correctCount = state.answers.filter(a => a.correct).length;

  if (state.mode === 'practice') {
    html += `<p><strong>Correct Answers:</strong> ${correctCount} / ${state.problems.length}</p>`;
  } else {
    html += `<p><strong>Problems Completed:</strong> ${problemsCompleted} / ${state.problems.length}</p>`;
    // Don't show incorrect count for successful completions
  }

  html += `<p><strong>Total Time:</strong> ${formatTime(totalTime)}</p>`;
  html += '</div>';

  // Buttons
  html += '<div style="text-align: center;">';
  html += '<button class="btn" onclick="toggleDetailedBreakdown()">Show Detailed Breakdown</button>';
  html += '<button class="btn" onclick="location.reload()">Play Again</button>';
  html += '</div>';

  // Detailed breakdown (hidden by default)
  html += '<div id="detailed-breakdown" style="display: none;">';
  html += renderDetailedBreakdown();
  html += '</div>';

  resultsContent.innerHTML = html;
}

function renderDetailedBreakdown() {
  let html = '<div class="detailed-breakdown">';
  html += '<h3>Problem Breakdown</h3>';
  html += '<div class="problem-row header">';
  html += '<div>#</div><div>Problem</div><div>Your Answer</div><div class="time">Time</div>';
  html += '</div>';

  const problemsToShow = state.currentProblem + 1;

  for (let i = 0; i < problemsToShow; i++) {
    const problem = state.problems[i];
    const answer = state.answers[i];
    const time = state.times[i];

    html += '<div class="problem-row">';
    html += `<div>${i + 1}</div>`;
    html += `<div>${problem.question} = ${problem.answer}</div>`;

    if (answer) {
      const statusClass = answer.correct ? 'correct' : 'incorrect';
      const statusText = answer.correct ? '✓' : '✗';
      html += `<div class="status ${statusClass}">${answer.userAnswer} ${statusText}</div>`;
    } else {
      html += '<div>—</div>';
    }

    html += `<div class="time">${time ? formatTime(time) : '—'}</div>`;
    html += '</div>';
  }

  html += '</div>';
  return html;
}

function formatTime(ms) {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  const remainingMs = Math.floor((ms % 1000) / 100);

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  } else {
    return `${remainingSeconds}.${remainingMs}s`;
  }
}

function toggleDetailedBreakdown() {
  const breakdown = document.getElementById('detailed-breakdown');
  breakdown.style.display = breakdown.style.display === 'none' ? 'block' : 'none';
}

// Timer Display
function updateTimerDisplay() {
  if (state.timerInterval) clearInterval(state.timerInterval);

  state.timerInterval = setInterval(() => {
    const elapsed = performance.now() - state.startTime;
    const seconds = Math.floor(elapsed / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    timerDisplay.textContent = `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }, 100);
}

// Screen Management
function showScreen(screenName) {
  [modeScreen, gameScreen, resultsScreen].forEach(screen => {
    screen.classList.remove('active');
  });

  if (screenName === 'mode') modeScreen.classList.add('active');
  if (screenName === 'game') gameScreen.classList.add('active');
  if (screenName === 'results') {
    resultsScreen.classList.add('active');
    if (state.timerInterval) {
      clearInterval(state.timerInterval);
      state.timerInterval = null;
    }
  }
}
