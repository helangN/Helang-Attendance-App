import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db, DEFAULT_SETTINGS } from './server/db';
import { GOOGLE_APPS_SCRIPT_CODE } from './server/googleAppsScriptTemplate';
import {
  calculateAttendanceEvaluation,
  calculateHaversineDistance,
  getKolkataDate,
  getKolkataTime12,
  getKolkataTime24,
  minutesToHoursDisplay,
  timeStringToMinutes,
} from './server/utils';
import {
  AppSettings,
  AttendanceRecord,
  AttendanceStatus,
  DailyAttendanceSummary,
  Employee,
  EmployeeMonthlyStats,
} from './src/types';

const app = express();
app.use(express.json());

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

// Simple session token map for demo/production deployment without external session stores
interface Session {
  role: 'ADMIN' | 'EMPLOYEE';
  id: string; // adminId or employeeId
  name: string;
}
const sessions = new Map<string, Session>();

function generateToken(role: 'ADMIN' | 'EMPLOYEE', id: string, name: string): string {
  const token = `token_${role.toLowerCase()}_${id}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  sessions.set(token, { role, id, name });
  return token;
}

// Middleware to extract user from Authorization header
function getAuth(req: Request): Session | null {
  const authHeader = req.headers.authorization;
  if (!authHeader) return null;
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();
  return sessions.get(token) || null;
}

// ==============================================================================
// AUTHENTICATION ROUTES
// ==============================================================================

// Employee Login (Employee ID + PIN)
app.post('/api/auth/employee/login', (req: Request, res: Response) => {
  const { employeeId, pin } = req.body;
  if (!employeeId || !pin) {
    return res.status(400).json({ error: 'Employee ID and PIN are required' });
  }

  const employee = db.getEmployeeById(String(employeeId).trim());
  if (!employee) {
    return res.status(401).json({ error: 'Invalid Employee ID or PIN' });
  }

  if (employee.status !== 'Active') {
    return res.status(403).json({
      error: 'Your account is deactivated. Please contact your administrator.',
    });
  }

  if (employee.pin !== String(pin).trim()) {
    return res.status(401).json({ error: 'Invalid Employee ID or PIN' });
  }

  const token = generateToken('EMPLOYEE', employee.employeeId, employee.name);
  const { pin: _, ...safeEmployee } = employee;

  return res.json({
    token,
    role: 'EMPLOYEE',
    employee: safeEmployee,
    serverTime: {
      date: getKolkataDate(),
      time12: getKolkataTime12(),
      timezone: 'Asia/Kolkata (IST)',
    },
  });
});

// Admin Login (Admin ID / Email + Password)
app.post('/api/auth/admin/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username/Email and Password are required' });
  }

  const admin = db.getAdminByEmailOrId(String(username).trim());
  if (!admin || admin.password !== String(password).trim()) {
    return res.status(401).json({ error: 'Invalid Admin credentials' });
  }

  if (admin.status !== 'Active') {
    return res.status(403).json({ error: 'Admin account is deactivated' });
  }

  const token = generateToken('ADMIN', admin.adminId, admin.adminName);
  const { password: _, ...safeAdmin } = admin;
  safeAdmin.name = admin.name || admin.adminName;

  return res.json({
    token,
    role: 'ADMIN',
    admin: safeAdmin,
    serverTime: {
      date: getKolkataDate(),
      time12: getKolkataTime12(),
      timezone: 'Asia/Kolkata (IST)',
    },
  });
});

// Current User Verification
app.get('/api/auth/me', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (auth.role === 'ADMIN') {
    const admin = db.getAdminByEmailOrId(auth.id);
    if (!admin) return res.status(401).json({ error: 'User not found' });
    const { password: _, ...safeAdmin } = admin;
    safeAdmin.name = admin.name || admin.adminName;
    return res.json({ role: 'ADMIN', user: safeAdmin });
  } else {
    const emp = db.getEmployeeById(auth.id);
    if (!emp || emp.status !== 'Active') {
      return res.status(401).json({ error: 'Employee not found or inactive' });
    }
    const { pin: _, ...safeEmp } = emp;
    return res.json({ role: 'EMPLOYEE', user: safeEmp });
  }
});

// Server Time endpoint
app.get('/api/time', (_req: Request, res: Response) => {
  res.json({
    date: getKolkataDate(),
    time12: getKolkataTime12(new Date(), true),
    time24: getKolkataTime24(),
    timezone: 'Asia/Kolkata',
  });
});

// ==============================================================================
// EMPLOYEE ROUTES
// ==============================================================================

// Employee Dashboard
app.get('/api/employee/dashboard', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'EMPLOYEE') {
    return res.status(401).json({ error: 'Unauthorized employee access' });
  }

  const employee = db.getEmployeeById(auth.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const today = getKolkataDate();
  const settings = db.getSettings();
  const todayRecord = db.getAttendanceForEmployeeDate(employee.employeeId, today) || null;

  // Monthly stats for current month
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthlyStats = computeEmployeeMonthlyStats(employee.employeeId, currentMonth, currentYear);

  return res.json({
    employee: {
      employeeId: employee.employeeId,
      name: employee.name,
      department: employee.department,
      designation: employee.designation,
      joiningDate: employee.joiningDate,
      email: employee.email,
      mobile: employee.mobile,
      status: employee.status,
    },
    today: {
      date: today,
      time: getKolkataTime12(),
      record: todayRecord,
    },
    officeConfig: {
      officeName: settings.officeName,
      officeLatitude: settings.officeLatitude,
      officeLongitude: settings.officeLongitude,
      allowedRadius: settings.allowedRadius,
      normalInTime: settings.normalInTime,
      lateAfter: settings.lateAfter,
      halfDayAfter: settings.halfDayAfter,
      earlyOutTime: settings.earlyOutTime,
      minWorkingHours: settings.minWorkingHours,
    },
    monthlyStats,
  });
});

// Check location endpoint (tells whether employee is inside office radius)
app.post('/api/employee/check-location', (req: Request, res: Response) => {
  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Latitude and Longitude are required' });
  }

  const settings = db.getSettings();
  const distance = calculateHaversineDistance(
    Number(latitude),
    Number(longitude),
    settings.officeLatitude,
    settings.officeLongitude
  );

  const isInside = distance <= settings.allowedRadius;
  return res.json({
    isInside,
    distance,
    allowedRadius: settings.allowedRadius,
    officeName: settings.officeName,
    message: isInside
      ? `Inside Office Location (${distance}m away)`
      : `Outside Office Location (${distance}m away, allowed: ${settings.allowedRadius}m)`,
  });
});

// MARK IN
app.post('/api/employee/mark-in', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'EMPLOYEE') {
    return res.status(401).json({ error: 'Unauthorized employee access' });
  }

  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'GPS location is required to mark attendance' });
  }

  const employee = db.getEmployeeById(auth.id);
  if (!employee || employee.status !== 'Active') {
    return res.status(403).json({ error: 'Account inactive or not found' });
  }

  const settings = db.getSettings();
  const distance = calculateHaversineDistance(
    Number(latitude),
    Number(longitude),
    settings.officeLatitude,
    settings.officeLongitude
  );

  // Compulsory GPS validation
  if (distance > settings.allowedRadius) {
    return res.status(400).json({
      error: 'Attendance cannot be marked because you are outside the allowed office location.',
      details: {
        currentDistance: distance,
        allowedRadius: settings.allowedRadius,
        officeName: settings.officeName,
      },
    });
  }

  const today = getKolkataDate();
  const existingRecord = db.getAttendanceForEmployeeDate(employee.employeeId, today);

  // Duplicate IN check
  if (existingRecord && existingRecord.inTime) {
    return res.status(400).json({
      error: `Duplicate IN: You have already marked IN for today at ${existingRecord.inTime}.`,
    });
  }

  const currentTime12 = getKolkataTime12();
  const inMinutes = timeStringToMinutes(currentTime12);
  const lateThreshold = timeStringToMinutes(settings.lateAfter || '12:30');
  const halfDayThreshold = timeStringToMinutes(settings.halfDayAfter || '14:00');

  const lateMark = inMinutes > lateThreshold;
  const initialStatus: AttendanceStatus = inMinutes > halfDayThreshold ? 'Half Day' : 'Present';

  const newRecord: AttendanceRecord = {
    attendanceId: `ATT-${today}-${employee.employeeId}`,
    employeeId: employee.employeeId,
    employeeName: employee.name,
    date: today,
    inTime: currentTime12,
    outTime: null,
    inLatitude: Number(latitude),
    inLongitude: Number(longitude),
    outLatitude: null,
    outLongitude: null,
    locationStatus: `Inside Office Location (${distance}m)`,
    workingHours: '0h 0m',
    workingMinutes: 0,
    attendanceStatus: initialStatus,
    lateMark,
    earlyOut: false,
    remarks: 'GPS geofence verified',
    createdDate: `${today} ${getKolkataTime24()}`,
    updatedDate: `${today} ${getKolkataTime24()}`,
  };

  db.recordAttendance(newRecord);

  return res.json({
    success: true,
    message: `Marked IN successfully at ${currentTime12}`,
    record: newRecord,
  });
});

// MARK OUT
app.post('/api/employee/mark-out', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'EMPLOYEE') {
    return res.status(401).json({ error: 'Unauthorized employee access' });
  }

  const { latitude, longitude } = req.body;
  if (latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'GPS location is required to mark attendance' });
  }

  const employee = db.getEmployeeById(auth.id);
  if (!employee || employee.status !== 'Active') {
    return res.status(403).json({ error: 'Account inactive or not found' });
  }

  const settings = db.getSettings();
  const distance = calculateHaversineDistance(
    Number(latitude),
    Number(longitude),
    settings.officeLatitude,
    settings.officeLongitude
  );

  // Compulsory GPS validation
  if (distance > settings.allowedRadius) {
    return res.status(400).json({
      error: 'Attendance cannot be marked because you are outside the allowed office location.',
      details: {
        currentDistance: distance,
        allowedRadius: settings.allowedRadius,
        officeName: settings.officeName,
      },
    });
  }

  const today = getKolkataDate();
  const existingRecord = db.getAttendanceForEmployeeDate(employee.employeeId, today);

  // Validation: Must mark IN first
  if (!existingRecord || !existingRecord.inTime) {
    return res.status(400).json({
      error: 'Cannot mark OUT without marking IN first.',
    });
  }

  // Duplicate OUT check
  if (existingRecord.outTime) {
    return res.status(400).json({
      error: `Duplicate OUT: You have already marked OUT for today at ${existingRecord.outTime}.`,
    });
  }

  const currentTime12 = getKolkataTime12();

  // Evaluate final status using timing rules
  const evaluation = calculateAttendanceEvaluation({
    inTimeStr: existingRecord.inTime,
    outTimeStr: currentTime12,
    settings,
  });

  const updatedRecord: AttendanceRecord = {
    ...existingRecord,
    outTime: currentTime12,
    outLatitude: Number(latitude),
    outLongitude: Number(longitude),
    locationStatus: `Inside Office Location (${distance}m)`,
    workingHours: evaluation.workingHours,
    workingMinutes: evaluation.workingMinutes,
    attendanceStatus: evaluation.attendanceStatus,
    lateMark: evaluation.lateMark,
    earlyOut: evaluation.earlyOut,
    updatedDate: `${today} ${getKolkataTime24()}`,
  };

  db.recordAttendance(updatedRecord);

  return res.json({
    success: true,
    message: `Marked OUT successfully at ${currentTime12}. Total Hours: ${evaluation.workingHours}`,
    record: updatedRecord,
  });
});

// Employee Attendance History
app.get('/api/employee/attendance', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'EMPLOYEE') {
    return res.status(401).json({ error: 'Unauthorized employee access' });
  }

  const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();

  const daysInMonth = new Date(year, month, 0).getDate();
  const settings = db.getSettings();
  const holidays = db.getHolidays();
  const allAttendance = db.getAttendance();

  const records: AttendanceRecord[] = [];
  const today = getKolkataDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    // If future date, stop
    if (dateStr > today) break;

    const existing = allAttendance.find(
      (a) => a.employeeId.toUpperCase() === auth.id.toUpperCase() && a.date === dateStr
    );

    if (existing) {
      records.push(existing);
    } else {
      // Determine if Absent, Holiday, or Weekly Off
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay(); // 0 = Sunday
      const holiday = holidays.find((h) => h.date === dateStr && h.status === 'Active');

      let status: AttendanceStatus = 'Absent';
      let remarks = 'Not marked IN';

      if (holiday) {
        status = 'Holiday';
        remarks = holiday.holidayName;
      } else if (settings.weeklyOffDays.includes(dayOfWeek)) {
        status = 'Weekly Off';
        remarks = 'Scheduled weekly off';
      }

      records.push({
        attendanceId: `ABS-${dateStr}-${auth.id}`,
        employeeId: auth.id,
        employeeName: auth.name,
        date: dateStr,
        inTime: null,
        outTime: null,
        inLatitude: null,
        inLongitude: null,
        outLatitude: null,
        outLongitude: null,
        locationStatus: '-',
        workingHours: '0h 0m',
        workingMinutes: 0,
        attendanceStatus: status,
        lateMark: false,
        earlyOut: false,
        remarks,
        createdDate: dateStr,
        updatedDate: dateStr,
      });
    }
  }

  // Sort descending by date
  records.sort((a, b) => b.date.localeCompare(a.date));

  return res.json({
    month,
    year,
    records,
  });
});

// Employee Monthly Report
app.get('/api/employee/monthly-report', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'EMPLOYEE') {
    return res.status(401).json({ error: 'Unauthorized employee access' });
  }

  const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();

  const stats = computeEmployeeMonthlyStats(auth.id, month, year);
  return res.json(stats);
});

// Employee change PIN
app.post('/api/employee/update-pin', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'EMPLOYEE') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { currentPin, newPin } = req.body;
  if (!currentPin || !newPin) {
    return res.status(400).json({ error: 'Current PIN and New PIN are required' });
  }

  const employee = db.getEmployeeById(auth.id);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  if (employee.pin !== String(currentPin).trim()) {
    return res.status(400).json({ error: 'Current PIN is incorrect' });
  }

  db.resetEmployeePin(employee.employeeId, String(newPin).trim(), `Employee (${employee.name})`);
  return res.json({ success: true, message: 'PIN updated successfully' });
});

// ==============================================================================
// ADMIN ROUTES
// ==============================================================================

// Admin Dashboard Summary with clickable KPI cards
app.get('/api/admin/dashboard', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Admin access required' });
  }

  const today = getKolkataDate();
  const allEmployees = db.getEmployees();
  const activeEmployees = allEmployees.filter((e) => e.status === 'Active');
  const inactiveEmployees = allEmployees.filter((e) => e.status === 'Inactive');
  const todayAttendance = db.getAttendance().filter((a) => a.date === today);

  const holiday = db.getHolidayByDate(today);
  const settings = db.getSettings();
  const isWeeklyOff = settings.weeklyOffDays.includes(new Date().getDay());

  // Count metrics
  let presentCount = 0;
  let absentCount = 0;
  let halfDayCount = 0;
  let lateCount = 0;
  let missingOutCount = 0;

  // Build employee roster with status for today
  const roster = activeEmployees.map((emp) => {
    const att = todayAttendance.find((a) => a.employeeId === emp.employeeId);
    let status: AttendanceStatus = 'Absent';
    let inTime = '-';
    let outTime = '-';
    let hours = '0h 0m';
    let late = false;
    let early = false;
    let location = '-';
    let recordId: string | null = null;

    if (att) {
      recordId = att.attendanceId;
      status = att.attendanceStatus;
      inTime = att.inTime || '-';
      outTime = att.outTime || '-';
      hours = att.workingHours || '0h 0m';
      late = att.lateMark;
      early = att.earlyOut;
      location = att.locationStatus;

      if (att.attendanceStatus === 'Present') presentCount++;
      if (att.attendanceStatus === 'Half Day') halfDayCount++;
      if (att.lateMark) lateCount++;
      if (att.inTime && !att.outTime) missingOutCount++;
    } else {
      if (holiday) {
        status = 'Holiday';
      } else if (isWeeklyOff) {
        status = 'Weekly Off';
      } else {
        absentCount++;
      }
    }

    return {
      employeeId: emp.employeeId,
      name: emp.name,
      department: emp.department,
      designation: emp.designation,
      status,
      inTime,
      outTime,
      hours,
      late,
      early,
      location,
      recordId,
    };
  });

  return res.json({
    today,
    serverTime: getKolkataTime12(),
    kpi: {
      totalEmployees: allEmployees.length,
      activeEmployees: activeEmployees.length,
      inactiveEmployees: inactiveEmployees.length,
      todayPresent: presentCount,
      todayAbsent: absentCount,
      todayHalfDay: halfDayCount,
      todayLate: lateCount,
      missingOut: missingOutCount,
      isHoliday: Boolean(holiday),
      holidayName: holiday?.holidayName || null,
      isWeeklyOff,
    },
    roster,
  });
});

// Admin Employee Management
app.get('/api/admin/employees', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const employees = db.getEmployees();
  res.json(employees);
});

app.post('/api/admin/employees', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const { employeeId, name, mobile, email, department, designation, joiningDate, pin, status } =
    req.body;

  if (!employeeId || !name || !email || !department) {
    return res.status(400).json({ error: 'Employee ID, Name, Email, and Department are required' });
  }

  const existing = db.getEmployeeById(String(employeeId).trim());
  if (existing) {
    return res.status(400).json({ error: `Employee ID ${employeeId} already exists.` });
  }

  const newEmp: Employee = {
    employeeId: String(employeeId).trim().toUpperCase(),
    name: String(name).trim(),
    mobile: mobile || '',
    email: String(email).trim().toLowerCase(),
    department: String(department).trim(),
    designation: String(designation || '').trim(),
    joiningDate: joiningDate || getKolkataDate(),
    pin: String(pin || '1234').trim(),
    status: status === 'Inactive' ? 'Inactive' : 'Active',
    createdDate: getKolkataDate(),
    updatedDate: getKolkataDate(),
  };

  db.addEmployee(newEmp, `Admin (${auth.name})`);
  return res.status(201).json(newEmp);
});

app.put('/api/admin/employees/:id', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const id = req.params.id;
  const existing = db.getEmployeeById(id);
  if (!existing) return res.status(404).json({ error: 'Employee not found' });

  const updated: Employee = {
    ...existing,
    ...req.body,
    employeeId: existing.employeeId, // prevent changing ID
    updatedDate: getKolkataDate(),
  };

  db.updateEmployee(updated, `Admin (${auth.name})`);
  return res.json(updated);
});

app.patch('/api/admin/employees/:id/status', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const { status } = req.body;
  if (status !== 'Active' && status !== 'Inactive') {
    return res.status(400).json({ error: 'Status must be Active or Inactive' });
  }

  const updated = db.setEmployeeStatus(req.params.id, status, `Admin (${auth.name})`);
  if (!updated) return res.status(404).json({ error: 'Employee not found' });

  return res.json(updated);
});

app.post('/api/admin/employees/:id/reset-pin', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const { newPin } = req.body;
  const pinToSet = newPin ? String(newPin).trim() : '1234';

  const success = db.resetEmployeePin(req.params.id, pinToSet, `Admin (${auth.name})`);
  if (!success) return res.status(404).json({ error: 'Employee not found' });

  return res.json({ success: true, message: `PIN reset successfully to ${pinToSet}` });
});

// Admin Attendance Management & Filter
app.get('/api/admin/attendance', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const { date, startDate, endDate, month, year, employeeId, department, status, late, earlyOut } =
    req.query;

  let records = db.getAttendance();

  if (date) {
    records = records.filter((r) => r.date === String(date));
  } else if (startDate && endDate) {
    records = records.filter((r) => r.date >= String(startDate) && r.date <= String(endDate));
  } else if (month && year) {
    const prefix = `${year}-${String(month).padStart(2, '0')}`;
    records = records.filter((r) => r.date.startsWith(prefix));
  }

  if (employeeId) {
    records = records.filter((r) => r.employeeId.toUpperCase() === String(employeeId).toUpperCase());
  }

  if (department) {
    const empIdsInDept = new Set(
      db
        .getEmployees()
        .filter((e) => e.department.toLowerCase() === String(department).toLowerCase())
        .map((e) => e.employeeId)
    );
    records = records.filter((r) => empIdsInDept.has(r.employeeId));
  }

  if (status) {
    records = records.filter((r) => r.attendanceStatus === status);
  }

  if (late === 'true') {
    records = records.filter((r) => r.lateMark);
  }

  if (earlyOut === 'true') {
    records = records.filter((r) => r.earlyOut);
  }

  // Sort descending by date then inTime
  records.sort((a, b) => b.date.localeCompare(a.date));

  return res.json(records);
});

// Admin Manual Correction of Attendance
app.put('/api/admin/attendance/:id', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const attendanceId = req.params.id;
  const corrections = req.body;

  // Recalculate working hours if inTime and outTime are updated
  if (corrections.inTime && corrections.outTime) {
    const settings = db.getSettings();
    const evaluation = calculateAttendanceEvaluation({
      inTimeStr: corrections.inTime,
      outTimeStr: corrections.outTime,
      settings,
    });
    corrections.workingHours = evaluation.workingHours;
    corrections.workingMinutes = evaluation.workingMinutes;
    if (!corrections.attendanceStatus) {
      corrections.attendanceStatus = evaluation.attendanceStatus;
    }
  }

  const updated = db.correctAttendance(attendanceId, corrections, `Admin (${auth.name})`);
  if (!updated) return res.status(404).json({ error: 'Attendance record not found' });

  return res.json(updated);
});

// ==============================================================================
// REPORTS
// ==============================================================================

// Day-wise Report
app.get('/api/admin/reports/day-wise', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const targetDate = (req.query.date as string) || getKolkataDate();
  const allEmployees = db.getEmployees().filter((e) => e.status === 'Active');
  const dayRecords = db.getAttendance().filter((a) => a.date === targetDate);
  const holiday = db.getHolidayByDate(targetDate);
  const settings = db.getSettings();

  const dayOfWeek = new Date(targetDate).getDay();
  const isWeeklyOff = settings.weeklyOffDays.includes(dayOfWeek);

  let present = 0;
  let absent = 0;
  let halfDay = 0;
  let late = 0;
  let earlyOut = 0;
  let missingOut = 0;

  const employeeRows = allEmployees.map((emp) => {
    const att = dayRecords.find((a) => a.employeeId === emp.employeeId);
    if (att) {
      if (att.attendanceStatus === 'Present') present++;
      if (att.attendanceStatus === 'Half Day') halfDay++;
      if (att.lateMark) late++;
      if (att.earlyOut) earlyOut++;
      if (att.inTime && !att.outTime) missingOut++;

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        designation: emp.designation,
        inTime: att.inTime || '-',
        outTime: att.outTime || '-',
        workingHours: att.workingHours || '0h 0m',
        status: att.attendanceStatus,
        lateMark: att.lateMark,
        earlyOut: att.earlyOut,
        locationStatus: att.locationStatus,
        remarks: att.remarks || '',
      };
    } else {
      let status: AttendanceStatus = 'Absent';
      if (holiday) {
        status = 'Holiday';
      } else if (isWeeklyOff) {
        status = 'Weekly Off';
      } else {
        absent++;
      }

      return {
        employeeId: emp.employeeId,
        name: emp.name,
        department: emp.department,
        designation: emp.designation,
        inTime: '-',
        outTime: '-',
        workingHours: '0h 0m',
        status,
        lateMark: false,
        earlyOut: false,
        locationStatus: '-',
        remarks: holiday ? holiday.holidayName : isWeeklyOff ? 'Weekly Off' : 'Unexcused Absence',
      };
    }
  });

  return res.json({
    date: targetDate,
    summary: {
      totalEmployees: allEmployees.length,
      present,
      absent,
      halfDay,
      late,
      earlyOut,
      missingOut,
      isHoliday: Boolean(holiday),
      holidayName: holiday?.holidayName || null,
      isWeeklyOff,
    },
    employeeRows,
  });
});

// Month-wise Report (All active employees in selected month)
app.get('/api/admin/reports/month-wise', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();
  const allEmployees = db.getEmployees().filter((e) => e.status === 'Active');

  const rows: EmployeeMonthlyStats[] = allEmployees.map((emp) =>
    computeEmployeeMonthlyStats(emp.employeeId, month, year)
  );

  // Totals
  const totals = rows.reduce(
    (acc, cur) => {
      acc.totalPresent += cur.present;
      acc.totalAbsent += cur.absent;
      acc.totalHalfDay += cur.halfDay;
      acc.totalLate += cur.late;
      acc.totalEarlyOut += cur.earlyOut;
      acc.totalMinutes += cur.totalWorkingMinutes;
      return acc;
    },
    {
      totalPresent: 0,
      totalAbsent: 0,
      totalHalfDay: 0,
      totalLate: 0,
      totalEarlyOut: 0,
      totalMinutes: 0,
    }
  );

  return res.json({
    month,
    year,
    employees: rows,
    totals: {
      ...totals,
      totalWorkingHours: minutesToHoursDisplay(totals.totalMinutes),
    },
  });
});

// Employee-wise Report
app.get('/api/admin/reports/employee-wise', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const employeeId = req.query.employeeId as string;
  if (!employeeId) return res.status(400).json({ error: 'employeeId query parameter is required' });

  const employee = db.getEmployeeById(employeeId);
  if (!employee) return res.status(404).json({ error: 'Employee not found' });

  const month = parseInt(req.query.month as string, 10) || new Date().getMonth() + 1;
  const year = parseInt(req.query.year as string, 10) || new Date().getFullYear();

  const stats = computeEmployeeMonthlyStats(employeeId, month, year);

  // Fetch full daily records
  const daysInMonth = new Date(year, month, 0).getDate();
  const settings = db.getSettings();
  const holidays = db.getHolidays();
  const allAttendance = db.getAttendance();

  const dailyRecords: AttendanceRecord[] = [];
  const today = getKolkataDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    if (dateStr > today) break;

    const existing = allAttendance.find(
      (a) => a.employeeId.toUpperCase() === employeeId.toUpperCase() && a.date === dateStr
    );

    if (existing) {
      dailyRecords.push(existing);
    } else {
      const dateObj = new Date(year, month - 1, day);
      const dayOfWeek = dateObj.getDay();
      const holiday = holidays.find((h) => h.date === dateStr && h.status === 'Active');

      let status: AttendanceStatus = 'Absent';
      let remarks = 'Not marked IN';

      if (holiday) {
        status = 'Holiday';
        remarks = holiday.holidayName;
      } else if (settings.weeklyOffDays.includes(dayOfWeek)) {
        status = 'Weekly Off';
        remarks = 'Scheduled weekly off';
      }

      dailyRecords.push({
        attendanceId: `ABS-${dateStr}-${employeeId}`,
        employeeId,
        employeeName: employee.name,
        date: dateStr,
        inTime: null,
        outTime: null,
        inLatitude: null,
        inLongitude: null,
        outLatitude: null,
        outLongitude: null,
        locationStatus: '-',
        workingHours: '0h 0m',
        workingMinutes: 0,
        attendanceStatus: status,
        lateMark: false,
        earlyOut: false,
        remarks,
        createdDate: dateStr,
        updatedDate: dateStr,
      });
    }
  }

  dailyRecords.sort((a, b) => b.date.localeCompare(a.date));

  return res.json({
    employee,
    month,
    year,
    stats,
    dailyRecords,
  });
});

// Admin Settings
app.get('/api/admin/settings', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  res.json(db.getSettings());
});

app.put('/api/admin/settings', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const updated = db.updateSettings(req.body, `Admin (${auth.name})`);
  return res.json(updated);
});

// Holidays Management
app.get('/api/admin/holidays', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  res.json(db.getHolidays());
});

app.post('/api/admin/holidays', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const { date, holidayName, status } = req.body;
  if (!date || !holidayName) {
    return res.status(400).json({ error: 'Date and Holiday Name are required' });
  }

  const existing = db.getHolidayByDate(date);
  if (existing) {
    return res.status(400).json({ error: `Holiday on date ${date} already exists` });
  }

  const holiday = db.addHoliday(
    {
      date,
      holidayName: String(holidayName).trim(),
      status: status === 'Inactive' ? 'Inactive' : 'Active',
    },
    `Admin (${auth.name})`
  );

  return res.status(201).json(holiday);
});

app.put('/api/admin/holidays/:date', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const updated = db.updateHoliday(req.params.date, req.body, `Admin (${auth.name})`);
  if (!updated) return res.status(404).json({ error: 'Holiday not found' });

  return res.json(updated);
});

app.delete('/api/admin/holidays/:date', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const success = db.deleteHoliday(req.params.date, `Admin (${auth.name})`);
  if (!success) return res.status(404).json({ error: 'Holiday not found' });

  return res.json({ success: true, message: 'Holiday deleted' });
});

// Audit Logs
app.get('/api/admin/audit-logs', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  res.json(db.getAuditLogs());
});

// Email Automation & Daily Report Generation
app.post('/api/admin/email/trigger-daily', (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const targetDate = (req.body.date as string) || getKolkataDate();
  const settings = db.getSettings();
  const allEmployees = db.getEmployees().filter((e) => e.status === 'Active');
  const dayRecords = db.getAttendance().filter((a) => a.date === targetDate);
  const holiday = db.getHolidayByDate(targetDate);
  const isWeeklyOff = settings.weeklyOffDays.includes(new Date(targetDate).getDay());

  let present = 0;
  let absent = 0;
  let halfDay = 0;
  let late = 0;
  let earlyOut = 0;
  let missingOut = 0;

  const employeeRows = allEmployees.map((emp) => {
    const att = dayRecords.find((a) => a.employeeId === emp.employeeId);
    if (att) {
      if (att.attendanceStatus === 'Present') present++;
      if (att.attendanceStatus === 'Half Day') halfDay++;
      if (att.lateMark) late++;
      if (att.earlyOut) earlyOut++;
      if (att.inTime && !att.outTime) missingOut++;

      return {
        id: emp.employeeId,
        name: emp.name,
        in: att.inTime || '-',
        out: att.outTime || '-',
        hours: att.workingHours || '0h 0m',
        status: att.attendanceStatus,
        late: att.lateMark ? 'Yes' : 'No',
      };
    } else {
      let status = 'Absent';
      if (holiday) status = 'Holiday';
      else if (isWeeklyOff) status = 'Weekly Off';
      else absent++;

      return {
        id: emp.employeeId,
        name: emp.name,
        in: '-',
        out: '-',
        hours: '0h 0m',
        status,
        late: 'No',
      };
    }
  });

  // Generate Professional HTML Email Format
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
    .header { background: #1e3a8a; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0 0 6px 0; font-size: 20px; font-weight: 700; }
    .header p { margin: 0; font-size: 13px; opacity: 0.9; }
    .kpi-grid { display: flex; flex-wrap: wrap; background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 16px; }
    .kpi-item { flex: 1 1 22%; min-width: 110px; margin: 6px; background: #ffffff; padding: 12px; border-radius: 6px; border: 1px solid #e2e8f0; text-align: center; }
    .kpi-title { font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; }
    .kpi-val { font-size: 18px; font-weight: 700; margin-top: 4px; color: #0f172a; }
    .content { padding: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 14px; font-size: 12px; }
    th { background: #0f172a; color: #ffffff; padding: 8px 10px; text-align: left; }
    td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
    tr:nth-child(even) { background-color: #f8fafc; }
    .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; }
    .badge-present { background: #dcfce7; color: #15803d; }
    .badge-absent { background: #fee2e2; color: #b91c1c; }
    .badge-halfday { background: #fef3c7; color: #b45309; }
    .footer { background: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${settings.companyName} - Daily Attendance Report</h1>
      <p>Report Date: <strong>${targetDate}</strong> | Generated at <strong>${getKolkataTime12(new Date(), true)} (IST)</strong></p>
    </div>
    <div class="kpi-grid">
      <div class="kpi-item"><div class="kpi-title">Total Staff</div><div class="kpi-val">${allEmployees.length}</div></div>
      <div class="kpi-item"><div class="kpi-title">Present</div><div class="kpi-val" style="color: #16a34a;">${present}</div></div>
      <div class="kpi-item"><div class="kpi-title">Absent</div><div class="kpi-val" style="color: #dc2626;">${absent}</div></div>
      <div class="kpi-item"><div class="kpi-title">Half Day</div><div class="kpi-val" style="color: #d97706;">${halfDay}</div></div>
      <div class="kpi-item"><div class="kpi-title">Late Mark</div><div class="kpi-val" style="color: #ea580c;">${late}</div></div>
      <div class="kpi-item"><div class="kpi-title">Missing OUT</div><div class="kpi-val" style="color: #7c3aed;">${missingOut}</div></div>
    </div>
    <div class="content">
      <h3 style="margin-top:0; font-size: 14px;">Staff Attendance Breakdown</h3>
      <table>
        <thead>
          <tr>
            <th>Emp ID</th>
            <th>Name</th>
            <th>IN Time</th>
            <th>OUT Time</th>
            <th>Hours</th>
            <th>Status</th>
            <th>Late</th>
          </tr>
        </thead>
        <tbody>
          ${employeeRows
            .map(
              (r) => `
            <tr>
              <td><strong>${r.id}</strong></td>
              <td>${r.name}</td>
              <td>${r.in}</td>
              <td>${r.out}</td>
              <td>${r.hours}</td>
              <td>
                <span class="badge ${
                  r.status === 'Present'
                    ? 'badge-present'
                    : r.status === 'Absent'
                    ? 'badge-absent'
                    : 'badge-halfday'
                }">${r.status}</span>
              </td>
              <td style="color: ${r.late === 'Yes' ? '#ea580c' : '#64748b'}; font-weight: ${
                r.late === 'Yes' ? 'bold' : 'normal'
              }">${r.late}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
    <div class="footer">
      This is an automated attendance notification sent to <strong>${settings.adminEmail}</strong>.<br/>
      Scheduled daily time: ${settings.dailyEmailTime} IST.
    </div>
  </div>
</body>
</html>
  `;

  db.addAuditLog(
    `Admin (${auth.name})`,
    'Daily Attendance Email Triggered',
    'Pending',
    `Sent daily report for ${targetDate} to ${settings.adminEmail}`
  );

  return res.json({
    success: true,
    recipient: settings.adminEmail,
    scheduledTime: settings.dailyEmailTime,
    date: targetDate,
    summary: {
      total: allEmployees.length,
      present,
      absent,
      halfDay,
      late,
      earlyOut,
      missingOut,
    },
    htmlPreview: htmlContent,
  });
});

// Google Sheets Sync API
app.post('/api/admin/sheets/sync', async (req: Request, res: Response) => {
  const auth = getAuth(req);
  if (!auth || auth.role !== 'ADMIN') return res.status(401).json({ error: 'Unauthorized' });

  const settings = db.getSettings();
  const scriptUrl = req.body.url || settings.googleAppsScriptUrl;

  if (!scriptUrl) {
    return res.status(400).json({
      error:
        'Google Apps Script Web App URL is not configured. Please paste your deployed Web App URL in Settings.',
    });
  }

  try {
    const payload = {
      action: 'sync_all',
      data: {
        employees: db.getEmployees(),
        attendance: db.getAttendance(),
        holidays: db.getHolidays(),
        settings: db.getSettings(),
        auditLogs: db.getAuditLogs(),
      },
    };

    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const result = await response.json().catch(() => ({ status: 'unknown' }));

    db.addAuditLog(
      `Admin (${auth.name})`,
      'Google Sheets Sync Executed',
      'Local Data',
      `Synced to Google Sheets via Web App: ${scriptUrl.substring(0, 45)}...`
    );

    return res.json({
      success: true,
      message: 'Successfully synchronized AttendFlow database with Google Sheets!',
      details: result,
      syncedCounts: {
        employees: payload.data.employees.length,
        attendance: payload.data.attendance.length,
        holidays: payload.data.holidays.length,
        auditLogs: payload.data.auditLogs.length,
      },
    });
  } catch (err: any) {
    return res.status(500).json({
      error: `Failed to connect with Google Apps Script: ${err.message}. Make sure the Web App is deployed with 'Who has access: Anyone'.`,
    });
  }
});

// Download Google Apps Script Code.gs
app.get('/api/admin/sheets/script', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/javascript');
  res.setHeader('Content-Disposition', 'attachment; filename="Code.gs"');
  res.send(GOOGLE_APPS_SCRIPT_CODE);
});

// Export CSV for any table
app.get('/api/admin/export/csv/:table', (req: Request, res: Response) => {
  const table = req.params.table;
  let headers: string[] = [];
  let rows: any[] = [];

  if (table === 'employees') {
    headers = [
      'Employee ID',
      'Name',
      'Mobile',
      'Email',
      'Department',
      'Designation',
      'Joining Date',
      'Status',
    ];
    rows = db.getEmployees().map((e) => [
      e.employeeId,
      `"${e.name.replace(/"/g, '""')}"`,
      e.mobile,
      e.email,
      e.department,
      `"${e.designation.replace(/"/g, '""')}"`,
      e.joiningDate,
      e.status,
    ]);
  } else if (table === 'attendance') {
    headers = [
      'Attendance ID',
      'Employee ID',
      'Employee Name',
      'Date',
      'IN Time',
      'OUT Time',
      'Working Hours',
      'Status',
      'Late Mark',
      'Early Out',
      'Location Status',
      'Remarks',
    ];
    rows = db.getAttendance().map((a) => [
      a.attendanceId,
      a.employeeId,
      `"${a.employeeName.replace(/"/g, '""')}"`,
      a.date,
      a.inTime || '',
      a.outTime || '',
      a.workingHours || '',
      a.attendanceStatus,
      a.lateMark ? 'Yes' : 'No',
      a.earlyOut ? 'Yes' : 'No',
      `"${(a.locationStatus || '').replace(/"/g, '""')}"`,
      `"${(a.remarks || '').replace(/"/g, '""')}"`,
    ]);
  } else if (table === 'holidays') {
    headers = ['Date', 'Holiday Name', 'Status'];
    rows = db.getHolidays().map((h) => [h.date, `"${h.holidayName.replace(/"/g, '""')}"`, h.status]);
  } else if (table === 'audit') {
    headers = ['Log ID', 'User', 'Action', 'Date', 'Time', 'Old Value', 'New Value'];
    rows = db.getAuditLogs().map((l) => [
      l.logId,
      `"${l.user.replace(/"/g, '""')}"`,
      `"${l.action.replace(/"/g, '""')}"`,
      l.date,
      l.time,
      `"${(l.oldValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
    ]);
  } else {
    return res.status(400).json({ error: 'Unknown table' });
  }

  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="${table}_export.csv"`);
  res.send(csv);
});

// Helper function to calculate employee monthly metrics
function computeEmployeeMonthlyStats(
  employeeId: string,
  month: number,
  year: number
): EmployeeMonthlyStats {
  const employee = db.getEmployeeById(employeeId);
  const employeeName = employee?.name || employeeId;
  const daysInMonth = new Date(year, month, 0).getDate();
  const settings = db.getSettings();
  const holidays = db.getHolidays();
  const allAttendance = db.getAttendance();

  let present = 0;
  let absent = 0;
  let halfDay = 0;
  let late = 0;
  let earlyOut = 0;
  let missingOut = 0;
  let workingDays = 0;
  let totalMinutes = 0;

  const today = getKolkataDate();

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = String(day).padStart(2, '0');
    const monthStr = String(month).padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();
    const isHoliday = holidays.some((h) => h.date === dateStr && h.status === 'Active');
    const isWeeklyOff = settings.weeklyOffDays.includes(dayOfWeek);

    if (!isHoliday && !isWeeklyOff) {
      workingDays++;
    }

    // Only compute up to today for attendance status
    if (dateStr <= today) {
      const record = allAttendance.find(
        (a) => a.employeeId.toUpperCase() === employeeId.toUpperCase() && a.date === dateStr
      );

      if (record) {
        if (record.attendanceStatus === 'Present') present++;
        if (record.attendanceStatus === 'Half Day') halfDay++;
        if (record.lateMark) late++;
        if (record.earlyOut) earlyOut++;
        if (record.inTime && !record.outTime) missingOut++;
        totalMinutes += record.workingMinutes || 0;
      } else {
        if (!isHoliday && !isWeeklyOff) {
          absent++;
        }
      }
    }
  }

  const attendedDays = present + halfDay;
  const avgMinutes = attendedDays > 0 ? Math.round(totalMinutes / attendedDays) : 0;

  return {
    employeeId,
    employeeName,
    month,
    year,
    calendarDays: daysInMonth,
    workingDays,
    present,
    absent,
    halfDay,
    late,
    earlyOut,
    missingOut,
    totalWorkingMinutes: totalMinutes,
    totalWorkingHours: minutesToHoursDisplay(totalMinutes),
    averageWorkingHours: minutesToHoursDisplay(avgMinutes),
  };
}

// ==============================================================================
// SERVER SETUP & VITE MIDDLEWARE
// ==============================================================================

async function startServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AttendFlow server started on http://0.0.0.0:${PORT} (Timezone: Asia/Kolkata)`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error during server startup:', err);
  process.exit(1);
});
