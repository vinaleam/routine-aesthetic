// ===== STATE =====
const state = {
  currentDate: new Date(),
  selectedDate: new Date(),
  viewMonth: new Date().getMonth(),
  viewYear: new Date().getFullYear(),
  tasks: {},
  timer: {
    mode: 'work',
    duration: 25 * 60,
    remaining: 25 * 60,
    running: false,
    interval: null,
    linkedTaskId: null,
    sessions: 0,
    totalSeconds: 0,
  },
  editingTaskId: null,
  lofi: {
    playing: false,
    currentTrack: 0,
    volume: 0.4,
    audioCtx: null,
    gainNode: null,
    sources: [],
  },
};

// ===== HELPERS =====
function dateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

async function reloadTasks() {
  state.tasks = await window.api.getAllTasksGrouped();
}

function getTasksForDate(date) {
  const key = dateKey(date);
  return (state.tasks[key] || []).sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ===== SEARCH =====
let searchQuery = '';
let searchDebounceTimer = null;

async function searchTasks(query) {
  const q = query.trim();
  if (!q) return [];
  return await window.api.searchByTitle(q);
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
  return `${months[m - 1]} ${d}, ${y}`;
}

function handleSearchInput(value) {
  searchQuery = value;
  const clearBtn = document.getElementById('search-clear');
  clearBtn.classList.toggle('visible', value.length > 0);

  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(async () => {
    await renderTasks(false);
  }, 200);
}

async function clearSearch() {
  const input = document.getElementById('search-input');
  input.value = '';
  searchQuery = '';
  document.getElementById('search-clear').classList.remove('visible');
  await renderTasks(false);
}

function formatMonth(month, year) {
  const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  return `${months[month]} ${year}`;
}

function formatShortDate(date) {
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

// ===== TOAST NOTIFICATIONS =====
function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.classList.add('visible');
  setTimeout(() => toast.classList.remove('visible'), 2500);
}

// ===== AUDIO (Timer completion beep) =====
function playBeep() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();
  const notes = [523, 659, 784, 1047];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = freq;
    gain.gain.value = 0.08;
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15 + i * 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.15);
    osc.stop(ctx.currentTime + 0.15 + i * 0.15);
  });
}

// ===== GREETING =====
function updateGreeting() {
  const hour = new Date().getHours();
  let greeting;
  if (hour < 6) greeting = 'LATE NIGHT CODING';
  else if (hour < 12) greeting = 'GOOD MORNING';
  else if (hour < 17) greeting = 'GOOD AFTERNOON';
  else if (hour < 21) greeting = 'GOOD EVENING';
  else greeting = 'NIGHT OWL MODE';

  document.getElementById('greeting-text').textContent = greeting;

  const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
  const now = new Date();
  document.getElementById('greeting-date').textContent =
    `${days[now.getDay()]} ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

// ========================================
// ===== ANIMATED PIXEL CLOUDS ==========
// ========================================
let clouds = [];

function initClouds() {
  const canvas = document.getElementById('clouds-canvas');
  canvas.width = canvas.parentElement.offsetWidth;
  canvas.height = canvas.parentElement.offsetHeight;

  clouds = [];
  const count = 6;
  for (let i = 0; i < count; i++) {
    clouds.push({
      x: Math.random() * canvas.width,
      y: 6 + Math.random() * (canvas.height - 24),
      speed: 0.15 + Math.random() * 0.25,
      scale: 0.6 + Math.random() * 0.6,
      alpha: 0.12 + Math.random() * 0.15,
    });
  }
}

function drawPixelCloud(ctx, cx, cy, scale, alpha) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#7f8fa6';
  const s = Math.round(3 * scale);

  const offsets = [
    [2, 0], [3, 0],
    [1, 1], [2, 1], [3, 1], [4, 1],
    [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2],
    [1, 3], [2, 3], [3, 3], [4, 3],
  ];

  offsets.forEach(([ox, oy]) => {
    ctx.fillRect(cx + ox * s, cy + oy * s, s, s);
  });
  ctx.globalAlpha = 1;
}

function animateClouds() {
  const canvas = document.getElementById('clouds-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  clouds.forEach(cloud => {
    cloud.x += cloud.speed;
    if (cloud.x > canvas.width + 40) {
      cloud.x = -60;
      cloud.y = 6 + Math.random() * (canvas.height - 24);
    }
    drawPixelCloud(ctx, cloud.x, cloud.y, cloud.scale, cloud.alpha);
  });

  requestAnimationFrame(animateClouds);
}

// ========================================
// ===== WEATHER DISPLAY ================
// ========================================
const WEATHER_ICONS = {
  sunny: [
    '..yyyy..',
    '.yYYYy.',
    'yYYYYYy',
    'yYYYYYy',
    'yYYYYYy',
    '.yYYYy.',
    '..yyyy..',
  ],
  cloudy: [
    '........',
    '..wwww..',
    '.wWWWWw.',
    'wWWWWWWw',
    'wWWWWWWw',
    '.wwwwww.',
    '........',
  ],
  rainy: [
    '..wwww..',
    '.wWWWWw.',
    'wWWWWWWw',
    '.wwwwww.',
    '.b..b...',
    '..b..b..',
    '.b..b...',
  ],
  snowy: [
    '..wwww..',
    '.wWWWWw.',
    'wWWWWWWw',
    '.wwwwww.',
    '..w..w..',
    '.w..w...',
    '..w..w..',
  ],
  stormy: [
    '..gggg..',
    '.gGGGGg.',
    'gGGGGGGg',
    '.gggggg.',
    '..y.....',
    '...y....',
    '..y.....',
  ],
  clear_night: [
    '....yyyy',
    '..yy..yy',
    '.y....yy',
    '.y...yyy',
    '.y....yy',
    '..yy..yy',
    '....yyyy',
  ],
};

const ICON_COLORS = {
  y: '#ffd369', Y: '#ffec8b',
  w: '#7f8fa6', W: '#b2bec3',
  b: '#48dbfb', B: '#0abde3',
  g: '#576574', G: '#8395a7',
  '.': null,
};

function drawWeatherIcon(type) {
  const canvas = document.getElementById('weather-icon');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 32, 32);
  ctx.imageSmoothingEnabled = false;

  const icon = WEATHER_ICONS[type] || WEATHER_ICONS.sunny;
  const px = 4;

  icon.forEach((row, ry) => {
    [...row].forEach((ch, rx) => {
      const color = ICON_COLORS[ch];
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(rx * px, ry * px, px, px);
      }
    });
  });
}

function mapWeatherCondition(code) {
  if (!code) return { type: 'sunny', label: 'CLEAR' };
  if (code >= 200 && code < 300) return { type: 'stormy', label: 'STORMY' };
  if (code >= 300 && code < 400) return { type: 'rainy', label: 'DRIZZLE' };
  if (code >= 500 && code < 600) return { type: 'rainy', label: 'RAINY' };
  if (code >= 600 && code < 700) return { type: 'snowy', label: 'SNOWY' };
  if (code >= 700 && code < 800) return { type: 'cloudy', label: 'FOGGY' };
  if (code === 800) {
    const hour = new Date().getHours();
    if (hour >= 19 || hour < 6) return { type: 'clear_night', label: 'CLEAR NIGHT' };
    return { type: 'sunny', label: 'SUNNY' };
  }
  if (code > 800) return { type: 'cloudy', label: 'CLOUDY' };
  return { type: 'sunny', label: 'CLEAR' };
}

async function fetchWeather() {
  try {
    const pos = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
    });

    const { latitude, longitude } = pos.coords;
    const resp = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,weather_code&timezone=auto`
    );
    const data = await resp.json();

    const temp = Math.round(data.current.temperature_2m);
    const wmo = data.current.weather_code;

    let condition;
    if (wmo <= 1) condition = mapWeatherCondition(800);
    else if (wmo <= 3) condition = mapWeatherCondition(802);
    else if (wmo >= 51 && wmo <= 57) condition = mapWeatherCondition(300);
    else if (wmo >= 61 && wmo <= 67) condition = mapWeatherCondition(500);
    else if (wmo >= 71 && wmo <= 77) condition = mapWeatherCondition(600);
    else if (wmo >= 80 && wmo <= 82) condition = mapWeatherCondition(500);
    else if (wmo >= 95) condition = mapWeatherCondition(200);
    else condition = mapWeatherCondition(800);

    document.getElementById('weather-temp').innerHTML = `${temp}&deg;C`;
    document.getElementById('weather-condition').textContent = condition.label;
    drawWeatherIcon(condition.type);
  } catch {
    setFallbackWeather();
  }
}

function setFallbackWeather() {
  const hour = new Date().getHours();
  const isNight = hour >= 19 || hour < 6;
  const type = isNight ? 'clear_night' : 'sunny';
  const label = isNight ? 'CLEAR NIGHT' : 'NICE DAY';

  document.getElementById('weather-temp').innerHTML = '--&deg;';
  document.getElementById('weather-condition').textContent = label;
  drawWeatherIcon(type);
}

// ========================================
// ===== LOFI MUSIC PLAYER ==============
// ========================================
const LOFI_TRACKS = [
  { name: 'Pixel Dreams',   bpm: 70,  key: 'C',  mood: 'dreamy' },
  { name: 'Rainy Bytes',    bpm: 65,  key: 'Am', mood: 'melancholy' },
  { name: 'Sunset Chip',    bpm: 75,  key: 'F',  mood: 'warm' },
  { name: 'Night Code',     bpm: 60,  key: 'Dm', mood: 'chill' },
  { name: 'Cloud Walker',   bpm: 68,  key: 'G',  mood: 'airy' },
  { name: 'Bit Cafe',       bpm: 72,  key: 'Bb', mood: 'cozy' },
];

const NOTE_FREQ = {
  'C3': 130.81, 'D3': 146.83, 'E3': 164.81, 'F3': 174.61, 'G3': 196.00, 'A3': 220.00, 'Bb3': 233.08, 'B3': 246.94,
  'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00, 'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88,
  'C5': 523.25, 'D5': 587.33, 'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00, 'Bb5': 932.33, 'B5': 987.77,
};

const CHORD_PROGRESSIONS = {
  'C':  [['C4','E4','G4'], ['F4','A4','C5'], ['G4','B4','D5'], ['C4','E4','G4']],
  'Am': [['A3','C4','E4'], ['F3','A3','C4'], ['G3','B3','D4'], ['A3','C4','E4']],
  'F':  [['F3','A3','C4'], ['Bb3','D4','F4'], ['C4','E4','G4'], ['F3','A3','C4']],
  'Dm': [['D4','F4','A4'], ['G3','Bb3','D4'], ['A3','C4','E4'], ['D4','F4','A4']],
  'G':  [['G3','B3','D4'], ['C4','E4','G4'], ['D4','F4','A4'], ['G3','B3','D4']],
  'Bb': [['Bb3','D4','F4'], ['F3','A3','C4'], ['G3','Bb3','D4'], ['Bb3','D4','F4']],
};

const MELODY_PATTERNS = {
  dreamy:     ['E5','G5','C5','D5','E5','C5','D5','B4'],
  melancholy: ['A4','C5','E5','D5','C5','A4','G4','A4'],
  warm:       ['F5','A5','G5','F5','C5','D5','E5','F5'],
  chill:      ['D5','F5','A4','G4','F4','D4','E4','F4'],
  airy:       ['G5','B4','D5','C5','G4','A4','B4','D5'],
  cozy:       ['Bb4','D5','F5','Bb4','A4','G4','F4','D4'],
};

function initLofiAudio() {
  if (state.lofi.audioCtx) return;
  state.lofi.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  state.lofi.gainNode = state.lofi.audioCtx.createGain();
  state.lofi.gainNode.gain.value = state.lofi.volume;
  state.lofi.gainNode.connect(state.lofi.audioCtx.destination);
}

function stopLofiSources() {
  state.lofi.sources.forEach(src => {
    try { src.stop(); } catch {}
  });
  state.lofi.sources = [];
}

function playLofiTrack() {
  const ctx = state.lofi.audioCtx;
  const gain = state.lofi.gainNode;
  const track = LOFI_TRACKS[state.lofi.currentTrack];
  const beatDuration = 60 / track.bpm;
  const chords = CHORD_PROGRESSIONS[track.key];
  const melody = MELODY_PATTERNS[track.mood];

  stopLofiSources();

  const totalBars = 8;
  const totalTime = totalBars * 4 * beatDuration;
  const startTime = ctx.currentTime + 0.05;

  // Chord pad (soft triangle wave)
  for (let bar = 0; bar < totalBars; bar++) {
    const chord = chords[bar % chords.length];
    chord.forEach(noteName => {
      const freq = NOTE_FREQ[noteName];
      if (!freq) return;

      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.value = freq;

      const noteStart = startTime + bar * 4 * beatDuration;
      const noteDuration = 4 * beatDuration;
      noteGain.gain.setValueAtTime(0, noteStart);
      noteGain.gain.linearRampToValueAtTime(0.06, noteStart + 0.3);
      noteGain.gain.linearRampToValueAtTime(0.04, noteStart + noteDuration * 0.7);
      noteGain.gain.linearRampToValueAtTime(0, noteStart + noteDuration);

      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start(noteStart);
      osc.stop(noteStart + noteDuration + 0.01);
      state.lofi.sources.push(osc);
    });
  }

  // Melody (sine wave)
  for (let bar = 0; bar < totalBars; bar++) {
    const notesInBar = [0, 2];
    notesInBar.forEach((beatOffset, idx) => {
      const melodyIdx = (bar * 2 + idx) % melody.length;
      const noteName = melody[melodyIdx];
      const freq = NOTE_FREQ[noteName];
      if (!freq) return;

      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = freq;

      const noteStart = startTime + (bar * 4 + beatOffset) * beatDuration;
      const noteDuration = beatDuration * 1.8;
      noteGain.gain.setValueAtTime(0, noteStart);
      noteGain.gain.linearRampToValueAtTime(0.1, noteStart + 0.08);
      noteGain.gain.exponentialRampToValueAtTime(0.02, noteStart + noteDuration * 0.6);
      noteGain.gain.linearRampToValueAtTime(0, noteStart + noteDuration);

      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start(noteStart);
      osc.stop(noteStart + noteDuration + 0.01);
      state.lofi.sources.push(osc);
    });
  }

  // Soft kick / bass pulse
  for (let bar = 0; bar < totalBars; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      if (beat % 2 !== 0) continue;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      const noteStart = startTime + (bar * 4 + beat) * beatDuration;
      osc.frequency.setValueAtTime(80, noteStart);
      osc.frequency.exponentialRampToValueAtTime(40, noteStart + 0.15);

      noteGain.gain.setValueAtTime(0.12, noteStart);
      noteGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.2);

      osc.connect(noteGain);
      noteGain.connect(gain);
      osc.start(noteStart);
      osc.stop(noteStart + 0.25);
      state.lofi.sources.push(osc);
    }
  }

  // Hi-hat noise
  for (let bar = 0; bar < totalBars; bar++) {
    for (let beat = 0; beat < 4; beat++) {
      const noteStart = startTime + (bar * 4 + beat) * beatDuration;

      const bufferSize = ctx.sampleRate * 0.05;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 8000;

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.04, noteStart);
      noteGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.05);

      noise.connect(filter);
      filter.connect(noteGain);
      noteGain.connect(gain);
      noise.start(noteStart);
      noise.stop(noteStart + 0.06);
      state.lofi.sources.push(noise);
    }
  }

  // Schedule next loop
  const loopTimeout = setTimeout(() => {
    if (state.lofi.playing) playLofiTrack();
  }, (totalTime - 0.1) * 1000);

  state.lofi._loopTimeout = loopTimeout;
}

function toggleLofi() {
  initLofiAudio();

  if (state.lofi.playing) {
    state.lofi.playing = false;
    stopLofiSources();
    clearTimeout(state.lofi._loopTimeout);
    document.getElementById('lofi-play').innerHTML = '&#9654;';
    document.getElementById('lofi-play').classList.remove('playing');
    document.getElementById('equalizer').classList.remove('active');
  } else {
    state.lofi.playing = true;
    if (state.lofi.audioCtx.state === 'suspended') {
      state.lofi.audioCtx.resume();
    }
    playLofiTrack();
    document.getElementById('lofi-play').innerHTML = '&#9646;&#9646;';
    document.getElementById('lofi-play').classList.add('playing');
    document.getElementById('equalizer').classList.add('active');
  }
}

function nextLofiTrack() {
  state.lofi.currentTrack = (state.lofi.currentTrack + 1) % LOFI_TRACKS.length;
  updateLofiDisplay();
  if (state.lofi.playing) {
    stopLofiSources();
    clearTimeout(state.lofi._loopTimeout);
    playLofiTrack();
  }
}

function prevLofiTrack() {
  state.lofi.currentTrack = (state.lofi.currentTrack - 1 + LOFI_TRACKS.length) % LOFI_TRACKS.length;
  updateLofiDisplay();
  if (state.lofi.playing) {
    stopLofiSources();
    clearTimeout(state.lofi._loopTimeout);
    playLofiTrack();
  }
}

function setLofiVolume(val) {
  state.lofi.volume = val / 100;
  if (state.lofi.gainNode) {
    state.lofi.gainNode.gain.value = state.lofi.volume;
  }
}

function updateLofiDisplay() {
  const track = LOFI_TRACKS[state.lofi.currentTrack];
  document.getElementById('lofi-track').textContent = track.name;
  drawLofiArt(track.mood);
}

function drawLofiArt(mood) {
  const canvas = document.getElementById('lofi-art-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 36, 36);
  ctx.imageSmoothingEnabled = false;

  const px = 4;
  const palette = {
    dreamy:     { bg: '#1a1a2e', fg: '#a29bfe', accent: '#ffd369' },
    melancholy: { bg: '#0f3460', fg: '#48dbfb', accent: '#e94560' },
    warm:       { bg: '#2d1b00', fg: '#ffd369', accent: '#e94560' },
    chill:      { bg: '#0d1b3e', fg: '#4ecca3', accent: '#48dbfb' },
    airy:       { bg: '#1a1a2e', fg: '#eaeaea', accent: '#a29bfe' },
    cozy:       { bg: '#2d1b00', fg: '#e94560', accent: '#ffd369' },
  };

  const p = palette[mood] || palette.dreamy;

  ctx.fillStyle = p.bg;
  ctx.fillRect(0, 0, 36, 36);

  ctx.fillStyle = p.fg;

  if (mood === 'dreamy') {
    [[2,1],[5,3],[1,5],[6,2],[3,6],[7,7]].forEach(([x,y]) => {
      ctx.fillRect(x*px, y*px, px, px);
    });
    ctx.fillStyle = p.accent;
    [[4,4],[2,7]].forEach(([x,y]) => ctx.fillRect(x*px, y*px, px, px));
  } else if (mood === 'melancholy') {
    for (let i = 0; i < 6; i++) {
      ctx.fillRect((i*1.3+1)*px, (i%3+1)*px, 2, px*1.5);
    }
    ctx.fillStyle = p.accent;
    ctx.fillRect(3*px, 6*px, px*3, px);
  } else if (mood === 'warm') {
    ctx.fillRect(2*px, 2*px, px*4, px*4);
    ctx.fillStyle = p.accent;
    [[1,3],[6,3],[3,0],[3,7],[1,1],[6,6]].forEach(([x,y]) => ctx.fillRect(x*px, y*px, px, px));
  } else if (mood === 'chill') {
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 8; col++) {
        if ((col + row) % 2 === 0) ctx.fillRect(col*px, (row*3+2)*px, px, px);
      }
    }
    ctx.fillStyle = p.accent;
    ctx.fillRect(3*px, 1*px, px*2, px);
  } else if (mood === 'airy') {
    [[2,3],[3,3],[4,3],[5,3],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4]].forEach(([x,y]) => {
      ctx.fillRect(x*px, y*px, px, px);
    });
    ctx.fillStyle = p.accent;
    [[3,2],[4,2]].forEach(([x,y]) => ctx.fillRect(x*px, y*px, px, px));
  } else {
    ctx.fillRect(2*px, 3*px, px*4, px*4);
    ctx.fillStyle = p.accent;
    ctx.fillRect(6*px, 4*px, px, px*2);
    ctx.fillStyle = p.fg;
    [[3,1],[4,2],[3,0]].forEach(([x,y]) => ctx.fillRect(x*px, y*px, px, px));
  }
}

// ===== PIXEL MASCOT =====
function drawMascot(isWorking) {
  const canvas = document.getElementById('mascot-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 32, 32);
  ctx.imageSmoothingEnabled = false;

  const c = isWorking ? '#e94560' : '#4ecca3';
  const pixels = [
    [8, 2, c], [10, 2, c], [20, 2, c], [22, 2, c],
    [8, 4, c], [10, 4, c], [20, 4, c], [22, 4, c],
    [6, 4, c], [24, 4, c],
    [6, 6, c], [8, 6, c], [10, 6, c], [12, 6, c], [14, 6, c],
    [16, 6, c], [18, 6, c], [20, 6, c], [22, 6, c], [24, 6, c],
    [6, 8, c], [24, 8, c],
    [6, 10, c], [24, 10, c],
    [6, 12, c], [24, 12, c],
    [8, 14, c], [10, 14, c], [12, 14, c], [14, 14, c],
    [16, 14, c], [18, 14, c], [20, 14, c], [22, 14, c],
    [10, 8, '#fff'], [12, 8, '#fff'], [18, 8, '#fff'], [20, 8, '#fff'],
    [12, 8, '#1a1a2e'], [20, 8, '#1a1a2e'],
    [14, 10, '#ffd369'], [16, 10, '#ffd369'],
    [12, 12, c], [14, 12, '#ffd369'], [16, 12, '#ffd369'], [18, 12, c],
  ];

  const blinkPhase = Date.now() % 3000;
  const isBlinking = blinkPhase < 150;

  pixels.forEach(([x, y, color]) => {
    if (isBlinking && y === 8 && [10, 12, 18, 20].includes(x)) {
      ctx.fillStyle = c;
    } else {
      ctx.fillStyle = color;
    }
    ctx.fillRect(x, y, 2, 2);
  });
}

// ===== CALENDAR =====
function renderCalendar(animate) {
  const grid = document.getElementById('calendar-grid');
  const title = document.getElementById('month-title');

  title.textContent = formatMonth(state.viewMonth, state.viewYear);

  if (animate) {
    grid.classList.add('switching');
    setTimeout(() => {
      buildCalendarGrid(grid);
      grid.classList.remove('switching');
    }, 150);
  } else {
    buildCalendarGrid(grid);
  }
}

function buildCalendarGrid(grid) {
  const firstDay = new Date(state.viewYear, state.viewMonth, 1).getDay();
  const daysInMonth = new Date(state.viewYear, state.viewMonth + 1, 0).getDate();
  const daysInPrev = new Date(state.viewYear, state.viewMonth, 0).getDate();

  const todayKey = dateKey(state.currentDate);
  const selectedKey = dateKey(state.selectedDate);

  let html = '';

  for (let i = firstDay - 1; i >= 0; i--) {
    html += `<div class="day-cell other-month empty">${daysInPrev - i}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cellDate = new Date(state.viewYear, state.viewMonth, d);
    const key = dateKey(cellDate);
    const isToday = key === todayKey;
    const isSelected = key === selectedKey;
    const tasks = state.tasks[key] || [];

    let classes = 'day-cell';
    if (isToday) classes += ' today';
    if (isSelected) classes += ' selected';

    let dots = '';
    if (tasks.length > 0) {
      const dotItems = tasks.slice(0, 3).map(t =>
        `<div class="task-dot ${t.priority}"></div>`
      ).join('');
      dots = `<div class="task-dots">${dotItems}</div>`;
    }

    html += `<div class="${classes}" data-day="${d}">${d}${dots}</div>`;
  }

  const totalCells = firstDay + daysInMonth;
  const remaining = (7 - (totalCells % 7)) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="day-cell other-month empty">${i}</div>`;
  }

  grid.innerHTML = html;

  grid.querySelectorAll('.day-cell:not(.empty)').forEach(cell => {
    cell.addEventListener('click', () => {
      const day = parseInt(cell.dataset.day);
      state.selectedDate = new Date(state.viewYear, state.viewMonth, day);
      renderCalendar(false);
      renderTasks(true);
      updateDateLabel();
    });
  });
}

function updateDateLabel() {
  document.getElementById('selected-date-label').textContent =
    formatShortDate(state.selectedDate);
}

function goToToday() {
  const now = new Date();
  state.selectedDate = now;
  state.viewMonth = now.getMonth();
  state.viewYear = now.getFullYear();
  renderCalendar(true);
  renderTasks(true);
  updateDateLabel();
}

// ===== TASKS =====
function renderTaskItem(task, showDate) {
  const isLinked = state.timer.linkedTaskId === task.id;
  const completedClass = task.completed ? ' completed' : '';
  return `
    <div class="task-item${completedClass}" data-id="${task.id}">
      <div class="task-item-header">
        <div class="task-priority-indicator ${task.priority}"></div>
        <span class="task-item-title">${escapeHtml(task.title)}</span>
        ${task.time ? `<span class="task-item-time">${task.time}</span>` : ''}
      </div>
      ${showDate ? `<div class="search-result-date">${formatDateLabel(task._date)}</div>` : ''}
      ${task.description ? `<div class="task-item-desc">${escapeHtml(task.description)}</div>` : ''}
      <div class="task-item-actions">
        <button class="task-action-btn done-btn${task.completed ? ' done' : ''}" data-action="done" data-id="${task.id}" ${showDate ? `data-date="${task._date}"` : ''}>
          ${task.completed ? 'DONE' : 'TODO'}
        </button>
        <button class="task-action-btn link-btn${isLinked ? ' linked' : ''}" data-action="link" data-id="${task.id}" ${showDate ? `data-date="${task._date}"` : ''}>
          ${isLinked ? 'LINKED' : 'LINK'}
        </button>
        <button class="task-action-btn edit-btn" data-action="edit" data-id="${task.id}" ${showDate ? `data-date="${task._date}"` : ''}>EDIT</button>
        <button class="task-action-btn delete-btn" data-action="delete" data-id="${task.id}" ${showDate ? `data-date="${task._date}"` : ''}>DEL</button>
      </div>
    </div>
  `;
}

function attachTaskActionListeners(list) {
  list.querySelectorAll('.task-action-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = btn.dataset.action;
      const id = btn.dataset.id;
      if (action === 'delete') deleteTask(id, btn.dataset.date);
      else if (action === 'edit') editTask(id, btn.dataset.date);
      else if (action === 'link') linkTask(id);
      else if (action === 'done') toggleDone(id, btn.dataset.date);
    });
  });
}

async function renderTasks(animate) {
  const list = document.getElementById('task-list');
  const isSearching = searchQuery.trim().length > 0;

  const buildList = async () => {
    if (isSearching) {
      const results = await searchTasks(searchQuery);
      if (results.length === 0) {
        list.innerHTML = `<div class="task-empty">NO MATCHING TASKS</div>`;
        return;
      }
      list.innerHTML = `<div class="search-results-header">${results.length} RESULT${results.length !== 1 ? 'S' : ''}</div>` +
        results.map(task => renderTaskItem(task, true)).join('');
      attachTaskActionListeners(list);
      return;
    }

    const tasks = getTasksForDate(state.selectedDate);
    if (tasks.length === 0) {
      list.innerHTML = `<div class="task-empty">NO TASKS YET<br>CLICK + TO ADD ONE</div>`;
      return;
    }

    list.innerHTML = tasks.map(task => renderTaskItem({ ...task, _date: dateKey(state.selectedDate) }, false)).join('');
    attachTaskActionListeners(list);
  };

  if (animate) {
    list.classList.add('switching');
    setTimeout(async () => {
      await buildList();
      list.classList.remove('switching');
    }, 150);
  } else {
    await buildList();
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showForm(taskData) {
  const form = document.getElementById('task-form');
  const addBtn = document.getElementById('btn-add-task');

  document.getElementById('task-title').value = taskData?.title || '';
  document.getElementById('task-desc').value = taskData?.description || '';
  document.getElementById('task-time').value = taskData?.time || '';
  document.getElementById('task-priority').value = taskData?.priority || 'medium';
  document.getElementById('task-reminder').checked = taskData?.reminder || false;
  document.getElementById('form-title').textContent = taskData ? 'EDIT TASK' : 'NEW TASK';

  form.classList.add('visible');
  addBtn.style.display = 'none';
  document.getElementById('task-title').focus();
}

function hideForm() {
  document.getElementById('task-form').classList.remove('visible');
  document.getElementById('btn-add-task').style.display = '';
  state.editingTaskId = null;
}

function isFormOpen() {
  return document.getElementById('task-form').classList.contains('visible');
}

async function saveTask() {
  const title = document.getElementById('task-title').value.trim();
  if (!title) return;

  const key = dateKey(state.selectedDate);

  const taskData = {
    id: state.editingTaskId || generateId(),
    title,
    description: document.getElementById('task-desc').value.trim(),
    date: key,
    time: document.getElementById('task-time').value,
    priority: document.getElementById('task-priority').value,
    reminder: document.getElementById('task-reminder').checked,
    completed: false,
  };

  if (state.editingTaskId) {
    const existing = (state.tasks[key] || []).find(t => t.id === state.editingTaskId);
    if (existing) taskData.completed = existing.completed;
    await window.api.updateTask(taskData);
    showToast('TASK UPDATED!');
  } else {
    await window.api.createTask(taskData);
    showToast('TASK CREATED!');
  }

  await reloadTasks();
  hideForm();
  await renderTasks(false);
  renderCalendar(false);
}

async function deleteTask(id, dateStr) {
  await window.api.deleteTask(id);
  if (state.timer.linkedTaskId === id) {
    state.timer.linkedTaskId = null;
    updateLinkedTaskDisplay();
  }
  await reloadTasks();
  await renderTasks(false);
  renderCalendar(false);
  showToast('TASK DELETED');
}

function editTask(id, dateStr) {
  const key = dateStr || dateKey(state.selectedDate);
  const task = (state.tasks[key] || []).find(t => t.id === id);
  if (!task) return;
  if (dateStr) {
    clearSearch();
    const [y, m, d] = dateStr.split('-').map(Number);
    state.selectedDate = new Date(y, m - 1, d);
    state.viewMonth = m - 1;
    state.viewYear = y;
    renderCalendar(false);
    updateDateLabel();
  }
  state.editingTaskId = id;
  showForm(task);
}

function linkTask(id) {
  const key = dateKey(state.selectedDate);
  const task = (state.tasks[key] || []).find(t => t.id === id);
  if (!task) return;

  if (state.timer.linkedTaskId === id) {
    state.timer.linkedTaskId = null;
    showToast('TASK UNLINKED');
  } else {
    state.timer.linkedTaskId = id;
    showToast('LINKED TO TIMER!');
  }
  updateLinkedTaskDisplay();
  renderTasks(false);
}

async function toggleDone(id, dateStr) {
  const newStatus = await window.api.toggleTaskStatus(id);
  if (!newStatus) return;
  await reloadTasks();
  await renderTasks(false);
  showToast(newStatus === 'completed' ? 'TASK COMPLETE!' : 'TASK REOPENED');
}

function updateLinkedTaskDisplay() {
  const el = document.getElementById('linked-task');
  if (!state.timer.linkedTaskId) {
    el.textContent = 'None';
    return;
  }
  for (const key of Object.keys(state.tasks)) {
    const task = state.tasks[key].find(t => t.id === state.timer.linkedTaskId);
    if (task) {
      el.textContent = task.title;
      return;
    }
  }
  el.textContent = 'None';
  state.timer.linkedTaskId = null;
}

// ===== TIMER =====
const WORK_DURATION = 25 * 60;
const BREAK_DURATION = 5 * 60;

function setTimerMode(mode) {
  state.timer.mode = mode;
  state.timer.duration = mode === 'work' ? WORK_DURATION : BREAK_DURATION;
  resetTimer();
  document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === mode);
  });
}

function startTimer() {
  if (state.timer.running) return;
  state.timer.running = true;

  const timerText = document.getElementById('timer-text');
  timerText.classList.add('running');
  timerText.classList.remove('warning');
  document.getElementById('btn-start').disabled = true;
  document.getElementById('btn-pause').disabled = false;

  state.timer.interval = setInterval(() => {
    state.timer.remaining--;
    state.timer.totalSeconds++;

    if (state.timer.remaining <= 60 && state.timer.remaining > 0) {
      timerText.classList.remove('running');
      timerText.classList.add('warning');
    }

    if (state.timer.remaining <= 0) {
      completeTimer();
      return;
    }

    updateTimerDisplay();
    drawTimerRing();
  }, 1000);
}

function pauseTimer() {
  state.timer.running = false;
  clearInterval(state.timer.interval);

  const timerText = document.getElementById('timer-text');
  timerText.classList.remove('running', 'warning');
  document.getElementById('btn-start').disabled = false;
  document.getElementById('btn-pause').disabled = true;
}

function resetTimer() {
  pauseTimer();
  state.timer.remaining = state.timer.duration;
  updateTimerDisplay();
  drawTimerRing();
}

function completeTimer() {
  pauseTimer();
  playBeep();

  if (state.timer.mode === 'work') {
    state.timer.sessions++;
    document.getElementById('session-count').textContent = state.timer.sessions;
    showToast('WORK SESSION COMPLETE! TAKE A BREAK');
  } else {
    showToast('BREAK OVER! TIME TO FOCUS');
  }
  updateTotalTime();
  setTimerMode(state.timer.mode === 'work' ? 'break' : 'work');
}

function updateTimerDisplay() {
  const mins = Math.floor(state.timer.remaining / 60);
  const secs = state.timer.remaining % 60;
  document.getElementById('timer-text').textContent =
    `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateTotalTime() {
  const totalMins = Math.floor(state.timer.totalSeconds / 60);
  const el = document.getElementById('total-time');
  if (totalMins < 60) {
    el.textContent = `${totalMins}m`;
  } else {
    const h = Math.floor(totalMins / 60);
    const m = totalMins % 60;
    el.textContent = `${h}h${m}m`;
  }
}

function drawTimerRing() {
  const canvas = document.getElementById('timer-canvas');
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const center = size / 2;
  const radius = 78;
  const lineWidth = 8;

  ctx.clearRect(0, 0, size, size);

  const segments = 60;
  const segmentAngle = (Math.PI * 2) / segments;
  const gapAngle = 0.02;

  for (let i = 0; i < segments; i++) {
    const startAngle = -Math.PI / 2 + i * segmentAngle + gapAngle;
    const endAngle = startAngle + segmentAngle - gapAngle * 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.strokeStyle = '#2c3e6d';
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }

  const progress = 1 - (state.timer.remaining / state.timer.duration);
  const filledSegments = Math.floor(progress * segments);
  const color = state.timer.mode === 'work' ? '#e94560' : '#4ecca3';

  for (let i = 0; i < filledSegments; i++) {
    const startAngle = -Math.PI / 2 + i * segmentAngle + gapAngle;
    const endAngle = startAngle + segmentAngle - gapAngle * 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, startAngle, endAngle);
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'butt';
    ctx.stroke();
  }

  if (state.timer.running && filledSegments > 0) {
    const leadAngle = -Math.PI / 2 + (filledSegments - 1) * segmentAngle + gapAngle;
    const leadEnd = leadAngle + segmentAngle - gapAngle * 2;
    ctx.beginPath();
    ctx.arc(center, center, radius, leadAngle, leadEnd);
    ctx.strokeStyle = state.timer.mode === 'work' ? '#ff6b81' : '#6effc5';
    ctx.lineWidth = lineWidth + 2;
    ctx.stroke();
  }

  ctx.fillStyle = color;
  const dotSize = 4;
  ctx.fillRect(8, 8, dotSize, dotSize);
  ctx.fillRect(14, 8, dotSize, dotSize);
  ctx.fillRect(8, 14, dotSize, dotSize);
  ctx.fillRect(size - 12, 8, dotSize, dotSize);
  ctx.fillRect(size - 18, 8, dotSize, dotSize);
  ctx.fillRect(size - 12, 14, dotSize, dotSize);
  ctx.fillRect(8, size - 12, dotSize, dotSize);
  ctx.fillRect(14, size - 12, dotSize, dotSize);
  ctx.fillRect(8, size - 18, dotSize, dotSize);
  ctx.fillRect(size - 12, size - 12, dotSize, dotSize);
  ctx.fillRect(size - 18, size - 12, dotSize, dotSize);
  ctx.fillRect(size - 12, size - 18, dotSize, dotSize);
}

// ===== MASCOT ANIMATION LOOP =====
function mascotLoop() {
  drawMascot(state.timer.running);
  requestAnimationFrame(mascotLoop);
}

// ===== EVENT LISTENERS =====
document.getElementById('search-input').addEventListener('input', (e) => {
  handleSearchInput(e.target.value);
});
document.getElementById('search-input').addEventListener('keydown', async (e) => {
  if (e.key === 'Enter') {
    clearTimeout(searchDebounceTimer);
    searchQuery = e.target.value;
    await renderTasks(false);
  }
});
document.getElementById('search-go').addEventListener('click', async () => {
  const input = document.getElementById('search-input');
  clearTimeout(searchDebounceTimer);
  searchQuery = input.value;
  await renderTasks(false);
});
document.getElementById('search-clear').addEventListener('click', clearSearch);

document.getElementById('prev-month').addEventListener('click', () => {
  state.viewMonth--;
  if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
  renderCalendar(true);
});

document.getElementById('next-month').addEventListener('click', () => {
  state.viewMonth++;
  if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
  renderCalendar(true);
});

document.getElementById('btn-today').addEventListener('click', goToToday);
document.getElementById('btn-start').addEventListener('click', startTimer);
document.getElementById('btn-pause').addEventListener('click', pauseTimer);
document.getElementById('btn-reset').addEventListener('click', resetTimer);

document.querySelectorAll('.mode-btn').forEach(btn => {
  btn.addEventListener('click', () => setTimerMode(btn.dataset.mode));
});

document.getElementById('btn-add-task').addEventListener('click', () => {
  state.editingTaskId = null;
  showForm();
});

document.getElementById('btn-save-task').addEventListener('click', saveTask);
document.getElementById('btn-cancel-task').addEventListener('click', hideForm);

document.getElementById('task-title').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') saveTask();
});

// Lofi controls
document.getElementById('lofi-play').addEventListener('click', toggleLofi);
document.getElementById('lofi-next').addEventListener('click', nextLofiTrack);
document.getElementById('lofi-prev').addEventListener('click', prevLofiTrack);
document.getElementById('lofi-volume').addEventListener('input', (e) => {
  setLofiVolume(parseInt(e.target.value));
});

// ===== KEYBOARD SHORTCUTS =====
document.addEventListener('keydown', (e) => {
  const tag = e.target.tagName;
  const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

  if (e.key === 'Escape') {
    if (isFormOpen()) {
      hideForm();
      e.preventDefault();
    } else if (searchQuery) {
      clearSearch();
      e.preventDefault();
    }
    return;
  }

  if (inInput) return;

  if (e.key === '/') {
    e.preventDefault();
    document.getElementById('search-input').focus();
    return;
  }

  if (e.code === 'Space') {
    e.preventDefault();
    if (state.timer.running) pauseTimer();
    else startTimer();
  }

  if (e.key === 'r' || e.key === 'R') resetTimer();

  if (e.key === 'n' || e.key === 'N') {
    if (!isFormOpen()) {
      state.editingTaskId = null;
      showForm();
    }
  }

  if (e.key === 't' || e.key === 'T') goToToday();

  if (e.key === 'ArrowLeft') {
    state.viewMonth--;
    if (state.viewMonth < 0) { state.viewMonth = 11; state.viewYear--; }
    renderCalendar(true);
  }

  if (e.key === 'ArrowRight') {
    state.viewMonth++;
    if (state.viewMonth > 11) { state.viewMonth = 0; state.viewYear++; }
    renderCalendar(true);
  }

  if (e.key === 'm' || e.key === 'M') toggleLofi();
});

// ========================================
// ===== REMINDER NOTIFICATION SYSTEM ====
// ========================================
const reminderState = {
  queue: [],
  active: false,
  dismissTimer: null,
  progressInterval: null,
  firedKeys: new Set(JSON.parse(localStorage.getItem('firedReminders') || '[]')),
};

function saveFiredReminders() {
  const todayPrefix = dateKey(new Date());
  const kept = [...reminderState.firedKeys].filter(k => k.startsWith(todayPrefix));
  reminderState.firedKeys = new Set(kept);
  localStorage.setItem('firedReminders', JSON.stringify(kept));
}

function checkReminders() {
  const now = new Date();
  const todayKey = dateKey(now);
  const tasks = state.tasks[todayKey] || [];
  const currentHH = String(now.getHours()).padStart(2, '0');
  const currentMM = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHH}:${currentMM}`;

  tasks.forEach(task => {
    if (!task.reminder || !task.time || task.completed) return;

    const fireKey = `${todayKey}:${task.id}:${task.time}`;
    if (reminderState.firedKeys.has(fireKey)) return;

    if (task.time <= currentTime) {
      reminderState.firedKeys.add(fireKey);
      saveFiredReminders();
      enqueueReminder(task, todayKey);
    }
  });
}

function enqueueReminder(task, key) {
  reminderState.queue.push({ task, key });
  if (!reminderState.active) {
    showNextReminder();
  }
}

function showNextReminder() {
  if (reminderState.queue.length === 0) {
    reminderState.active = false;
    return;
  }

  reminderState.active = true;
  const { task } = reminderState.queue.shift();

  document.getElementById('rp-title').textContent = task.title;
  const descEl = document.getElementById('rp-desc');
  if (task.description) {
    descEl.textContent = task.description;
    descEl.classList.add('has-text');
  } else {
    descEl.textContent = '';
    descEl.classList.remove('has-text');
  }
  document.getElementById('rp-time').textContent = task.time || 'NOW';

  drawPixelBell();
  spawnRingParticles();
  playReminderSound();

  const overlay = document.getElementById('reminder-overlay');
  overlay.classList.add('visible');

  overlay.dataset.taskId = task.id;
  overlay.dataset.taskKey = dateKey(state.selectedDate);

  const todayKey = dateKey(new Date());
  overlay.dataset.dateKey = todayKey;

  startAutoDismiss(12000);
}

function startAutoDismiss(duration) {
  const bar = document.getElementById('rp-progress-bar');
  bar.style.transition = 'none';
  bar.style.width = '100%';

  bar.offsetHeight;
  bar.style.transition = `width ${duration / 1000}s linear`;
  bar.style.width = '0%';

  clearTimeout(reminderState.dismissTimer);
  reminderState.dismissTimer = setTimeout(() => {
    dismissReminder();
  }, duration);
}

function dismissReminder() {
  clearTimeout(reminderState.dismissTimer);
  const overlay = document.getElementById('reminder-overlay');
  overlay.classList.remove('visible');

  setTimeout(() => showNextReminder(), 400);
}

async function reminderMarkDone() {
  const overlay = document.getElementById('reminder-overlay');
  const taskId = overlay.dataset.taskId;

  await window.api.toggleTaskStatus(taskId);
  await reloadTasks();
  await renderTasks(false);
  renderCalendar(false);
  showToast('TASK COMPLETE!');
  dismissReminder();
}

async function reminderSnooze(minutes) {
  const overlay = document.getElementById('reminder-overlay');
  const taskId = overlay.dataset.taskId;
  const key = overlay.dataset.dateKey;

  const task = (state.tasks[key] || []).find(t => t.id === taskId);
  if (task && task.time) {
    const [h, m] = task.time.split(':').map(Number);
    const snoozed = new Date();
    snoozed.setHours(h, m + minutes, 0, 0);
    if (snoozed <= new Date()) {
      snoozed.setTime(Date.now() + minutes * 60 * 1000);
    }
    const newTime = `${String(snoozed.getHours()).padStart(2, '0')}:${String(snoozed.getMinutes()).padStart(2, '0')}`;

    const oldFireKey = `${key}:${taskId}:${task.time}`;
    reminderState.firedKeys.delete(oldFireKey);
    saveFiredReminders();

    task.time = newTime;
    await window.api.updateTask({ ...task, date: key });
    await reloadTasks();
    await renderTasks(false);
    showToast(`SNOOZED ${minutes} MIN -> ${newTime}`);
  }
  dismissReminder();
}

function drawPixelBell() {
  const canvas = document.getElementById('rp-bell-canvas');
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, 32, 32);
  ctx.imageSmoothingEnabled = false;

  const y = '#ffd369';
  const Y = '#ffec8b';
  const d = '#b8860b';
  const w = '#eaeaea';

  const bell = [
    [0, 0, 0, 0, 0, 0, 0, y, y, 0, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, y, Y, Y, y, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, y, y, y, y, y, y, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, y, Y, Y, Y, Y, Y, Y, y, 0, 0, 0, 0],
    [0, 0, 0, y, Y, Y, w, Y, Y, Y, Y, Y, y, 0, 0, 0],
    [0, 0, 0, y, Y, w, Y, Y, Y, Y, Y, Y, y, 0, 0, 0],
    [0, 0, y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, y, 0, 0],
    [0, 0, y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, y, 0, 0],
    [0, y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, y, 0],
    [0, y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, y, 0],
    [y, d, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, Y, d, d, y],
    [y, d, d, d, d, d, d, d, d, d, d, d, d, d, d, y],
    [0, y, y, y, y, y, y, y, y, y, y, y, y, y, y, 0],
    [0, 0, 0, 0, 0, 0, y, d, d, y, 0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0, 0, d, d, 0, 0, 0, 0, 0, 0, 0],
  ];

  bell.forEach((row, ry) => {
    row.forEach((color, rx) => {
      if (color) {
        ctx.fillStyle = color;
        ctx.fillRect(rx * 2, ry * 2, 2, 2);
      }
    });
  });
}

function spawnRingParticles() {
  const container = document.getElementById('rp-ring-particles');
  container.innerHTML = '';

  const offsets = [
    { dx: '-12px', dy: '-10px' },
    { dx: '10px',  dy: '-12px' },
    { dx: '14px',  dy: '4px' },
    { dx: '6px',   dy: '14px' },
    { dx: '-8px',  dy: '12px' },
    { dx: '-14px', dy: '2px' },
  ];

  offsets.forEach(({ dx, dy }, i) => {
    const p = document.createElement('div');
    p.className = 'rp-particle';
    p.style.setProperty('--dx', dx);
    p.style.setProperty('--dy', dy);
    p.style.animationDelay = `${i * 0.08}s`;
    container.appendChild(p);
  });
}

function playReminderSound() {
  const ctx = new (window.AudioContext || window.webkitAudioContext)();

  const notes = [
    { freq: 880, start: 0, dur: 0.25 },
    { freq: 1108.73, start: 0.2, dur: 0.35 },
    { freq: 1318.51, start: 0.45, dur: 0.5 },
  ];

  notes.forEach(({ freq, start, dur }) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    gain.gain.setValueAtTime(0, ctx.currentTime + start);
    gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + start + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + start);
    osc.stop(ctx.currentTime + start + dur + 0.01);
  });
}

// Reminder popup action listeners
document.getElementById('rp-done').addEventListener('click', reminderMarkDone);
document.getElementById('rp-snooze5').addEventListener('click', () => reminderSnooze(5));
document.getElementById('rp-snooze10').addEventListener('click', () => reminderSnooze(10));
document.getElementById('rp-dismiss').addEventListener('click', dismissReminder);

// Check reminders every 15 seconds
setInterval(checkReminders, 15000);
setTimeout(checkReminders, 1000);

// ===== WINDOW RESIZE =====
window.addEventListener('resize', () => {
  initClouds();
});

// ===== INIT =====
(async function initApp() {
  // Migrate localStorage data to SQLite on first run
  const localData = localStorage.getItem('tasks');
  if (localData) {
    const parsed = JSON.parse(localData);
    if (Object.keys(parsed).length > 0) {
      await window.api.importFromLocalStorage(parsed);
    }
    localStorage.removeItem('tasks');
  }

  // Load tasks from SQLite
  await reloadTasks();

  renderCalendar(false);
  await renderTasks(false);
  updateDateLabel();
  drawTimerRing();
  updateTimerDisplay();
  updateGreeting();
  initClouds();
  animateClouds();
  mascotLoop();
  updateLofiDisplay();
})();
fetchWeather();

// Refresh weather every 30 minutes
setInterval(fetchWeather, 30 * 60 * 1000);
