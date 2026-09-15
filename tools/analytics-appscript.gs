/**
 * ETC WEATHER OBSERVATION / AQUARIUM - PLAYTEST TELEMETRY RECEIVER
 *
 * Paste this whole file into a Google Apps Script project bound to a
 * Google Sheet, run setUpSheets() once, then deploy it as a web app.
 * Full instructions: tools/ANALYTICS-SETUP.md
 *
 * This file is UTF-8. Editing it through a tool that cannot keep UTF-8
 * (PowerShell's Set-Content, for one) turns every Chinese label into a
 * question mark, so check the labels after any bulk edit.
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

/* Event name -> the label shown on the dashboard, in funnel order. */
var FUNNEL = [
  ['site_view', '???? / OPENED SITE'],
  ['first_contact_complete', '?????? / SAW FIRST CONTACT'],
  ['andrew_id_submitted', '?? Andrew ID / SUBMITTED ANDREW ID'],
  ['archive_unlocked', '???? / UNLOCKED ARCHIVE'],
  ['aquarium_view', '?? Aquarium / REACHED AQUARIUM'],
  ['registration_started', '???? / STARTED QUESTIONNAIRE'],
  ['questionnaire_completed', '???? / FINISHED QUESTIONNAIRE'],
  ['ticket_downloaded', '??? / DOWNLOADED TICKET'],
];

/* The questionnaire, mirrored from src/aquarium/script.js. Only the
   multiple-choice questions: the ANSWERS tab draws one pie per question.
   If a question changes there, change it here and rerun setUpSheets(). */
var CHOICE_QUESTIONS = [
  ['visitedBefore', '???????? / VISITED BEFORE', ['YES', 'NO', "I'M NOT SURE"]],
  ['alone', '????? / VISITING ALONE', ['YES', 'NO']],
  ['recognize', '??????????? / RECOGNIZES SELF', ['ALWAYS', 'USUALLY', 'SOMETIMES', 'RARELY']],
  ['unfamiliar', '???????? / REFLECTION UNFAMILIAR', ['YES', 'NO', "I'M NOT SURE"]],
  ['heartSide', '??????? / HEART ON THE RIGHT', ['YES', 'NO', "I'M NOT SURE"]],
  ['unexpected', '???????????? / REFLECTION UNEXPECTED', ['YES', 'NO', "I'M NOT SURE"]],
  ['clockDirection', '???????? / CLOCK DIRECTION', ['CLOCKWISE', 'COUNTERCLOCKWISE', "I'M NOT SURE"]],
  ['someoneElse', '????????? / SAW SOMEONE ELSE', ['YES', 'NO', "I'M NOT SURE"]],
  ['double', '?????????? / BELIEVES IN A DOUBLE', ['YES', 'NO', "I DON'T KNOW"]],
  ['identical', '?????????? / WOULD COUNT AS YOU', ['YES', 'NO', 'IT DEPENDS']],
  ['consent', '????????? / CONSENTED', ['YES', 'NO']],
];

/* Label, lower bound, upper bound. The bounds are COUNTIFS criteria. */
var AGE_BUCKETS = [
  ['17 ???', '">=0"', '"<=17"'],
  ['18-22', '">=18"', '"<=22"'],
  ['23-26', '">=23"', '"<=26"'],
  ['27-30', '">=27"', '"<=30"'],
  ['31 ???', '">=31"', '"<=200"'],
];

var INK = '#1a1a1a';
var MUTED = '#6b6b6b';
var RULE = '#d9d9d9';

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

/* ================================================================
   SETUP
   ================================================================ */

/**
 * Run this from the Apps Script editor whenever the layout should be
 * rebuilt. Safe to rerun: it only rewrites the two generated tabs and
 * never touches collected data. Everything it writes is a live formula,
 * so numbers and charts fill in by themselves as players arrive.
 *
 * It does not change doPost(), so rerunning it needs no redeploy.
 */
function setUpSheets() {
  var book = SpreadsheetApp.openById(SHEET_ID);

  sheet(book, 'EVENTS', EVENT_HEADERS);
  sheet(book, 'ANDREW IDS', ['TIMESTAMP', 'ANDREW ID', 'VISITOR ID']);
  sheet(book, 'QUESTIONNAIRE', ['TIMESTAMP', 'VISITOR ID']);

  /* SUMMARY was the first version of the dashboard, now replaced. */
  var legacy = book.getSheetByName('SUMMARY');
  if (legacy) book.deleteSheet(legacy);

  /* The empty tab Google creates with every new spreadsheet. */
  ['Sheet1', 'Sheet 1', '\u5de5\u4f5c\u88681'].forEach(function (name) {
    var blank = book.getSheetByName(name);
    if (blank && blank.getLastRow() === 0) book.deleteSheet(blank);
  });

  buildDashboard(book);
  buildAnswers(book);
  tidyRawTabs(book);
  order(book, ['DASHBOARD', 'ANSWERS', 'EVENTS', 'ANDREW IDS', 'QUESTIONNAIRE']);
}

/**
 * Deletes every collected row but keeps the tabs, the formulas and the
 * charts. Run it once the test runs are over, before the real playtest.
 */
function clearCollectedData() {
  var book = SpreadsheetApp.openById(SHEET_ID);
  ['EVENTS', 'ANDREW IDS', 'QUESTIONNAIRE'].forEach(function (name) {
    var target = book.getSheetByName(name);
    if (!target) return;
    var rows = target.getLastRow() - 1;
    if (rows > 0) target.deleteRows(2, rows);
  });
}

/* ================================================================
   DASHBOARD
   ================================================================ */

function buildDashboard(book) {
  var view = reset(book, 'DASHBOARD', 0);

  title(view, 1, 'ETC ARG / PLAYTEST ????');
  note(view, 2, '??????????????????????? EVENTS / ANDREW IDS / QUESTIONNAIRE ??????');
  view.getRange(3, 1).setValue('?????? / LAST EVENT').setFontColor(MUTED);
  view.getRange(3, 2).setFormula('=IFERROR(TEXT(MAX(EVENTS!$A$2:$A), "yyyy-mm-dd hh:mm"), "-")');

  /* --- Headline numbers --- */
  section(view, 5, '???? / HEADLINE NUMBERS');

  var kpis = [
    ['????', uniqueVisitors('site_view')],
    ['?? Andrew ID', "=COUNTUNIQUE('ANDREW IDS'!$B$2:$B)"],
    ['?? Aquarium', uniqueVisitors('aquarium_view')],
    ['????', uniqueVisitors('questionnaire_completed')],
    ['???', uniqueVisitors('ticket_downloaded')],
    ['????', '=COUNTA(EVENTS!$B$2:$B)'],
  ];
  kpis.forEach(function (kpi, i) {
    view.getRange(6, i + 1).setValue(kpi[0]).setFontColor(MUTED).setFontSize(9);
    view.getRange(7, i + 1).setFormula(kpi[1]).setFontSize(22).setFontWeight('bold');
  });

  /* Second line reads each headline as a share of everyone who showed up. */
  view.getRange(8, 1).setValue('?? / BASE').setFontColor(MUTED).setFontSize(9);
  for (var col = 2; col <= 5; col++) {
    view.getRange(8, col)
      .setFormula('=IFERROR(' + columnLetter(col) + '7/$A$7, "-")')
      .setFontColor(MUTED)
      .setFontSize(9)
      .setNumberFormat('0%');
  }

  /* --- Funnel --- */
  section(view, 10, '???? / FUNNEL');
  header(view, 11, ['??', '??', '??', '????', '????']);

  FUNNEL.forEach(function (entry, i) {
    var row = 12 + i;
    view.getRange(row, 1).setValue(entry[1]);
    view.getRange(row, 2).setFormula(uniqueVisitors(entry[0]));
    view.getRange(row, 3).setFormula('=COUNTIF(EVENTS!$B$2:$B, "' + entry[0] + '")');
    view.getRange(row, 4).setFormula('=IFERROR($B' + row + '/$B$12, "-")');
    if (i > 0) view.getRange(row, 5).setFormula('=IFERROR($B' + row + '/$B' + (row - 1) + ', "-")');
  });
  view.getRange(12, 4, FUNNEL.length, 2).setNumberFormat('0%');

  /* Charts float above the grid, so each is anchored far enough down
     column G to clear the one before it. */
  chart(view, Charts.ChartType.BAR, view.getRange(11, 1, FUNNEL.length + 1, 2), 11, 7, 620, 300, {
    title: '???????? / FUNNEL',
    legend: { position: 'none' },
  });

  /* --- By day --- */
  section(view, 21, '???? / BY DAY');
  header(view, 22, ['??', '????', '???', '???']);

  for (var i = 0; i < 30; i++) {
    var row = 23 + i;
    var day = '$A' + row;
    /* The window starts at the first event ever recorded and stops at
       today, so days with no data yet stay blank instead of drawing a
       flat zero across the chart. */
    view.getRange(row, 1).setFormula(
      i === 0
        ? '=IF(COUNT(EVENTS!$A$2:$A)=0, "", INT(MIN(EVENTS!$A$2:$A)))'
        : '=IF(OR($A' + (row - 1) + '="", $A' + (row - 1) + '+1>TODAY()), "", $A' + (row - 1) + '+1)'
    );
    view.getRange(row, 2).setFormula(
      '=IF(' + day + '="", "", IF(COUNTIFS(EVENTS!$A$2:$A, ">="&' + day + ', EVENTS!$A$2:$A, "<"&' + day + '+1)=0, 0,' +
        ' COUNTUNIQUE(FILTER(EVENTS!$C$2:$C, INT(EVENTS!$A$2:$A)=' + day + '))))'
    );
    view.getRange(row, 3).setFormula(dayCount(day, ''));
    view.getRange(row, 4).setFormula(dayCount(day, ', EVENTS!$B$2:$B, "ticket_downloaded"'));
  }
  view.getRange(23, 1, 30, 1).setNumberFormat('mm-dd');

  chart(view, Charts.ChartType.LINE, view.getRange(22, 1, 31, 4), 28, 7, 620, 300, {
    title: '??????? / DAILY',
    legend: { position: 'bottom' },
    pointSize: 4,
  });

  /* --- Device and language --- */
  section(view, 54, '????? / DEVICE AND LANGUAGE');
  header(view, 55, ['??', '??']);
  view.getRange(56, 1).setValue('?? / MOBILE');
  view.getRange(56, 2).setFormula('=COUNTIFS(EVENTS!$B$2:$B, "site_view", EVENTS!$L$2:$L, "*Mobi*")');
  view.getRange(57, 1).setValue('?? / DESKTOP');
  view.getRange(57, 2).setFormula('=COUNTIF(EVENTS!$B$2:$B, "site_view")-$B$56');

  header(view, 59, ['??', '??']);
  view.getRange(60, 1).setValue('?? / CHINESE');
  view.getRange(60, 2).setFormula('=COUNTIFS(EVENTS!$B$2:$B, "site_view", EVENTS!$K$2:$K, "zh*")');
  view.getRange(61, 1).setValue('?? / ENGLISH');
  view.getRange(61, 2).setFormula('=COUNTIFS(EVENTS!$B$2:$B, "site_view", EVENTS!$K$2:$K, "en*")');
  view.getRange(62, 1).setValue('?? / OTHER');
  view.getRange(62, 2).setFormula('=COUNTIF(EVENTS!$B$2:$B, "site_view")-$B$60-$B$61');

  chart(view, Charts.ChartType.PIE, view.getRange(55, 1, 3, 2), 54, 7, 300, 220, { title: '?? / DEVICE' });
  chart(view, Charts.ChartType.PIE, view.getRange(59, 1, 4, 2), 54, 12, 300, 220, { title: '?? / LANGUAGE' });

  view.setColumnWidth(1, 300);
  view.setColumnWidths(2, 4, 120);
  view.setHiddenGridlines(true);
}

/* ================================================================
   ANSWERS
   ================================================================ */

function buildAnswers(book) {
  var view = reset(book, 'ANSWERS', 1);

  title(view, 1, '?????? / QUESTIONNAIRE');
  note(view, 2, '?????????????????????????????????? CHOICE_QUESTIONS????? setUpSheets()?');
  view.getRange(3, 1).setValue('?????? / COMPLETED').setFontColor(MUTED);
  view.getRange(3, 2).setFormula('=COUNTA(QUESTIONNAIRE!$A$2:$A)');

  section(view, 5, '???? / AGE');
  header(view, 6, ['???', '??', '??']);

  var ageColumn = questionColumn('age');
  AGE_BUCKETS.forEach(function (bucket, i) {
    var row = 7 + i;
    view.getRange(row, 1).setValue(bucket[0]);
    view.getRange(row, 2).setFormula('=IFERROR(COUNTIFS(' + ageColumn + ', ' + bucket[1] + ', ' + ageColumn + ', ' + bucket[2] + '), 0)');
    view.getRange(row, 3).setFormula('=IFERROR($B' + row + '/SUM($B$7:$B$11), "-")');
  });
  view.getRange(7, 3, AGE_BUCKETS.length, 1).setNumberFormat('0%');

  chart(view, Charts.ChartType.COLUMN, view.getRange(6, 1, AGE_BUCKETS.length + 1, 2), 5, 5, 380, 240, {
    title: '?? / AGE',
    legend: { position: 'none' },
  });

  var top = 18;
  CHOICE_QUESTIONS.forEach(function (question) {
    var id = question[0];
    var label = question[1];
    var options = question[2];
    var column = questionColumn(id);
    var first = top + 2;
    var last = top + 1 + options.length;

    view.getRange(top, 1).setValue(label).setFontWeight('bold');
    header(view, top + 1, ['??', '??', '??']);

    options.forEach(function (option, i) {
      var row = first + i;
      view.getRange(row, 1).setValue(option);
      view.getRange(row, 2).setFormula('=IFERROR(COUNTIF(' + column + ', "' + option + '"), 0)');
      view.getRange(row, 3).setFormula('=IFERROR($B' + row + '/SUM($B$' + first + ':$B$' + last + '), "-")');
    });
    view.getRange(first, 3, options.length, 1).setNumberFormat('0%');

    chart(view, Charts.ChartType.PIE, view.getRange(first, 1, options.length, 2), top, 5, 360, 210, { title: label });

    /* 11 rows is enough for the tallest block plus its pie. */
    top += 11;
  });

  view.setColumnWidth(1, 260);
  view.setColumnWidths(2, 2, 110);
  view.setHiddenGridlines(true);
}

/* ================================================================
   HELPERS
   ================================================================ */

/* A tab rebuilt from scratch: same name, no leftover charts or rows. */
function reset(book, name, index) {
  var view = book.getSheetByName(name);
  if (!view) return book.insertSheet(name, index);

  view.getCharts().forEach(function (existing) {
    view.removeChart(existing);
  });
  view.clear();
  return view;
}

function title(view, row, text) {
  view.getRange(row, 1).setValue(text).setFontSize(16).setFontWeight('bold').setFontColor(INK);
}

function note(view, row, text) {
  view.getRange(row, 1).setValue(text).setFontColor(MUTED).setFontSize(9);
}

function section(view, row, text) {
  view.getRange(row, 1).setValue(text).setFontWeight('bold').setFontColor(INK);
  view.getRange(row, 1, 1, 5).setBorder(null, null, true, null, null, null, RULE, SpreadsheetApp.BorderStyle.SOLID);
}

function header(view, row, labels) {
  view.getRange(row, 1, 1, labels.length).setValues([labels]).setFontWeight('bold').setFontColor(MUTED).setFontSize(9);
}

/* COUNTUNIQUE counts FILTER's #N/A as a value, so an event nobody has
   fired would read as one visitor. Guard it with the raw count. */
function uniqueVisitors(event) {
  return '=IF(COUNTIF(EVENTS!$B$2:$B, "' + event + '")=0, 0, COUNTUNIQUE(FILTER(EVENTS!$C$2:$C, EVENTS!$B$2:$B="' + event + '")))';
}

function dayCount(day, extra) {
  return '=IF(' + day + '="", "", COUNTIFS(EVENTS!$A$2:$A, ">="&' + day + ', EVENTS!$A$2:$A, "<"&' + day + '+1' + extra + '))';
}

/* The questionnaire grows a column per question in arrival order, so the
   answer counts find their column by name instead of by position. */
function questionColumn(id) {
  return 'INDEX(QUESTIONNAIRE!$A:$BZ, 0, MATCH("' + id + '", QUESTIONNAIRE!$A$1:$BZ$1, 0))';
}

function columnLetter(column) {
  return String.fromCharCode(64 + column);
}

function chart(view, type, range, row, column, width, height, options) {
  var builder = view.newChart()
    .setChartType(type)
    .addRange(range)
    .setPosition(row, column, 0, 0)
    .setOption('width', width)
    .setOption('height', height)
    .setOption('backgroundColor', '#ffffff')
    .setOption('titleTextStyle', { fontSize: 12, bold: true });

  Object.keys(options).forEach(function (key) {
    builder.setOption(key, options[key]);
  });

  view.insertChart(builder.build());
}

function tidyRawTabs(book) {
  var events = book.getSheetByName('EVENTS');
  events.setFrozenRows(1);
  events.getRange(1, 1, 1, EVENT_HEADERS.length).setFontWeight('bold');
  events.getRange(2, 1, events.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  [150, 190, 120, 120, 110, 130, 130, 220, 150, 90, 80, 260].forEach(function (width, i) {
    events.setColumnWidth(i + 1, width);
  });

  var ids = book.getSheetByName('ANDREW IDS');
  ids.setFrozenRows(1);
  ids.getRange(2, 1, ids.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  [150, 200, 120].forEach(function (width, i) {
    ids.setColumnWidth(i + 1, width);
  });

  var survey = book.getSheetByName('QUESTIONNAIRE');
  survey.setFrozenRows(1);
  survey.setFrozenColumns(1);
  survey.getRange(2, 1, survey.getMaxRows() - 1, 1).setNumberFormat('yyyy-mm-dd hh:mm:ss');
  survey.setColumnWidth(1, 150);
}

function order(book, names) {
  names.forEach(function (name, index) {
    var view = book.getSheetByName(name);
    if (!view) return;
    book.setActiveSheet(view);
    book.moveActiveSheet(index + 1);
  });
  book.setActiveSheet(book.getSheetByName(names[0]));
}
