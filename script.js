/* ================================================================
   ARG CONFIGURATION — THE VALUES PLAYTESTS NEED TO SWAP
   ================================================================ */
const CONFIG = {
  /* The station countdown and the Aquarium opening point at the same moment. */
  targetDate: '2026-09-26T00:00:00-04:00',
  locale: 'zh-CN',
  latestPacket: '0008',
  latestIssued: '09/16/2026',
  archiveAccessKey: 'A17EE71A',
  aquariumUrl: '/aquarium/',
  aquariumLabel: 'etcweatherobservation.com/aquarium',
};

const STORAGE_KEYS = {
  firstContact: 'etc-first-contact-complete',
  archiveUnlocked: 'etc-archive-unlocked',
  andrewId: 'etc-andrew-id',
};

const ANDREW_DOMAIN = '@andrew.cmu.edu';
const ALLOWED_USERNAME = /^[A-Za-z0-9._+-]+$/;
/* Private browsing and blocked-storage settings make localStorage throw on
   access, so every read and write is guarded: if storage is unusable the
   experience still runs, it just forgets progress between visits. */
const store = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* Storage unavailable — progress is lost on reload, nothing else breaks. */
    }
  },
  clear() {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
    } catch {
      /* Nothing to clear. */
    }
  },
};

/* ?reset=true wipes local progress so a playtest can start from first contact. */
if (new URLSearchParams(location.search).get('reset') === 'true') {
  store.clear();
  try {
    window.localStorage.removeItem('aquarium-visitor');
  } catch {
    /* Aquarium state lives on the same origin but may be unreachable. */
  }
  history.replaceState(null, '', location.pathname + location.hash);
}

/* ================================================================
   PACKET DATA — ADD NEW RECORDS HERE
   ================================================================ */
const PACKETS = [
  {
    id: '0008',
    issueDate: '09/16/2026',
    isoDate: '2026-09-16',
    title: 'RETURN OBSERVATION',
    restricted: false,
    pages: ['./packets/packet-0008-1.png'],
  },
  {
    id: '0007',
    issueDate: '09/07/2026',
    isoDate: '2026-09-07',
    title: 'LOCAL FORECAST BULLETIN',
    restricted: false,
    pages: ['./packets/packet-0007-1.png', './packets/packet-0007-2.png'],
  },
  {
    id: '0006',
    issueDate: '09/03/2026',
    isoDate: '2026-09-03',
    title: 'LOCAL FORECAST BULLETIN',
    restricted: false,
    pages: ['./packets/packet-0006-1.png', './packets/packet-0006-2.png'],
  },
  {
    id: '0005',
    issueDate: '08/30/2026',
    isoDate: '2026-08-30',
    title: 'LOCAL FORECAST BULLETIN',
    restricted: false,
    pages: ['./packets/packet-0005-1.png'],
  },
  {
    id: '0004',
    issueDate: '08/27/2026',
    isoDate: '2026-08-27',
    title: 'LOCAL FORECAST BULLETIN',
    restricted: false,
    pages: ['./packets/packet-0004-1.png'],
  },
  {
    id: '0003',
    issueDate: '08/24/2026',
    isoDate: '2026-08-24',
    title: 'LOCAL FORECAST BULLETIN',
    restricted: false,
    pages: ['./packets/packet-0003-1.png'],
  },
  {
    id: '0002',
    issueDate: '10/18/2008',
    isoDate: '2008-10-18',
    title: 'RECOVERED CONVERSATION',
    restricted: true,
    record: {
      timestamp: '10.18.2008 / 2:11',
      source: 'UNRESOLVED',
      state: 'PARTIAL',
      label: 'MESSAGE 02 / REPLY',
      lines: [
        'I CHANGED IT.',
        'I TRACED YOUR SIGNAL TO THE OLD AQUARIUM.',
        'THE SIGNAL STABILIZES',
        'AT  THE  LARGE  G_A_S.',
        'IF THE SAME PLACE EXISTS THERE,',
        'COME  TO  THE  GL_S_  TOMORROW AT 18:00.',
        'WE MAY BE ABLE TO SYNCHRONIZE THE—',
      ],
      symbol: 'rain',
      temperature: '58°F',
      footnote: 'NO FURTHER PAEKETS RECOVERE',
      checksum: 'CHK: E71A',
      relatedRecord: true,
    },
  },
  {
    id: '0001',
    issueDate: '10/17/2008',
    isoDate: '2008-10-17',
    title: 'RECOVERED CONVERSATION',
    restricted: true,
    record: {
      timestamp: '10.17.2008 / 21:43',
      source: 'UNRESOLVED',
      state: 'RECEIVED',
      label: 'MESSAGE 01',
      lines: [
        'THIS IS NOT THE FORECAST I SAVED.',
        'IF SOMEONE ELSE CAN READ THIS',
        "CHANGE TOMORROW'S SYMBOL TO RAIN.",
        'DO NOT CHANGE THE TEMPERATURE.',
        'I NEED TO KNOW THIS IS NOT AN ERROR.',
      ],
      symbol: 'sun',
      temperature: '58°F',
      footnote: 'REPLY RECOVERED IN ANOTHER PACKET',
      checksum: 'CHK: A17E',
    },
  },
];

/* ================================================================
   COUNTDOWN
   ================================================================ */
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
};

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
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
  elements.hours.textContent = '00';
  elements.minutes.textContent = '00';
  elements.seconds.textContent = '00';
  elements.targetDisplay.textContent = 'NOT SCHEDULED';
  elements.statusLabel.textContent = 'SUSPENDED';
  elements.issuedDate.textContent = CONFIG.latestIssued;
  elements.packetId.textContent = CONFIG.latestPacket;
  elements.checksum.textContent = makeChecksum(`SUSPENDED:${CONFIG.targetDate}`);
  elements.syncState.textContent = 'HALTED';
  elements.hours.closest('.timer').setAttribute('aria-label', 'Next update bulletin suspended');
}

updateStaticDetails();

/* ================================================================
   ANDREW ID / AFFILIATION
   ================================================================ */
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
    submit.textContent = 'VERIFYING...';
    setFormStatus(status, '');

    /* The record is logged for the production team, but a Formspree outage must
       never strand a player: verification succeeds either way. */
    try {
      await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: formData,
      });
    } catch {
      /* Offline or blocked — continue without the record. */
    }

    submit.disabled = false;
    submit.textContent = submitLabel;
    onSuccess?.(validation.username);
  });
}

const affiliationForm = document.querySelector('#affiliation-form');
const affiliationResult = document.querySelector('#affiliation-result');
const affiliationUsername = document.querySelector('#affiliation-username');
const affiliationKey = document.querySelector('#affiliation-key');
const affiliationStatus = document.querySelector('#affiliation-status');

function showAffiliation(username) {
  affiliationUsername.textContent = username;
  affiliationKey.textContent = CONFIG.archiveAccessKey;
  affiliationResult.hidden = false;
}

wireEmailForm(affiliationForm, {
  onSuccess: (username) => {
    store.set(STORAGE_KEYS.andrewId, username);
    affiliationForm.querySelector('.email-address input').value = '';
    setFormStatus(affiliationStatus, '');
    showAffiliation(username);
  },
});

const savedAndrewId = store.get(STORAGE_KEYS.andrewId);
if (savedAndrewId) showAffiliation(savedAndrewId);

/* ================================================================
   VIEW ROUTING
   ================================================================ */
const ROUTES = ['current', 'archive', 'about'];
const navItems = [...document.querySelectorAll('[data-route]')];
const views = [...document.querySelectorAll('[data-view]')];

function showView(route, { updateHash = true } = {}) {
  /* #home kept working for anyone holding an old link. */
  const requested = route === 'home' ? 'current' : route;
  const nextRoute = ROUTES.includes(requested) ? requested : 'current';
  views.forEach((view) => view.classList.toggle('is-active', view.dataset.view === nextRoute));
  navItems.forEach((item) => {
    const active = item.dataset.route === nextRoute;
    item.classList.toggle('is-active', active);
    item.setAttribute('aria-current', active ? 'page' : 'false');
  });
  document.title = nextRoute === 'current' ? 'ETC Weather Observation' : `${nextRoute.replace('-', ' ').toUpperCase()} — ETC Observation`;
  if (updateHash) history.replaceState(null, '', `#${nextRoute}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

navItems.forEach((item) => item.addEventListener('click', () => showView(item.dataset.route)));
window.addEventListener('hashchange', () => showView(location.hash.slice(1), { updateHash: false }));
showView(location.hash.slice(1) || 'current', { updateHash: false });

/* ================================================================
   ARCHIVE
   ================================================================ */
const archiveList = document.querySelector('#archive-list');
const archiveCode = document.querySelector('#archive-code');
const archiveNote = document.querySelector('#archive-note');
const packetViewer = document.querySelector('#packet-viewer');
const packetViewerClose = document.querySelector('#packet-viewer-close');
const packetViewerMeta = document.querySelector('#packet-viewer-meta');
const packetViewerTitle = document.querySelector('#packet-viewer-title');
const packetViewerPages = document.querySelector('#packet-viewer-pages');
const restrictedDialog = document.querySelector('#restricted-dialog');
const restrictedClose = document.querySelector('#restricted-close');
const archiveForm = document.querySelector('#archive-form');
const archiveKeyInput = document.querySelector('#archive-key');
const archiveStatus = document.querySelector('#archive-status');

function isArchiveUnlocked() {
  return store.get(STORAGE_KEYS.archiveUnlocked) === 'true';
}

function renderArchive() {
  const unlocked = isArchiveUnlocked();
  const withheld = PACKETS.filter((packet) => packet.restricted && !unlocked).length;

  archiveList.replaceChildren(
    ...PACKETS.map((packet) => {
      const locked = packet.restricted && !unlocked;
      const link = document.createElement('a');
      link.className = `archive-link${locked ? ' is-restricted' : ''}`;
      link.href = `#packet-${packet.id}`;
      link.dataset.packet = packet.id;

      const name = document.createElement('strong');
      name.textContent = `PACKET ${packet.id}`;

      const date = document.createElement('time');
      date.dateTime = packet.isoDate;
      date.textContent = packet.issueDate;

      const state = document.createElement('span');
      state.textContent = locked ? '[RESTRICTED]' : '[VIEW]';

      link.append(name, date, state);
      link.addEventListener('click', (event) => {
        event.preventDefault();
        if (packet.restricted && !isArchiveUnlocked()) {
          openRestrictedDialog();
          return;
        }
        openPacket(packet);
      });
      return link;
    }),
  );

  archiveCode.textContent = `${pad(PACKETS.length)} RECORDS / READ ONLY`;
  archiveNote.textContent = withheld
    ? `${pad(withheld)} RECORDS WITHHELD / OPERATOR ACCESS REQUIRED`
    : 'ARCHIVE ACCESS GRANTED / ALL RECORDS AVAILABLE';
  archiveNote.dataset.state = withheld ? 'withheld' : 'granted';
}

function createSymbol(kind) {
  const namespace = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(namespace, 'svg');
  svg.setAttribute('viewBox', '0 0 120 120');
  svg.setAttribute('class', 'recovered-symbol');
  svg.setAttribute('aria-hidden', 'true');

  if (kind === 'sun') {
    const points = [];
    for (let index = 0; index < 24; index += 1) {
      const radius = index % 2 === 0 ? 56 : 38;
      const angle = (Math.PI * index) / 12 - Math.PI / 2;
      points.push(`${(60 + radius * Math.cos(angle)).toFixed(1)},${(60 + radius * Math.sin(angle)).toFixed(1)}`);
    }
    const burst = document.createElementNS(namespace, 'polygon');
    burst.setAttribute('points', points.join(' '));
    const core = document.createElementNS(namespace, 'circle');
    core.setAttribute('cx', '60');
    core.setAttribute('cy', '60');
    core.setAttribute('r', '24');
    svg.append(burst, core);
    return svg;
  }

  const cloud = document.createElementNS(namespace, 'path');
  cloud.setAttribute(
    'd',
    'M30 74 C15 74 10 60 21 53 C16 37 34 27 46 36 C52 20 78 22 82 40 C99 38 105 60 92 68 C89 72 84 74 78 74 Z',
  );
  svg.append(cloud);

  [30, 44, 58, 72, 86].forEach((x) => {
    const drop = document.createElementNS(namespace, 'line');
    drop.setAttribute('x1', String(x));
    drop.setAttribute('y1', '84');
    drop.setAttribute('x2', String(x - 7));
    drop.setAttribute('y2', '102');
    svg.append(drop);
  });

  return svg;
}

function createRecoveredSheet(packet) {
  const { record } = packet;
  const sheet = document.createElement('article');
  sheet.className = 'recovered';

  const head = document.createElement('header');
  head.className = 'recovered__head';
  head.innerHTML = '<b>ETC WEATHER OBSERVATION</b><span>ARCHIVE / 2008</span>';

  const body = document.createElement('div');
  body.className = 'recovered__body';

  const tags = document.createElement('div');
  tags.className = 'recovered__tags';
  tags.innerHTML = `<span>RECOVERED CONVERSATION</span><span>PACKET ${packet.id}</span>`;

  const meta = document.createElement('dl');
  meta.className = 'recovered__meta';
  meta.innerHTML = `
    <div><dt>DATE</dt><dd>${record.timestamp}</dd></div>
    <div><dt>SOURCE</dt><dd>${record.source}</dd></div>
    <div><dt>STATE</dt><dd>${record.state}</dd></div>`;

  const grid = document.createElement('div');
  grid.className = 'recovered__grid';

  const message = document.createElement('div');
  message.className = 'recovered__message';
  const label = document.createElement('p');
  label.className = 'recovered__label';
  label.textContent = record.label;
  message.append(label, ...record.lines.map((line) => {
    const paragraph = document.createElement('p');
    paragraph.className = 'recovered__line';
    paragraph.textContent = line;
    return paragraph;
  }));

  const figure = document.createElement('figure');
  figure.className = 'recovered__glass';
  const caption = document.createElement('figcaption');
  caption.textContent = record.temperature;
  figure.append(createSymbol(record.symbol), caption);

  grid.append(message, figure);

  const foot = document.createElement('footer');
  foot.className = 'recovered__foot';
  foot.innerHTML = `<span>${record.footnote}</span><span>${record.checksum}</span>`;

  body.append(tags, meta, grid, foot);
  sheet.append(head, body);
  return sheet;
}

function createRelatedRecord() {
  const related = document.createElement('aside');
  related.className = 'related-record';

  const label = document.createElement('p');
  label.className = 'related-record__label';
  label.textContent = 'RELATED RECORD';

  const link = document.createElement('a');
  link.className = 'related-record__link';
  link.href = CONFIG.aquariumUrl;
  link.textContent = CONFIG.aquariumLabel;

  const note = document.createElement('p');
  note.className = 'related-record__note';
  note.textContent = 'LOCATION REFERENCED IN THIS MESSAGE / STILL RESOLVING';

  related.append(label, link, note);
  return related;
}

function openPacket(packet) {
  packetViewerMeta.textContent = `PACKET ${packet.id} / ${packet.issueDate}`;
  packetViewerTitle.textContent = packet.title;

  const pages = [];

  if (packet.record) {
    const recovered = createRecoveredSheet(packet);
    if (packet.record.relatedRecord) {
      const packetStack = document.createElement('div');
      packetStack.className = 'packet-record-stack';
      packetStack.append(recovered, createRelatedRecord());
      pages.push(packetStack);
    } else {
      pages.push(recovered);
    }
  } else {
    packet.pages.forEach((source, index) => {
      const figure = document.createElement('figure');
      figure.className = 'packet-page';

      const image = document.createElement('img');
      image.src = source;
      image.loading = index === 0 ? 'eager' : 'lazy';
      image.alt = `Packet ${packet.id}, issued ${packet.issueDate}${packet.pages.length > 1 ? `, page ${index + 1}` : ''}`;
      figure.append(image);

      if (packet.pages.length > 1) {
        const caption = document.createElement('figcaption');
        caption.textContent = `PAGE ${index + 1} / ${packet.pages.length}`;
        figure.append(caption);
      }
      pages.push(figure);
    });
  }

  packetViewerPages.replaceChildren(...pages);
  packetViewer.showModal();
  packetViewer.querySelector('.packet-viewer__card').scrollTop = 0;
}

function closePacketViewer() {
  packetViewer.close();
}

function openRestrictedDialog() {
  archiveKeyInput.value = '';
  archiveStatus.textContent = '';
  archiveStatus.removeAttribute('data-state');
  restrictedDialog.showModal();
  window.setTimeout(() => archiveKeyInput.focus(), 0);
}

function closeRestrictedDialog() {
  restrictedDialog.close();
}

packetViewerClose.addEventListener('click', closePacketViewer);
packetViewer.addEventListener('click', (event) => {
  if (event.target === packetViewer) closePacketViewer();
});
packetViewer.addEventListener('close', () => packetViewerPages.replaceChildren());

restrictedClose.addEventListener('click', closeRestrictedDialog);
restrictedDialog.addEventListener('click', (event) => {
  if (event.target === restrictedDialog) closeRestrictedDialog();
});
restrictedDialog.addEventListener('close', () => {
  archiveKeyInput.value = '';
});

archiveForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const entered = archiveKeyInput.value.trim().replace(/[\s-]/g, '').toUpperCase();

  if (entered !== CONFIG.archiveAccessKey.replace(/[\s-]/g, '').toUpperCase()) {
    archiveStatus.textContent = 'ACCESS KEY NOT RECOGNIZED';
    archiveStatus.dataset.state = 'error';
    archiveKeyInput.value = '';
    archiveKeyInput.focus();
    archiveForm.animate(
      [{ transform: 'translateX(-5px)' }, { transform: 'translateX(5px)' }, { transform: 'translateX(0)' }],
      { duration: 180 },
    );
    return;
  }

  /* One key opens both withheld records — the player never types it twice. */
  store.set(STORAGE_KEYS.archiveUnlocked, 'true');
  renderArchive();
  archiveKeyInput.value = '';
  archiveStatus.innerHTML = 'ARCHIVE ACCESS GRANTED<br />PACKETS 0001–0002 UNLOCKED.';
  archiveStatus.dataset.state = 'success';
  window.setTimeout(closeRestrictedDialog, 2200);
});

renderArchive();

/* ================================================================
   FIRST CONTACT
   ================================================================ */
const SIGNAL_LINES = [
  'GOOD.',
  'THERE IS SOMEONE THERE.',
  "I WASN'T SURE.",
  'OLD RECORDS.',
  'BEFORE THE ONES YOU SAW.',
  'LOOK THERE.',
  'SOMETHING WAS LEFT.',
  'AQUARIUM—',
  '...',
  "I CAN'T HOLD THIS.",
];

const signalDialog = document.querySelector('#signal-dialog');
const signalBody = document.querySelector('#signal-body');
const signalQuestion = document.querySelector('#signal-question');
const signalActions = document.querySelector('#signal-actions');
const signalYes = document.querySelector('#signal-yes');
const signalDismiss = document.querySelector('#signal-dismiss');

function setupFirstContact() {
  if (store.get(STORAGE_KEYS.firstContact) === 'true') return;

  let closable = false;

  function appendLine(text) {
    const line = document.createElement('p');
    line.className = 'signal__line';
    line.textContent = text;
    signalBody.append(line);
    signalBody.scrollTop = signalBody.scrollHeight;
  }

  function endTransmission() {
    signalDialog.classList.add('is-severing');
    /* The dots twitch once more before the connection gives out. */
    window.setTimeout(() => {
      closable = true;
      signalDialog.classList.remove('is-severing');
      signalDialog.classList.add('is-closable');
      signalDismiss.disabled = false;
      signalDismiss.setAttribute('aria-label', 'Close transmission');
      signalDismiss.focus({ preventScroll: true });
    }, 1200);
  }

  function playTransmission() {
    signalQuestion.remove();
    signalActions.remove();
    signalDialog.classList.add('is-receiving');

    let delay = 400;
    SIGNAL_LINES.forEach((text, index) => {
      delay += text === '...' ? 1100 : 500 + Math.round(Math.random() * 500);
      window.setTimeout(() => {
        appendLine(text);
        if (index === SIGNAL_LINES.length - 1) endTransmission();
      }, delay);
    });
  }

  signalYes.addEventListener('click', playTransmission);

  signalDismiss.addEventListener('click', () => {
    if (!closable) return;
    store.set(STORAGE_KEYS.firstContact, 'true');
    signalDialog.close();
  });

  /* Escape, backdrop clicks and anything else stay blocked until the
     transmission has run out on its own. */
  signalDialog.addEventListener('cancel', (event) => {
    if (!closable) {
      event.preventDefault();
      return;
    }
    store.set(STORAGE_KEYS.firstContact, 'true');
  });

  signalDialog.addEventListener('close', () => {
    if (store.get(STORAGE_KEYS.firstContact) !== 'true') signalDialog.showModal();
  });

  signalDialog.showModal();
}

setupFirstContact();

/* ================================================================
   NAVIGATION RAIL
   ================================================================ */
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
