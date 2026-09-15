/**
 * ETC WEATHER OBSERVATION / AQUARIUM - PLAYTEST TELEMETRY RECEIVER
 *
 * Paste this whole file into a Google Apps Script project bound to a
 * Google Sheet, run setUpSheets() once, then deploy it as a web app.
 * Full instructions: tools/ANALYTICS-SETUP.md
 */

/* The spreadsheet this script writes to. Bound scripts could use
   getActiveSpreadsheet(), but naming the id keeps the web app pointed at
   the right file no matter how the project is copied or redeployed. */
var SHEET_ID = '1QEfp8KjD-AW_QTGdMCGRBEVwPn1TZx_rzQ1whM5HU4E';

var EVENT_HEADERS = [
  'TIMESTAMP',
  'EVENT',
  'VISITOR ID',
  'SESSION ID',
  'PATH',
  'ANDREW ID',
  'VISITOR NAME',
  'DETAIL',
  'REFERRER',
  'SCREEN',
  'LANGUAGE',
  'USER AGENT',
];

/* Event name -> the label shown on the SUMMARY tab, in funnel order.
   The Chinese half of each label is escaped so this file stays plain
   ASCII and survives being copied through editors that mangle UTF-8. */
var FUNNEL = [
  ['site_view', '\u6253\u5F00\u7F51\u7AD9 / OPENED SITE'],
  ['first_contact_complete', '\u770B\u5B8C\u5F00\u573A\u901A\u4FE1 / SAW FIRST CONTACT'],
  ['andrew_id_submitted', '\u63D0\u4EA4 Andrew ID / SUBMITTED ANDREW ID'],
  ['archive_unlocked', '\u89E3\u9501\u6863\u6848 / UNLOCKED ARCHIVE'],
  ['aquarium_view', '\u8FDB\u5165 Aquarium / REACHED AQUARIUM'],
  ['registration_started', '\u5F00\u59CB\u95EE\u5377 / STARTED QUESTIONNAIRE'],
  ['questionnaire_completed', '\u5B8C\u6210\u95EE\u5377 / FINISHED QUESTIONNAIRE'],
  ['ticket_downloaded', '\u4E0B\u8F7D\u7968 / DOWNLOADED TICKET'],
];

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);

  try {
    var data = JSON.parse(e.postData.contents);
    var book = SpreadsheetApp.openById(SHEET_ID);
    var answers = data.answers || {};

    sheet(book, 'EVENTS', EVENT_HEADERS).appendRow([
      new Date(),
      data.event || '',
      data.visitorId || '',
      data.sessionId || '',
      data.path || '',
      data.andrewId || '',
      data.visitorName || '',
      detailOf(data),
      data.referrer || '',
      data.screen || '',
      data.language || '',
      data.userAgent || '',
    ]);

    /* The two lists the production team actually reads get their own tabs. */
    if (data.event === 'andrew_id_submitted') {
      sheet(book, 'ANDREW IDS', ['TIMESTAMP', 'ANDREW ID', 'VISITOR ID']).appendRow([
        new Date(),
        data.andrewId || '',
        data.visitorId || '',
      ]);
    }

    if (data.event === 'questionnaire_completed') {
      var row = { TIMESTAMP: new Date(), 'VISITOR ID': data.visitorId || '' };
      Object.keys(answers).forEach(function (key) {
        row[key] = answers[key];
      });
      appendMapped(sheet(book, 'QUESTIONNAIRE', ['TIMESTAMP', 'VISITOR ID']), row);
    }

    return json({ ok: true });
  } catch (error) {
    return json({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

/* Visiting the /exec URL in a browser should say something reassuring. */
function doGet() {
  return ContentService.createTextOutput('OK. This endpoint only accepts POST.');
}

function json(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}

/* Everything that is not already its own column, kept as JSON so no
   field added later is silently dropped. */
function detailOf(data) {
  var known = ['event', 'visitorId', 'sessionId', 'path', 'andrewId', 'visitorName', 'referrer', 'screen', 'language', 'userAgent', 'sentAt', 'answers'];
  var rest = {};
  Object.keys(data).forEach(function (key) {
    if (known.indexOf(key) === -1) rest[key] = data[key];
  });
  if (data.answers) rest.answers = data.answers;
  return Object.keys(rest).length ? JSON.stringify(rest) : '';
}

function sheet(book, name, headers) {
  var target = book.getSheetByName(name);
  if (!target) {
    target = book.insertSheet(name);
    target.appendRow(headers);
    target.setFrozenRows(1);
    target.getRange(1, 1, 1, headers.length).setFontWeight('bold');
  }
  return target;
}

/* Writes a row by header name and grows the header row when the
   questionnaire gains a question, so new questions need no edits here. */
function appendMapped(target, row) {
  var width = Math.max(target.getLastColumn(), 1);
  var headers = target.getRange(1, 1, 1, width).getValues()[0];

  Object.keys(row).forEach(function (key) {
    if (headers.indexOf(key) === -1) {
      headers.push(key);
      target.getRange(1, headers.length).setValue(key).setFontWeight('bold');
    }
  });

  var values = headers.map(function (header) {
    return row[header] === undefined ? '' : row[header];
  });
  target.appendRow(values);
}

/**
 * Run this once from the Apps Script editor. It creates the tabs and a
 * SUMMARY built from live formulas, so the numbers stay current without
 * anyone re-running anything.
 */
function setUpSheets() {
  var book = SpreadsheetApp.openById(SHEET_ID);
  sheet(book, 'EVENTS', EVENT_HEADERS);
  sheet(book, 'ANDREW IDS', ['TIMESTAMP', 'ANDREW ID', 'VISITOR ID']);
  sheet(book, 'QUESTIONNAIRE', ['TIMESTAMP', 'VISITOR ID']);

  var summary = book.getSheetByName('SUMMARY') || book.insertSheet('SUMMARY', 0);
  summary.clear();
  summary.appendRow([
    '\u6307\u6807 / STEP',
    '\u4EBA\u6570 (\u72EC\u7ACB\u8BBF\u5BA2)',
    '\u6B21\u6570 (\u4E8B\u4EF6\u603B\u6570)',
    '\u76F8\u5BF9\u7B2C\u4E00\u6B65',
  ]);
  summary.setFrozenRows(1);
  summary.getRange(1, 1, 1, 4).setFontWeight('bold');

  FUNNEL.forEach(function (entry, index) {
    var name = entry[0];
    var row = index + 2;
    summary.appendRow([
      entry[1],
      /* COUNTUNIQUE counts FILTER's #N/A as a value, so an event nobody has
         fired would read as one visitor. Guard it with the raw count. */
      '=IF(COUNTIF(EVENTS!$B$2:$B, "' + name + '")=0, 0, COUNTUNIQUE(FILTER(EVENTS!$C$2:$C, EVENTS!$B$2:$B="' + name + '")))',
      '=COUNTIF(EVENTS!$B$2:$B, "' + name + '")',
      '=IFERROR($B' + row + '/$B$2, "")',
    ]);
  });

  var tail = FUNNEL.length + 3;
  summary.getRange(tail, 1).setValue('\u6536\u5230\u7684 Andrew ID \u6570 (\u53BB\u91CD) / UNIQUE ANDREW IDS');
  summary.getRange(tail, 2).setFormula('=COUNTUNIQUE(\'ANDREW IDS\'!$B$2:$B)');
  summary.getRange(tail + 1, 1).setValue('\u586B\u5199\u7684\u59D3\u540D\u6570 / NAMES COLLECTED');
  summary.getRange(tail + 1, 2).setFormula('=COUNTA(QUESTIONNAIRE!$A$2:$A)');
  summary.getRange(tail + 2, 1).setValue('\u603B\u4E8B\u4EF6\u6570 / TOTAL EVENTS');
  summary.getRange(tail + 2, 2).setFormula('=COUNTA(EVENTS!$B$2:$B)');
  summary.getRange(tail + 3, 1).setValue('\u6700\u540E\u4E00\u6B21\u4E8B\u4EF6 / LAST EVENT AT');
  summary.getRange(tail + 3, 2).setFormula('=IFERROR(TEXT(MAX(EVENTS!$A$2:$A), "yyyy-mm-dd hh:mm"), "-")');

  summary.getRange(2, 4, FUNNEL.length, 1).setNumberFormat('0%');
  summary.setColumnWidth(1, 340);
  summary.getRange(tail, 1, 4, 1).setFontWeight('bold');
}
