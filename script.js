/* ================================================================
   COUNTDOWN CONFIGURATION — EDIT THIS ONE BLOCK TO CHANGE DEFAULTS
   ================================================================ */
const COUNTDOWN_CONFIG = {
  targetDate: '2026-12-31T23:59:59+08:00',
  locale: 'zh-CN',
  storageKey: 'next-update-settings-v2',
};

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const elements = {
  body: document.body,
  hours: document.querySelector('#hours'),
  minutes: document.querySelector('#minutes'),
  seconds: document.querySelector('#seconds'),
  targetDisplay: document.querySelector('#target-display'),
  statusLabel: document.querySelector('#status-label'),
  issuedDate: document.querySelector('#issued-date'),
  packetId: document.querySelector('#packet-id'),
  checksum: document.querySelector('#checksum'),
  syncState: document.querySelector('#sync-state'),
  dialog: document.querySelector('#settings-dialog'),
  form: document.querySelector('#settings-form'),
  dateInput: document.querySelector('#date-input'),
  openSettings: document.querySelector('#open-settings'),
  closeSettings: document.querySelector('#close-settings'),
  resetSettings: document.querySelector('#reset-settings'),
};

let settings = loadSettings();
let previousValues = {};
let announcedMinute = null;

function loadSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(COUNTDOWN_CONFIG.storageKey));
    if (!Number.isNaN(new Date(saved?.targetDate).getTime())) {
      return saved;
    }
  } catch {
    // Invalid local data falls back to the code-level defaults.
  }

  return {
    targetDate: COUNTDOWN_CONFIG.targetDate,
  };
}

function saveSettings(nextSettings) {
  settings = nextSettings;
  localStorage.setItem(COUNTDOWN_CONFIG.storageKey, JSON.stringify(settings));
  previousValues = {};
  updateStaticDetails();
  updateCountdown();
}

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
}

function toLocalInputValue(date) {
  const offset = date.getTimezoneOffset() * MINUTE;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDate(date, withTime = false) {
  return new Intl.DateTimeFormat(COUNTDOWN_CONFIG.locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    ...(withTime
      ? { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }
      : {}),
  }).format(date).replaceAll('/', '.');
}

function makeChecksum(value) {
  let hash = 2166136261;
  for (const character of value) {
    hash ^= character.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  const hex = (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

function updateStaticDetails() {
  const target = new Date(settings.targetDate);
  const now = new Date();
  const packetSeed = Math.abs(Math.round((target.getTime() - now.getTime()) / DAY));

  elements.targetDisplay.textContent = `${formatDate(target, true)} / UTC${formatOffset(target)}`;
  elements.issuedDate.textContent = formatDate(now);
  elements.packetId.textContent = pad(packetSeed % 10000, 4);
  elements.checksum.textContent = makeChecksum(settings.targetDate);
  document.title = 'Next Update — Temporal Observation';
}

function formatOffset(date) {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
}

function renderValue(element, key, value) {
  if (previousValues[key] === value) return;
  previousValues[key] = value;
  element.classList.remove('is-ticking');
  void element.offsetWidth;
  element.textContent = value;
  element.classList.add('is-ticking');
  window.setTimeout(() => element.classList.remove('is-ticking'), 120);
}

function updateCountdown() {
  const targetTime = new Date(settings.targetDate).getTime();
  const remaining = Math.max(0, targetTime - Date.now());
  const expired = remaining <= 0;

  const hours = Math.floor(remaining / HOUR);
  const minutes = Math.floor((remaining % HOUR) / MINUTE);
  const seconds = Math.floor((remaining % MINUTE) / SECOND);

  renderValue(elements.hours, 'hours', pad(hours, Math.max(2, String(hours).length)));
  renderValue(elements.minutes, 'minutes', pad(minutes));
  renderValue(elements.seconds, 'seconds', pad(seconds));

  elements.statusLabel.textContent = expired ? 'COMPLETE' : 'ACTIVE';
  elements.syncState.textContent = expired ? 'TERMINAL' : 'NOMINAL';
  elements.body.classList.toggle('is-expired', expired);

  const currentMinute = Math.ceil(remaining / MINUTE);
  if (announcedMinute !== currentMinute) {
    announcedMinute = currentMinute;
    elements.hours.closest('[role="timer"]').setAttribute(
      'aria-label',
      expired
        ? 'Next update countdown complete'
        : `${hours} hours, ${minutes} minutes and ${seconds} seconds remaining`,
    );
  }
}

function scheduleTick() {
  updateCountdown();
  window.setTimeout(scheduleTick, SECOND - (Date.now() % SECOND) + 12);
}

function openSettings() {
  elements.dateInput.value = toLocalInputValue(new Date(settings.targetDate));
  elements.dialog.showModal();
  window.setTimeout(() => elements.dateInput.focus(), 0);
}

elements.openSettings.addEventListener('click', openSettings);
elements.closeSettings.addEventListener('click', () => elements.dialog.close());

elements.dialog.addEventListener('click', (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

elements.form.addEventListener('submit', (event) => {
  event.preventDefault();
  const target = new Date(elements.dateInput.value);
  if (Number.isNaN(target.getTime())) return;

  saveSettings({
    targetDate: target.toISOString(),
  });
  elements.dialog.close();
});

elements.resetSettings.addEventListener('click', () => {
  localStorage.removeItem(COUNTDOWN_CONFIG.storageKey);
  saveSettings({
    targetDate: COUNTDOWN_CONFIG.targetDate,
  });
  elements.dateInput.value = toLocalInputValue(new Date(settings.targetDate));
});

updateStaticDetails();
scheduleTick();
