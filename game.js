// ════════════════════════════════════════════════════════════════
//  AMD Quiz Game  —  game.js  v3  (Firebase Multiplayer + BGM)
// ════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────
//  FIREBASE CONFIG
//  ► สร้างโปรเจกต์ที่ https://console.firebase.google.com
//  ► เพิ่ม Web App → คัดลอก firebaseConfig มาวางแทนด้านล่าง
//  ► เปิด Realtime Database (ในแท็บ Build) ตั้ง Rules เป็น public
//  ► ถ้ายังไม่ตั้งค่า เกมส์จะรันใน Local Mode (บอท) โดยอัตโนมัติ
// ─────────────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyCNDa2i6PNjIkbaMedYjPPLhC9kowFl_IE",
  authDomain:        "amd-quiz-game-ccd92.firebaseapp.com",
  databaseURL:       "https://amd-quiz-game-ccd92-default-rtdb.firebaseio.com",
  projectId:         "amd-quiz-game-ccd92",
  storageBucket:     "amd-quiz-game-ccd92.firebasestorage.app",
  messagingSenderId: "981336749760",
  appId:             "1:981336749760:web:ba85920aaa743177451f25"
};

// ─────────────────────────────────────────────────────────────────
//  DEFAULT QUESTION SET
// ─────────────────────────────────────────────────────────────────
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

// ─────────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────────
const CHOICE_COLORS = ['#e74c3c','#3498db','#f39c12','#9b59b6'];
const ICONS         = ['▲','♦','●','■'];
const MAX_TIME      = 20;
const PLAYER_COLORS = [
  '#e84393','#3498db','#2ecc71','#f39c12',
  '#9b59b6','#e74c3c','#1abc9c','#e67e22',
  '#27ae60','#2980b9','#8e44ad','#d35400',
  '#c0392b','#16a085','#f1c40f','#7f8c8d'
];
const BOT_DATA = [
  { name:'หุ่นยนต์ 🤖',  color:'#3498db' },
  { name:'นักวิชาการ 📚', color:'#2ecc71' },
  { name:'อัจฉริยะ 🧠',  color:'#f39c12' },
  { name:'นักเดา 🎲',    color:'#9b59b6' },
];

// ─────────────────────────────────────────────────────────────────
//  GAME STATE
// ─────────────────────────────────────────────────────────────────
let currentSet    = DEFAULT_SET;
let selectedSetId = 'default';
let editingSetId  = null;
let editorQs      = [];

let allPlayers  = [];
let prevScores  = {};
let prevRanks   = {};
let currentQ    = 0;
let timeLeft    = MAX_TIME;
let timerID     = null;
let answered    = false;
let myAnswerIdx = -1;

// ─────────────────────────────────────────────────────────────────
//  ONLINE STATE
// ─────────────────────────────────────────────────────────────────
let isOnline     = false;
let isHost       = false;
let myPlayerId   = null;
let myColor      = '#e84393';
let roomCode     = null;
let roomRef      = null;
let db           = null;
let _fbListeners = [];
let _revealPending = false;
let _answerWatchRef = null;

// ─────────────────────────────────────────────────────────────────
//  FIREBASE INIT
// ─────────────────────────────────────────────────────────────────
function initFirebase() {
  if (FIREBASE_CONFIG.apiKey === 'YOUR_API_KEY') {
    setModeBadge(false);
    return;
  }
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    isOnline = true;
    setModeBadge(true);
    console.log('[AMD Quiz] Firebase OK → Online mode');
  } catch (e) {
    console.warn('[AMD Quiz] Firebase error → Local mode', e);
    setModeBadge(false);
  }
}

function setModeBadge(online) {
  const el = document.getElementById('mode-badge');
  if (!el) return;
  el.textContent = online ? '🌐 Online Mode' : '🤖 Local Mode';
  el.className   = 'mode-badge ' + (online ? 'online' : 'local');
}

// ─────────────────────────────────────────────────────────────────
//  AUDIO  (Web Audio API — no external files)
// ─────────────────────────────────────────────────────────────────
let _ac = null;
function ac() {
  if (!_ac) _ac = new (window.AudioContext || window.webkitAudioContext)();
  if (_ac.state === 'suspended') _ac.resume();
  return _ac;
}

function beepAt(freq, dur, type, vol, when) {
  try {
    const ctx = ac();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type || 'sine';
    o.frequency.value = freq;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(vol || 0.15, when);
    g.gain.exponentialRampToValueAtTime(0.001, when + dur);
    o.start(when); o.stop(when + dur + 0.01);
  } catch(e) {}
}

function beep(freq, dur, type, vol, delay) {
  beepAt(freq, dur, type, vol, ac().currentTime + (delay || 0));
}

function sfxClick()    { beep(700, 0.045, 'sine',     0.12); }
function sfxPing()     { beep(880, 0.08,  'sine',     0.10); }
function sfxTick(u)    { u ? beep(1047,0.055,'square',0.13) : beep(660,0.065,'square',0.07); }
function sfxCorrect()  { [523,659,784,1047].forEach((f,i) => beep(f,0.2,'sine',0.18,i*0.11)); }
function sfxWrong()    { beep(280,0.22,'sawtooth',0.25); beep(210,0.22,'sawtooth',0.2,0.22); }
function sfxStart()    { [392,523,659,784,1047].forEach((f,i) => beep(f,0.15,'triangle',0.17,i*0.09)); }
function sfxChampion() { [523,659,784,1047,784,1047,1319].forEach((f,i) => beep(f,0.2,'triangle',0.18,i*0.11)); }

// ─────────────────────────────────────────────────────────────────
//  BGM  (Looping background music via Web Audio API)
// ─────────────────────────────────────────────────────────────────
let bgmActive  = false;
let bgmBeat    = 0;
let bgmTimer   = null;

const BGM_MELODY = [
  523, 659, 784, 1047,
  880, 784, 659, 523,
  784, 988, 784, 659,
  698, 880, 784, 523
];
const BGM_BASS  = [130, 196, 220, 174];
const BGM_STEP  = 230;

function startBGM() {
  if (bgmActive) return;
  bgmActive = true;
  bgmBeat   = 0;
  _bgmTick();
}

function stopBGM() {
  bgmActive = false;
  if (bgmTimer) { clearTimeout(bgmTimer); bgmTimer = null; }
}

function _bgmTick() {
  if (!bgmActive) return;
  const ctx  = ac();
  const now  = ctx.currentTime;
  const freq = BGM_MELODY[bgmBeat % BGM_MELODY.length];
  beepAt(freq, 0.16, 'sine', 0.05, now);
  if (bgmBeat % 4 === 0) {
    const bf = BGM_BASS[Math.floor(bgmBeat / 4) % BGM_BASS.length];
    beepAt(bf,         0.42, 'triangle', 0.06, now);
    beepAt(bf * 1.26,  0.42, 'triangle', 0.03, now);
    beepAt(bf * 1.498, 0.42, 'triangle', 0.025, now);
  }
  bgmBeat++;
  bgmTimer = setTimeout(_bgmTick, BGM_STEP);
}

// ─────────────────────────────────────────────────────────────────
//  LOCAL STORAGE
// ─────────────────────────────────────────────────────────────────
function getSets() {
  try {
    const raw = localStorage.getItem('qb_sets');
    return [DEFAULT_SET, ...(raw ? JSON.parse(raw) : [])];
  } catch(e) { return [DEFAULT_SET]; }
}
function persistSets(sets) {
  try { localStorage.setItem('qb_sets', JSON.stringify(sets.filter(s => s.id !== 'default'))); }
  catch(e) {}
}

// ─────────────────────────────────────────────────────────────────
//  SCREEN HELPER
// ─────────────────────────────────────────────────────────────────
function show(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

// ─────────────────────────────────────────────────────────────────
//  FIREBASE LISTENER HELPERS
// ─────────────────────────────────────────────────────────────────
function fbOn(ref, event, fn) {
  ref.on(event, fn);
  _fbListeners.push({ ref, event, fn });
}
function fbOffAll() {
  _fbListeners.forEach(({ ref, event, fn }) => ref.off(event, fn));
  _fbListeners = [];
}

// ─────────────────────────────────────────────────────────────────
//  ROOM CODE GENERATOR
// ─────────────────────────────────────────────────────────────────
function genCode() {
  const C = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 6; i++) s += C[Math.floor(Math.random() * C.length)];
  return s;
}

// ─────────────────────────────────────────────────────────────────
//  ① MENU
// ─────────────────────────────────────────────────────────────────
function showSets() { sfxClick(); renderSets(); show('screen-sets'); }

function showJoin() {
  sfxClick();
  if (!isOnline) {
    alert('ต้องตั้งค่า Firebase ก่อนถึงจะเข้าร่วม Online ได้\nดูคำแนะนำในไฟล์ game.js บรรทัดแรก');
    return;
  }
  const params = new URLSearchParams(location.search);
  const rc = params.get('room');
  if (rc) document.getElementById('join-code').value = rc.toUpperCase();
  document.getElementById('join-error').textContent = '';
  show('screen-join');
}

// ─────────────────────────────────────────────────────────────────
//  ② SET PICKER
// ─────────────────────────────────────────────────────────────────
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

async function startWithSet() {
  sfxClick();
  const sets = getSets();
  currentSet = sets.find(s => s.id === selectedSetId) || DEFAULT_SET;
  if (!currentSet.questions.length) { alert('ชุดคำถามนี้ยังว่างอยู่'); return; }
  if (isOnline) await createOnlineRoom();
  else showQRLocal();
}

// ─────────────────────────────────────────────────────────────────
//  ③ EDITOR
// ─────────────────────────────────────────────────────────────────
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
  renderEditor(); show('screen-editor');
}

function esc(s) {
  return (s||'').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
}

function renderEditor() {
  document.getElementById('editor-questions').innerHTML = editorQs.map((q, qi) => `
    <div class="eq-block">
      <div class="eq-hdr">
        <span>📝 คำถามที่ ${qi + 1}</span>
        ${editorQs.length > 1 ? `<button class="btn-icon danger" onclick="removeQ(${qi})">🗑️</button>` : ''}
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
  if (!valid.length) { alert('กรุณากรอกคำถามและตัวเลือกให้ครบ'); return; }
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

// ─────────────────────────────────────────────────────────────────
//  ④ ONLINE — CREATE ROOM (Host)
// ─────────────────────────────────────────────────────────────────
async function createOnlineRoom() {
  roomCode   = genCode();
  isHost     = true;
  myPlayerId = 'host_' + Date.now();
  myColor    = PLAYER_COLORS[0];
  roomRef    = db.ref('rooms/' + roomCode);

  await roomRef.set({
    hostId:      myPlayerId,
    status:      'lobby',
    currentQ:    0,
    questionSet: currentSet,
    createdAt:   firebase.database.ServerValue.TIMESTAMP
  });

  roomRef.onDisconnect().remove();

  const base = location.href.replace(/[?#].*/, '');
  const url  = base + '?room=' + roomCode;

  const el = document.getElementById('room-code-display');
  el.textContent = roomCode;
  el.style.display = '';

  document.getElementById('qr-url').textContent = url;
  const box = document.getElementById('qr-box');
  box.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(box, { text:url, width:180, height:180,
      colorDark:'#2c2c54', colorLight:'#ffffff' });
  }
  document.querySelector('#screen-qr .qr-hint').textContent =
    'เพื่อนสแกน QR หรือกรอกรหัส ' + roomCode + ' เพื่อเข้าร่วม';
  show('screen-qr');
}

// ─────────────────────────────────────────────────────────────────
//  ④ LOCAL — QR SCREEN
// ─────────────────────────────────────────────────────────────────
function showQRLocal() {
  document.getElementById('room-code-display').style.display = 'none';
  const url = location.href.replace(/[?#].*/, '');
  document.getElementById('qr-url').textContent = url;
  const box = document.getElementById('qr-box');
  box.innerHTML = '';
  if (typeof QRCode !== 'undefined') {
    new QRCode(box, { text:url, width:180, height:180,
      colorDark:'#2c2c54', colorLight:'#ffffff' });
  }
  document.querySelector('#screen-qr .qr-hint').textContent = 'แชร์ลิงค์นี้ให้เพื่อนเปิดบน Browser';
  show('screen-qr');
}

function goLobbyFromQR() {
  sfxClick();
  if (isOnline && isHost) {
    goLobbyOnlineHost();
  } else {
    document.getElementById('lobby-phase-join').style.display = '';
    document.getElementById('lobby-phase-wait').style.display = 'none';
    document.getElementById('player-name').value = '';
    show('screen-lobby');
  }
}

// ─────────────────────────────────────────────────────────────────
//  ④b JOIN ROOM SCREEN (Online players)
// ─────────────────────────────────────────────────────────────────
async function joinRoomOnline() {
  const code = document.getElementById('join-code').value.trim().toUpperCase();
  const name = document.getElementById('join-name').value.trim();
  const errEl = document.getElementById('join-error');
  errEl.textContent = '';

  if (code.length < 4) { errEl.textContent = '⚠️ กรุณากรอกรหัสห้อง'; return; }
  if (!name) { errEl.textContent = '⚠️ กรุณากรอกชื่อ'; return; }

  errEl.textContent = '🔍 กำลังค้นหาห้อง...';

  let snap;
  try { snap = await db.ref('rooms/' + code).once('value'); }
  catch(e) { errEl.textContent = '⚠️ เชื่อมต่อ Firebase ไม่ได้'; return; }

  if (!snap.exists()) { errEl.textContent = `⚠️ ไม่พบห้อง "${code}"`; return; }

  const room = snap.val();
  if (room.status !== 'lobby') { errEl.textContent = '⚠️ เกมส์นี้เริ่มแล้ว'; return; }

  const existCount = room.players ? Object.keys(room.players).length : 0;
  if (existCount >= 50) { errEl.textContent = '⚠️ ห้องเต็ม (50/50)'; return; }

  myColor    = PLAYER_COLORS[existCount % PLAYER_COLORS.length];
  roomCode   = code;
  isHost     = false;
  roomRef    = db.ref('rooms/' + code);
  currentSet = room.questionSet;

  const playerRef = roomRef.child('players').push();
  myPlayerId = playerRef.key;

  await playerRef.set({ name: name + ' 👤', color: myColor, score: 0, isHost: false });
  playerRef.onDisconnect().remove();

  sfxClick();
  startBGM();
  goLobbyOnlinePlayer();
}

// ─────────────────────────────────────────────────────────────────
//  ⑤ LOBBY — ONLINE HOST
// ─────────────────────────────────────────────────────────────────
async function goLobbyOnlineHost() {
  // Host is controller only — NOT added to players list
  isHost = true;
  showLobbyWait(true);
  startBGM();
  attachLobbyListeners();
}

// ─────────────────────────────────────────────────────────────────
//  ⑤ LOBBY — ONLINE PLAYER
// ─────────────────────────────────────────────────────────────────
function goLobbyOnlinePlayer() {
  isHost = false;
  showLobbyWait(false);
  attachLobbyListeners();
}

function showLobbyWait(showCode) {
  show('screen-lobby');
  document.getElementById('lobby-phase-join').style.display = 'none';
  document.getElementById('lobby-phase-wait').style.display = '';
  document.getElementById('host-start-btn').style.display   = 'none';

  const codeEl = document.getElementById('lobby-room-code-show');
  if (showCode && roomCode) {
    codeEl.textContent = 'รหัสห้อง: ' + roomCode;
    codeEl.style.display = '';
  } else {
    codeEl.style.display = 'none';
  }
  document.getElementById('lobby-status').textContent = '⏳ รอผู้เล่นเข้าร่วม...';
}

// ─────────────────────────────────────────────────────────────────
//  ⑤ LOBBY — LOCAL MODE
// ─────────────────────────────────────────────────────────────────
function joinLobbyLocal() {
  const nameInput = document.getElementById('player-name').value.trim();
  const myName = (nameInput || 'ผู้เล่น') + ' 👤';
  isHost = true;

  allPlayers = [{ id:'me', name: myName, score: 0, color: PLAYER_COLORS[0], isMe: true, isHost: true }];

  document.getElementById('lobby-phase-join').style.display = 'none';
  document.getElementById('lobby-phase-wait').style.display = '';
  document.getElementById('lobby-room-code-show').style.display = 'none';
  document.getElementById('host-start-btn').style.display = 'none';
  document.getElementById('lobby-status').textContent = '⏳ รอผู้เล่นเข้าร่วม...';
  renderLobbyPlayers();
  sfxClick();
  startBGM();

  let delay = 900;
  BOT_DATA.forEach((bot, i) => {
    setTimeout(() => {
      allPlayers.push({ id:'bot'+i, name: bot.name, score: 0, color: bot.color, isMe: false, isHost: false });
      renderLobbyPlayers();
      sfxPing();
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

// ─────────────────────────────────────────────────────────────────
//  ONLINE LOBBY LISTENERS
// ─────────────────────────────────────────────────────────────────
function attachLobbyListeners() {
  fbOn(roomRef.child('players'), 'value', snap => {
    const data = snap.val() || {};
    allPlayers = Object.entries(data).map(([id, p]) => ({
      id,
      name:   p.name,
      score:  p.score || 0,
      color:  p.color || '#e84393',
      isMe:   id === myPlayerId,
      isHost: false
    }));
    renderLobbyPlayers();

    if (isHost) {
      const n = allPlayers.length;
      document.getElementById('lobby-status').textContent =
        n === 0 ? '⏳ รอผู้เล่นเข้าร่วม...' : `✅ ผู้เล่น ${n} คน — พร้อมเริ่ม!`;
      document.getElementById('host-start-btn').style.display = n >= 1 ? '' : 'none';
    }
  });

  fbOn(roomRef.child('status'), 'value', async snap => {
    const status = snap.val();
    if (!status || status === 'lobby') return;

    const roomSnap = await roomRef.once('value');
    const room     = roomSnap.val();
    if (!room) return;

    currentSet = room.questionSet || currentSet;
    currentQ   = room.currentQ   || 0;

    if (status === 'question') {
      _revealPending = false;
      buildPrevSnapshot();
      renderQuestion(room);
      show('screen-question');
      if (isHost) watchAnswersForReveal(currentQ);
    } else if (status === 'reveal') {
      if (_answerWatchRef) { _answerWatchRef.off(); _answerWatchRef = null; }
      doReveal(room);
    } else if (status === 'midlb') {
      syncScores(room);
      showMidLeaderboard();
    } else if (status === 'final') {
      syncScores(room);
      stopBGM();
      showFinal();
    }
  });
}

// ─────────────────────────────────────────────────────────────────
//  WATCH ANSWERS FOR AUTO-REVEAL (Host only)
// ─────────────────────────────────────────────────────────────────
function watchAnswersForReveal(qIdx) {
  if (_answerWatchRef) { _answerWatchRef.off(); _answerWatchRef = null; }
  _answerWatchRef = roomRef.child('ans_' + qIdx);
  _answerWatchRef.on('value', snap => {
    const answeredCount = snap.numChildren();
    const totalPlayers  = allPlayers.length;
    const counter = document.getElementById('q-counter');
    if (counter && isHost) {
      counter.textContent =
        `คำถาม ${qIdx + 1} / ${currentSet.questions.length}   |   ${answeredCount}/${totalPlayers} ตอบแล้ว`;
    }
    if (totalPlayers > 0 && answeredCount >= totalPlayers && !_revealPending) {
      _revealPending = true;
      clearInterval(timerID);
      roomRef.update({ status: 'reveal', currentQ: qIdx });
    }
  });
}

// ─────────────────────────────────────────────────────────────────
//  START GAME
// ─────────────────────────────────────────────────────────────────
async function startGame() {
  allPlayers.forEach(p => { p.score = 0; });
  currentQ = 0;
  sfxStart();

  if (isOnline) {
    const updates = { status:'question', currentQ:0,
      qStartTime: firebase.database.ServerValue.TIMESTAMP };
    allPlayers.forEach(p => { updates[`players/${p.id}/score`] = 0; });
    await roomRef.update(updates);
  } else {
    show('screen-question');
    loadQuestion();
  }
}

// ─────────────────────────────────────────────────────────────────
//  RANK SNAPSHOT HELPER
// ─────────────────────────────────────────────────────────────────
function buildPrevSnapshot() {
  const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
  prevScores = {};
  prevRanks  = {};
  allPlayers.forEach(p  => { prevScores[p.name] = p.score; });
  sorted.forEach((p, i) => { prevRanks[p.name]  = i + 1;  });
}

// ─────────────────────────────────────────────────────────────────
//  ⑥ QUESTION — LOCAL MODE
// ─────────────────────────────────────────────────────────────────
function loadQuestion() {
  answered    = false;
  myAnswerIdx = -1;
  timeLeft    = MAX_TIME;

  buildPrevSnapshot();

  const q = currentSet.questions[currentQ];
  document.getElementById('q-counter').textContent =
    `คำถาม ${currentQ + 1} / ${currentSet.questions.length}`;
  document.getElementById('question-text').textContent = q.q;
  buildChoiceButtons(q.choices, selectAnswerLocal);
  startTimerBar(MAX_TIME);
  clearInterval(timerID);
  updateTimerDisplay();
  timerID = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 5)  sfxTick(true);
    else if (timeLeft <= 10) sfxTick(false);
    if (timeLeft <= 0) { clearInterval(timerID); if (!answered) timeUpLocal(); }
  }, 1000);
}

// ─────────────────────────────────────────────────────────────────
//  ⑥ QUESTION — ONLINE MODE
// ─────────────────────────────────────────────────────────────────
function renderQuestion(room) {
  answered    = false;
  myAnswerIdx = -1;
  _revealPending = false;

  const q = currentSet.questions[currentQ];

  if (isHost) {
    document.getElementById('q-counter').textContent =
      `คำถาม ${currentQ + 1} / ${currentSet.questions.length}   |   0/${allPlayers.length} ตอบแล้ว`;
    document.getElementById('question-text').textContent = q.q;
    buildChoiceButtons(q.choices, null);
    document.querySelectorAll('.choice-btn').forEach(btn => {
      btn.disabled = true;
      btn.style.opacity = '0.55';
      btn.style.cursor  = 'default';
    });
  } else {
    document.getElementById('q-counter').textContent =
      `คำถาม ${currentQ + 1} / ${currentSet.questions.length}`;
    document.getElementById('question-text').textContent = q.q;
    buildChoiceButtons(q.choices, selectAnswerOnline);
  }

  timeLeft = MAX_TIME;
  if (room.qStartTime) {
    const elapsed = Math.floor((Date.now() - room.qStartTime) / 1000);
    timeLeft = Math.max(0, MAX_TIME - elapsed);
  }

  startTimerBar(timeLeft);
  clearInterval(timerID);
  updateTimerDisplay();

  if (timeLeft <= 0) {
    onlineTimeUp();
    return;
  }

  timerID = setInterval(() => {
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft <= 5)  sfxTick(true);
    else if (timeLeft <= 10) sfxTick(false);
    if (timeLeft <= 0) {
      clearInterval(timerID);
      onlineTimeUp();
      if (isHost && !_revealPending) {
        _revealPending = true;
        setTimeout(() => roomRef.update({ status:'reveal', currentQ }), 800);
      }
    }
  }, 1000);
}

function buildChoiceButtons(choices, handler) {
  const el = document.getElementById('choices');
  el.innerHTML = '';
  choices.forEach((c, i) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.style.background = CHOICE_COLORS[i];
    btn.innerHTML = `<span class="choice-icon">${ICONS[i]}</span>${c}`;
    if (handler) btn.onclick = () => handler(i);
    el.appendChild(btn);
  });
}

// ─────────────────────────────────────────────────────────────────
//  TIMER HELPERS
// ─────────────────────────────────────────────────────────────────
function startTimerBar(secs) {
  const bar = document.getElementById('timer-bar');
  bar.style.transition = 'none';
  bar.style.width = '100%';
  setTimeout(() => {
    bar.style.transition = `width ${secs}s linear`;
    bar.style.width = '0%';
  }, 50);
}

function updateTimerDisplay() {
  const el = document.getElementById('timer-text');
  el.textContent = timeLeft;
  el.className = 'timer-num';
  if      (timeLeft <= 5)  el.className += ' urgent';
  else if (timeLeft <= 10) el.className += ' warn';
}

function resetTimerClass() {
  document.getElementById('timer-text').className = 'timer-num';
}

function calcPts(rem) { return Math.max(100, Math.round(1000 * (rem / MAX_TIME))); }

function highlightChoices(selectedIdx, correctIdx) {
  document.querySelectorAll('.choice-btn').forEach((btn, i) => {
    btn.disabled = true;
    if      (i === correctIdx)   btn.classList.add('correct');
    else if (i === selectedIdx)  btn.classList.add('wrong');
    else                         btn.classList.add('revealed');
  });
}

// ─────────────────────────────────────────────────────────────────
//  ANSWER — LOCAL MODE
// ─────────────────────────────────────────────────────────────────
function selectAnswerLocal(idx) {
  if (answered) return;
  answered = true;
  clearInterval(timerID);
  resetTimerClass();

  const q   = currentSet.questions[currentQ];
  const ok  = idx === q.answer;
  const pts = ok ? calcPts(timeLeft) : 0;
  const me  = allPlayers.find(p => p.isMe);
  if (me) me.score += pts;

  highlightChoices(idx, q.answer);
  if (ok) sfxCorrect(); else sfxWrong();

  allPlayers.filter(p => !p.isMe).forEach(ai => {
    if (Math.random() < 0.6) ai.score += calcPts(Math.random() * MAX_TIME);
  });

  setTimeout(() => showResult(ok, pts, q.choices[q.answer]), 1000);
}

function timeUpLocal() {
  answered = true;
  resetTimerClass();
  const q = currentSet.questions[currentQ];
  highlightChoices(-1, q.answer);
  sfxWrong();
  allPlayers.filter(p => !p.isMe).forEach(ai => {
    if (Math.random() < 0.65) ai.score += calcPts(Math.random() * MAX_TIME);
  });
  setTimeout(() => showResult(false, 0, q.choices[q.answer]), 1000);
}

// ─────────────────────────────────────────────────────────────────
//  ANSWER — ONLINE MODE
// ─────────────────────────────────────────────────────────────────
async function selectAnswerOnline(idx) {
  if (answered) return;
  answered    = true;
  myAnswerIdx = idx;
  clearInterval(timerID);
  resetTimerClass();

  const q   = currentSet.questions[currentQ];
  const ok  = idx === q.answer;
  const pts = ok ? calcPts(timeLeft) : 0;
  const me  = allPlayers.find(p => p.isMe);
  if (me) me.score += pts;

  document.querySelectorAll('.choice-btn').forEach((btn, i) => {
    btn.disabled = true;
    if (i === idx) btn.style.opacity = '0.85';
    else btn.style.opacity = '0.4';
  });
  document.getElementById('q-counter').textContent += '  ✓ ส่งแล้ว!';

  if (ok) sfxCorrect(); else sfxWrong();

  try {
    const newScore = me ? me.score : pts;
    await roomRef.child('players/' + myPlayerId + '/score').set(newScore);
    await roomRef.child('ans_' + currentQ + '/' + myPlayerId).set(1);
  } catch(e) {}
}

function onlineTimeUp() {
  if (!answered) {
    answered    = true;
    myAnswerIdx = -1;
    document.querySelectorAll('.choice-btn').forEach(btn => { btn.disabled = true; });
  }
}

// ─────────────────────────────────────────────────────────────────
//  REVEAL (Online)
// ─────────────────────────────────────────────────────────────────
function doReveal(room) {
  clearInterval(timerID);
  const q = currentSet.questions[room.currentQ];

  if (isHost) {
    document.querySelectorAll('.choice-btn').forEach((btn, i) => {
      btn.disabled = true;
      btn.style.opacity = i === q.answer ? '1' : '0.35';
      if (i === q.answer) btn.classList.add('correct');
    });
    document.getElementById('res-icon').textContent = '📊';
    document.getElementById('res-msg').textContent  = 'เฉลยคำตอบ';
    document.getElementById('res-pts').textContent  = '';
    document.getElementById('res-ans').textContent  = 'คำตอบที่ถูก: ' + q.choices[q.answer];
    document.getElementById('res-wait-msg').textContent = '⏳ กำลังรวบรวมคะแนน...';
    show('screen-result');
    setTimeout(() => roomRef.update({ status:'midlb', currentQ: room.currentQ }), 3000);
  } else {
    const ok  = myAnswerIdx === q.answer;
    const pts = ok ? calcPts(Math.max(0, timeLeft)) : 0;
    highlightChoices(myAnswerIdx, q.answer);
    showResult(ok, pts, q.choices[q.answer], true);
  }
}

// ─────────────────────────────────────────────────────────────────
//  ⑦ RESULT
// ─────────────────────────────────────────────────────────────────
function showResult(ok, pts, correctText, isOnlineReveal) {
  document.getElementById('res-icon').textContent = ok ? '✅' : '❌';
  document.getElementById('res-msg').textContent  = ok ? 'ถูกต้อง! 🎉' : 'ผิด...';
  document.getElementById('res-pts').textContent  = ok ? `+${pts} คะแนน` : '0 คะแนน';
  document.getElementById('res-ans').textContent  = `คำตอบที่ถูก: ${correctText}`;
  document.getElementById('res-wait-msg').textContent =
    isOnlineReveal ? '⏳ รอ Host เริ่มคำถามถัดไป...' : '⏳ กำลังรวบรวมคะแนน...';
  show('screen-result');

  if (!isOnlineReveal) {
    setTimeout(() => showMidLeaderboard(), 1800);
  }
}

// ─────────────────────────────────────────────────────────────────
//  SYNC SCORES FROM FIREBASE
// ─────────────────────────────────────────────────────────────────
function syncScores(room) {
  if (!room.players) return;
  allPlayers.forEach(p => {
    const fb = room.players[p.id];
    if (fb) p.score = fb.score || 0;
  });
}

// ─────────────────────────────────────────────────────────────────
//  ⑦b MID-LEADERBOARD
// ─────────────────────────────────────────────────────────────────
function showMidLeaderboard() {
  const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
  const top10  = sorted.slice(0, 10);

  document.getElementById('mid-lb-qnum').textContent = currentQ + 1;

  const isLast = currentQ + 1 >= currentSet.questions.length;
  document.getElementById('mid-lb-sub').textContent =
    isLast ? '🏁 คำถามสุดท้าย!' : `เหลืออีก ${currentSet.questions.length - currentQ - 1} คำถาม`;

  const nextBtn  = document.getElementById('mid-lb-next-btn');
  const waitMsg  = document.getElementById('mid-lb-wait');
  nextBtn.textContent = isLast ? '🏆 ดูผลสรุป' : 'ถัดไป →';
  nextBtn.style.display = isHost ? '' : 'none';
  waitMsg.style.display  = isHost ? 'none' : '';

  document.getElementById('mid-lb-list').innerHTML = top10.map((p, i) => {
    const gained    = p.score - (prevScores[p.name] || 0);
    const oldRank   = prevRanks[p.name] || (i + 1);
    const delta     = oldRank - (i + 1);
    const badge     = delta > 0 ? `<span class="rank-up">▲${delta}</span>`
                    : delta < 0 ? `<span class="rank-dn">▼${Math.abs(delta)}</span>`
                    :             `<span class="rank-eq">—</span>`;
    const medal = ['🥇','🥈','🥉'][i] || (i + 1);
    return `
      <div class="mid-lb-row ${p.isMe ? 'me' : ''}" style="animation-delay:${i * 0.07}s">
        <span class="mid-lb-rank">${medal}</span>
        <div class="mid-lb-char-dot" style="background:${p.color}"></div>
        <span class="mid-lb-name">${p.name}</span>
        ${badge}
        <span class="mid-lb-gain ${gained > 0 ? '' : 'zero'}">+${gained > 0 ? gained.toLocaleString() : 0}</span>
        <span class="mid-lb-score">${p.score.toLocaleString()}</span>
      </div>`;
  }).join('');

  show('screen-mid-lb');
}

async function proceedNextQuestion() {
  sfxClick();
  currentQ++;

  if (isOnline) {
    if (_answerWatchRef) { _answerWatchRef.off(); _answerWatchRef = null; }
    if (currentQ < currentSet.questions.length) {
      _revealPending = false;
      await roomRef.update({
        status:     'question',
        currentQ,
        qStartTime: firebase.database.ServerValue.TIMESTAMP
      });
    } else {
      await roomRef.update({ status:'final', currentQ });
    }
  } else {
    if (currentQ < currentSet.questions.length) {
      show('screen-question');
      loadQuestion();
    } else {
      stopBGM();
      showFinal();
    }
  }
}

// ─────────────────────────────────────────────────────────────────
//  ⑧ FINAL
// ─────────────────────────────────────────────────────────────────
function showFinal() {
  stopBGM();
  const sorted = [...allPlayers].sort((a, b) => b.score - a.score);
  const champ  = sorted[0] || { name:'—', score:0, color:'#e84393' };

  document.getElementById('final-champ-name').textContent  = champ.name;
  document.getElementById('final-champ-score').textContent = `${champ.score.toLocaleString()} คะแนน`;
  document.getElementById('champ-char-display').innerHTML  = buildCharHTML(champ.color, true);

  [1, 2, 3].forEach(rank => {
    const p = sorted[rank - 1];
    if (p) {
      document.getElementById(`podium-char-${rank}`).innerHTML    = buildCharHTML(p.color, rank === 1);
      document.getElementById(`podium-pname-${rank}`).textContent = p.name;
      document.getElementById(`podium-pts-${rank}`).textContent   = p.score.toLocaleString() + ' pt';
    }
  });

  document.getElementById('leaderboard').innerHTML = sorted.map((p, i) => `
    <div class="lb-row ${p.isMe ? 'me' : ''}">
      <span class="lb-rank">${['🥇','🥈','🥉'][i] || i + 1}</span>
      <div class="lb-dot" style="background:${p.color}"></div>
      <span class="lb-name">${p.name}</span>
      <span class="lb-score">${p.score.toLocaleString()}</span>
    </div>`).join('');

  sfxChampion();
  show('screen-final');
  document.getElementById('screen-final').scrollTop = 0;
  setTimeout(startFireworks, 400);
}

// ─────────────────────────────────────────────────────────────────
//  CHARACTER HTML BUILDER
// ─────────────────────────────────────────────────────────────────
function buildCharHTML(color, hasCrown) {
  return `
    <div class="char-figure">
      <span class="${hasCrown ? 'char-crown' : 'char-crown-pad'}">${hasCrown ? '👑' : ''}</span>
      <div class="char-head" style="background:${color}">
        <div class="char-eyes-row"><div class="char-eye"></div><div class="char-eye"></div></div>
        <div class="char-smile">‿</div>
      </div>
      <div class="char-body" style="background:${color};filter:brightness(.7)"></div>
      <div class="char-legs">
        <div class="char-leg" style="background:${color};filter:brightness(.55)"></div>
        <div class="char-leg" style="background:${color};filter:brightness(.55)"></div>
      </div>
    </div>`;
}

// ─────────────────────────────────────────────────────────────────
//  FIREWORKS
// ─────────────────────────────────────────────────────────────────
let _fwRAF = null;

function startFireworks() {
  const canvas = document.getElementById('fireworks-canvas');
  if (!canvas) return;
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const ctx  = canvas.getContext('2d');
  const pArr = [];
  let frame  = 0;

  function rocket() {
    const x = 80 + Math.random() * (canvas.width - 160);
    const ty = 60 + Math.random() * (canvas.height * 0.45);
    const a  = -Math.PI / 2 + (Math.random() - 0.5) * 0.5;
    const sp = 7 + Math.random() * 4;
    pArr.push({ x, y: canvas.height, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
      targetY: ty, trail: [], isRocket: true,
      color: `hsl(${Math.random()*360},100%,65%)` });
  }

  function explode(x, y) {
    const n = 55 + Math.floor(Math.random() * 30);
    for (let i = 0; i < n; i++) {
      const a = (Math.PI*2/n)*i + (Math.random()-0.5)*0.3;
      const s = 1.5 + Math.random() * 4.5;
      pArr.push({ x, y, vx: Math.cos(a)*s, vy: Math.sin(a)*s,
        life:1, size:1.5+Math.random()*2.5,
        color:`hsl(${Math.random()*360},100%,65%)`, isRocket:false });
    }
  }

  function draw() {
    _fwRAF = requestAnimationFrame(draw);
    ctx.fillStyle = 'rgba(44,44,84,0.18)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    frame++;
    if (frame % 42 === 0) rocket();

    for (let i = pArr.length - 1; i >= 0; i--) {
      const p = pArr[i];
      if (p.isRocket) {
        p.x += p.vx; p.y += p.vy;
        p.trail.push({x:p.x,y:p.y});
        if (p.trail.length > 9) p.trail.shift();
        p.trail.forEach((t, ti) => {
          ctx.beginPath(); ctx.arc(t.x,t.y,1.5,0,Math.PI*2);
          ctx.fillStyle=p.color; ctx.globalAlpha=(ti/p.trail.length)*0.45; ctx.fill();
        });
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(p.x,p.y,3.5,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.fill();
        if (p.y <= p.targetY) { explode(p.x,p.y); pArr.splice(i,1); }
      } else {
        p.vx*=0.97; p.vy*=0.97; p.vy+=0.08;
        p.x+=p.vx; p.y+=p.vy; p.life-=0.017;
        if (p.life<=0) { pArr.splice(i,1); continue; }
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2);
        ctx.fillStyle=p.color; ctx.globalAlpha=p.life; ctx.fill();
        ctx.globalAlpha=1;
      }
    }
  }
  draw();
}

function stopFireworks() {
  if (_fwRAF) { cancelAnimationFrame(_fwRAF); _fwRAF = null; }
  const c = document.getElementById('fireworks-canvas');
  if (c) c.getContext('2d').clearRect(0,0,c.width,c.height);
}

// ─────────────────────────────────────────────────────────────────
//  LOBBY RENDER
// ─────────────────────────────────────────────────────────────────
function renderLobbyPlayers() {
  document.getElementById('lobby-player-list').innerHTML = allPlayers.map(p => `
    <div class="lobby-player">
      <div class="lobby-char" style="background:${p.color}">
        <div class="lchar-eyes"><div class="lchar-eye"></div><div class="lchar-eye"></div></div>
        <div class="lchar-smile">‿</div>
      </div>
      <div class="lobby-pname">${p.name}</div>
      ${p.isMe   ? '<span class="me-badge">คุณ</span>'   : ''}
      ${p.isHost && !p.isMe ? '<span class="me-badge host-badge">Host</span>' : ''}
    </div>`).join('');
}

// ─────────────────────────────────────────────────────────────────
//  RESTART
// ─────────────────────────────────────────────────────────────────
function restartGame() {
  sfxClick();
  stopFireworks();
  stopBGM();
  clearInterval(timerID);
  if (_answerWatchRef) { _answerWatchRef.off(); _answerWatchRef = null; }
  fbOffAll();

  roomRef    = null;
  roomCode   = null;
  isHost     = false;
  myPlayerId = null;
  allPlayers = [];
  answered   = false;

  document.getElementById('lobby-phase-join').style.display = '';
  document.getElementById('lobby-phase-wait').style.display = 'none';
  document.getElementById('player-name').value = '';
  show('screen-menu');
}

// ─────────────────────────────────────────────────────────────────
//  INIT ON LOAD
// ─────────────────────────────────────────────────────────────────
window.addEventListener('load', () => {
  initFirebase();

  const params    = new URLSearchParams(location.search);
  const roomParam = params.get('room');
  if (roomParam) {
    if (isOnline) {
      document.getElementById('join-code').value = roomParam.toUpperCase();
      show('screen-join');
    } else {
      alert('ต้องตั้งค่า Firebase เพื่อเข้าร่วมห้องออนไลน์\nดูคำแนะนำในไฟล์ game.js');
    }
  }
});
