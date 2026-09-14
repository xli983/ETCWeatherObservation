/* ================================================================
   AQUARIUM CONFIGURATION — THE VALUES PLAYTESTS NEED TO SWAP
   ================================================================ */
const CONFIG = {
  /* Playtest opening is fixed. A real lunar cycle can replace this later. */
  openingDate: '2026-09-26T00:00:00-04:00',
  openingLabel: 'SEPTEMBER 26, 2026',
  ticketNumber: '9A7F-2C1B',
  /* Every visitor is COMPLETE for now; the questionnaire does not branch yet. */
  visitorClass: 'COMPLETE',
};

const STORAGE_KEY = 'aquarium-visitor';
const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

const store = {
  read() {
    try {
      return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? '{}');
    } catch {
      return {};
    }
  },
  write(patch) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...store.read(), ...patch }));
    } catch {
      /* Storage unavailable — the visit still works, it just is not remembered. */
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* Nothing to clear. */
    }
  },
};

if (new URLSearchParams(location.search).get('reset') === 'true') {
  store.clear();
  history.replaceState(null, '', location.pathname + location.hash);
}

function pad(value, size = 2) {
  return String(value).padStart(size, '0');
}

/* ================================================================
   NEXT OPENING COUNTDOWN
   ================================================================ */
const openingDate = document.querySelector('#opening-date');
const openingDays = document.querySelector('#opening-days');
const openingHours = document.querySelector('#opening-hours');
const openingMinutes = document.querySelector('#opening-minutes');
const openingState = document.querySelector('#opening-state');
const openingClock = document.querySelector('#opening-clock');

openingDate.textContent = CONFIG.openingLabel;

function updateOpeningCountdown() {
  const remaining = new Date(CONFIG.openingDate).getTime() - Date.now();

  if (remaining <= 0) {
    openingDays.textContent = '00';
    openingHours.textContent = '00';
    openingMinutes.textContent = '00';
    openingState.textContent = 'THE AQUARIUM IS OPEN';
    openingClock.setAttribute('aria-label', 'The Aquarium is open');
    return;
  }

  const days = Math.floor(remaining / DAY);
  const hours = Math.floor((remaining % DAY) / HOUR);
  const minutes = Math.floor((remaining % HOUR) / MINUTE);

  openingDays.textContent = pad(days);
  openingHours.textContent = pad(hours);
  openingMinutes.textContent = pad(minutes);
  openingState.textContent = 'CLOSED UNTIL THE FULL MOON';
  openingClock.setAttribute('aria-label', `${days} days, ${hours} hours and ${minutes} minutes until the next opening`);
}

updateOpeningCountdown();
window.setInterval(updateOpeningCountdown, SECOND);

/* The counter has been climbing since the page was last touched in 2008. */
const visitorCounter = document.querySelector('#visitor-counter');
const daysSinceLastUpdate = Math.floor((Date.now() - Date.parse('2008-10-18T00:00:00-04:00')) / DAY);
visitorCounter.textContent = pad(14_219 + daysSinceLastUpdate * 3, 7);

/* ================================================================
   VISITOR REGISTRATION QUESTIONNAIRE
   ================================================================ */
const QUESTIONS = [
  { id: 'name', type: 'text', text: 'What name would you like to be registered under?', placeholder: 'Name', hint: 'This name is printed on your ticket.' },
  { id: 'age', type: 'number', text: 'How old are you?', placeholder: 'Age' },
  { id: 'visitedBefore', type: 'choice', text: 'Have you visited this aquarium before?', options: ['YES', 'NO', "I'M NOT SURE"] },
  { id: 'alone', type: 'choice', text: 'Are you visiting alone?', options: ['YES', 'NO'] },
  { id: 'recognize', type: 'choice', text: 'Do you usually recognize yourself immediately when you look into a mirror?', options: ['ALWAYS', 'USUALLY', 'SOMETIMES', 'RARELY'] },
  { id: 'unfamiliar', type: 'choice', text: 'Have you ever felt that your reflection looked unfamiliar to you?', options: ['YES', 'NO', "I'M NOT SURE"] },
  { id: 'unexpected', type: 'choice', text: 'Have you ever noticed your reflection doing something you did not expect?', options: ['YES', 'NO', "I'M NOT SURE"] },
  { id: 'someoneElse', type: 'choice', text: 'Have you ever seen someone in a mirror who you believed was not yourself?', options: ['YES', 'NO', "I'M NOT SURE"] },
  { id: 'double', type: 'choice', text: 'Do you believe there is another person who is exactly like you somewhere in the world?', options: ['YES', 'NO', "I DON'T KNOW"] },
  { id: 'identical', type: 'choice', text: 'If you met someone identical to you, would you consider them to be you?', options: ['YES', 'NO', 'IT DEPENDS'] },
  { id: 'consent', type: 'choice', text: 'Do you consent to your visitor record being preserved by the Aquarium?', options: ['YES', 'NO'] },
];

const registration = document.querySelector('#registration');
const registrationBody = document.querySelector('#registration-body');
const registrationFoot = document.querySelector('#registration-foot');
const registrationProgress = document.querySelector('#registration-progress');
const registrationBar = document.querySelector('#registration-bar');
const registrationBack = document.querySelector('#registration-back');
const registrationNext = document.querySelector('#registration-next');
const registrationClose = document.querySelector('#registration-close');
const getTicketButton = document.querySelector('#get-ticket');

let answers = store.read().answers ?? {};
let questionIndex = 0;

function setProgress(step) {
  registrationProgress.textContent = `${pad(step)} / ${pad(QUESTIONS.length)}`;
  registrationBar.style.width = `${(step / QUESTIONS.length) * 100}%`;
}

function currentAnswer() {
  return answers[QUESTIONS[questionIndex].id];
}

function saveAnswer(value) {
  answers = { ...answers, [QUESTIONS[questionIndex].id]: value };
  store.write({ answers, visitorClass: CONFIG.visitorClass });
}

function renderQuestion() {
  const question = QUESTIONS[questionIndex];
  setProgress(questionIndex + 1);
  registrationFoot.hidden = false;
  registrationBack.disabled = questionIndex === 0;
  registrationNext.textContent = questionIndex === QUESTIONS.length - 1 ? 'SUBMIT' : 'CONTINUE';

  const text = document.createElement('p');
  text.className = 'question__text';
  text.textContent = question.text;

  const nodes = [text];

  if (question.type === 'choice') {
    const list = document.createElement('div');
    list.className = 'option-list';
    question.options.forEach((option) => {
      const button = document.createElement('button');
      button.className = `option${currentAnswer() === option ? ' is-chosen' : ''}`;
      button.type = 'button';
      button.textContent = option;
      button.addEventListener('click', () => {
        saveAnswer(option);
        list.querySelectorAll('.option').forEach((node) => node.classList.toggle('is-chosen', node === button));
        registrationNext.disabled = false;
      });
      list.append(button);
    });
    nodes.push(list);
    registrationNext.disabled = currentAnswer() === undefined;
  } else {
    const input = document.createElement('input');
    input.className = 'text-entry';
    input.id = 'question-entry';
    input.type = question.type === 'number' ? 'number' : 'text';
    input.placeholder = question.placeholder ?? '';
    input.value = currentAnswer() ?? '';
    input.autocomplete = 'off';
    if (question.type === 'number') {
      input.inputMode = 'numeric';
      input.min = '0';
      input.max = '130';
    } else {
      input.maxLength = 40;
    }
    input.addEventListener('input', () => {
      hint.removeAttribute('data-state');
      hint.textContent = question.hint ?? '';
      registrationNext.disabled = input.value.trim() === '';
    });
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        registrationNext.click();
      }
    });

    const hint = document.createElement('p');
    hint.className = 'field-hint';
    hint.textContent = question.hint ?? '';

    nodes.push(input, hint);
    registrationNext.disabled = (currentAnswer() ?? '').toString().trim() === '';
  }

  registrationBody.replaceChildren(...nodes);
  registrationBody.scrollTop = 0;
  window.setTimeout(() => registrationBody.querySelector('#question-entry')?.focus({ preventScroll: true }), 30);
}

function advance() {
  const question = QUESTIONS[questionIndex];

  if (question.type !== 'choice') {
    const input = registrationBody.querySelector('#question-entry');
    const value = input.value.trim();
    const hint = registrationBody.querySelector('.field-hint');

    if (!value) {
      hint.textContent = 'Please answer before continuing.';
      hint.dataset.state = 'error';
      input.focus();
      return;
    }
    saveAnswer(value);
  }

  if (questionIndex === QUESTIONS.length - 1) {
    issueTicket();
    return;
  }

  questionIndex += 1;
  renderQuestion();
}

registrationNext.addEventListener('click', advance);
registrationBack.addEventListener('click', () => {
  if (questionIndex === 0) return;
  questionIndex -= 1;
  renderQuestion();
});

/* ================================================================
   TICKET
   ================================================================ */
function visitorName() {
  return (store.read().visitorName ?? answers.name ?? 'VISITOR').toString().toUpperCase();
}

function ticketFields() {
  return [
    ['VISITOR', visitorName()],
    ['TICKET NO.', CONFIG.ticketNumber],
    ['STATUS', 'VALID'],
    ['ENTRY CONDITION', 'FULL MOON'],
  ];
}

function renderTicket() {
  setProgress(QUESTIONS.length);
  registrationFoot.hidden = true;

  const ticket = document.createElement('article');
  ticket.className = 'ticket';

  const head = document.createElement('header');
  head.className = 'ticket__head';
  head.innerHTML = '<p class="ticket__mark">AQUARIUM</p><p class="ticket__sub">VISITOR ADMISSION</p>';

  const fields = document.createElement('dl');
  fields.className = 'ticket__fields';
  fields.innerHTML = ticketFields()
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join('');

  const foot = document.createElement('p');
  foot.className = 'ticket__foot';
  foot.textContent = 'KEEP THIS TICKET. YOU MAY NEED IT LATER.';

  ticket.append(head, fields, foot);

  const actions = document.createElement('div');
  actions.className = 'ticket-actions';

  const save = document.createElement('button');
  save.className = 'flat-button flat-button--primary';
  save.type = 'button';
  save.textContent = 'SAVE TICKET';
  save.addEventListener('click', () => saveTicketImage(save));

  const done = document.createElement('button');
  done.className = 'flat-button';
  done.type = 'button';
  done.textContent = 'CLOSE';
  done.addEventListener('click', closeRegistration);

  const again = document.createElement('button');
  again.className = 'flat-button';
  again.type = 'button';
  again.textContent = 'REGISTER AGAIN';
  again.addEventListener('click', () => {
    answers = {};
    questionIndex = 0;
    store.clear();
    renderQuestion();
  });

  actions.append(save, done, again);
  registrationBody.replaceChildren(ticket, actions);
  registrationBody.scrollTop = 0;
}

function issueTicket() {
  registrationFoot.hidden = true;
  setProgress(QUESTIONS.length);
  store.write({
    answers,
    visitorName: answers.name ?? 'VISITOR',
    visitorClass: CONFIG.visitorClass,
    ticketIssued: true,
  });

  const issuing = document.createElement('div');
  issuing.className = 'issuing';
  issuing.innerHTML =
    '<p class="issuing__complete">REGISTRATION COMPLETE</p><p class="issuing__status">GENERATING TICKET<i>...</i></p>';
  registrationBody.replaceChildren(issuing);

  window.setTimeout(renderTicket, 1700);
}

/* The ticket is redrawn on a canvas rather than screenshotted, so the export
   does not depend on any rendering library. */
function drawTicket() {
  const width = 760;
  const height = 1040;
  const scale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const context = canvas.getContext('2d');
  context.scale(scale, scale);

  context.fillStyle = '#f7f5eb';
  context.fillRect(0, 0, width, height);

  for (let x = 0; x < width; x += 6) {
    context.fillStyle = 'rgba(28,28,25,0.035)';
    context.fillRect(x, 0, 1, height);
  }

  const header = context.createLinearGradient(0, 0, 0, 230);
  header.addColorStop(0, '#17385c');
  header.addColorStop(1, '#1f6f7a');
  context.fillStyle = header;
  context.fillRect(0, 0, width, 230);

  context.textAlign = 'center';
  context.fillStyle = '#ffffff';
  context.font = '70px "Times New Roman", Times, serif';
  context.letterSpacing = '20px';
  context.fillText('AQUARIUM', width / 2 + 10, 130);
  context.font = '18px Verdana, Geneva, sans-serif';
  context.letterSpacing = '10px';
  context.fillText('VISITOR ADMISSION', width / 2 + 5, 180);

  context.textAlign = 'left';
  context.letterSpacing = '0px';
  let y = 310;
  ticketFields().forEach(([label, value]) => {
    context.fillStyle = '#5c5c52';
    context.font = '17px Verdana, Geneva, sans-serif';
    context.letterSpacing = '6px';
    context.fillText(label, 70, y);

    context.fillStyle = '#1c1c19';
    context.font = '36px "Courier New", Courier, monospace';
    context.letterSpacing = '2px';
    context.fillText(value, 70, y + 52);

    context.letterSpacing = '0px';
    context.strokeStyle = '#c8c4b0';
    context.setLineDash([2, 5]);
    context.beginPath();
    context.moveTo(70, y + 92);
    context.lineTo(width - 70, y + 92);
    context.stroke();
    context.setLineDash([]);

    y += 150;
  });

  context.textAlign = 'center';
  context.fillStyle = '#5c5c52';
  context.font = '16px Verdana, Geneva, sans-serif';
  context.letterSpacing = '4px';
  context.fillText('KEEP THIS TICKET. YOU MAY NEED IT LATER.', width / 2, height - 70);

  context.letterSpacing = '0px';
  context.strokeStyle = '#1c1c19';
  context.lineWidth = 4;
  context.strokeRect(2, 2, width - 4, height - 4);

  return canvas;
}

function saveTicketImage(button) {
  const label = button.textContent;
  try {
    const link = document.createElement('a');
    link.href = drawTicket().toDataURL('image/png');
    link.download = `aquarium-ticket-${visitorName().toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
    link.click();
    button.textContent = 'SAVED';
  } catch {
    button.textContent = 'SCREENSHOT INSTEAD';
  }
  window.setTimeout(() => {
    button.textContent = label;
  }, 2400);
}

/* ================================================================
   OVERLAY CONTROL
   ================================================================ */
function openRegistration() {
  registration.hidden = false;
  document.body.style.overflow = 'hidden';

  if (store.read().ticketIssued) {
    renderTicket();
    return;
  }

  questionIndex = 0;
  renderQuestion();
}

function closeRegistration() {
  registration.hidden = true;
  document.body.style.overflow = '';
  getTicketButton.focus({ preventScroll: true });
}

getTicketButton.addEventListener('click', openRegistration);
registrationClose.addEventListener('click', closeRegistration);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !registration.hidden) closeRegistration();
});

if (store.read().ticketIssued) getTicketButton.textContent = 'VIEW YOUR TICKET';

/* ---------- menu bar highlighting ---------- */
const menuItems = [...document.querySelectorAll('.menubar__item')];
const sections = menuItems.map((item) => document.querySelector(item.getAttribute('href')));
const sectionObserver = new IntersectionObserver(
  (entries) => {
    entries
      .filter((entry) => entry.isIntersecting)
      .forEach((entry) => {
        menuItems.forEach((item, index) => item.classList.toggle('is-current', sections[index] === entry.target));
      });
  },
  { rootMargin: '-40% 0px -50% 0px' },
);
sections.forEach((section) => section && sectionObserver.observe(section));
