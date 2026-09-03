/* ================================================================
   COUNTDOWN CONFIGURATION — SET THE TARGET DATE HERE
   ================================================================ */
const COUNTDOWN_CONFIG = {
  locale: 'zh-CN',
  packetId: '0005',
  signalTime: ['19', '15', '19'],
};

const ANDREW_DOMAIN = '@andrew.cmu.edu';
const ALLOWED_USERNAME = /^[A-Za-z0-9._+-]+$/;
const INTAKE_STORAGE_KEY = 'etc-intake-submitted';

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
  countdownPanel: document.querySelector('.countdown-panel'),
  signalFragment: document.querySelector('#signal-fragment'),
  intakeDialog: document.querySelector('#intake-dialog'),
};

let previousValues = {};
let announcedMinute = null;
const GLITCH_GLYPHS = '01#%&/\\<>[]{}?!=+*ΞЖȜƵ';
const glitchResets = new WeakMap();

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
  const now = new Date();
  const signalTime = COUNTDOWN_CONFIG.signalTime.join(':');

  elements.targetDisplay.textContent = `SIGNAL LOCK / ${signalTime}`;
  elements.issuedDate.textContent = formatDate(now);
  elements.packetId.textContent = COUNTDOWN_CONFIG.packetId;
  elements.checksum.textContent = makeChecksum(signalTime);
}

function renderValue(element, key, value) {
  if (previousValues[key] === value) return;
  previousValues[key] = value;
  element.dataset.value = value;
  element.classList.remove('is-ticking');
  void element.offsetWidth;
  element.textContent = value;
  element.classList.add('is-ticking');
  window.setTimeout(() => element.classList.remove('is-ticking'), 120);
}

function corruptText(value, intensity = 0.5) {
  return [...value]
    .map((character) => {
      if (character === ' ' || Math.random() > intensity) return character;
      return GLITCH_GLYPHS[Math.floor(Math.random() * GLITCH_GLYPHS.length)];
    })
    .join('');
}

function corruptValue(element) {
  const currentValue = element.dataset.value || element.textContent;
  const previousReset = glitchResets.get(element);
  if (previousReset) window.clearTimeout(previousReset);

  const protectedIndex = Math.floor(Math.random() * currentValue.length);
  const corruptedValue = [...currentValue]
    .map((character, index) => index === protectedIndex ? character : corruptText(character, 1))
    .join('');
  element.dataset.corrupt = corruptedValue;
  element.textContent = currentValue;
  element.classList.add('is-corrupted');

  const reset = window.setTimeout(() => {
    element.textContent = element.dataset.value || currentValue;
    element.dataset.corrupt = element.dataset.value || currentValue;
    element.classList.remove('is-corrupted');
  }, 90 + Math.random() * 170);
  glitchResets.set(element, reset);
}

function scheduleSignalInterference() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  window.setTimeout(() => {
    const values = [elements.hours, elements.minutes, elements.seconds];
    const burstSize = Math.random() > 0.24 ? values.length : 2;
    values.sort(() => Math.random() - 0.5).slice(0, burstSize).forEach(corruptValue);

    elements.countdownPanel.classList.add('is-interfering');
    elements.signalFragment.textContent = Math.random() > 0.48
      ? `// ${corruptText('SIGNAL_UNSTABLE', 0.36)}`
      : `// ERR_${corruptText(makeChecksum(String(Date.now())).slice(0, 4), 0.58)}`;

    window.setTimeout(() => {
      elements.countdownPanel.classList.remove('is-interfering');
      elements.signalFragment.textContent = '// SIGNAL_UNSTABLE';
    }, 70 + Math.random() * 150);

    scheduleSignalInterference();
  }, 45 + Math.random() * 240);
}

function updateCountdown() {
  const [hours, minutes, seconds] = COUNTDOWN_CONFIG.signalTime;

  renderValue(elements.hours, 'hours', hours);
  renderValue(elements.minutes, 'minutes', minutes);
  renderValue(elements.seconds, 'seconds', seconds);

  elements.statusLabel.textContent = 'UNSTABLE';
  elements.syncState.textContent = 'CORRUPTED';
  elements.body.classList.remove('is-expired');

  if (announcedMinute !== minutes) {
    announcedMinute = minutes;
    elements.hours.closest('[role="timer"]').setAttribute(
      'aria-label',
      `Corrupted signal displaying ${hours} hours, ${minutes} minutes and ${seconds} seconds`,
    );
  }
}

function scheduleTick() {
  updateCountdown();
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

/* Private browsing and blocked-storage settings make localStorage throw on
   access, so both sides are guarded: if storage is unusable the gate simply
   reappears on the next visit. */
function hasCompletedIntake() {
  try {
    return window.localStorage.getItem(INTAKE_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function rememberIntake() {
  try {
    window.localStorage.setItem(INTAKE_STORAGE_KEY, 'true');
  } catch {
    /* Storage unavailable — nothing to remember, the gate shows again later. */
  }
}

/* The intake dispatch is a hard gate on the first visit: it only closes once an
   Andrew ID has been submitted successfully, so every dismissal route is
   disabled. Once submitted, the visitor is never asked again on this browser. */
function setupIntakeDialog() {
  if (hasCompletedIntake()) return;

  const dialog = elements.intakeDialog;
  const card = dialog.querySelector('.dispatch__card');
  const input = dialog.querySelector('#intake-andrew-username');
  let unlocked = false;

  function refuseDismissal() {
    card.animate(
      [{ transform: 'translateX(-6px)' }, { transform: 'translateX(6px)' }, { transform: 'translateX(0)' }],
      { duration: 190 },
    );
    input.focus();
  }

  wireEmailForm(document.querySelector('#intake-email-form'), {
    onSuccess: () => {
      rememberIntake();
      window.setTimeout(() => {
        unlocked = true;
        dialog.close();
      }, 1400);
    },
  });

  /* Blocks Escape and any other browser-initiated cancel. */
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    refuseDismissal();
  });

  /* Clicks on the backdrop land on the dialog element itself. */
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) refuseDismissal();
  });

  /* Last resort: if anything else closes the dialog, reopen it. */
  dialog.addEventListener('close', () => {
    if (!unlocked) dialog.showModal();
  });

  dialog.showModal();
  window.setTimeout(() => input.focus(), 0);
}

wireEmailForm(document.querySelector('#andrew-email-form'));
setupIntakeDialog();
updateStaticDetails();
scheduleTick();
scheduleSignalInterference();

/* ================================================================
   OBSERVATION CONSOLE / VIEW ROUTING
   ================================================================ */
const ROUTES = ['home', 'archive', 'station', 'system-log', 'about'];
const navItems = [...document.querySelectorAll('[data-route]')];
const views = [...document.querySelectorAll('[data-view]')];
let stationMap;

function initStationMap() {
  if (stationMap || !window.L) return;

  const station = [40.4433, -79.9436];
  stationMap = window.L.map('station-map', {
    center: station,
    zoom: 12,
    zoomControl: true,
    attributionControl: false,
  });

  window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(stationMap);

  const stationIcon = window.L.divIcon({ className: 'station-marker', iconSize: [12, 12], iconAnchor: [6, 6] });
  const relayIcon = window.L.divIcon({ className: 'relay-marker', iconSize: [8, 8], iconAnchor: [4, 4] });
  window.L.marker(station, { icon: stationIcon }).addTo(stationMap).bindTooltip('ETC / PRIMARY NODE', { direction: 'top', offset: [0, -8] });
  [
    [40.4406, -79.9959, 'DOWNTOWN RELAY'],
    [40.4556, -79.9264, 'EAST LIBERTY RELAY'],
    [40.4319, -80.0062, 'SOUTH SHORE RELAY'],
  ].forEach(([lat, lng, label]) => window.L.marker([lat, lng], { icon: relayIcon }).addTo(stationMap).bindTooltip(label, { direction: 'top' }));

  const coordinateReadout = document.querySelector('#map-coordinates');
  const zoomReadout = document.querySelector('#map-zoom');
  stationMap.on('mousemove', ({ latlng }) => {
    coordinateReadout.textContent = `${Math.abs(latlng.lat).toFixed(4)}° ${latlng.lat >= 0 ? 'N' : 'S'} / ${Math.abs(latlng.lng).toFixed(4)}° ${latlng.lng >= 0 ? 'E' : 'W'}`;
  });
  stationMap.on('zoomend', () => { zoomReadout.textContent = `ZOOM ${stationMap.getZoom()}`; });
}

function showView(route, { updateHash = true } = {}) {
  const nextRoute = ROUTES.includes(route) ? route : 'home';
  views.forEach((view) => view.classList.toggle('is-active', view.dataset.view === nextRoute));
  navItems.forEach((item) => {
    const active = item.dataset.route === nextRoute;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });
  document.title = nextRoute === 'home' ? 'ETC Weather Observation' : `${nextRoute.replace('-', ' ').toUpperCase()} — ETC Observation`;
  if (updateHash) history.replaceState(null, '', nextRoute === 'home' ? '#home' : `#${nextRoute}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (nextRoute === 'station') {
    window.setTimeout(() => {
      initStationMap();
      stationMap?.invalidateSize();
    }, 50);
  }
}

navItems.forEach((item) => item.addEventListener('click', () => showView(item.dataset.route)));
window.addEventListener('hashchange', () => showView(location.hash.slice(1), { updateHash: false }));
showView(location.hash.slice(1) || 'home', { updateHash: false });

/* Restricted packet archive: lightweight ARG gate, not security for sensitive data. */
const ADMIN_PASSWORD = 'DMJRC';
const archiveLinks = [...document.querySelectorAll('.archive-link')];
const archiveForm = document.querySelector('#archive-form');
const archivePassword = document.querySelector('#archive-password');
const archiveStatus = document.querySelector('#archive-status');
const packetViewer = document.querySelector('#packet-viewer');
const packetViewerClose = document.querySelector('#packet-viewer-close');
const packetViewerMeta = document.querySelector('#packet-viewer-meta');
const packetViewerImage = document.querySelector('#packet-viewer-image');
const restrictedDialog = document.querySelector('#restricted-dialog');
const restrictedClose = document.querySelector('#restricted-close');
const restrictedPacket = document.querySelector('#restricted-packet');
let pendingRestrictedPacket = null;

function closePacketViewer() {
  packetViewer.close();
  packetViewerImage.removeAttribute('src');
}

function openPacket(record) {
  packetViewerMeta.textContent = `PACKET ${record.packet} / ${record.date}`;
  packetViewerImage.src = record.image;
  packetViewerImage.alt = `Weather bulletin packet ${record.packet}, issued ${record.date}`;
  packetViewer.showModal();
}

function closeRestrictedDialog() {
  restrictedDialog.close();
  archivePassword.value = '';
  archiveStatus.textContent = '';
  archiveStatus.removeAttribute('data-state');
  pendingRestrictedPacket = null;
}

archiveLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    const record = {
      packet: link.dataset.packet,
      date: link.dataset.date,
      image: link.dataset.image,
    };

    if (link.dataset.restricted === 'true') {
      pendingRestrictedPacket = record;
      restrictedPacket.textContent = `PACKET ${record.packet} / ${record.date}`;
      archivePassword.value = '';
      archiveStatus.textContent = '';
      archiveStatus.removeAttribute('data-state');
      restrictedDialog.showModal();
      window.setTimeout(() => archivePassword.focus(), 0);
      return;
    }

    openPacket(record);
  });
});

packetViewerClose.addEventListener('click', closePacketViewer);
packetViewer.addEventListener('click', (event) => {
  if (event.target === packetViewer) closePacketViewer();
});
packetViewer.addEventListener('close', () => packetViewerImage.removeAttribute('src'));

restrictedClose.addEventListener('click', closeRestrictedDialog);
restrictedDialog.addEventListener('click', (event) => {
  if (event.target === restrictedDialog) closeRestrictedDialog();
});
restrictedDialog.addEventListener('close', () => {
  archivePassword.value = '';
  pendingRestrictedPacket = null;
});

archiveForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (archivePassword.value.trim().toUpperCase() === ADMIN_PASSWORD) {
    archiveStatus.textContent = `ACCESS GRANTED / PACKET ${pendingRestrictedPacket?.packet ?? ''}`;
    archiveStatus.dataset.state = 'success';
    archivePassword.value = '';
    return;
  }

  archiveStatus.textContent = 'ACCESS DENIED';
  archiveStatus.dataset.state = 'error';
  archivePassword.value = '';
  archivePassword.focus();
  archiveForm.animate([{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }], { duration: 180 });
});

/* The rail follows the pointer subtly and introduces itself once per tab. */
const observationRail = document.querySelector('.site-nav');
if (observationRail) {
  observationRail.addEventListener('pointermove', (event) => {
    const bounds = observationRail.getBoundingClientRect();
    observationRail.style.setProperty('--nav-y', `${event.clientY - bounds.top}px`);
  });

  observationRail.addEventListener('pointerleave', () => {
    observationRail.style.setProperty('--nav-y', '50%');
    observationRail.classList.remove('is-peeking');
    observationRail.querySelector(':focus')?.blur();
  });

  if (!window.sessionStorage.getItem('etc-rail-seen') && window.matchMedia('(min-width: 821px)').matches) {
    observationRail.classList.add('is-peeking');
    window.setTimeout(() => observationRail.classList.remove('is-peeking'), 1450);
    window.sessionStorage.setItem('etc-rail-seen', 'true');
  }

  observationRail.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.activeElement?.blur();
      observationRail.classList.remove('is-peeking');
    }
  });
}
