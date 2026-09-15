/* ================================================================
   PLAYTEST TELEMETRY — SHARED BY THE WEATHER SITE AND THE AQUARIUM

   Every event is appended to a Google Sheet through an Apps Script
   endpoint. Paste the /exec URL below after deploying the script in
   tools/analytics-appscript.gs — see tools/ANALYTICS-SETUP.md.

   While ENDPOINT is empty, tracking is a no-op: both sites run
   exactly as they do now, nothing is sent, nothing throws.
   ================================================================ */
const ENDPOINT = 'https://script.google.com/macros/s/AKfycbxH7tZXQJ-2XikF12S5jZ0XW05RZUd9o4Gl_NkNFo6M-SEUu8HoareFYwE1H3CvHWg4BQ/exec';

const VISITOR_KEY = 'etc-visitor-id';
const SESSION_KEY = 'etc-session-id';

function randomId() {
  try {
    return window.crypto.randomUUID().slice(0, 18);
  } catch {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/* The visitor id survives across visits and across both sites, because
   the Aquarium lives on the same origin. That is what turns the events
   into a funnel instead of five unrelated counters. The session id is
   per tab, so a returning player can be told apart from a new one. */
function readId(storage, key) {
  try {
    const existing = storage.getItem(key);
    if (existing) return existing;
    const created = randomId();
    storage.setItem(key, created);
    return created;
  } catch {
    /* Storage blocked — the event still sends, it just cannot be linked. */
    return 'unlinked';
  }
}

let visitorId = null;
let sessionId = null;

/* Send an event. Never awaited, never throws, never blocks the page:
   telemetry must not be able to break a playtest. */
export function track(event, detail = {}) {
  if (!ENDPOINT) return;

  try {
    visitorId ??= readId(window.localStorage, VISITOR_KEY);
    sessionId ??= readId(window.sessionStorage, SESSION_KEY);

    const body = JSON.stringify({
      event,
      visitorId,
      sessionId,
      path: location.pathname,
      referrer: document.referrer,
      screen: `${window.innerWidth}x${window.innerHeight}`,
      language: navigator.language,
      userAgent: navigator.userAgent,
      sentAt: new Date().toISOString(),
      ...detail,
    });

    /* text/plain keeps this a simple request: no CORS preflight, which
       Apps Script endpoints cannot answer. */
    if (navigator.sendBeacon?.(ENDPOINT, new Blob([body], { type: 'text/plain;charset=utf-8' }))) return;

    fetch(ENDPOINT, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body,
    }).catch(() => {
      /* Offline or blocked — the record is lost, the player is not. */
    });
  } catch {
    /* Telemetry is always optional. */
  }
}
