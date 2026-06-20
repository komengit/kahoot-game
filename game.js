// ════════════════════════════════════════════════════════════════
//  AMD Quiz Game  —  game.js
// ════════════════════════════════════════════════════════════════

// ── DEFAULT QUESTION SET ─────────────────────────────────────────
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

// ── CONSTANTS ─────────────────────────────────────────────────────
const CHOICE_COLORS = ['#e74c3c','#3498db','#f39c12','#9b59b6'];
const ICONS         = ['▲','♦','●','■'];
const MAX_TIME      = 20;

// Bot configurations (name + character color)
const BOT_DATA = [
  { name:'หุ่นยนต์ 🤖', color:'#3498db' },
  { name:'นักวิชาการ 📚', color:'#2ecc71' },
  { name:'อัจฉริยะ 🧠',  color:'#f39c12' },
  { name:'นักเดา 🎲',    color:'#9b59b6' },
];
const PLAYER_COLOR = '#e84393';

// ── STATE ──────────────────────────────────────────────────────────
let currentSet    = DEFAULT_SET;
let selectedSetId = 'default';
let editingSetId  = null;
let editorQs      = [];

let allPlayers    = [];   // [{name, score, color, isMe}]
let prevScores    = {};   // {name: score} snapshot before each question
let prevRanks     = {};   // {name: rank}  snapshot before each question
let currentQ      = 0;
let timeLeft      = MAX_TIME;
let timerID       = null;
let answered      = false;

// ════════════════════════════════════════════════════════════════
//  AUDIO  (Web Audio API — no external files)
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

function sfxClick()    { beep(700, 0.045, 'sine', 0.12); }
function sfxPing()     { beep(880, 0.08,  'sine', 0.1); }
function sfxTick(u)    { u ? beep(1047,0.055,'square',0.13) : beep(660,0.065,'square',0.07); }
function sfxCorrect()  { [523,659,784,1047].forEach((f,i) => beep(f,0.2,'sine',0.2,i*0.11)); }
function sfxWrong()    { beep(280,0.22,'sawtooth',0.25,0); beep(210,0.22,'sawtooth',0.2,0.22); }
function sfxStart()    { [392,523,659,784,1047].forEach((f,i) => beep(f,0.15,'triangle',0.18,i*0.09)); }
function sfxChampion() { [523,659,784,1047,784,1047,1319].forEach((f,i) => beep(f,0.2,'triangle',0.2,i*0.11)); }

// ════════════════════════════════════════════════════════════════
//  LOCAL STORAGE
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
function showSets() { sfxClick(); renderSets(); show('screen-sets'); }

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
  sfxClick(); editingSetId = setId;
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
          ? `<button class="btn-icon danger" onclick="removeQ(${qi})">🗑️</button>` : ''}
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
  document.querySelector('.editor-qs .eq-block:last-child')?.scrollIntoView({ behavior:'smooth' });
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
  persistSets(sets); sfxCorrect(); showSets();
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

// ════════════════════════════════════════════════════════════════
//  ⑤ LOBBY
// ════════════════════════════════════════════════════════════════
function goLobby() {
  sfxClick();
  // Reset to phase 1
  document.getElementById('lobby-phase-join').style.display = '';
  document.getElementById('lobby-phase-wait').style.display = 'none';
  document.getElementById('player-name').value = '';
  show('screen-lobby');
}

function joinLobby() {
  const nameInput = document.getElementById('player-name').value.trim();
  const myName = (nameInput || 'ผู้เล่น') + ' 👤';

  // Init player list with just the human
  allPlayers = [{ name: myName, score: 0, color: PLAYER_COLOR, isMe: true }];

  // Switch to waiting room phase
  document.getElementById('lobby-phase-join').style.display = 'none';
  document.getElementById('lobby-phase-wait').style.display = '';
  document.getElementById('host-start-btn').style.display = 'none';
  document.getElementById('lobby-status').textContent = '⏳ รอผู้เล่นเข้าร่วม...';
  renderLobbyPlayers();
  sfxClick();

  // Animate bots joining one by one
  let delay = 900;
  BOT_DATA.forEach((bot, i) => {
    setTimeout(() => {
      allPlayers.push({ name: bot.name, score: 0, color: bot.color, isMe: false });
      renderLobbyPlayers();
      sfxPing();

      // Show start button after all bots joined
      if (allPlayers.length === 1 + BOT_DATA.length) {
        setTimeout(() => {
          document.getElementById('lobby-status').textContent =
            `✅ ผู้เล่นครบ ${allPlayers.length} คน พร้อมเริ่มแล้ว!`;
          document.getElementById('host-start-btn').style.display = '';
        }, 500);
      }
    }, delay);
    delay += 700 + Math.floor(Math.random() * 600);
  });
}

function renderLobbyPlayers() {
  document.getElementById('lobby-player-list').innerHTML = allPlayers.map((p, i) => `
    <div class="lobby-player" style="animation-delay:0s">
      <div class="lobby-char" style="background:${p.color}">
        <div class="lchar-eyes">
          <div class="lchar-eye"></div>
          <div class="lchar-eye"></div>
        </div>
        <div class="lchar-smile">‿</div>
      </div>
      <div class="lobby-pname">${p.name}</div>
      ${p.isMe ? '<span class="me-badge">คุณ</span>' : ''}
    </div>
  `).join('');
}

// ════════════════════════════════════════════════════════════════
//  START GAME (host click)
// ════════════════════════════════════════════════════════════════
function startGame() {
  allPlayers.forEach(p => p.score = 0);
  currentQ = 0;
  sfxStart();
  loadQuestion();
  show('screen-question');
}

// ════════════════════════════════════════════════════════════════
//  ⑥ QUESTION
// ════════════════════════════════════════════════════════════════
function loadQuestion() {
  answered = false;
  timeLeft  = MAX_TIME;

  // Snapshot ranks & scores before this question
  const sortedBefore = [...allPlayers].sort((a, b) => b.score - a.score);
  prevScores = {};
  prevRanks  = {};
  allPlayers.forEach(p => { prevScores[p.name] = p.score; });
  sortedBefore.forEach((p, i) => { prevRanks[p.name] = i + 1; });

  const q = currentSet.questions[currentQ];
  document.getElementById('q-counter').textContent =
    `คำถาม ${currentQ + 1} / ${currentSet.questions.length}`;
  document.getElementById('question-text').textContent = q.q;

  // Build choice buttons
  const el = document.getElementById('choices');
  el.innerHTML = '';
  q.choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.style.background = CHOICE_COLORS[i];
    btn.innerHTML = `<span class="choice-icon">${ICONS[i]}</span>${c}`;
    btn.onclick = () => selectAnswer(i);
    el.appendChild(btn);
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
  updateTimerDisplay();
  timerID = setInterval(tick, 1000);
}

function tick() {
  timeLeft--;
  updateTimerDisplay();
  if      (timeLeft <= 5)  sfxTick(true);
  else if (timeLeft <= 10) sfxTick(false);
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

  const q   = currentSet.questions[currentQ];
  const me  = allPlayers.find(p => p.isMe);
  const ok  = idx === q.answer;
  const pts = ok ? calcPts(timeLeft) : 0;
  me.score += pts;

  // Highlight choices
  document.querySelectorAll('.choice-btn').forEach((btn, i) => {
    btn.disabled = true;
    if      (i === q.answer) btn.classList.add('correct');
    else if (i === idx)      btn.classList.add('wrong');
    else                     btn.classList.add('revealed');
  });

  if (ok) sfxCorrect(); else sfxWrong();

  // Simulate AI answering
  allPlayers.filter(p => !p.isMe).forEach(ai => {
    if (Math.random() < 0.6) ai.score += calcPts(Math.random() * MAX_TIME);
  });

  setTimeout(() => showResult(ok, pts, q.choices[q.answer]), 1000);
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
  allPlayers.filter(p => !p.isMe).forEach(ai => {
    if (Math.random() < 0.65) ai.score += calcPts(Math.random() * MAX_TIME);
  });
  setTimeout(() => showResult(false, 0, q.choices[q.answer]), 1000);
}

function resetTimerClass() {
  document.getElementById('timer-text').className = 'timer-num';
}

// ════════════════════════════════════════════════════════════════
//  ⑦ RESULT  (auto-advances to mid-leaderboard)
// ════════════════════════════════════════════════════════════════
function showResult(ok, pts, correctText) {
  document.getElementById('res-icon').textContent = ok ? '✅' : '❌';
  document.getElementById('res-msg').textContent  = ok ? 'ถูกต้อง! 🎉' : 'ผิด...';
  document.getElementById('res-pts').textContent  = ok ? `+${pts} คะแนน` : '0 คะแนน';
  document.getElementById('res-ans').textContent  = `คำตอบที่ถูก: ${correctText}`;
  show('screen-result');
  setTimeout(() => showMidLeaderboard(), 1800);
}

// ════════════════════════════════════════════════════════════════
//  ⑦b MID-LEADERBOARD
// ════════════════════════════════════════════════════════════════
function showMidLeaderboard() {
  const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
  const top10  = sorted.slice(0, 10);

  document.getElementById('mid-lb-qnum').textContent = currentQ + 1;

  const isLast = currentQ + 1 >= currentSet.questions.length;
  document.getElementById('mid-lb-sub').textContent =
    isLast ? '🏁 คำถามสุดท้าย! ดูผลสรุปได้เลย' : `เหลืออีก ${currentSet.questions.length - currentQ - 1} คำถาม`;
  document.getElementById('mid-lb-next-btn').textContent =
    isLast ? '🏆 ดูผลสรุป' : 'ถัดไป →';

  document.getElementById('mid-lb-list').innerHTML = top10.map((p, i) => {
    const gained      = p.score - (prevScores[p.name] || 0);
    const oldRank     = prevRanks[p.name] || (i + 1);
    const rankChange  = oldRank - (i + 1); // positive = moved up
    let rankBadge;
    if      (rankChange > 0) rankBadge = `<span class="rank-up">▲${rankChange}</span>`;
    else if (rankChange < 0) rankBadge = `<span class="rank-dn">▼${Math.abs(rankChange)}</span>`;
    else                     rankBadge = `<span class="rank-eq">—</span>`;

    const medal = ['🥇','🥈','🥉'][i] || `${i + 1}`;
    return `
      <div class="mid-lb-row ${p.isMe ? 'me' : ''}" style="animation-delay:${i * 0.07}s">
        <span class="mid-lb-rank">${medal}</span>
        <div class="mid-lb-char-dot" style="background:${p.color}"></div>
        <span class="mid-lb-name">${p.name}</span>
        ${rankBadge}
        ${gained > 0
          ? `<span class="mid-lb-gain">+${gained.toLocaleString()}</span>`
          : `<span class="mid-lb-gain zero">+0</span>`}
        <span class="mid-lb-score">${p.score.toLocaleString()}</span>
      </div>`;
  }).join('');

  show('screen-mid-lb');
}

function proceedNextQuestion() {
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
//  ⑧ FINAL — Podium + Characters + Fireworks
// ════════════════════════════════════════════════════════════════
function showFinal() {
  const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
  const champ  = sorted[0];

  // Champion banner
  document.getElementById('final-champ-name').textContent  = champ.name;
  document.getElementById('final-champ-score').textContent = `${champ.score.toLocaleString()} คะแนน`;
  document.getElementById('champ-char-display').innerHTML  = buildCharHTML(champ.color, true);

  // Podium positions: slot 1=1st, 2=2nd, 3=3rd
  [1, 2, 3].forEach(rank => {
    const p = sorted[rank - 1];
    if (p) {
      document.getElementById(`podium-char-${rank}`).innerHTML  = buildCharHTML(p.color, rank === 1);
      document.getElementById(`podium-pname-${rank}`).textContent = p.name;
      document.getElementById(`podium-pts-${rank}`).textContent   = p.score.toLocaleString() + ' pt';
    }
  });

  // Full leaderboard
  document.getElementById('leaderboard').innerHTML = sorted.map((p, i) => `
    <div class="lb-row ${p.isMe ? 'me' : ''}">
      <span class="lb-rank">${['🥇','🥈','🥉'][i] || i + 1}</span>
      <div class="lb-dot" style="background:${p.color}"></div>
      <span class="lb-name">${p.name}</span>
      <span class="lb-score">${p.score.toLocaleString()}</span>
    </div>`).join('');

  sfxChampion();
  show('screen-final');

  // Scroll final screen to top
  document.getElementById('screen-final').scrollTop = 0;

  // Launch fireworks after brief delay
  setTimeout(() => startFireworks(), 400);
}

// ── Character HTML builder ─────────────────────────────────────
function buildCharHTML(color, hasCrown) {
  return `
    <div class="char-figure">
      <span class="${hasCrown ? 'char-crown' : 'char-crown-pad'}">${hasCrown ? '👑' : ''}</span>
      <div class="char-head" style="background:${color}">
        <div class="char-eyes-row">
          <div class="char-eye"></div>
          <div class="char-eye"></div>
        </div>
        <div class="char-smile">‿</div>
      </div>
      <div class="char-body"  style="background:${color};filter:brightness(.7)"></div>
      <div class="char-legs">
        <div class="char-leg" style="background:${color};filter:brightness(.55)"></div>
        <div class="char-leg" style="background:${color};filter:brightness(.55)"></div>
      </div>
    </div>`;
}

// ════════════════════════════════════════════════════════════════
//  FIREWORKS  (Canvas particle system)
// ════════════════════════════════════════════════════════════════
let _fwRAF = null;

function startFireworks() {
  const canvas = document.getElementById('fireworks-canvas');
  if (!canvas) return;

  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  const ctx = canvas.getContext('2d');
  const particles = [];
  let frame = 0;

  function launchRocket() {
    const x       = 80 + Math.random() * (canvas.width  - 160);
    const targetY = 60 + Math.random() * (canvas.height * 0.45);
    const angle   = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const speed   = 7 + Math.random() * 4;
    particles.push({
      x, y: canvas.height,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      targetY, trail: [],
      isRocket: true,
      color: `hsl(${Math.random()*360},100%,65%)`
    });
  }

  function explode(x, y) {
    const count = 55 + Math.floor(Math.random() * 30);
    for (let i = 0; i < count; i++) {
      const ang   = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.3;
      const spd   = 1.5 + Math.random() * 4.5;
      particles.push({
        x, y,
        vx: Math.cos(ang) * spd,
        vy: Math.sin(ang) * spd,
        life: 1, size: 1.5 + Math.random() * 2.5,
        color: `hsl(${Math.random()*360},100%,65%)`,
        isRocket: false
      });
    }
  }

  function animate() {
    _fwRAF = requestAnimationFrame(animate);
    ctx.fillStyle = 'rgba(44,44,84,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    frame++;
    if (frame % 42 === 0) launchRocket();

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];

      if (p.isRocket) {
        p.x += p.vx; p.y += p.vy;
        p.trail.push({ x: p.x, y: p.y });
        if (p.trail.length > 9) p.trail.shift();

        // Draw trail
        p.trail.forEach((t, ti) => {
          ctx.beginPath();
          ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.globalAlpha = (ti / p.trail.length) * 0.45;
          ctx.fill();
        });
        ctx.globalAlpha = 1;

        // Draw head
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Explode when target reached
        if (p.y <= p.targetY) { explode(p.x, p.y); particles.splice(i, 1); }

      } else {
        p.vx *= 0.97; p.vy *= 0.97;
        p.vy += 0.08;
        p.x  += p.vx; p.y += p.vy;
        p.life -= 0.017;
        if (p.life <= 0) { particles.splice(i, 1); continue; }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  animate();
}

function stopFireworks() {
  if (_fwRAF) { cancelAnimationFrame(_fwRAF); _fwRAF = null; }
  const canvas = document.getElementById('fireworks-canvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// ════════════════════════════════════════════════════════════════
//  RESTART
// ════════════════════════════════════════════════════════════════
function restartGame() {
  sfxClick();
  stopFireworks();
  // Back to lobby phase 1
  document.getElementById('lobby-phase-join').style.display = '';
  document.getElementById('lobby-phase-wait').style.display = 'none';
  document.getElementById('player-name').value = '';
  show('screen-lobby');
}
