/* ═══════════════════════════════════════════════
   AURA  —  Core Application Logic  (app.js)
   ═══════════════════════════════════════════════ */

/* ── State ───────────────────────────────────── */
const state = {
  currentScreen: 'home',
  isRecording: false,
  recognition: null,
  recordingTimer: null,
  recordingStart: 0,
  transcript: '',
  interimTranscript: '',
  selectedCalDay: null,
  currentFlashcardIdx: 0,
  studyFlashcards: [],
  viewingLecture: null,
  chatContext: ''
};

/* ═══════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  await AuraDB.open();
  await AuraDB.seed();
  setupNavigation();
  navigateTo(location.hash.slice(1) || 'home');
  setupRecorder();
  setupCalendar();
  setupStudyTabs();
  setupChatInput();
  AuraBridge.init();
});

/* ═══════════════════════════════════════════════
   NAVIGATION
   ═══════════════════════════════════════════════ */

function setupNavigation() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const screen = item.dataset.screen;
      if (screen) navigateTo(screen);
    });
  });

  window.addEventListener('hashchange', () => {
    navigateTo(location.hash.slice(1) || 'home');
  });

  // FAB → go to record
  const fab = document.getElementById('fab');
  if (fab) fab.addEventListener('click', () => navigateTo('record'));
}

function navigateTo(screenId) {
  if (!['home', 'record', 'study', 'calendar'].includes(screenId)) screenId = 'home';

  // Update hash without triggering hashchange loop
  if (location.hash !== '#' + screenId) {
    history.replaceState(null, '', '#' + screenId);
  }

  state.currentScreen = screenId;

  // Toggle screens
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById('screen-' + screenId);
  if (target) target.classList.add('active');

  // Toggle nav items
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.querySelector(`.nav-item[data-screen="${screenId}"]`)?.classList.add('active');

  // Toggle chat input bar
  const chatBar = document.getElementById('chat-input-bar');
  if (chatBar) chatBar.classList.toggle('visible', screenId === 'study');

  // Toggle FAB — hide on record screen
  const fab = document.getElementById('fab');
  if (fab) fab.style.display = screenId === 'record' ? 'none' : 'flex';

  // Refresh screen data
  if (screenId === 'home') refreshHome();
  if (screenId === 'study') refreshStudy();
  if (screenId === 'calendar') refreshCalendar();
}

/* ═══════════════════════════════════════════════
   HOME SCREEN
   ═══════════════════════════════════════════════ */

async function refreshHome() {
  const lectures = await AuraDB.lectures.getAll();
  const flashcards = await AuraDB.flashcards.getAll();
  const deadlines = await AuraDB.deadlines.getAll();

  // Greeting
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';

  document.getElementById('home-greeting').textContent = greeting + ' 👋';
  document.getElementById('home-subtitle').textContent = getMotivationalSubtitle();

  // Stats
  document.getElementById('stat-lectures').textContent = lectures.length;
  document.getElementById('stat-flashcards').textContent = flashcards.length;
  document.getElementById('stat-streak').textContent = calculateStreak(lectures);

  // Deadlines
  renderDeadlines(deadlines);

  // Recent lectures
  renderRecentLectures(lectures);
}

function getMotivationalSubtitle() {
  const subs = [
    "Let's make today count.",
    "Ready to learn something new?",
    "Your knowledge, your superpower.",
    "Stay curious, stay ahead.",
    "Focus mode: activated."
  ];
  return subs[Math.floor(Math.random() * subs.length)];
}

function calculateStreak(lectures) {
  if (lectures.length === 0) return 0;
  const dates = [...new Set(lectures.map(l => new Date(l.date).toDateString()))].sort((a, b) => new Date(b) - new Date(a));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < dates.length; i++) {
    const expected = new Date(today);
    expected.setDate(expected.getDate() - i);
    if (new Date(dates[i]).toDateString() === expected.toDateString()) {
      streak++;
    } else break;
  }
  return streak || 1; // At least 1 for demo
}

function renderDeadlines(deadlines) {
  const container = document.getElementById('home-deadlines');
  const sorted = [...deadlines].sort((a, b) => new Date(a.date) - new Date(b.date));

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">🎉</span><p class="empty-text">No upcoming deadlines!</p></div>';
    return;
  }

  container.innerHTML = sorted.slice(0, 4).map(d => {
    const daysLeft = Math.max(0, Math.ceil((new Date(d.date) - new Date()) / 86400000));
    const dayText = daysLeft === 0 ? 'Today!' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`;
    return `
      <div class="deadline-item glass-card">
        <div class="deadline-dot ${d.priority}"></div>
        <div class="deadline-info">
          <div class="dl-title">${esc(d.title)}</div>
          <div class="dl-meta">${esc(d.course)} • ${formatDate(d.date)}</div>
        </div>
        <div class="deadline-days">${dayText}</div>
      </div>`;
  }).join('');
}

function renderRecentLectures(lectures) {
  const container = document.getElementById('home-lectures');
  const sorted = [...lectures].sort((a, b) => b.date - a.date);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">🎙️</span><p class="empty-text">Record your first lecture to get started!</p></div>';
    return;
  }

  container.innerHTML = sorted.slice(0, 5).map(l => `
    <div class="lecture-item glass-card" onclick="openLecture('${l.id}')">
      <div class="lecture-icon">📄</div>
      <div class="lecture-info">
        <div class="li-title">${esc(l.title)}</div>
        <div class="li-meta">${timeAgo(l.date)} • ${formatDuration(l.duration)}</div>
      </div>
      <div class="lecture-arrow">›</div>
    </div>
  `).join('');
}

/* ═══════════════════════════════════════════════
   RECORD SCREEN
   ═══════════════════════════════════════════════ */

function setupRecorder() {
  const btn = document.getElementById('record-btn');
  if (btn) btn.addEventListener('click', toggleRecording);
}

function toggleRecording() {
  if (state.isRecording) {
    stopRecording();
  } else {
    startRecording();
  }
}

function startRecording() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    AuraAI.showToast('⚠️ Speech recognition not supported in this browser');
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = true;
  state.recognition.interimResults = true;
  state.recognition.lang = 'en-US';
  state.recognition.maxAlternatives = 1;

  state.transcript = '';
  state.interimTranscript = '';

  state.recognition.onresult = (event) => {
    let interim = '';
    let finalT = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const t = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalT += t + ' ';
      } else {
        interim += t;
      }
    }

    if (finalT) state.transcript += finalT;
    state.interimTranscript = interim;

    updateTranscriptDisplay();
  };

  state.recognition.onerror = (event) => {
    console.warn('[Speech] Error:', event.error);
    if (event.error === 'not-allowed') {
      AuraAI.showToast('🎤 Microphone permission denied');
      stopRecording();
    }
    // Auto-restart on recoverable errors
    if (event.error === 'network' || event.error === 'aborted') {
      if (state.isRecording) {
        setTimeout(() => {
          try { state.recognition.start(); } catch(e) {}
        }, 500);
      }
    }
  };

  state.recognition.onend = () => {
    // Auto-restart if still recording (handles browser auto-stop)
    if (state.isRecording) {
      try { state.recognition.start(); } catch (e) {}
    }
  };

  try {
    state.recognition.start();
  } catch (e) {
    AuraAI.showToast('⚠️ Could not start recording');
    return;
  }

  state.isRecording = true;
  state.recordingStart = Date.now();

  // UI updates
  const btn = document.getElementById('record-btn');
  const wrapper = document.getElementById('record-btn-wrapper');
  btn.classList.add('recording');
  btn.innerHTML = '⏹';
  wrapper.classList.add('recording');

  document.getElementById('record-status').className = 'record-status live';
  document.getElementById('record-status').textContent = 'Recording...';

  document.getElementById('post-record').classList.remove('visible');

  // Timer
  updateRecordTimer();
  state.recordingTimer = setInterval(updateRecordTimer, 1000);
}

function stopRecording() {
  state.isRecording = false;

  if (state.recognition) {
    state.recognition.onend = null; // prevent auto-restart
    state.recognition.stop();
    state.recognition = null;
  }

  clearInterval(state.recordingTimer);

  const btn = document.getElementById('record-btn');
  const wrapper = document.getElementById('record-btn-wrapper');
  btn.classList.remove('recording');
  btn.innerHTML = '🎙️';
  wrapper.classList.remove('recording');

  document.getElementById('record-status').className = 'record-status';
  document.getElementById('record-status').textContent = 'Recording saved';

  const duration = Math.floor((Date.now() - state.recordingStart) / 1000);

  // Show post-record UI
  if (state.transcript.trim().length > 0) {
    const postRecord = document.getElementById('post-record');
    postRecord.classList.add('visible');
    document.getElementById('lecture-title-input').value = 'Lecture — ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    postRecord.dataset.duration = duration;
  } else {
    AuraAI.showToast('No speech detected. Try again.');
  }
}

function updateRecordTimer() {
  const elapsed = Math.floor((Date.now() - state.recordingStart) / 1000);
  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const ss = String(elapsed % 60).padStart(2, '0');
  document.getElementById('record-timer').textContent = `${mm}:${ss}`;
}

function updateTranscriptDisplay() {
  const box = document.getElementById('transcript-box');
  box.innerHTML = esc(state.transcript) +
    (state.interimTranscript ? `<span class="interim">${esc(state.interimTranscript)}</span>` : '');
  box.scrollTop = box.scrollHeight;
}

/* ── Save Lecture ─────────────────────────────── */
async function saveLectureFromRecording() {
  const title = document.getElementById('lecture-title-input').value.trim() || 'Untitled Lecture';
  const duration = parseInt(document.getElementById('post-record').dataset.duration) || 0;

  const lecture = {
    id: 'lec_' + Date.now(),
    title,
    transcript: state.transcript.trim(),
    summary: null,
    date: Date.now(),
    duration
  };

  await AuraDB.lectures.save(lecture);
  AuraAI.showToast('✅ Lecture saved!');

  // Reset
  state.transcript = '';
  state.interimTranscript = '';
  document.getElementById('transcript-box').innerHTML = '<span style="color:var(--muted)">Your live transcript will appear here...</span>';
  document.getElementById('record-timer').textContent = '00:00';
  document.getElementById('post-record').classList.remove('visible');

  // Navigate to study to view it
  navigateTo('study');
}

async function summarizeAndSave() {
  const title = document.getElementById('lecture-title-input').value.trim() || 'Untitled Lecture';
  const duration = parseInt(document.getElementById('post-record').dataset.duration) || 0;

  const btn = document.querySelector('#post-record .btn-primary');
  const origText = btn.innerHTML;
  btn.innerHTML = '<span class="spinner dark"></span> Summarizing...';
  btn.disabled = true;

  const summary = await AuraAI.summarize(state.transcript.trim());

  const lecture = {
    id: 'lec_' + Date.now(),
    title,
    transcript: state.transcript.trim(),
    summary,
    date: Date.now(),
    duration
  };

  await AuraDB.lectures.save(lecture);

  // Also generate flashcards
  try {
    const cards = await AuraAI.flashcards(state.transcript.trim(), 5);
    for (const c of cards) {
      await AuraDB.flashcards.save({
        id: 'fc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        lectureId: lecture.id,
        front: c.front,
        back: c.back
      });
    }
  } catch (e) {
    console.warn('[AI] Flashcard generation failed:', e);
  }

  btn.innerHTML = origText;
  btn.disabled = false;

  AuraAI.showToast('✅ Lecture saved with AI summary!');

  // Reset
  state.transcript = '';
  state.interimTranscript = '';
  document.getElementById('transcript-box').innerHTML = '<span style="color:var(--muted)">Your live transcript will appear here...</span>';
  document.getElementById('record-timer').textContent = '00:00';
  document.getElementById('post-record').classList.remove('visible');

  navigateTo('study');
}

/* ═══════════════════════════════════════════════
   STUDY SCREEN
   ═══════════════════════════════════════════════ */

function setupStudyTabs() {
  document.querySelectorAll('.study-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.study-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const panel = tab.dataset.panel;
      document.querySelectorAll('.study-panel').forEach(p => p.classList.remove('active'));
      document.getElementById('panel-' + panel)?.classList.add('active');

      // Hide lecture detail when switching tabs
      hideLectureDetail();
    });
  });
}

async function refreshStudy() {
  const lectures = await AuraDB.lectures.getAll();
  const flashcards = await AuraDB.flashcards.getAll();

  // Lectures list
  renderStudyLectures(lectures);

  // Flashcards
  state.studyFlashcards = flashcards;
  state.currentFlashcardIdx = 0;
  renderFlashcard();
}

function renderStudyLectures(lectures) {
  const container = document.getElementById('study-lectures-list');
  const sorted = [...lectures].sort((a, b) => b.date - a.date);

  if (sorted.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">📚</span><p class="empty-text">No lectures yet. Record one to start studying!</p></div>';
    return;
  }

  container.innerHTML = sorted.map(l => `
    <div class="lecture-item glass-card" onclick="openLecture('${l.id}')">
      <div class="lecture-icon">${l.summary ? '✨' : '📄'}</div>
      <div class="lecture-info">
        <div class="li-title">${esc(l.title)}</div>
        <div class="li-meta">${timeAgo(l.date)} • ${formatDuration(l.duration)} ${l.summary ? '• AI Summary' : ''}</div>
      </div>
      <div class="lecture-arrow">›</div>
    </div>
  `).join('');
}

/* ── Lecture Detail ───────────────────────────── */
async function openLecture(id) {
  const lecture = await AuraDB.lectures.get(id);
  if (!lecture) return;

  state.viewingLecture = lecture;
  state.chatContext = lecture.transcript;

  // Switch to study screen if not there
  if (state.currentScreen !== 'study') navigateTo('study');

  const detail = document.getElementById('lecture-detail');
  document.getElementById('study-main').style.display = 'none';
  detail.classList.add('visible');

  // Hide chat bar so it doesn't cover content
  const chatBar = document.getElementById('chat-input-bar');
  if (chatBar) chatBar.classList.remove('visible');

  document.getElementById('detail-title').textContent = lecture.title;
  document.getElementById('detail-meta').textContent =
    `${formatDate(new Date(lecture.date).toISOString().split('T')[0])} • ${formatDuration(lecture.duration)}`;

  document.getElementById('detail-transcript').textContent = lecture.transcript;

  const summaryEl = document.getElementById('detail-summary');
  const summaryActions = document.getElementById('detail-summary-actions');

  if (lecture.summary) {
    summaryEl.innerHTML = renderMarkdown(lecture.summary);
    summaryActions.innerHTML = `<button class="btn-ghost" onclick="regenerateSummary('${id}')">🔄 Regenerate</button>`;
  } else {
    summaryEl.innerHTML = '<p style="color:var(--muted)">No summary yet.</p>';
    summaryActions.innerHTML = `<button class="btn-primary" onclick="generateSummary('${id}')">✨ Summarize with AI</button>`;
  }

  // Load flashcards for this lecture
  const cards = await AuraDB.flashcards.getByLecture(id);
  const fcContainer = document.getElementById('detail-flashcards');
  if (cards.length > 0) {
    let html = `<div class="detail-fc-deck">`;
    cards.forEach((c, idx) => {
      html += `
        <div class="flashcard" onclick="this.classList.toggle('flipped')" style="position:relative;min-height:160px;margin-bottom:12px;">
          <div class="flashcard-face flashcard-front">
            <div class="fc-label">Question ${idx + 1}</div>
            <div class="fc-text">${esc(c.front)}</div>
            <div class="fc-hint">Tap to reveal answer</div>
          </div>
          <div class="flashcard-face flashcard-back">
            <div class="fc-label">Answer</div>
            <div class="fc-text">${esc(c.back)}</div>
            <div class="fc-hint">Tap to flip back</div>
          </div>
        </div>`;
    });
    html += `</div>`;
    html += `<button class="btn-secondary" style="width:100%;margin-top:8px;" onclick="generateFlashcardsForLecture('${id}')">🃏 Generate More Flashcards</button>`;
    fcContainer.innerHTML = html;
  } else {
    fcContainer.innerHTML = `<button class="btn-primary" style="width:100%;" onclick="generateFlashcardsForLecture('${id}')">🃏 Generate Flashcards</button>`;
  }
}

function hideLectureDetail() {
  document.getElementById('lecture-detail').classList.remove('visible');
  document.getElementById('study-main').style.display = 'block';
  state.viewingLecture = null;

  // Show chat bar again
  const chatBar = document.getElementById('chat-input-bar');
  if (chatBar) chatBar.classList.add('visible');
}

async function generateSummary(lectureId) {
  const lecture = await AuraDB.lectures.get(lectureId);
  if (!lecture) return;

  const el = document.getElementById('detail-summary');
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>AI is analyzing your lecture...</p></div>';

  const summary = await AuraAI.summarize(lecture.transcript);
  lecture.summary = summary;
  await AuraDB.lectures.save(lecture);

  el.innerHTML = renderMarkdown(summary);
  document.getElementById('detail-summary-actions').innerHTML =
    `<button class="btn-ghost" onclick="regenerateSummary('${lectureId}')">🔄 Regenerate</button>`;

  AuraAI.showToast('✨ Summary generated!');
}

async function regenerateSummary(lectureId) {
  await generateSummary(lectureId);
}

async function generateFlashcardsForLecture(lectureId) {
  const lecture = await AuraDB.lectures.get(lectureId);
  if (!lecture) return;

  const el = document.getElementById('detail-flashcards');
  el.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><p>Generating flashcards...</p></div>';

  const cards = await AuraAI.flashcards(lecture.transcript, 5);

  for (const c of cards) {
    await AuraDB.flashcards.save({
      id: 'fc_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      lectureId,
      front: c.front,
      back: c.back
    });
  }

  el.innerHTML = `<p style="color:var(--muted);font-size:13px;">${cards.length} flashcard(s) generated!</p>`;
  AuraAI.showToast('🃏 Flashcards created!');

  // Refresh flashcard deck
  const allCards = await AuraDB.flashcards.getAll();
  state.studyFlashcards = allCards;
  state.currentFlashcardIdx = 0;
  renderFlashcard();
}

/* ── Flashcards ──────────────────────────────── */
function renderFlashcard() {
  const container = document.getElementById('flashcard-deck');
  const counter = document.getElementById('flashcard-counter');

  if (state.studyFlashcards.length === 0) {
    container.innerHTML = '<div class="empty-state"><span class="empty-icon">🃏</span><p class="empty-text">No flashcards yet. Open a lecture and generate some!</p></div>';
    counter.textContent = '0 / 0';
    return;
  }

  const idx = state.currentFlashcardIdx;
  const card = state.studyFlashcards[idx];
  counter.textContent = `${idx + 1} / ${state.studyFlashcards.length}`;

  container.innerHTML = `
    <div class="flashcard" id="active-flashcard" onclick="flipFlashcard()">
      <div class="flashcard-face flashcard-front">
        <div class="fc-label">Question</div>
        <div class="fc-text">${esc(card.front)}</div>
        <div class="fc-hint">Tap to reveal answer</div>
      </div>
      <div class="flashcard-face flashcard-back">
        <div class="fc-label">Answer</div>
        <div class="fc-text">${esc(card.back)}</div>
        <div class="fc-hint">Tap to flip back</div>
      </div>
    </div>
  `;
}

function flipFlashcard() {
  const card = document.getElementById('active-flashcard');
  if (card) card.classList.toggle('flipped');
}

function prevFlashcard() {
  if (state.studyFlashcards.length === 0) return;
  state.currentFlashcardIdx = (state.currentFlashcardIdx - 1 + state.studyFlashcards.length) % state.studyFlashcards.length;
  renderFlashcard();
}

function nextFlashcard() {
  if (state.studyFlashcards.length === 0) return;
  state.currentFlashcardIdx = (state.currentFlashcardIdx + 1) % state.studyFlashcards.length;
  renderFlashcard();
}

/* ── Chat ────────────────────────────────────── */
function setupChatInput() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');

  if (sendBtn) sendBtn.addEventListener('click', sendChatMessage);
  if (input) input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}

async function sendChatMessage() {
  const input = document.getElementById('chat-input');
  const q = input.value.trim();
  if (!q) return;

  input.value = '';
  const container = document.getElementById('chat-messages');

  // Add user bubble
  container.innerHTML += `<div class="chat-bubble user">${esc(q)}</div>`;

  // Add loading
  const loadId = 'chat-loading-' + Date.now();
  container.innerHTML += `<div class="chat-bubble ai" id="${loadId}"><span class="spinner"></span></div>`;
  container.scrollTop = container.scrollHeight;

  // Build context from all lectures if no specific one viewed
  let ctx = state.chatContext;
  if (!ctx) {
    const lectures = await AuraDB.lectures.getAll();
    ctx = lectures.map(l => `## ${l.title}\n${l.transcript}`).join('\n\n---\n\n');
  }

  const answer = await AuraAI.ask(q, ctx);

  const loadEl = document.getElementById(loadId);
  if (loadEl) loadEl.outerHTML = `<div class="chat-bubble ai">${renderMarkdown(answer)}</div>`;
  container.scrollTop = container.scrollHeight;
}

/* ═══════════════════════════════════════════════
   CALENDAR SCREEN
   ═══════════════════════════════════════════════ */

function setupCalendar() {
  const addBtn = document.getElementById('cal-add-btn');
  if (addBtn) addBtn.addEventListener('click', toggleAddDeadlineForm);

  const form = document.getElementById('add-deadline-form');
  if (form) form.addEventListener('submit', handleAddDeadline);
}

async function refreshCalendar() {
  renderWeekView();
  const deadlines = await AuraDB.deadlines.getAll();
  renderTimeline(deadlines);
}

function renderWeekView() {
  const container = document.getElementById('cal-week');
  const today = new Date();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Get start of week (Sunday)
  const start = new Date(today);
  start.setDate(start.getDate() - start.getDay());

  let html = '';
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);

    const isToday = d.toDateString() === today.toDateString();
    const isSelected = state.selectedCalDay === d.toDateString();

    html += `
      <div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}"
           onclick="selectCalDay('${d.toDateString()}')">
        <div class="cd-name">${dayNames[d.getDay()]}</div>
        <div class="cd-num">${d.getDate()}</div>
      </div>`;
  }

  container.innerHTML = html;
}

function selectCalDay(dateStr) {
  state.selectedCalDay = dateStr;
  renderWeekView();
}

function renderTimeline(deadlines) {
  const container = document.getElementById('cal-timeline');

  // Generate AI-suggested study slots
  const studySlots = [
    { time: '08:00 AM', title: 'Morning Review', desc: 'Review ML flashcards — peak focus hours', type: 'study' },
    { time: '10:30 AM', title: 'Organic Chemistry', desc: 'Practice functional group identification', type: 'study' },
    { time: '02:00 PM', title: 'History Essay Prep', desc: 'Outline Renaissance essay draft', type: 'study' },
    { time: '04:30 PM', title: 'Break & Recharge', desc: 'Take a walk, clear your mind', type: 'break' },
    { time: '06:00 PM', title: 'Evening Review', desc: 'Spaced repetition — revisit weak topics', type: 'study' }
  ];

  // Mix in deadlines for today
  const today = new Date().toISOString().split('T')[0];
  const todayDeadlines = deadlines.filter(d => d.date === today);

  let items = studySlots.map(s => `
    <div class="timeline-item ${s.type === 'study' ? 'study-slot' : ''} glass-card">
      <div class="ti-time">${s.time}</div>
      <div class="ti-title">${s.title}</div>
      <div class="ti-desc">${s.desc}</div>
    </div>
  `);

  todayDeadlines.forEach(d => {
    items.push(`
      <div class="timeline-item glass-card">
        <div class="ti-time">⚠️ Due Today</div>
        <div class="ti-title">${esc(d.title)}</div>
        <div class="ti-desc">${esc(d.course)}</div>
      </div>
    `);
  });

  container.innerHTML = items.join('');

  // Render deadlines list
  renderCalDeadlines(deadlines);
}

function renderCalDeadlines(deadlines) {
  const container = document.getElementById('cal-deadlines');
  const sorted = [...deadlines].sort((a, b) => new Date(a.date) - new Date(b.date));

  container.innerHTML = sorted.map(d => {
    const daysLeft = Math.max(0, Math.ceil((new Date(d.date) - new Date()) / 86400000));
    return `
      <div class="deadline-item glass-card">
        <div class="deadline-dot ${d.priority}"></div>
        <div class="deadline-info">
          <div class="dl-title">${esc(d.title)}</div>
          <div class="dl-meta">${esc(d.course)} • ${formatDate(d.date)}</div>
        </div>
        <div class="deadline-days">${daysLeft}d</div>
      </div>`;
  }).join('');
}

function toggleAddDeadlineForm() {
  const form = document.getElementById('add-deadline-form');
  form.classList.toggle('visible');
}

async function handleAddDeadline(e) {
  e.preventDefault();

  const title = document.getElementById('dl-title-input').value.trim();
  const course = document.getElementById('dl-course-input').value.trim();
  const date = document.getElementById('dl-date-input').value;
  const priority = document.getElementById('dl-priority-input').value;

  if (!title || !date) {
    AuraAI.showToast('⚠️ Please fill in title and date');
    return;
  }

  await AuraDB.deadlines.save({
    id: 'dl_' + Date.now(),
    title,
    course: course || 'General',
    date,
    priority: priority || 'medium'
  });

  AuraAI.showToast('✅ Deadline added!');

  // Reset form
  e.target.reset();
  document.getElementById('add-deadline-form').classList.remove('visible');

  refreshCalendar();
}

/* ═══════════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════════ */

function esc(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function formatDuration(seconds) {
  if (!seconds) return '0m';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function timeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return formatDate(new Date(timestamp).toISOString().split('T')[0]);
}

function renderMarkdown(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/_(.+?)_/g, '<em>$1</em>')
    .replace(/^#{1,3}\s+(.+)/gm, '<strong>$1</strong>')
    .replace(/^[•●]\s+(.+)/gm, '• $1')
    .replace(/\n/g, '<br>');
}

/* ── Settings button ─────────────────────────── */
function openSettings() {
  AuraAI.showKeyModal();
}
