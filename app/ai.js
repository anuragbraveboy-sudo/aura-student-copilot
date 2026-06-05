/* ───────────────────────────────────────────────
   AURA  —  AI Integration Module  (ai.js)
   Gemini API + local fallback summarization
   ─────────────────────────────────────────────── */

const AI_MODEL = 'gemini-2.0-flash';
const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

/* ── API Key Management ──────────────────────── */
function getApiKey() {
  return localStorage.getItem('aura_gemini_key') || '';
}

function setApiKey(key) {
  localStorage.setItem('aura_gemini_key', key.trim());
}

function hasApiKey() {
  return getApiKey().length > 10;
}

/* ── Core Gemini Call ────────────────────────── */
async function callGemini(prompt, maxTokens = 2048) {
  const key = getApiKey();
  if (!key) throw new Error('NO_KEY');

  const url = `${GEMINI_BASE}/${AI_MODEL}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: maxTokens
      }
    })
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
}

/* ── Summarize Lecture ───────────────────────── */
async function summarizeLecture(transcript) {
  if (!hasApiKey()) return fallbackSummarize(transcript);

  const prompt = `You are an expert academic study assistant. Summarize the following lecture transcript into clear, concise bullet points that a student can use for revision. Use markdown formatting with bold key terms. Group related points under sub-headings if appropriate.

LECTURE TRANSCRIPT:
${transcript}

SUMMARY:`;

  try {
    return await callGemini(prompt);
  } catch (e) {
    console.warn('[AI] Gemini call failed, using fallback:', e.message);
    return fallbackSummarize(transcript);
  }
}

/* ── Generate Flashcards ─────────────────────── */
async function generateFlashcards(transcript, count = 5) {
  if (!hasApiKey()) return fallbackFlashcards(transcript, count);

  const prompt = `You are an expert academic tutor. From the following lecture transcript, generate exactly ${count} flashcards for study. Each flashcard should test a key concept, definition, or fact.

Return ONLY a valid JSON array (no markdown fences, no extra text) with objects having "front" (question) and "back" (answer) fields.

Example format:
[{"front":"What is X?","back":"X is..."},{"front":"Define Y","back":"Y is..."}]

LECTURE TRANSCRIPT:
${transcript}`;

  try {
    let raw = await callGemini(prompt, 1500);
    // Strip markdown code fences if present
    raw = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
    const cards = JSON.parse(raw);
    if (Array.isArray(cards)) return cards.slice(0, count);
    throw new Error('Not an array');
  } catch (e) {
    console.warn('[AI] Flashcard generation failed, using fallback:', e.message);
    return fallbackFlashcards(transcript, count);
  }
}

/* ── Q&A About Notes ─────────────────────────── */
async function askAboutNotes(question, context) {
  if (!hasApiKey()) return fallbackQA(question, context);

  const prompt = `You are AURA, a helpful academic study assistant. A student is asking a question about their lecture notes. Answer concisely and accurately based on the provided context. If the answer is not in the context, say so and provide your best general knowledge answer.

LECTURE NOTES:
${context}

STUDENT QUESTION:
${question}

ANSWER:`;

  try {
    return await callGemini(prompt, 1024);
  } catch (e) {
    console.warn('[AI] Q&A failed, using fallback:', e.message);
    return fallbackQA(question, context);
  }
}

/* ── Suggest Study Plan ──────────────────────── */
async function suggestStudyPlan(deadlines, lectures) {
  if (!hasApiKey()) return fallbackStudyPlan(deadlines);

  const dlText = deadlines.map(d => `• ${d.title} (${d.course}) — Due: ${d.date} — Priority: ${d.priority}`).join('\n');
  const lecText = lectures.map(l => `• ${l.title}`).join('\n');

  const prompt = `You are an academic study planner. Based on the following deadlines and recently recorded lectures, suggest an optimized study plan for the next 7 days. Use time blocks (morning, afternoon, evening). Be specific and practical.

UPCOMING DEADLINES:
${dlText}

RECENT LECTURES:
${lecText}

Return the plan as a simple, readable schedule.`;

  try {
    return await callGemini(prompt, 1024);
  } catch {
    return fallbackStudyPlan(deadlines);
  }
}

/* ── Fallback: Summarize ─────────────────────── */
function fallbackSummarize(text) {
  const sentences = text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).filter(s => s.length > 20);
  const keyPoints = [];

  // Extract sentences with key indicator words
  const keywords = ['important', 'key', 'main', 'first', 'second', 'third', 'remember',
    'definition', 'means', 'called', 'known as', 'types', 'example', 'includes',
    'therefore', 'because', 'critical', 'essential', 'significant', 'fundamental'];

  for (const s of sentences) {
    const lower = s.toLowerCase();
    if (keywords.some(k => lower.includes(k))) {
      keyPoints.push('• ' + s.trim());
    }
  }

  // If not enough points, grab first sentences of the text
  if (keyPoints.length < 3) {
    for (let i = 0; i < Math.min(5, sentences.length); i++) {
      const point = '• ' + sentences[i].trim();
      if (!keyPoints.includes(point)) keyPoints.push(point);
    }
  }

  return `**Summary** (generated offline)\n\n${keyPoints.slice(0, 8).join('\n\n')}\n\n_💡 Add a Gemini API key in Settings for richer AI-powered summaries._`;
}

/* ── Fallback: Flashcards ────────────────────── */
function fallbackFlashcards(text, count) {
  const sentences = text.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).filter(s => s.length > 30);
  const cards = [];
  const usedIndices = new Set();

  const patterns = [
    { regex: /(?:is|are|was|were)\s+(?:a|an|the)?\s*(.+)/i, type: 'definition' },
    { regex: /(?:called|known as|termed)\s+(.+)/i, type: 'term' },
    { regex: /(?:three|four|five|two)\s+(?:main|primary|key|types|kinds)/i, type: 'list' }
  ];

  for (let i = 0; i < sentences.length && cards.length < count; i++) {
    const s = sentences[i].trim();
    if (usedIndices.has(i)) continue;

    for (const p of patterns) {
      if (p.regex.test(s) && cards.length < count) {
        // Generate a question from the sentence
        const words = s.split(/\s+/).slice(0, 6).join(' ');
        cards.push({
          front: `What ${words.toLowerCase().replace(/\.$/, '')}...?`,
          back: s
        });
        usedIndices.add(i);
        break;
      }
    }
  }

  // Fill remaining with general questions
  for (let i = 0; i < sentences.length && cards.length < count; i++) {
    if (!usedIndices.has(i)) {
      cards.push({
        front: `Explain: "${sentences[i].split(/\s+/).slice(0, 8).join(' ')}..."`,
        back: sentences[i].trim()
      });
      usedIndices.add(i);
    }
  }

  return cards.slice(0, count);
}

/* ── Fallback: Q&A ───────────────────────────── */
function fallbackQA(question, context) {
  const qLower = question.toLowerCase();
  const sentences = context.replace(/\n+/g, ' ').split(/(?<=[.!?])\s+/).filter(s => s.length > 15);

  // Find sentences most relevant to the question keywords
  const qWords = qLower.split(/\s+/).filter(w => w.length > 3);
  let best = { sentence: '', score: 0 };

  for (const s of sentences) {
    const sLower = s.toLowerCase();
    const score = qWords.reduce((acc, w) => acc + (sLower.includes(w) ? 1 : 0), 0);
    if (score > best.score) best = { sentence: s, score };
  }

  if (best.score > 0) {
    return `Based on your notes: "${best.sentence.trim()}"\n\n_💡 Add a Gemini API key for more detailed AI answers._`;
  }
  return `I couldn't find a direct answer in your notes. Try rephrasing or add a Gemini API key for smarter answers.`;
}

/* ── Fallback: Study Plan ────────────────────── */
function fallbackStudyPlan(deadlines) {
  const sorted = [...deadlines].sort((a, b) => new Date(a.date) - new Date(b.date));
  let plan = '**Suggested Study Plan** (offline mode)\n\n';
  sorted.forEach((d, i) => {
    const daysLeft = Math.max(0, Math.ceil((new Date(d.date) - new Date()) / 86400000));
    plan += `**${i + 1}. ${d.title}** (${d.course})\n`;
    plan += `   📅 Due in ${daysLeft} day${daysLeft !== 1 ? 's' : ''} — Priority: ${d.priority}\n`;
    plan += `   ➡️ Study ${daysLeft <= 1 ? 'TODAY — URGENT!' : `${Math.ceil(daysLeft / 2)} sessions recommended`}\n\n`;
  });
  plan += '_💡 Add a Gemini API key for personalized AI study plans._';
  return plan;
}

/* ── API Key Modal ───────────────────────────── */
function showApiKeyModal() {
  // Remove existing modal if any
  const old = document.getElementById('api-key-modal');
  if (old) old.remove();

  const modal = document.createElement('div');
  modal.id = 'api-key-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-card">
      <div class="modal-header">
        <span class="modal-icon">🔑</span>
        <h2>Gemini API Key</h2>
        <p class="modal-subtitle">Enter your API key to unlock AI-powered features</p>
      </div>
      <div class="modal-body">
        <input type="password" id="api-key-input" class="modal-input" placeholder="AIza..." value="${getApiKey()}" autocomplete="off" />
        <p class="modal-hint">Your key is stored locally on your device only. <br/>Get one free at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com</a></p>
      </div>
      <div class="modal-actions">
        <button class="btn-secondary" onclick="document.getElementById('api-key-modal').remove()">Cancel</button>
        <button class="btn-primary" id="save-api-key-btn">Save Key</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);
  requestAnimationFrame(() => modal.classList.add('visible'));

  document.getElementById('save-api-key-btn').addEventListener('click', () => {
    const val = document.getElementById('api-key-input').value;
    setApiKey(val);
    modal.classList.remove('visible');
    setTimeout(() => modal.remove(), 300);
    // Show confirmation
    showToast(val ? '✅ API key saved!' : '🗑️ API key removed');
  });

  // Close on backdrop click
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('visible');
      setTimeout(() => modal.remove(), 300);
    }
  });
}

/* ── Toast notification ──────────────────────── */
function showToast(message, duration = 2500) {
  const existing = document.querySelector('.aura-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'aura-toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('visible'));
  setTimeout(() => {
    toast.classList.remove('visible');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* ── Exports ─────────────────────────────────── */
window.AuraAI = {
  summarize: summarizeLecture,
  flashcards: generateFlashcards,
  ask: askAboutNotes,
  studyPlan: suggestStudyPlan,
  hasKey: hasApiKey,
  showKeyModal: showApiKeyModal,
  showToast
};
