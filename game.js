// ─── QUESTIONS ───────────────────────────────────────────────────
const QUESTIONS = [
  {
    q: "เมืองหลวงของประเทศไทยคืออะไร?",
    choices: ["เชียงใหม่","กรุงเทพมหานคร","พัทยา","ภูเก็ต"],
    answer: 1
  },
  {
    q: "ภาษาโปรแกรมใดที่รันบน Browser โดยตรง?",
    choices: ["Python","Java","JavaScript","C++"],
    answer: 2
  },
  {
    q: "ดาวเคราะห์ใดใหญ่ที่สุดในระบบสุริยะ?",
    choices: ["ดาวอังคาร","โลก","ดาวเสาร์","ดาวพฤหัส"],
    answer: 3
  },
  {
    q: "HTML ย่อมาจากอะไร?",
    choices: [
      "HyperText Markup Language",
      "High Transfer Markup Language",
      "HyperText Media Language",
      "Home Tool Markup Language"
    ],
    answer: 0
  },
  {
    q: "ใครเป็นผู้สร้าง Facebook?",
    choices: ["Bill Gates","Steve Jobs","Mark Zuckerberg","Elon Musk"],
    answer: 2
  },
  {
    q: "2 ยกกำลัง 10 เท่ากับเท่าไร?",
    choices: ["512","1024","2048","256"],
    answer: 1
  },
  {
    q: "CSS ย่อมาจากอะไร?",
    choices: [
      "Creative Style Sheets",
      "Cascading Style Sheets",
      "Computer Style Sheets",
      "Colorful Style Sheets"
    ],
    answer: 1
  },
  {
    q: "ประเทศใดมีประชากรมากที่สุดในโลก?",
    choices: ["อินเดีย","สหรัฐอเมริกา","จีน","บราซิล"],
    answer: 0
  },
  {
    q: "ฉลามวาฬเป็นสัตว์ประเภทใด?",
    choices: ["สัตว์เลี้ยงลูกด้วยนม","ปลา","สัตว์เลื้อยคลาน","สัตว์สะเทินน้ำสะเทินบก"],
    answer: 1
  },
  {
    q: "Git คืออะไร?",
    choices: [
      "ภาษาโปรแกรม",
      "ระบบ Version Control",
      "เว็บเบราว์เซอร์",
      "ระบบปฏิบัติการ"
    ],
    answer: 1
  }
];

const CHOICE_COLORS = ["#e74c3c","#3498db","#f39c12","#9b59b6"];
const CHOICE_ICONS  = ["▲","♦","●","■"];
const MAX_TIME = 20;

// ─── STATE ────────────────────────────────────────────────────────
let playerName  = "ผู้เล่น";
let score       = 0;
let currentQ    = 0;
let timeLeft    = MAX_TIME;
let timerID     = null;
let answered    = false;
let aiScores    = [];

// ─── HELPERS ─────────────────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function calcPoints(remaining) {
  return Math.max(100, Math.round(1000 * (remaining / MAX_TIME)));
}

// ─── LOBBY ───────────────────────────────────────────────────────
function startGame() {
  const nameInput = document.getElementById('player-name').value.trim();
  playerName = nameInput || "ผู้เล่น";
  score = 0; currentQ = 0;

  // Fake AI opponents
  const aiNames = ["BotA 🤖","BotB 🤖","BotC 🤖"];
  aiScores = aiNames.map(n => ({ name: n, score: 0 }));

  loadQuestion();
  show('screen-question');
}

// ─── QUESTION ────────────────────────────────────────────────────
function loadQuestion() {
  answered = false;
  timeLeft = MAX_TIME;
  const q = QUESTIONS[currentQ];

  document.getElementById('question-counter').textContent =
    `คำถาม ${currentQ + 1}/${QUESTIONS.length}`;
  document.getElementById('question-text').textContent = q.q;

  const choicesEl = document.getElementById('choices');
  choicesEl.innerHTML = '';
  q.choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.style.background = CHOICE_COLORS[i];
    btn.textContent = `${CHOICE_ICONS[i]} ${c}`;
    btn.onclick = () => selectAnswer(i);
    choicesEl.appendChild(btn);
  });

  // Timer bar
  const bar = document.getElementById('timer-bar');
  bar.style.transition = 'none';
  bar.style.width = '100%';
  setTimeout(() => {
    bar.style.transition = `width ${MAX_TIME}s linear`;
    bar.style.width = '0%';
  }, 50);

  clearInterval(timerID);
  timerID = setInterval(tickTimer, 1000);
  document.getElementById('timer-text').textContent = timeLeft;
}

function tickTimer() {
  timeLeft--;
  document.getElementById('timer-text').textContent = timeLeft;
  if (timeLeft <= 0) {
    clearInterval(timerID);
    if (!answered) timeUp();
  }
}

function selectAnswer(idx) {
  if (answered) return;
  answered = true;
  clearInterval(timerID);

  const q = QUESTIONS[currentQ];
  const btns = document.querySelectorAll('.choice-btn');
  const isCorrect = idx === q.answer;
  const pts = isCorrect ? calcPoints(timeLeft) : 0;
  score += pts;

  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else if (i === idx)  btn.classList.add('wrong');
    else                 btn.classList.add('revealed');
  });

  // AI answers
  aiScores.forEach(ai => {
    const correct = Math.random() < 0.55;
    if (correct) ai.score += calcPoints(Math.random() * MAX_TIME);
  });

  setTimeout(() => showResult(isCorrect, pts, q.choices[q.answer]), 900);
}

function timeUp() {
  answered = true;
  const btns = document.querySelectorAll('.choice-btn');
  const q = QUESTIONS[currentQ];
  btns.forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else btn.classList.add('revealed');
  });
  aiScores.forEach(ai => {
    const correct = Math.random() < 0.6;
    if (correct) ai.score += calcPoints(Math.random() * MAX_TIME);
  });
  setTimeout(() => showResult(false, 0, q.choices[q.answer]), 900);
}

// ─── RESULT ──────────────────────────────────────────────────────
function showResult(correct, pts, correctText) {
  document.getElementById('result-icon').textContent  = correct ? '✅' : '❌';
  document.getElementById('result-msg').textContent   = correct ? 'ถูกต้อง! 🎉' : 'ผิด...';
  document.getElementById('result-points').textContent = correct ? `+${pts} คะแนน` : '0 คะแนน';
  document.getElementById('correct-answer-label').textContent =
    `คำตอบที่ถูก: ${correctText}`;
  show('screen-result');
}

function nextQuestion() {
  currentQ++;
  if (currentQ < QUESTIONS.length) {
    loadQuestion();
    show('screen-question');
  } else {
    showFinal();
  }
}

// ─── FINAL ───────────────────────────────────────────────────────
function showFinal() {
  const all = [
    { name: playerName + " 🙋", score, me: true },
    ...aiScores
  ].sort((a, b) => b.score - a.score);

  const myRank = all.findIndex(p => p.me) + 1;
  const rankEmoji = ["🥇","🥈","🥉"][myRank - 1] || `#${myRank}`;

  document.getElementById('final-name').textContent = playerName;
  document.getElementById('final-score').textContent = `${score.toLocaleString()} คะแนน`;
  document.getElementById('final-rank').textContent  = `อันดับ ${rankEmoji}`;

  const lb = document.getElementById('leaderboard');
  lb.innerHTML = all.map((p, i) => `
    <div class="lb-row ${p.me ? 'me' : ''}">
      <span class="lb-rank">${["🥇","🥈","🥉"][i] || i+1}</span>
      <span class="lb-name">${p.name}</span>
      <span class="lb-score">${p.score.toLocaleString()}</span>
    </div>
  `).join('');

  show('screen-final');
}

function restartGame() {
  show('screen-lobby');
}
