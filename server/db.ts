import fs from 'node:fs';
import path from 'node:path';
import {
  AdminUser,
  AppSettings,
  AttendanceRecord,
  AuditLogEntry,
  Employee,
  Holiday,
} from '../src/types';
import { getKolkataDate, getKolkataTime12, getKolkataTime24 } from './utils';

export interface DatabaseSchema {
  adminUsers: AdminUser[];
  employees: Employee[];
  attendance: AttendanceRecord[];
  holidays: Holiday[];
  settings: AppSettings;
  auditLogs: AuditLogEntry[];
}

const DB_DIR = path.resolve('data');
const DB_FILE = path.join(DB_DIR, 'attendance_db.json');

// Initial seed settings
export const DEFAULT_SETTINGS: AppSettings = {
  normalInTime: '10:15',
  lateAfter: '12:30',
  halfDayAfter: '14:00',
  minWorkingHours: 6,
  earlyOutTime: '16:30',
  officeName: 'TechCorp Campus, Sector 62, Noida',
  officeLatitude: 28.6280,
  officeLongitude: 77.3670,
  allowedRadius: 300, // 300 meters
  weeklyOffDays: [0], // 0 = Sunday
  dailyEmailTime: '19:00',
  adminEmail: 'admin@company.com',
  employeeEmailNotification: true,
  googleAppsScriptUrl: '',
  companyName: 'AttendFlow Corp',
};

const DEFAULT_ADMIN: AdminUser = {
  adminId: 'ADMIN001',
  adminName: 'System Administrator',
  name: 'System Administrator',
  email: 'admin@company.com',
  password: 'admin123',
  status: 'Active',
};

const SEED_EMPLOYEES: Employee[] = [
  {
    employeeId: 'EMP101',
    name: 'Rahul Sharma',
    mobile: '+91 98765 43210',
    email: 'rahul.sharma@company.com',
    department: 'Engineering',
    designation: 'Senior Software Engineer',
    joiningDate: '2024-01-15',
    pin: '1234',
    status: 'Active',
    createdDate: '2024-01-15',
    updatedDate: '2026-09-01',
  },
  {
    employeeId: 'EMP102',
    name: 'Priya Patel',
    mobile: '+91 98765 43211',
    email: 'priya.patel@company.com',
    department: 'Design',
    designation: 'Lead UI/UX Designer',
    joiningDate: '2024-03-01',
    pin: '1234',
    status: 'Active',
    createdDate: '2024-03-01',
    updatedDate: '2026-09-01',
  },
  {
    employeeId: 'EMP103',
    name: 'Amit Kumar',
    mobile: '+91 98765 43212',
    email: 'amit.kumar@company.com',
    department: 'Operations',
    designation: 'Operations Lead',
    joiningDate: '2024-02-10',
    pin: '1234',
    status: 'Active',
    createdDate: '2024-02-10',
    updatedDate: '2026-09-01',
  },
  {
    employeeId: 'EMP104',
    name: 'Sneha Verma',
    mobile: '+91 98765 43213',
    email: 'sneha.verma@company.com',
    department: 'Marketing',
    designation: 'Growth Strategist',
    joiningDate: '2024-04-12',
    pin: '1234',
    status: 'Active',
    createdDate: '2024-04-12',
    updatedDate: '2026-09-01',
  },
  {
    employeeId: 'EMP105',
    name: 'Vikas Singh',
    mobile: '+91 98765 43214',
    email: 'vikas.singh@company.com',
    department: 'Human Resources',
    designation: 'HR Executive',
    joiningDate: '2024-05-02',
    pin: '1234',
    status: 'Active',
    createdDate: '2024-05-02',
    updatedDate: '2026-09-01',
  },
  {
    employeeId: 'EMP106',
    name: 'Ananya Roy',
    mobile: '+91 98765 43215',
    email: 'ananya.roy@company.com',
    department: 'Finance',
    designation: 'Financial Analyst',
    joiningDate: '2024-06-20',
    pin: '1234',
    status: 'Inactive', // For testing inactive login rejection
    createdDate: '2024-06-20',
    updatedDate: '2026-09-01',
  },
];

const SEED_HOLIDAYS: Holiday[] = [
  { date: '2026-01-26', holidayName: 'Republic Day', status: 'Active' },
  { date: '2026-03-03', holidayName: 'Holi Festival', status: 'Active' },
  { date: '2026-08-15', holidayName: 'Independence Day', status: 'Active' },
  { date: '2026-10-02', holidayName: 'Gandhi Jayanti', status: 'Active' },
  { date: '2026-10-20', holidayName: 'Dussehra', status: 'Active' },
  { date: '2026-11-08', holidayName: 'Diwali Festival', status: 'Active' },
  { date: '2026-12-25', holidayName: 'Christmas Day', status: 'Active' },
];

/**
 * Generates sample past attendance for realistic reports & KPI cards
 */
function generateSeedAttendance(): AttendanceRecord[] {
  const records: AttendanceRecord[] = [];
  const today = getKolkataDate(); // YYYY-MM-DD

  // Generate historical data for past 15 working days of September 2026
  const pastDays = [
    '2026-09-15',
    '2026-09-16',
    '2026-09-17',
    '2026-09-18',
    '2026-09-21',
    '2026-09-22',
    '2026-09-23',
    '2026-09-24',
    '2026-09-25',
    '2026-09-28',
    '2026-09-29',
  ];

  pastDays.forEach((date) => {
    SEED_EMPLOYEES.filter((e) => e.status === 'Active').forEach((emp, index) => {
      // Create varied statuses: mostly Present, some Late, some Half Day
      const isAbsent = (index + date.charCodeAt(date.length - 1)) % 7 === 0;
      const isLate = (index + date.charCodeAt(date.length - 2)) % 5 === 0;
      const isHalfDay = (index + date.charCodeAt(date.length - 3)) % 9 === 0;

      if (isAbsent) {
        return; // Absent means no row or marked absent by report
      }

      let inTime = '09:45 AM';
      let outTime = '06:45 PM';
      let status: 'Present' | 'Half Day' = 'Present';
      let lateMark = false;
      let earlyOut = false;
      let workingMinutes = 540;
      let workingHours = '9h 0m';

      if (isLate) {
        inTime = '12:45 PM';
        lateMark = true;
        workingMinutes = 390;
        workingHours = '6h 30m';
      } else if (isHalfDay) {
        inTime = '02:15 PM';
        outTime = '06:30 PM';
        status = 'Half Day';
        workingMinutes = 255;
        workingHours = '4h 15m';
      }

      records.push({
        attendanceId: `ATT-${date}-${emp.employeeId}`,
        employeeId: emp.employeeId,
        employeeName: emp.name,
        date,
        inTime,
        outTime,
        inLatitude: 28.6280 + (Math.random() - 0.5) * 0.001,
        inLongitude: 77.3670 + (Math.random() - 0.5) * 0.001,
        outLatitude: 28.6280 + (Math.random() - 0.5) * 0.001,
        outLongitude: 77.3670 + (Math.random() - 0.5) * 0.001,
        locationStatus: 'Inside Office Location (35m)',
        workingHours,
        workingMinutes,
        attendanceStatus: status,
        lateMark,
        earlyOut,
        remarks: 'Auto-recorded',
        createdDate: `${date} 09:45:00`,
        updatedDate: `${date} 18:45:00`,
      });
    });
  });

  // Today's records (for live interactive testing)
  // EMP101 marked in early (Present, pending OUT)
  records.push({
    attendanceId: `ATT-${today}-EMP101`,
    employeeId: 'EMP101',
    employeeName: 'Rahul Sharma',
    date: today,
    inTime: '09:50 AM',
    outTime: null,
    inLatitude: 28.62805,
    inLongitude: 77.36702,
    outLatitude: null,
    outLongitude: null,
    locationStatus: 'Inside Office Location (24m)',
    workingHours: '0h 0m',
    workingMinutes: 0,
    attendanceStatus: 'Present',
    lateMark: false,
    earlyOut: false,
    remarks: 'GPS geofence verified',
    createdDate: `${today} 09:50:12`,
    updatedDate: `${today} 09:50:12`,
  });

  // EMP102 marked in late (Late Mark, pending OUT)
  records.push({
    attendanceId: `ATT-${today}-EMP102`,
    employeeId: 'EMP102',
    employeeName: 'Priya Patel',
    date: today,
    inTime: '12:45 PM',
    outTime: null,
    inLatitude: 28.6281,
    inLongitude: 77.3669,
    outLatitude: null,
    outLongitude: null,
    locationStatus: 'Inside Office Location (48m)',
    workingHours: '0h 0m',
    workingMinutes: 0,
    attendanceStatus: 'Present',
    lateMark: true,
    earlyOut: false,
    remarks: 'Late arrival',
    createdDate: `${today} 12:45:30`,
    updatedDate: `${today} 12:45:30`,
  });

  // EMP103 completed full day (Present, OUT marked)
  records.push({
    attendanceId: `ATT-${today}-EMP103`,
    employeeId: 'EMP103',
    employeeName: 'Amit Kumar',
    date: today,
    inTime: '09:30 AM',
    outTime: '06:15 PM',
    inLatitude: 28.6280,
    inLongitude: 77.3670,
    outLatitude: 28.62802,
    outLongitude: 77.36701,
    locationStatus: 'Inside Office Location (12m)',
    workingHours: '8h 45m',
    workingMinutes: 525,
    attendanceStatus: 'Present',
    lateMark: false,
    earlyOut: false,
    remarks: 'Full day completed',
    createdDate: `${today} 09:30:00`,
    updatedDate: `${today} 18:15:00`,
  });

  // EMP105 completed Half Day with early out
  records.push({
    attendanceId: `ATT-${today}-EMP105`,
    employeeId: 'EMP105',
    employeeName: 'Vikas Singh',
    date: today,
    inTime: '10:05 AM',
    outTime: '03:30 PM',
    inLatitude: 28.62795,
    inLongitude: 77.36705,
    outLatitude: 28.62795,
    outLongitude: 77.36705,
    locationStatus: 'Inside Office Location (18m)',
    workingHours: '5h 25m',
    workingMinutes: 325,
    attendanceStatus: 'Half Day',
    lateMark: false,
    earlyOut: true,
    remarks: 'Early departure approved',
    createdDate: `${today} 10:05:00`,
    updatedDate: `${today} 15:30:00`,
  });

  // EMP104 has NOT marked in today (will show as Absent / Missing IN in today's dashboard)

  return records;
}

export class Database {
  private data: DatabaseSchema;

  constructor() {
    this.data = this.load();
  }

  private load(): DatabaseSchema {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        return JSON.parse(raw);
      } catch (err) {
        console.error('Failed reading DB file, reinitializing default seed:', err);
      }
    }

    // Default Seed Data
    const initialData: DatabaseSchema = {
      adminUsers: [DEFAULT_ADMIN],
      employees: SEED_EMPLOYEES,
      attendance: generateSeedAttendance(),
      holidays: SEED_HOLIDAYS,
      settings: DEFAULT_SETTINGS,
      auditLogs: [
        {
          logId: 'LOG-001',
          user: 'System Setup',
          action: 'Database Initialized',
          date: getKolkataDate(),
          time: getKolkataTime24(),
          oldValue: 'None',
          newValue: 'Schema bootstrapped with default company settings and sample records',
        },
      ],
    };

    this.saveData(initialData);
    return initialData;
  }

  private saveData(data: DatabaseSchema) {
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  }

  public save() {
    this.saveData(this.data);
  }

  // --- GETTERS ---
  public getEmployees(): Employee[] {
    return this.data.employees;
  }

  public getEmployeeById(id: string): Employee | undefined {
    return this.data.employees.find((e) => e.employeeId.toUpperCase() === id.toUpperCase());
  }

  public getAdminUsers(): AdminUser[] {
    return this.data.adminUsers;
  }

  public getAdminByEmailOrId(idOrEmail: string): AdminUser | undefined {
    const val = idOrEmail.toLowerCase().trim();
    return this.data.adminUsers.find(
      (a) => a.adminId.toLowerCase() === val || a.email.toLowerCase() === val
    );
  }

  public getAttendance(): AttendanceRecord[] {
    return this.data.attendance;
  }

  public getAttendanceById(id: string): AttendanceRecord | undefined {
    return this.data.attendance.find((a) => a.attendanceId === id);
  }

  public getAttendanceForEmployeeDate(
    employeeId: string,
    date: string
  ): AttendanceRecord | undefined {
    return this.data.attendance.find(
      (a) => a.employeeId.toUpperCase() === employeeId.toUpperCase() && a.date === date
    );
  }

  public getHolidays(): Holiday[] {
    return this.data.holidays;
  }

  public getHolidayByDate(date: string): Holiday | undefined {
    return this.data.holidays.find((h) => h.date === date && h.status === 'Active');
  }

  public getSettings(): AppSettings {
    return this.data.settings;
  }

  public getAuditLogs(): AuditLogEntry[] {
    return this.data.auditLogs;
  }

  // --- MUTATORS WITH AUDIT LOGGING ---
  public addAuditLog(user: string, action: string, oldValue: string, newValue: string) {
    const entry: AuditLogEntry = {
      logId: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      user,
      action,
      date: getKolkataDate(),
      time: getKolkataTime24(),
      oldValue,
      newValue,
    };
    this.data.auditLogs.unshift(entry);
    // Keep last 1000 logs
    if (this.data.auditLogs.length > 1000) {
      this.data.auditLogs = this.data.auditLogs.slice(0, 1000);
    }
    this.save();
  }

  public addEmployee(emp: Employee, actor: string): Employee {
    this.data.employees.push(emp);
    this.addAuditLog(actor, 'Employee Added', 'None', `Added ${emp.name} (${emp.employeeId})`);
    this.save();
    return emp;
  }

  public updateEmployee(emp: Employee, actor: string): Employee {
    const idx = this.data.employees.findIndex((e) => e.employeeId === emp.employeeId);
    if (idx !== -1) {
      const old = this.data.employees[idx];
      this.data.employees[idx] = { ...emp, updatedDate: getKolkataDate() };
      this.addAuditLog(
        actor,
        'Employee Edited',
        JSON.stringify(old),
        JSON.stringify(this.data.employees[idx])
      );
      this.save();
    }
    return emp;
  }

  public setEmployeeStatus(
    employeeId: string,
    status: 'Active' | 'Inactive',
    actor: string
  ): Employee | null {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) return null;
    const oldStatus = emp.status;
    emp.status = status;
    emp.updatedDate = getKolkataDate();
    this.addAuditLog(
      actor,
      status === 'Active' ? 'Employee Activated' : 'Employee Deactivated',
      oldStatus,
      status
    );
    this.save();
    return emp;
  }

  public resetEmployeePin(employeeId: string, newPin: string, actor: string): boolean {
    const emp = this.getEmployeeById(employeeId);
    if (!emp) return false;
    emp.pin = newPin;
    emp.updatedDate = getKolkataDate();
    this.addAuditLog(actor, 'PIN Changed', '***', '***');
    this.save();
    return true;
  }

  public recordAttendance(record: AttendanceRecord): AttendanceRecord {
    const idx = this.data.attendance.findIndex((a) => a.attendanceId === record.attendanceId);
    if (idx !== -1) {
      this.data.attendance[idx] = record;
    } else {
      this.data.attendance.unshift(record);
    }
    this.save();
    return record;
  }

  public correctAttendance(
    attendanceId: string,
    corrections: Partial<AttendanceRecord>,
    actor: string
  ): AttendanceRecord | null {
    const record = this.getAttendanceById(attendanceId);
    if (!record) return null;
    const oldCopy = { ...record };
    Object.assign(record, corrections, { updatedDate: `${getKolkataDate()} ${getKolkataTime24()}` });
    this.addAuditLog(
      actor,
      'Attendance Corrected',
      JSON.stringify(oldCopy),
      JSON.stringify(record)
    );
    this.save();
    return record;
  }

  public updateSettings(newSettings: Partial<AppSettings>, actor: string): AppSettings {
    const oldCopy = { ...this.data.settings };
    this.data.settings = { ...this.data.settings, ...newSettings };
    this.addAuditLog(
      actor,
      'Settings Changed',
      JSON.stringify(oldCopy),
      JSON.stringify(this.data.settings)
    );
    this.save();
    return this.data.settings;
  }

  public addHoliday(holiday: Holiday, actor: string): Holiday {
    this.data.holidays.push(holiday);
    this.addAuditLog(actor, 'Holiday Added', 'None', `${holiday.holidayName} on ${holiday.date}`);
    this.save();
    return holiday;
  }

  public updateHoliday(date: string, holiday: Partial<Holiday>, actor: string): Holiday | null {
    const idx = this.data.holidays.findIndex((h) => h.date === date);
    if (idx === -1) return null;
    const old = { ...this.data.holidays[idx] };
    this.data.holidays[idx] = { ...this.data.holidays[idx], ...holiday };
    this.addAuditLog(
      actor,
      'Holiday Edited',
      JSON.stringify(old),
      JSON.stringify(this.data.holidays[idx])
    );
    this.save();
    return this.data.holidays[idx];
  }

  public deleteHoliday(date: string, actor: string): boolean {
    const idx = this.data.holidays.findIndex((h) => h.date === date);
    if (idx === -1) return false;
    const removed = this.data.holidays.splice(idx, 1)[0];
    this.addAuditLog(actor, 'Holiday Deleted', `${removed.holidayName} on ${removed.date}`, 'Deleted');
    this.save();
    return true;
  }

  public getAllData(): DatabaseSchema {
    return this.data;
  }
}

export const db = new Database();
