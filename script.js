/* ================================================================
   COUNTDOWN CONFIGURATION — SET THE TARGET DATE HERE
   ================================================================ */
const COUNTDOWN_CONFIG = {
  targetDate: '2026-09-02T08:00:00-04:00',
  locale: 'zh-CN',
  packetId: '0005',
};

const ANDREW_DOMAIN = '@andrew.cmu.edu';
const ALLOWED_USERNAME = /^[A-Za-z0-9._+-]+$/;
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

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
  intakeDialog: document.querySelector('#intake-dialog'),
  intakeClose: document.querySelector('#intake-close'),
};

let previousValues = {};
let announcedMinute = null;

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
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

function formatOffset(date) {
  const minutes = -date.getTimezoneOffset();
  const sign = minutes >= 0 ? '+' : '-';
  return `${sign}${pad(Math.floor(Math.abs(minutes) / 60))}:${pad(Math.abs(minutes) % 60)}`;
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
  const target = new Date(COUNTDOWN_CONFIG.targetDate);
  const now = new Date();

  elements.targetDisplay.textContent = `${formatDate(target, true)} / UTC${formatOffset(target)}`;
  elements.issuedDate.textContent = formatDate(now);
  elements.packetId.textContent = COUNTDOWN_CONFIG.packetId;
  elements.checksum.textContent = makeChecksum(COUNTDOWN_CONFIG.targetDate);
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
  const targetTime = new Date(COUNTDOWN_CONFIG.targetDate).getTime();
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

function setFormStatus(status, message, type = '') {
  status.textContent = message;
  status.className = `email-form__status${type ? ` is-${type}` : ''}`;
}

function validateUsername(rawValue) {
  const username = rawValue.trim();

  if (!username) {
    return { valid: false, message: 'Please enter your Andrew ID.' };
  }
  if (username.includes('@')) {
    return { valid: false, message: 'Do not include @ in your Andrew ID.' };
  }
  if (!ALLOWED_USERNAME.test(username)) {
    return {
      valid: false,
      message: 'Use only letters, numbers, periods, underscores, plus signs, and hyphens.',
    };
  }
  if (username.startsWith('.') || username.endsWith('.') || username.includes('..')) {
    return {
      valid: false,
      message: 'Your Andrew ID cannot start or end with a period, or contain consecutive periods.',
    };
  }

  return { valid: true, username };
}

function wireEmailForm(form, { onSuccess } = {}) {
  const input = form.querySelector('.email-address input');
  const submit = form.querySelector('.submit-button');
  const status = form.querySelector('.email-form__status');
  const submitLabel = submit.textContent;

  input.addEventListener('beforeinput', (event) => {
    if (event.data?.includes('@')) {
      event.preventDefault();
      input.setAttribute('aria-invalid', 'true');
      setFormStatus(status, 'Do not include @ in your Andrew ID.', 'error');
    }
  });

  input.addEventListener('input', () => {
    const originalValue = input.value;
    const sanitizedValue = originalValue.replace(/@/g, '').replace(/[^A-Za-z0-9._+-]/g, '');

    if (sanitizedValue !== originalValue) {
      input.value = sanitizedValue;
      input.setAttribute('aria-invalid', 'true');
      setFormStatus(status, 'Use only letters, numbers, periods, underscores, plus signs, and hyphens.', 'error');
      return;
    }

    input.removeAttribute('aria-invalid');
    setFormStatus(status, '');
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const validation = validateUsername(input.value);

    if (!validation.valid) {
      input.setAttribute('aria-invalid', 'true');
      setFormStatus(status, validation.message, 'error');
      input.focus();
      return;
    }

    const completeEmail = `${validation.username}${ANDREW_DOMAIN}`;
    const submittedAt = new Date();
    const formData = new FormData();
    formData.append('email', completeEmail);
    formData.append('submittedAt', submittedAt.toISOString());
    formData.append('submittedLocal', submittedAt.toString());

    input.value = validation.username;
    input.removeAttribute('aria-invalid');
    submit.disabled = true;
    submit.textContent = 'Submitting...';
    setFormStatus(status, '');

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });

      if (!response.ok) throw new Error(`Form submission failed: ${response.status}`);

      input.value = '';
      setFormStatus(status, 'Success. We received your Andrew email.', 'success');
      onSuccess?.();
    } catch {
      setFormStatus(status, 'Submission failed. Please try again later.', 'error');
    } finally {
      submit.disabled = false;
      submit.textContent = submitLabel;
    }
  });
}

function setupIntakeDialog() {
  const dialog = elements.intakeDialog;

  wireEmailForm(document.querySelector('#intake-email-form'), {
    onSuccess: () => window.setTimeout(() => dialog.close(), 1400),
  });

  elements.intakeClose.addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  dialog.showModal();
}

wireEmailForm(document.querySelector('#andrew-email-form'));
setupIntakeDialog();
updateStaticDetails();
scheduleTick();
