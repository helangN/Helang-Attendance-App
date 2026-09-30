import { AppSettings, AttendanceStatus } from '../src/types';

/**
 * Calculates distance in meters between two GPS coordinates using the Haversine formula
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Returns current Asia/Kolkata date string (YYYY-MM-DD)
 */
export function getKolkataDate(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

/**
 * Returns current Asia/Kolkata 12-hour time string (e.g. "10:15 AM" or "06:30:20 PM")
 */
export function getKolkataTime12(date: Date = new Date(), withSeconds = false): string {
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  };
  if (withSeconds) {
    options.second = '2-digit';
  }
  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Returns current Asia/Kolkata 24-hour time string (e.g. "10:15" or "10:15:30")
 */
export function getKolkataTime24(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
}

/**
 * Converts "HH:MM" (24-hour) string to minutes from midnight
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  // Handle 12-hour format if passed (e.g. "10:15 AM")
  const is12Hour = /am|pm/i.test(timeStr);
  if (is12Hour) {
    const parts = timeStr.trim().split(/[:\s]/);
    let hours = parseInt(parts[0], 10);
    const mins = parseInt(parts[1], 10);
    const meridiem = parts[parts.length - 1].toUpperCase();
    if (meridiem === 'PM' && hours < 12) hours += 12;
    if (meridiem === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
  }

  const [hours, minutes] = timeStr.split(':').map((s) => parseInt(s, 10));
  return (hours || 0) * 60 + (minutes || 0);
}

/**
 * Formats minutes into "Xh Ym"
 */
export function minutesToHoursDisplay(minutes: number): string {
  if (!minutes || minutes <= 0) return '0h 0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

/**
 * Calculates attendance status, late mark, and working hours
 */
export function calculateAttendanceEvaluation({
  inTimeStr,
  outTimeStr,
  settings,
}: {
  inTimeStr: string;
  outTimeStr: string | null;
  settings: AppSettings;
}): {
  attendanceStatus: AttendanceStatus;
  lateMark: boolean;
  earlyOut: boolean;
  workingMinutes: number;
  workingHours: string;
} {
  const inMinutes = timeStringToMinutes(inTimeStr);
  const lateThreshold = timeStringToMinutes(settings.lateAfter || '12:30');
  const halfDayThreshold = timeStringToMinutes(settings.halfDayAfter || '14:00');
  const earlyOutThreshold = timeStringToMinutes(settings.earlyOutTime || '16:30');
  const minRequiredWorkingMinutes = (settings.minWorkingHours || 6) * 60;

  const lateMark = inMinutes > lateThreshold;

  if (!outTimeStr) {
    // Only IN marked so far
    let initialStatus: AttendanceStatus = 'Present';
    if (inMinutes > halfDayThreshold) {
      initialStatus = 'Half Day';
    }
    return {
      attendanceStatus: initialStatus,
      lateMark,
      earlyOut: false,
      workingMinutes: 0,
      workingHours: '0h 0m',
    };
  }

  const outMinutes = timeStringToMinutes(outTimeStr);
  const workingMinutes = Math.max(0, outMinutes - inMinutes);
  const workingHours = minutesToHoursDisplay(workingMinutes);
  const earlyOut = outMinutes < earlyOutThreshold;

  let attendanceStatus: AttendanceStatus = 'Present';

  // Rule 1: IN after Half Day threshold -> Half Day
  if (inMinutes > halfDayThreshold) {
    attendanceStatus = 'Half Day';
  }
  // Rule 2: Working hours less than minimum working hours -> Half Day
  else if (workingMinutes < minRequiredWorkingMinutes) {
    attendanceStatus = 'Half Day';
  }
  // Rule 3: Early Out with working hours < min -> Half Day (already covered)
  else {
    attendanceStatus = 'Present';
  }

  return {
    attendanceStatus,
    lateMark,
    earlyOut,
    workingMinutes,
    workingHours,
  };
}
