/* eslint-disable */
/**
 * WhatsApp Sender - Google Apps Script Web App
 *
 * تعليمات التركيب:
 * 1. افتح جدول Google Sheet الخاص بك
 * 2. اضغط على Extensions (الإضافات) -> Apps Script
 * 3. امسح أي كود موجود في ملف Code.gs وضع هذا الكود بالكامل مكانه
 * 4. اضغط على Deploy (نشر) -> New deployment (نشر جديد)
 * 5. اختر نوع Web app
 * 6. Execute as: Me (حسابك)
 * 7. Who has access: Anyone (أي شخص)
 * 8. اضغط Deploy وانسخ رابط الـ Web App URL وضعه في إعدادات التطبيق.
 */

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'get_contacts';

  if (action === 'clear_contacts') {
    return handleClearContacts();
  }
  if (action === 'get_session') {
    return handleGetSession();
  }
  if (action === 'clear_session') {
    return handleClearSession();
  }
  if (action === 'get_templates') {
    return handleGetTemplates();
  }

  return handleGetContacts();
}

function doPost(e) {
  try {
    var contents = e && e.postData ? e.postData.contents : '';
    var payload = {};
    if (contents) {
      payload = JSON.parse(contents);
    }
    var action = payload.action || 'sync_contacts';

    if (action === 'clear_contacts') {
      return handleClearContacts();
    } else if (action === 'replace_all_contacts') {
      return handleReplaceAllContacts(payload.contacts || []);
    } else if (action === 'delete_contact') {
      return handleDeleteContact(payload.id, payload.phone);
    } else if (action === 'sync_contacts' || action === 'sync_results') {
      return handleSyncContacts(payload.contacts || []);
    } else if (action === 'sync_session') {
      return handleSyncSession(payload.session, payload.queue || []);
    } else if (action === 'get_session') {
      return handleGetSession();
    } else if (action === 'clear_session') {
      return handleClearSession();
    } else if (action === 'sync_templates') {
      return handleSyncTemplates(payload.templates || []);
    } else if (action === 'get_templates') {
      return handleGetTemplates();
    } else if (action === 'delete_template') {
      return handleDeleteTemplate(payload.id);
    }

    return createJsonResponse({ status: 'success', message: 'Action processed' });
  } catch (err) {
    return createJsonResponse({ status: 'error', message: err.toString() });
  }
}

var HEADERS = [
  'ID',
  'Name',
  'Original Phone',
  'Normalized Phone',
  'International Phone',
  'Company',
  'Email',
  'Category',
  'Is Valid',
  'Status',
  'Is Duplicate',
  'Messaging Status',
  'Created At',
  'Last Updated'
];

function getOrCreateSheet(sheetName) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var name = sheetName || 'Contacts';
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (name === 'Contacts') {
    ensureContactsHeaders(sheet);
  }
  return sheet;
}

function ensureContactsHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#E2F0D9');
  }
}

function handleClearContacts() {
  var sheet = getOrCreateSheet('Contacts');
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  return createJsonResponse({ status: 'success', message: 'Contacts cleared', count: 0 });
}

function handleReplaceAllContacts(contacts) {
  var sheet = getOrCreateSheet('Contacts');
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }

  if (contacts && contacts.length > 0) {
    var nowStr = new Date().toLocaleString();
    var rows = contacts.map(function(c) {
      return [
        c.id || '',
        c.name || '',
        "'" + String(c.originalPhone || ''),
        "'" + String(c.normalizedPhone || ''),
        "'" + String(c.internationalPhone || ''),
        c.company || '',
        c.email || '',
        c.category || 'عام',
        c.isValid === true ? 'TRUE' : 'FALSE',
        c.status || 'valid',
        c.isDuplicate === true ? 'TRUE' : 'FALSE',
        c.messagingStatus || 'unsent',
        c.createdAt || nowStr,
        nowStr
      ];
    });

    sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  }

  return createJsonResponse({
    status: 'success',
    message: 'Contacts replaced successfully',
    syncedCount: contacts ? contacts.length : 0
  });
}

function handleDeleteContact(id, phone) {
  var sheet = getOrCreateSheet('Contacts');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return createJsonResponse({ status: 'success', message: 'Sheet is empty', deletedCount: 0 });
  }

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var deletedCount = 0;

  for (var i = data.length - 1; i >= 0; i--) {
    var rowId = String(data[i][0] || '').trim();
    var rowOrigPhone = String(data[i][2] || '').replace(/['\s]/g, '').trim();
    var rowNormPhone = String(data[i][3] || '').replace(/['\s]/g, '').trim();
    var searchPhone = phone ? String(phone).replace(/['\s]/g, '').trim() : '';

    var matchId = id && rowId === String(id).trim();
    var matchPhone = searchPhone && (rowNormPhone === searchPhone || rowOrigPhone === searchPhone);

    if (matchId || matchPhone) {
      sheet.deleteRow(i + 2);
      deletedCount++;
    }
  }

  return createJsonResponse({
    status: 'success',
    message: 'Deleted ' + deletedCount + ' rows',
    deletedCount: deletedCount
  });
}

function handleSyncContacts(contacts) {
  var sheet = getOrCreateSheet('Contacts');
  var lastRow = sheet.getLastRow();
  var phoneToRowMap = {};

  if (lastRow > 1) {
    var phoneColValues = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
    for (var i = 0; i < phoneColValues.length; i++) {
      var p = String(phoneColValues[i][0] || '').replace(/['\s]/g, '').trim();
      if (p) phoneToRowMap[p] = i + 2;
    }
  }

  var nowStr = new Date().toLocaleString();
  var toAppend = [];

  for (var j = 0; j < contacts.length; j++) {
    var c = contacts[j];
    var normPhone = String(c.normalizedPhone || c.originalPhone || '').replace(/['\s]/g, '').trim();
    var targetRow = phoneToRowMap[normPhone];

    var rowData = [
      c.id || '',
      c.name || '',
      "'" + String(c.originalPhone || ''),
      "'" + String(c.normalizedPhone || ''),
      "'" + String(c.internationalPhone || ''),
      c.company || '',
      c.email || '',
      c.category || 'عام',
      c.isValid === true ? 'TRUE' : 'FALSE',
      c.status || 'valid',
      c.isDuplicate === true ? 'TRUE' : 'FALSE',
      c.messagingStatus || 'unsent',
      c.createdAt || nowStr,
      nowStr
    ];

    if (targetRow) {
      sheet.getRange(targetRow, 1, 1, HEADERS.length).setValues([rowData]);
    } else {
      toAppend.push(rowData);
    }
  }

  if (toAppend.length > 0) {
    var nextRow = sheet.getLastRow() + 1;
    sheet.getRange(nextRow, 1, toAppend.length, HEADERS.length).setValues(toAppend);
  }

  return createJsonResponse({ status: 'success', syncedCount: contacts.length });
}

function handleGetContacts() {
  var sheet = getOrCreateSheet('Contacts');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    return createJsonResponse({ status: 'success', contacts: [] });
  }

  var data = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  var contacts = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    var normPhone = String(row[3] || '').replace(/['\s]/g, '').trim();
    var origPhone = String(row[2] || '').replace(/['\s]/g, '').trim();
    if (!normPhone && !origPhone) continue;

    contacts.push({
      id: String(row[0] || ''),
      name: String(row[1] || ''),
      originalPhone: origPhone,
      normalizedPhone: normPhone,
      internationalPhone: String(row[4] || '').replace(/^'/, ''),
      company: String(row[5] || ''),
      email: String(row[6] || ''),
      category: String(row[7] || 'عام'),
      isValid: row[8] === 'TRUE' || row[8] === true,
      status: String(row[9] || 'valid'),
      isDuplicate: row[10] === 'TRUE' || row[10] === true,
      messagingStatus: String(row[11] || 'unsent'),
      createdAt: String(row[12] || '')
    });
  }

  return createJsonResponse({ status: 'success', contacts: contacts });
}

// ==================== Session Synchronization Functions ====================

function handleSyncSession(session, queue) {
  var sheet = getOrCreateSheet('ActiveSession');
  sheet.clear();

  if (!session || !session.id) {
    return createJsonResponse({ status: 'success', message: 'Session cleared' });
  }

  // Row 1 & 2: Session metadata
  sheet.appendRow(['ID', 'Name', 'TemplateContent', 'CurrentIndex', 'Status', 'TotalCount', 'UpdatedAt']);
  sheet.appendRow([
    session.id || '',
    session.name || '',
    session.templateContent || '',
    typeof session.currentIndex === 'number' ? session.currentIndex : 0,
    session.status || 'running',
    session.totalCount || (queue ? queue.length : 0),
    session.updatedAt || Date.now()
  ]);

  sheet.getRange(1, 1, 1, 7).setFontWeight('bold').setBackground('#D9E1F2');

  // Row 3: Blank separator
  // Row 4: Queue headers
  sheet.appendRow(['QueueID', 'ContactID', 'ContactName', 'ContactPhone', 'Status', 'AttemptCount', 'LastAttemptAt', 'SkipReason', 'RenderedMessage']);
  sheet.getRange(3, 1, 1, 9).setFontWeight('bold').setBackground('#FFF2CC');

  if (queue && queue.length > 0) {
    var queueRows = queue.map(function(q) {
      return [
        q.id || '',
        q.contactId || '',
        q.contactName || '',
        "'" + String(q.contactPhone || ''),
        q.status || 'pending',
        q.attemptCount || 0,
        q.lastAttemptAt || '',
        q.skipReason || '',
        q.renderedMessage || ''
      ];
    });
    sheet.getRange(4, 1, queueRows.length, 9).setValues(queueRows);
  }

  return createJsonResponse({ status: 'success', message: 'Session synced successfully' });
}

function handleGetSession() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ActiveSession');
  if (!sheet || sheet.getLastRow() < 2) {
    return createJsonResponse({ status: 'success', session: null, queue: [] });
  }

  var metaValues = sheet.getRange(2, 1, 1, 7).getValues()[0];
  var sessionId = String(metaValues[0] || '').trim();
  if (!sessionId) {
    return createJsonResponse({ status: 'success', session: null, queue: [] });
  }

  var session = {
    id: sessionId,
    name: String(metaValues[1] || 'Campaign'),
    templateContent: String(metaValues[2] || ''),
    currentIndex: Number(metaValues[3] || 0),
    status: String(metaValues[4] || 'running'),
    totalCount: Number(metaValues[5] || 0),
    createdAt: Date.now(),
    updatedAt: Number(metaValues[6] || Date.now())
  };

  var queue = [];
  var lastRow = sheet.getLastRow();
  if (lastRow >= 4) {
    var queueData = sheet.getRange(4, 1, lastRow - 3, 9).getValues();
    for (var i = 0; i < queueData.length; i++) {
      var r = queueData[i];
      if (!r[0]) continue;
      queue.push({
        id: String(r[0]),
        sessionId: session.id,
        contactId: String(r[1]),
        contactName: String(r[2]),
        contactPhone: String(r[3]).replace(/['\s]/g, ''),
        status: String(r[4] || 'pending'),
        attemptCount: Number(r[5] || 0),
        lastAttemptAt: r[6] ? Number(r[6]) : undefined,
        skipReason: r[7] ? String(r[7]) : undefined,
        renderedMessage: String(r[8] || '')
      });
    }
  }

  return createJsonResponse({ status: 'success', session: session, queue: queue });
}

function handleClearSession() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('ActiveSession');
  if (sheet) {
    sheet.clear();
  }
  return createJsonResponse({ status: 'success', message: 'Session cleared' });
}

// ==================== Template Synchronization Functions ====================

var TEMPLATE_HEADERS = ['ID', 'Title', 'Content', 'Category', 'CreatedAt', 'UpdatedAt'];

function handleSyncTemplates(templates) {
  var sheet = getOrCreateSheet('Templates');
  sheet.clear();
  sheet.appendRow(TEMPLATE_HEADERS);
  sheet.getRange(1, 1, 1, TEMPLATE_HEADERS.length).setFontWeight('bold').setBackground('#E2F0D9');

  if (templates && templates.length > 0) {
    var rows = templates.map(function(t) {
      return [
        t.id || '',
        t.title || '',
        t.content || '',
        t.category || 'عام',
        t.createdAt || Date.now(),
        t.updatedAt || Date.now()
      ];
    });
    sheet.getRange(2, 1, rows.length, TEMPLATE_HEADERS.length).setValues(rows);
  }

  return createJsonResponse({
    status: 'success',
    message: 'Templates synced successfully',
    syncedCount: templates ? templates.length : 0
  });
}

function handleGetTemplates() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Templates');
  if (!sheet || sheet.getLastRow() <= 1) {
    return createJsonResponse({ status: 'success', templates: [] });
  }

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  var templates = [];

  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (!row[0] && !row[1]) continue;
    templates.push({
      id: String(row[0] || ''),
      title: String(row[1] || ''),
      content: String(row[2] || ''),
      category: String(row[3] || 'عام'),
      createdAt: Number(row[4] || Date.now()),
      updatedAt: Number(row[5] || Date.now())
    });
  }

  return createJsonResponse({ status: 'success', templates: templates });
}

function handleDeleteTemplate(id) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Templates');
  if (!sheet || sheet.getLastRow() <= 1) {
    return createJsonResponse({ status: 'success', message: 'No templates' });
  }

  var data = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = data.length - 1; i >= 0; i--) {
    if (String(data[i][0]).trim() === String(id).trim()) {
      sheet.deleteRow(i + 2);
    }
  }

  return createJsonResponse({ status: 'success', message: 'Template deleted' });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
