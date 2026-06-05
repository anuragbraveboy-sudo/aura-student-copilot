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
  chatContext: '',
  chatHistory: [],
  recordMode: 'audio',
  videoStream: null,
  mediaRecorder: null,
  videoChunks: [],
  studySessions: []
};

/* ═══════════════════════════════════════════════
   INIT
   ═══════════════════════════════════════════════ */

document.addEventListener('DOMContentLoaded', async () => {
  await AuraDB.open();
  await AuraDB.seed();
  loadTheme();
  loadChatHistory();
  loadStudySessions();
  setupNavigation();
  navigateTo(location.hash.slice(1) || 'home');
  setupRecorder();
  setupCalendar();
  setupStudyTabs();
  setupChatInput();
  setupFileUpload();
  setupSessionForm();
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
  if (screenId === 'study') {
    refreshStudy();
    document.getElementById('lecture-detail').classList.remove('visible');
    document.getElementById('study-main').style.display = 'block';
  }
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

  const greetEl = document.getElementById('home-greeting');
  greetEl.textContent = greeting + ' 👋';
  greetEl.classList.add('gradient-greeting');
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
        <button class="deadline-delete-btn" onclick="event.stopPropagation();deleteDeadline('${d.id}')" title="Delete">✕</button>
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
    AuraAI.showToast('No speech detected. Try typing notes manually ⌨️');
    // Auto-show the type mode
    const textarea = document.getElementById('type-textarea');
    const saveBtn = document.getElementById('type-save-btn');
    const modeBtn = document.getElementById('type-mode-btn');
    if (textarea) textarea.style.display = 'block';
    if (saveBtn) saveBtn.style.display = 'block';
    if (modeBtn) modeBtn.textContent = '🎙️ Switch back to voice mode';
  }
}

/* ── Manual Type Mode ────────────────────────── */
function toggleTypeMode() {
  const textarea = document.getElementById('type-textarea');
  const saveBtn = document.getElementById('type-save-btn');
  const modeBtn = document.getElementById('type-mode-btn');
  
  if (textarea.style.display === 'none') {
    textarea.style.display = 'block';
    saveBtn.style.display = 'block';
    modeBtn.textContent = '🎙️ Switch back to voice mode';
    textarea.focus();
  } else {
    textarea.style.display = 'none';
    saveBtn.style.display = 'none';
    modeBtn.textContent = '⌨️ Or type/paste notes manually';
  }
}

async function saveTypedNotes() {
  const textarea = document.getElementById('type-textarea');
  const text = textarea.value.trim();
  
  if (!text || text.length < 10) {
    AuraAI.showToast('⚠️ Please enter some notes first');
    return;
  }
  
  state.transcript = text;
  
  // Show post-record UI
  const postRecord = document.getElementById('post-record');
  postRecord.classList.add('visible');
  document.getElementById('lecture-title-input').value = 'Lecture — ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  postRecord.dataset.duration = 0;
  
  // Update transcript display
  document.getElementById('transcript-box').textContent = text;
  
  AuraAI.showToast('✅ Notes ready! Now save or summarize.');
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
  // Fix: ensure study-main is visible and lecture-detail is hidden
  document.getElementById('lecture-detail').classList.remove('visible');
  document.getElementById('study-main').style.display = 'block';

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

  // Hook up delete button
  const deleteBtn = document.getElementById('detail-delete-btn');
  if (deleteBtn) {
    deleteBtn.onclick = () => deleteLecture(id);
  }

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
  state.chatHistory.push({ role: 'user', text: q });
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

  state.chatHistory.push({ role: 'ai', text: answer });
  saveChatHistory();

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

  // Show 14 days starting from 3 days ago
  const start = new Date(today);
  start.setDate(start.getDate() - 3);

  let html = '';
  for (let i = 0; i < 14; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);

    const isToday = d.toDateString() === today.toDateString();
    const isSelected = state.selectedCalDay === d.toDateString();
    const isPast = d < today && !isToday;

    html += `
      <div class="cal-day ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${isPast ? 'past' : ''}"
           onclick="selectCalDay('${d.toDateString()}')">
        <div class="cd-name">${dayNames[d.getDay()]}</div>
        <div class="cd-num">${d.getDate()}</div>
      </div>`;
  }

  container.innerHTML = html;
}

async function selectCalDay(dateStr) {
  state.selectedCalDay = dateStr;
  renderWeekView();
  
  // Show deadlines and study sessions for selected day
  const deadlines = await AuraDB.deadlines.getAll();
  const selectedDate = new Date(dateStr);
  const dateIso = selectedDate.toISOString().split('T')[0];
  
  const dayDeadlines = deadlines.filter(d => d.date === dateIso);
  const daySessions = state.studySessions.filter(s => s.date === dateIso);
  
  const container = document.getElementById('selected-day-info');
  if (!container) return;
  
  if (dayDeadlines.length === 0 && daySessions.length === 0) {
    container.innerHTML = `
      <div class="selected-day-info glass-card">
        <div class="sdi-title">${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
        <div class="sdi-content">No deadlines or study sessions for this day.</div>
      </div>`;
    return;
  }
  
  let html = `
    <div class="selected-day-info glass-card">
      <div class="sdi-title">${selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</div>
      <div class="sdi-content">`;
  
  dayDeadlines.forEach(d => {
    html += `<div class="sdi-item">📋 ${esc(d.title)} — ${esc(d.course)} (${d.priority})</div>`;
  });
  
  daySessions.forEach(s => {
    html += `<div class="sdi-item">📝 ${esc(s.title)} at ${esc(s.time)} (${s.duration}min)</div>`;
  });
  
  html += `</div></div>`;
  container.innerHTML = html;
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
        <button class="deadline-delete-btn" onclick="event.stopPropagation();deleteDeadline('${d.id}')" title="Delete">✕</button>
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

/* ═══════════════════════════════════════════════
   THEME SYSTEM
   ═══════════════════════════════════════════════ */

function setTheme(name) {
  if (!['dark', 'light', 'midnight'].includes(name)) name = 'dark';
  
  if (name === 'dark') {
    delete document.documentElement.dataset.theme;
  } else {
    document.documentElement.dataset.theme = name;
  }
  
  localStorage.setItem('aura-theme', name);
  
  // Update theme picker UI
  document.querySelectorAll('.theme-circle').forEach(c => c.classList.remove('active'));
  const active = document.querySelector(`.theme-${name}`);
  if (active) active.classList.add('active');
}

function loadTheme() {
  const saved = localStorage.getItem('aura-theme') || 'dark';
  setTheme(saved);
}

/* ═══════════════════════════════════════════════
   FILE UPLOAD
   ═══════════════════════════════════════════════ */

function setupFileUpload() {
  const area = document.getElementById('upload-area');
  const input = document.getElementById('file-upload');
  
  if (area && input) {
    area.addEventListener('click', () => input.click());
    input.addEventListener('change', handleFileUpload);
  }
}

async function handleFileUpload(e) {
  const file = e.target.files[0];
  if (!file) return;
  
  const ext = file.name.split('.').pop().toLowerCase();
  
  if (ext === 'pdf') {
    AuraAI.showToast('📄 PDF text extraction — connect to PC Bridge for processing');
    e.target.value = '';
    return;
  }
  
  if (ext === 'doc' || ext === 'docx') {
    AuraAI.showToast('📄 DOC files — connect to PC Bridge for processing');
    e.target.value = '';
    return;
  }
  
  // Read .txt and .md files
  if (ext === 'txt' || ext === 'md') {
    try {
      const text = await file.text();
      if (!text || text.trim().length < 5) {
        AuraAI.showToast('⚠️ File appears to be empty');
        return;
      }
      
      state.transcript = text.trim();
      
      // Update transcript display
      document.getElementById('transcript-box').textContent = state.transcript;
      
      // Show post-record UI
      const postRecord = document.getElementById('post-record');
      postRecord.classList.add('visible');
      document.getElementById('lecture-title-input').value = file.name.replace(/\.[^.]+$/, '') + ' — ' + new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      postRecord.dataset.duration = 0;
      
      AuraAI.showToast(`✅ "${file.name}" loaded! Now save or summarize.`);
    } catch (err) {
      AuraAI.showToast('⚠️ Could not read file');
      console.warn('[Upload] Error:', err);
    }
  }
  
  e.target.value = '';
}

/* ═══════════════════════════════════════════════
   DELETE FUNCTIONS
   ═══════════════════════════════════════════════ */

async function deleteLecture(id) {
  if (!confirm('Delete this lecture?')) return;
  
  await AuraDB.lectures.delete(id);
  
  // Also delete associated flashcards
  const cards = await AuraDB.flashcards.getByLecture(id);
  for (const c of cards) {
    await AuraDB.flashcards.delete(c.id);
  }
  
  AuraAI.showToast('🗑️ Lecture deleted');
  
  // If viewing lecture detail, go back
  if (state.viewingLecture && state.viewingLecture.id === id) {
    hideLectureDetail();
  }
  
  // Refresh current screen
  if (state.currentScreen === 'study') refreshStudy();
  if (state.currentScreen === 'home') refreshHome();
}

async function deleteDeadline(id) {
  if (!confirm('Delete this deadline?')) return;
  
  await AuraDB.deadlines.delete(id);
  AuraAI.showToast('🗑️ Deadline deleted');
  
  if (state.currentScreen === 'calendar') refreshCalendar();
  if (state.currentScreen === 'home') refreshHome();
}

async function deleteFlashcard(id) {
  if (!confirm('Delete this flashcard?')) return;
  
  await AuraDB.flashcards.delete(id);
  AuraAI.showToast('🗑️ Flashcard deleted');
  
  // Refresh flashcards
  const allCards = await AuraDB.flashcards.getAll();
  state.studyFlashcards = allCards;
  state.currentFlashcardIdx = 0;
  renderFlashcard();
}

/* ═══════════════════════════════════════════════
   CHAT HISTORY
   ═══════════════════════════════════════════════ */

function saveChatHistory() {
  try {
    localStorage.setItem('aura-chat-history', JSON.stringify(state.chatHistory));
  } catch (e) {
    console.warn('[Chat] Could not save history:', e);
  }
}

function loadChatHistory() {
  try {
    const saved = localStorage.getItem('aura-chat-history');
    if (saved) {
      state.chatHistory = JSON.parse(saved);
      renderChatHistory();
    }
  } catch (e) {
    console.warn('[Chat] Could not load history:', e);
  }
}

function renderChatHistory() {
  const container = document.getElementById('chat-messages');
  if (!container || state.chatHistory.length === 0) return;
  
  let html = '<div class="chat-bubble ai">👋 Hi! I\'m your AURA study assistant. Ask me anything about your lecture notes, and I\'ll help you understand the material better.</div>';
  
  state.chatHistory.forEach(msg => {
    if (msg.role === 'user') {
      html += '<div class="chat-bubble user">' + esc(msg.text) + '</div>';
    } else {
      html += '<div class="chat-bubble ai">' + renderMarkdown(msg.text) + '</div>';
    }
  });
  
  container.innerHTML = html;
  container.scrollTop = container.scrollHeight;
}

function clearChatHistory() {
  if (!confirm('Clear all chat history?')) return;
  
  state.chatHistory = [];
  localStorage.removeItem('aura-chat-history');
  
  const container = document.getElementById('chat-messages');
  container.innerHTML = '<div class="chat-bubble ai">👋 Hi! I\'m your AURA study assistant. Ask me anything about your lecture notes, and I\'ll help you understand the material better.</div>';
  
  AuraAI.showToast('🗑️ Chat history cleared');
}

/* ═══════════════════════════════════════════════
   VIDEO RECORDING
   ═══════════════════════════════════════════════ */

async function setRecordMode(mode) {
  state.recordMode = mode;
  
  // Update button UI
  document.getElementById('mode-audio')?.classList.toggle('active', mode === 'audio');
  document.getElementById('mode-video')?.classList.toggle('active', mode === 'video');
  
  const previewContainer = document.getElementById('video-preview-container');
  const previewVideo = document.getElementById('video-preview');
  
  if (mode === 'video') {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      state.videoStream = stream;
      if (previewVideo) previewVideo.srcObject = stream;
      if (previewContainer) previewContainer.classList.add('visible');
    } catch (err) {
      AuraAI.showToast('📹 Camera access denied');
      console.warn('[Video] Error:', err);
      setRecordMode('audio');
      return;
    }
  } else {
    // Stop video stream
    if (state.videoStream) {
      state.videoStream.getTracks().forEach(t => t.stop());
      state.videoStream = null;
    }
    if (previewVideo) previewVideo.srcObject = null;
    if (previewContainer) previewContainer.classList.remove('visible');
  }
}

/* ═══════════════════════════════════════════════
   STUDY SESSIONS
   ═══════════════════════════════════════════════ */

function loadStudySessions() {
  try {
    const saved = localStorage.getItem('aura-study-sessions');
    if (saved) state.studySessions = JSON.parse(saved);
  } catch (e) {
    console.warn('[Sessions] Could not load:', e);
  }
}

function saveStudySessions() {
  try {
    localStorage.setItem('aura-study-sessions', JSON.stringify(state.studySessions));
  } catch (e) {
    console.warn('[Sessions] Could not save:', e);
  }
}

function setupSessionForm() {
  const form = document.getElementById('add-session-form');
  if (form) {
    form.addEventListener('submit', handleAddSession);
  }
}

function toggleAddSessionForm() {
  const form = document.getElementById('add-session-form');
  if (form) form.classList.toggle('visible');
}

async function handleAddSession(e) {
  e.preventDefault();
  
  const title = document.getElementById('ss-title-input').value.trim();
  const time = document.getElementById('ss-time-input').value;
  const duration = parseInt(document.getElementById('ss-duration-input').value) || 60;
  
  if (!title || !time) {
    AuraAI.showToast('⚠️ Please fill in title and time');
    return;
  }
  
  // Use selected day or today
  let dateIso;
  if (state.selectedCalDay) {
    dateIso = new Date(state.selectedCalDay).toISOString().split('T')[0];
  } else {
    dateIso = new Date().toISOString().split('T')[0];
  }
  
  state.studySessions.push({
    id: 'ss_' + Date.now(),
    title,
    time,
    duration,
    date: dateIso
  });
  
  saveStudySessions();
  AuraAI.showToast('✅ Study session added!');
  
  e.target.reset();
  document.getElementById('add-session-form').classList.remove('visible');
  
  refreshCalendar();
}

/* ── Settings button ─────────────────────────── */
function openSettings() {
  AuraAI.showKeyModal();
}

