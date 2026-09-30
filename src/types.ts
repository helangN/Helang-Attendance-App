export type UserRole = 'ADMIN' | 'EMPLOYEE';

export interface Employee {
  employeeId: string;
  name: string;
  mobile: string;
  email: string;
  department: string;
  designation: string;
  joiningDate: string; // YYYY-MM-DD
  pin: string;
  status: 'Active' | 'Inactive';
  createdDate: string;
  updatedDate: string;
}

export type AttendanceStatus =
  | 'Present'
  | 'Absent'
  | 'Half Day'
  | 'Holiday'
  | 'Weekly Off'
  | 'OUT Missing'
  | 'Pending';

export interface AttendanceRecord {
  attendanceId: string;
  employeeId: string;
  employeeName: string;
  date: string; // YYYY-MM-DD
  inTime: string | null; // e.g. "09:45 AM"
  outTime: string | null; // e.g. "06:30 PM"
  inLatitude: number | null;
  inLongitude: number | null;
  outLatitude: number | null;
  outLongitude: number | null;
  locationStatus: string;
  workingHours: string; // e.g. "8h 45m" or "0h 0m"
  workingMinutes: number; // For easy math
  attendanceStatus: AttendanceStatus;
  lateMark: boolean; // Yes/No
  earlyOut: boolean; // Yes/No
  remarks: string;
  createdDate: string;
  updatedDate: string;
}

export interface Holiday {
  date: string; // YYYY-MM-DD
  holidayName: string;
  status: 'Active' | 'Inactive';
}

export interface AppSettings {
  normalInTime: string; // e.g. "10:15"
  lateAfter: string; // e.g. "12:30"
  halfDayAfter: string; // e.g. "14:00"
  minWorkingHours: number; // e.g. 6
  earlyOutTime: string; // e.g. "16:30"
  officeName: string;
  officeLatitude: number;
  officeLongitude: number;
  allowedRadius: number; // meters, default 300
  weeklyOffDays: number[]; // 0 = Sunday, 6 = Saturday (e.g. [0])
  dailyEmailTime: string; // e.g. "19:00"
  adminEmail: string;
  employeeEmailNotification: boolean;
  googleAppsScriptUrl?: string;
  companyName: string;
}

export interface AdminUser {
  adminId: string;
  adminName: string;
  name?: string;
  email: string;
  password?: string;
  status: 'Active' | 'Inactive';
}

export interface AuditLogEntry {
  logId: string;
  user: string;
  action: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm:ss
  oldValue: string;
  newValue: string;
}

export interface DailyAttendanceSummary {
  date: string;
  totalEmployees: number;
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  earlyOut: number;
  missingOut: number;
  holidayOrOff: number;
}

export interface EmployeeMonthlyStats {
  employeeId: string;
  employeeName: string;
  month: number;
  year: number;
  calendarDays: number;
  workingDays: number;
  present: number;
  absent: number;
  halfDay: number;
  late: number;
  earlyOut: number;
  missingOut: number;
  totalWorkingMinutes: number;
  totalWorkingHours: string;
  averageWorkingHours: string;
}

export interface LocationValidationResult {
  isInside: boolean;
  distance: number; // in meters
  allowedRadius: number;
  officeName: string;
  message: string;
}
