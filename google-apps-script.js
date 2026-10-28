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
  'Is Valid',
  'Status',
  'Is Duplicate',
  'Messaging Status',
  'Created At',
  'Last Updated'
];

function getOrCreateSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('Contacts');
  if (!sheet) {
    sheet = ss.insertSheet('Contacts');
  }
  ensureHeaders(sheet);
  return sheet;
}

function ensureHeaders(sheet) {
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#E2F0D9');
  }
}

function handleClearContacts() {
  var sheet = getOrCreateSheet();
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }
  return createJsonResponse({ status: 'success', message: 'Contacts cleared', count: 0 });
}

function handleReplaceAllContacts(contacts) {
  var sheet = getOrCreateSheet();
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
  var sheet = getOrCreateSheet();
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
  var sheet = getOrCreateSheet();
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
  var sheet = getOrCreateSheet();
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
      isValid: row[7] === 'TRUE' || row[7] === true,
      status: String(row[8] || 'valid'),
      isDuplicate: row[9] === 'TRUE' || row[9] === true,
      messagingStatus: String(row[10] || 'unsent'),
      createdAt: String(row[11] || '')
    });
  }

  return createJsonResponse({ status: 'success', contacts: contacts });
}

function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
