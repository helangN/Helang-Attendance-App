/**
 * Google Apps Script (Code.gs) template for direct Google Sheets database integration.
 * Users can paste this script in their Google Spreadsheet under Extensions > Apps Script,
 * deploy as a Web App (Access: Anyone), and paste the Web App URL into AttendFlow Settings.
 */
export const GOOGLE_APPS_SCRIPT_CODE = `/**
 * ==============================================================================
 * ATTENDFLOW - GOOGLE SHEETS BACKEND CONNECTOR (Code.gs)
 * ==============================================================================
 * This script connects your Google Spreadsheet directly with AttendFlow.
 * 
 * INSTRUCTIONS:
 * 1. Open your Google Spreadsheet.
 * 2. Click Extensions > Apps Script.
 * 3. Replace all contents of Code.gs with this entire script.
 * 4. Run the function "setupDatabaseSheets" once to generate all 6 tables with formatting.
 * 5. Click "Deploy" > "New deployment" > Select type: "Web app".
 * 6. Set Description: "AttendFlow Sync API".
 * 7. Set "Execute as": "Me".
 * 8. Set "Who has access": "Anyone" (crucial for API sync).
 * 9. Click "Deploy", copy the Web App URL, and paste it into AttendFlow Settings > Google Sheets.
 * ==============================================================================
 */

// Global Sheet Names
var SHEETS = {
  EMPLOYEES: 'Employees',
  ATTENDANCE: 'Attendance',
  HOLIDAYS: 'Holidays',
  SETTINGS: 'Settings',
  ADMIN_USERS: 'AdminUsers',
  AUDIT_LOG: 'AuditLog'
};

/**
 * Automatically creates all 6 sheets with headers and styling
 */
function setupDatabaseSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var definitions = [
    {
      name: SHEETS.EMPLOYEES,
      headers: ['Employee ID', 'Employee Name', 'Mobile', 'Email', 'Department', 'Designation', 'Joining Date', 'PIN/Password', 'Status', 'Created Date', 'Updated Date'],
      color: '#1e3a8a'
    },
    {
      name: SHEETS.ATTENDANCE,
      headers: ['Attendance ID', 'Employee ID', 'Employee Name', 'Date', 'IN Time', 'OUT Time', 'IN Latitude', 'IN Longitude', 'OUT Latitude', 'OUT Longitude', 'Location Status', 'Working Hours', 'Attendance Status', 'Late Mark', 'Early Out', 'Remarks', 'Created Date', 'Updated Date'],
      color: '#0d9488'
    },
    {
      name: SHEETS.HOLIDAYS,
      headers: ['Date', 'Holiday Name', 'Status'],
      color: '#d97706'
    },
    {
      name: SHEETS.SETTINGS,
      headers: ['Setting Name', 'Setting Value'],
      color: '#475569'
    },
    {
      name: SHEETS.ADMIN_USERS,
      headers: ['Admin ID', 'Admin Name', 'Email', 'Password/PIN', 'Status'],
      color: '#7c3aed'
    },
    {
      name: SHEETS.AUDIT_LOG,
      headers: ['Log ID', 'User', 'Action', 'Date', 'Time', 'Old Value', 'New Value'],
      color: '#dc2626'
    }
  ];

  definitions.forEach(function(def) {
    var sheet = ss.getSheetByName(def.name);
    if (!sheet) {
      sheet = ss.insertSheet(def.name);
    }
    
    // Set headers if empty or row 1
    var headerRange = sheet.getRange(1, 1, 1, def.headers.length);
    headerRange.setValues([def.headers]);
    headerRange.setBackground(def.color);
    headerRange.setFontColor('#ffffff');
    headerRange.setFontWeight('bold');
    sheet.setFrozenRows(1);
  });

  return 'Setup completed successfully! All 6 database sheets are ready.';
}

/**
 * Handles GET requests (Health check, schema check, and data export)
 */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || 'ping';
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  if (action === 'ping') {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      message: 'AttendFlow Google Apps Script Web App is connected and running!',
      spreadsheetTitle: ss.getName(),
      sheets: ss.getSheets().map(function(s) { return s.getName(); }),
      timestamp: new Date().toISOString()
    })).setMimeType(ContentService.MimeType.JSON);
  }

  if (action === 'pull') {
    var data = {};
    for (var key in SHEETS) {
      var sheetName = SHEETS[key];
      var sheet = ss.getSheetByName(sheetName);
      if (sheet) {
        data[sheetName] = sheet.getDataRange().getValues();
      }
    }
    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: data
    })).setMimeType(ContentService.MimeType.JSON);
  }

  return ContentService.createTextOutput(JSON.stringify({
    status: 'error',
    message: 'Unknown action'
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handles POST requests from AttendFlow to sync attendance, employees, settings, logs
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    var action = payload.action;
    var ss = SpreadsheetApp.getActiveSpreadsheet();

    if (action === 'setup') {
      setupDatabaseSheets();
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'All 6 sheets verified/created.'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'sync_all') {
      // payload.data contains employees, attendance, holidays, settings, auditLog
      if (payload.data.employees) syncTable(ss, SHEETS.EMPLOYEES, payload.data.employees);
      if (payload.data.attendance) syncTable(ss, SHEETS.ATTENDANCE, payload.data.attendance);
      if (payload.data.holidays) syncTable(ss, SHEETS.HOLIDAYS, payload.data.holidays);
      if (payload.data.settings) syncSettings(ss, payload.data.settings);
      if (payload.data.auditLogs) syncTable(ss, SHEETS.AUDIT_LOG, payload.data.auditLogs);

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Successfully synchronized data to Google Sheets.',
        timestamp: new Date().toISOString()
      })).setMimeType(ContentService.MimeType.JSON);
    }

    if (action === 'record_attendance') {
      // Append single attendance record directly
      var att = payload.record;
      var sheet = ss.getSheetByName(SHEETS.ATTENDANCE);
      if (!sheet) {
        setupDatabaseSheets();
        sheet = ss.getSheetByName(SHEETS.ATTENDANCE);
      }
      
      // Look for existing row with attendanceId
      var data = sheet.getDataRange().getValues();
      var rowIndex = -1;
      for (var i = 1; i < data.length; i++) {
        if (data[i][0] == att.attendanceId) {
          rowIndex = i + 1;
          break;
        }
      }

      var rowValues = [
        att.attendanceId,
        att.employeeId,
        att.employeeName,
        att.date,
        att.inTime || '',
        att.outTime || '',
        att.inLatitude || '',
        att.inLongitude || '',
        att.outLatitude || '',
        att.outLongitude || '',
        att.locationStatus || '',
        att.workingHours || '',
        att.attendanceStatus || '',
        att.lateMark ? 'Yes' : 'No',
        att.earlyOut ? 'Yes' : 'No',
        att.remarks || '',
        att.createdDate || '',
        att.updatedDate || ''
      ];

      if (rowIndex > -1) {
        sheet.getRange(rowIndex, 1, 1, rowValues.length).setValues([rowValues]);
      } else {
        sheet.appendRow(rowValues);
      }

      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        message: 'Attendance record saved to Google Sheets'
      })).setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: 'Unsupported action: ' + action
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function syncTable(ss, sheetName, rowsArray) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return;
  if (!rowsArray || rowsArray.length === 0) return;

  // Clear existing data rows (keep header)
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
  }

  // Convert array of objects or values to 2D array
  var matrix = rowsArray.map(function(item) {
    return Object.keys(item).map(function(k) {
      return item[k] === null || item[k] === undefined ? '' : item[k];
    });
  });

  if (matrix.length > 0 && matrix[0].length > 0) {
    sheet.getRange(2, 1, matrix.length, matrix[0].length).setValues(matrix);
  }
}

function syncSettings(ss, settingsObj) {
  var sheet = ss.getSheetByName(SHEETS.SETTINGS);
  if (!sheet) return;
  var rows = [];
  for (var key in settingsObj) {
    rows.push([key, JSON.stringify(settingsObj[key])]);
  }
  var lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, 2).clearContent();
  }
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
}
`;
