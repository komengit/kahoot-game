// ════════════════════════════════════════════════════════════════
//  QuizBlast  —  game.js
// ════════════════════════════════════════════════════════════════

// ── DEFAULT QUESTION SET ────────────────────────────────────────
const DEFAULT_SET = {
  id: 'default',
  name: '🎓 คำถามพื้นฐาน (ค่าเริ่มต้น)',
  questions: [
    { q:'เมืองหลวงของประเทศไทยคืออะไร?',
      choices:['เชียงใหม่','กรุงเทพมหานคร','พัทยา','ภูเก็ต'], answer:1 },
    { q:'ภาษาโปรแกรมใดที่รันบน Browser โดยตรง?',
      choices:['Python','Java','JavaScript','C++'], answer:2 },
    { q:'ดาวเคราะห์ใดใหญ่ที่สุดในระบบสุริยะ?',
      choices:['ดาวอังคาร','โลก','ดาวเสาร์','ดาวพฤหัส'], answer:3 },
    { q:'HTML ย่อมาจากอะไร?',
      choices:['HyperText Markup Language','High Transfer Markup Language',
               'HyperText Media Language','Home Tool Markup Language'], answer:0 },
    { q:'ใครเป็นผู้สร้าง Facebook?',
      choices:['Bill Gates','Steve Jobs','Mark Zuckerberg','Elon Musk'], answer:2 },
    { q:'2 ยกกำลัง 10 เท่ากับเท่าไร?',
      choices:['512','1024','2048','256'], answer:1 },
    { q:'CSS ย่อมาจากอะไร?',
      choices:['Creative Style Sheets','Cascading Style Sheets',
               'Computer Style Sheets','Colorful Style Sheets'], answer:1 },
    { q:'ประเทศใดมีประชากรมากที่สุดในโลก?',
      choices:['อินเดีย','สหรัฐอเมริกา','จีน','บราซิล'], answer:0 },
    { q:'ฉลามวาฬเป็นสัตว์ประเภทใด?',
      choices:['สัตว์เลี้ยงลูกด้วยนม','ปลา','สัตว์เลื้อยคลาน','สัตว์สะเทินน้ำสะเทินบก'], answer:1 },
    { q:'Git คืออะไร?',
      choices:['ภาษาโปรแกรม','ระบบ Version Control','เว็บเบราว์เซอร์','ระบบปฏิบัติการ'], answer:1 }
  ]
};

const COLORS = ['#e74c3c','#3498db','#f39c12','#9b59b6'];
const ICONS  = ['▲','♦','●','■'];
const MAX_TIME = 20;

// ── STATE ───────────────────────────────────────────────────────
let currentSet    = DEFAULT_SET;
let selectedSetId = 'default';
let editingSetId  = null;
let editorQs      = [];
let playerName    = 'ผู้เล่น';
let score         = 0;
let currentQ      = 0;
let timeLeft      = MAX_TIME;
let timerID       = null;
let answered      = false;
let aiScores      = [];

// ════════════════════════════════════════════════════════════════
//  AUDIO  (Web Audio API — no external files needed)
// ════════════════════════════════════════════════════════════════
let _ac = null;
function ac() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
}

function beep(freq, dur, type, vol, delay) {
  try {
    const ctx = ac();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    const t = ctx.currentTime + (delay || 0);
    g.gain.setValueAtTime(vol || 0.2, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.start(t); o.stop(t + dur + 0.01);
  } catch(e) {}
}

// button click
function sfxClick() { beep(700, 0.045, 'sine', 0.12); }

// timer tick — normal vs urgent
function sfxTick(urgent) {
  if (urgent) {
    beep(1047, 0.055, 'square', 0.13);
  } else {
    beep(660,  0.065, 'square', 0.07);
  }
}

// correct answer: ascending chime
function sfxCorrect() {
  [523, 659, 784, 1047].forEach((f, i) => beep(f, 0.2, 'sine', 0.2, i * 0.11));
}

// wrong answer: descending buzz
function sfxWrong() {
  beep(280, 0.22, 'sawtooth', 0.25, 0.0);
  beep(210, 0.22, 'sawtooth', 0.2,  0.22);
}

// game start fanfare
function sfxStart() {
  [392, 523, 659, 784, 1047].forEach((f, i) => beep(f, 0.15, 'triangle', 0.18, i * 0.09));
}

// ════════════════════════════════════════════════════════════════
//  LOCAL STORAGE — custom question sets
// ════════════════════════════════════════════════════════════════
function getSets() {
  try {
    const raw = localStorage.getItem('qb_sets');
    return [DEFAULT_SET, ...(raw ? JSON.parse(raw) : [])];
  } catch(e) { return [DEFAULT_SET]; }
}

function persistSets(sets) {
  try {
    localStorage.setItem('qb_sets', JSON.stringify(sets.filter(s => s.id !== 'default')));
  } catch(e) {}
}

// ════════════════════════════════════════════════════════════════
//  SCREEN HELPER
// ════════════════════════════════════════════════════════════════
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ════════════════════════════════════════════════════════════════
//  ① MENU
// ════════════════════════════════════════════════════════════════
function showSets() {
  sfxClick();
  renderSets();
  show('screen-sets');
}

// ════════════════════════════════════════════════════════════════
//  ② SET PICKER
// ════════════════════════════════════════════════════════════════
function renderSets() {
  const sets = getSets();
  document.getElementById('set-list').innerHTML = sets.map(s => `
    <div class="set-item ${s.id === selectedSetId ? 'selected' : ''}" onclick="selectSet('${s.id}')">
      <div class="set-info">
        <span class="set-name">${s.name}</span>
        <span class="set-count">${s.questions.length} คำถาม</span>
      </div>
      <div class="set-btns">
        ${s.id !== 'default' ? `
          <button class="btn-icon" onclick="event.stopPropagation();showEditor('${s.id}')">✏️</button>
          <button class="btn-icon danger" onclick="event.stopPropagation();deleteSet('${s.id}')">🗑️</button>
        ` : ''}
      </div>
    </div>`).join('');
}

function selectSet(id) { sfxClick(); selectedSetId = id; renderSets(); }

function deleteSet(id) {
  if (!confirm('ลบชุดคำถามนี้?')) return;
  const sets = getSets().filter(s => s.id !== id);
  persistSets(sets);
  if (selectedSetId === id) selectedSetId = 'default';
  renderSets();
}

function startWithSet() {
  sfxClick();
  const sets = getSets();
  currentSet = sets.find(s => s.id === selectedSetId) || DEFAULT_SET;
  if (!currentSet.questions.length) { alert('ชุดคำถามนี้ยังว่างอยู่'); return; }
  showQR();
}

// ════════════════════════════════════════════════════════════════
//  ③ EDITOR
// ════════════════════════════════════════════════════════════════
function showEditor(setId) {
  sfxClick();
  editingSetId = setId;
  if (setId) {
    const set = getSets().find(s => s.id === setId);
    document.getElementById('set-name-input').value = set.name;
    editorQs = JSON.parse(JSON.stringify(set.questions));
  } else {
    document.getElementById('set-name-input').value = '';
    editorQs = [{ q:'', choices:['','','',''], answer:0 }];
  }
  renderEditor();
  show('screen-editor');
}

function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

function renderEditor() {
  document.getElementById('editor-questions').innerHTML = editorQs.map((q, qi) => `
    <div class="eq-block">
      <div class="eq-hdr">
        <span>📝 คำถามที่ ${qi + 1}</span>
        ${editorQs.length > 1
          ? `<button class="btn-icon danger" onclick="removeQ(${qi})">🗑️</button>`
          : ''}
      </div>
      <input class="eq-q" type="text" placeholder="พิมพ์คำถามที่นี่..."
        value="${esc(q.q)}" oninput="editorQs[${qi}].q=this.value"/>
      <div class="eq-choices">
        ${q.choices.map((c, ci) => `
          <label class="eq-choice ${ci === q.answer ? 'correct' : ''}">
            <input type="radio" name="r${qi}" ${ci === q.answer ? 'checked' : ''}
              onchange="editorQs[${qi}].answer=${ci};renderEditor()"/>
            <input class="eq-ci" type="text" placeholder="ตัวเลือก ${ci+1}"
              value="${esc(c)}" oninput="editorQs[${qi}].choices[${ci}]=this.value"/>
          </label>`).join('')}
      </div>
      <small class="eq-hint">● เลือก ○ หน้าตัวเลือกที่ถูกต้อง</small>
    </div>`).join('');
}

function addQ() {
  editorQs.push({ q:'', choices:['','','',''], answer:0 });
  renderEditor();
  document.querySelector('.editor-qs .eq-block:last-child')
    ?.scrollIntoView({ behavior:'smooth' });
}

function removeQ(i) { editorQs.splice(i, 1); renderEditor(); }

function saveSet() {
  const name = document.getElementById('set-name-input').value.trim();
  if (!name) { alert('กรุณาใส่ชื่อชุดคำถาม'); return; }
  const valid = editorQs.filter(q => q.q.trim() && q.choices.every(c => c.trim()));
  if (!valid.length) { alert('กรุณากรอกคำถามและตัวเลือกให้ครบทุกช่อง'); return; }

  const sets = getSets();
  if (editingSetId && editingSetId !== 'default') {
    const idx = sets.findIndex(s => s.id === editingSetId);
    if (idx >= 0) sets[idx] = { id: editingSetId, name, questions: valid };
  } else {
    const nid = 'set_' + Date.now();
    sets.push({ id: nid, name, questions: valid });
    selectedSetId = nid;
  }
  persistSets(sets);
  sfxCorrect();
  showSets();
}

// ════════════════════════════════════════════════════════════════
//  ④ QR CODE
// ════════════════════════════════════════════════════════════════
function showQR() {
  const url = location.href.replace(/[?#].*/, '');
  document.getElementById('qr-url').textContent = url;
  const box = document.getElementById('qr-box');
  box.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(box, { text: url, width: 200, height: 200,
      colorDark: '#2c2c54', colorLight: '#ffffff' });
  } else {
    box.innerHTML = `<p style="color:#2c2c54;padding:16px;font-size:.8rem">เปิดใน Browser เพื่อแสดง QR</p>`;
  }
  show('screen-qr');
}

function goLobby() { sfxClick(); show('screen-lobby'); }

// ════════════════════════════════════════════════════════════════
//  ⑤ LOBBY → START GAME
// ════════════════════════════════════════════════════════════════
function startGame() {
  playerName = document.getElementById('player-name').value.trim() || 'ผู้เล่น';
  score = 0; currentQ = 0;
  aiScores = ['BotA 🤖','BotB 🤖','BotC 🤖'].map(n => ({ name: n, score: 0 }));
  sfxStart();
  loadQuestion();
  show('screen-question');
}

// ════════════════════════════════════════════════════════════════
//  ⑥ QUESTION
// ════════════════════════════════════════════════════════════════
function loadQuestion() {
  answered = false;
  timeLeft = MAX_TIME;
  const q = currentSet.questions[currentQ];

  document.getElementById('q-counter').textContent =
    `คำถาม ${currentQ + 1} / ${currentSet.questions.length}`;
  document.getElementById('question-text').textContent = q.q;

  // build choice buttons
  const el = document.getElementById('choices');
  el.innerHTML = '';
  q.choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.style.background = COLORS[i];
    btn.innerHTML = `<span class="choice-icon">${ICONS[i]}</span>${c}`;
    btn.onclick = () => selectAnswer(i);
    el.appendChild(btn);
  });

  // reset timer bar
  const bar = document.getElementById('timer-bar');
  bar.style.transition = 'none';
  bar.style.width = '100%';
  setTimeout(() => {
    bar.style.transition = `width ${MAX_TIME}s linear`;
    bar.style.width = '0%';
  }, 50);

  clearInterval(timerID);
  updateTimerDisplay();
  timerID = setInterval(tick, 1000);
}

function tick() {
  timeLeft--;
  updateTimerDisplay();
  // play tick sound
  if (timeLeft <= 5)       sfxTick(true);   // urgent fast tick
  else if (timeLeft <= 10) sfxTick(false);  // normal tick
  if (timeLeft <= 0) { clearInterval(timerID); if (!answered) timeUp(); }
}

function updateTimerDisplay() {
  const el = document.getElementById('timer-text');
  el.textContent = timeLeft;
  el.className = 'timer-num';
  if      (timeLeft <= 5)  el.className += ' urgent';
  else if (timeLeft <= 10) el.className += ' warn';
}

function calcPts(rem) { return Math.max(100, Math.round(1000 * (rem / MAX_TIME))); }

function selectAnswer(idx) {
  if (answered) return;
  answered = true;
  clearInterval(timerID);
  resetTimerClass();

  const q = currentSet.questions[currentQ];
  const ok = idx === q.answer;
  const pts = ok ? calcPts(timeLeft) : 0;
  score += pts;

  document.querySelectorAll('.choice-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer)  btn.classList.add('correct');
    else if (i === idx)  btn.classList.add('wrong');
    else                 btn.classList.add('revealed');
  });

  if (ok) sfxCorrect(); else sfxWrong();

  aiScores.forEach(ai => {
    if (Math.random() < 0.55) ai.score += calcPts(Math.random() * MAX_TIME);
  });

  setTimeout(() => showResult(ok, pts, q.choices[q.answer]), 900);
}

function timeUp() {
  answered = true;
  resetTimerClass();
  const q = currentSet.questions[currentQ];
  document.querySelectorAll('.choice-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === q.answer) btn.classList.add('correct');
    else btn.classList.add('revealed');
  });
  sfxWrong();
  aiScores.forEach(ai => { if (Math.random() < 0.6) ai.score += calcPts(Math.random() * MAX_TIME); });
  setTimeout(() => showResult(false, 0, q.choices[q.answer]), 900);
}

function resetTimerClass() {
  document.getElementById('timer-text').className = 'timer-num';
}

// ════════════════════════════════════════════════════════════════
//  ⑦ RESULT (per question)
// ════════════════════════════════════════════════════════════════
function showResult(ok, pts, correctText) {
  document.getElementById('res-icon').textContent = ok ? '✅' : '❌';
  document.getElementById('res-msg').textContent  = ok ? 'ถูกต้อง! 🎉' : 'ผิด...';
  document.getElementById('res-pts').textContent  = ok ? `+${pts} คะแนน` : '0 คะแนน';
  document.getElementById('res-ans').textContent  = `คำตอบที่ถูก: ${correctText}`;
  show('screen-result');
}

function nextQuestion() {
  sfxClick();
  currentQ++;
  if (currentQ < currentSet.questions.length) {
    loadQuestion();
    show('screen-question');
  } else {
    showFinal();
  }
}

// ════════════════════════════════════════════════════════════════
//  ⑧ FINAL LEADERBOARD
// ════════════════════════════════════════════════════════════════
function showFinal() {
  const all = [{ name: playerName + ' 🙋', score, me: true }, ...aiScores]
    .sort((a, b) => b.score - a.score);
  const rank = all.findIndex(p => p.me) + 1;
  const medal = ['🥇','🥈','🥉'][rank - 1] || `#${rank}`;

  document.getElementById('final-name').textContent  = playerName;
  document.getElementById('final-score').textContent = `${score.toLocaleString()} คะแนน`;
  document.getElementById('final-rank').textContent  = `อันดับ ${medal}`;
  document.getElementById('leaderboard').innerHTML   = all.map((p, i) => `
    <div class="lb-row ${p.me ? 'me' : ''}">
      <span class="lb-rank">${['🥇','🥈','🥉'][i] || i + 1}</span>
      <span class="lb-name">${p.name}</span>
      <span class="lb-score">${p.score.toLocaleString()}</span>
    </div>`).join('');

  sfxCorrect();
  show('screen-final');
}
