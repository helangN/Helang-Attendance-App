import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Building,
  Calendar,
  CheckCircle2,
  Clock,
  Compass,
  FileText,
  Info,
  Layers,
  LogOut,
  MapPin,
  Navigation,
  RefreshCw,
  Smartphone,
  User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, EmployeeMonthlyStats, LocationValidationResult } from '../../types';
import { LateBadge, StatusBadge } from '../common/Badge';
import { PWAInstallButton } from '../common/PWAInstallButton';

interface EmployeeDashboardProps {
  onNavigate: (tab: 'HOME' | 'ATTENDANCE' | 'REPORTS' | 'PROFILE', filterStatus?: string) => void;
}

export const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ onNavigate }) => {
  const { user, token, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<EmployeeMonthlyStats | null>(null);
  const [officeConfig, setOfficeConfig] = useState<any>(null);

  // Time & Location state
  const [currentTime, setCurrentTime] = useState<string>('');
  const [todayDate, setTodayDate] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<LocationValidationResult | null>(null);
  const [locationChecking, setLocationChecking] = useState<boolean>(false);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'error';
    text: string;
    details?: string;
  } | null>(null);

  // Geofence testing simulation helper (toggle to use exact office coords during demo/testing)
  const [simulateAtOffice, setSimulateAtOffice] = useState<boolean>(true);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/employee/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTodayRecord(data.today.record);
        setMonthlyStats(data.monthlyStats);
        setOfficeConfig(data.officeConfig);
        setTodayDate(data.today.date);
        setCurrentTime(data.today.time);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Live Clock updater (Asia/Kolkata timezone)
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const timeStr = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      }).format(now);
      setCurrentTime(timeStr);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Check Location against office geofence
  const checkCurrentLocation = async (lat?: number, lng?: number) => {
    if (!token) return;
    setLocationChecking(true);
    setGpsError(null);

    const runValidation = async (latitude: number, longitude: number) => {
      try {
        const res = await fetch('/api/employee/check-location', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ latitude, longitude }),
        });
        const data = await res.json();
        setLocationStatus(data);
      } catch (err: any) {
        setGpsError('Could not verify distance to office server.');
      } finally {
        setLocationChecking(false);
      }
    };

    if (lat !== undefined && lng !== undefined) {
      await runValidation(lat, lng);
      return;
    }

    if (simulateAtOffice && officeConfig) {
      // Simulate at office coordinate (within 25m)
      await runValidation(officeConfig.officeLatitude + 0.0001, officeConfig.officeLongitude + 0.0001);
      return;
    }

    if (!navigator.geolocation) {
      setGpsError('Geolocation is not supported by your browser or device.');
      setLocationChecking(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        runValidation(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setGpsError(`GPS Access Denied (${err.message}). Enable location services to mark attendance.`);
        setLocationChecking(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (officeConfig) {
      checkCurrentLocation();
    }
  }, [officeConfig, simulateAtOffice]);

  // Handle Mark IN or Mark OUT
  const handleAttendanceAction = async (actionType: 'IN' | 'OUT') => {
    setFeedbackMessage(null);
    setGpsError(null);

    if (!navigator.onLine) {
      setFeedbackMessage({
        type: 'error',
        text: 'Internet connection required to mark attendance.',
      });
      return;
    }

    // Determine GPS coordinates
    const submitCoords = async (latitude: number, longitude: number) => {
      setSubmitting(true);
      try {
        const endpoint = actionType === 'IN' ? '/api/employee/mark-in' : '/api/employee/mark-out';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ latitude, longitude }),
        });

        const data = await res.json();

        if (!res.ok) {
          setFeedbackMessage({
            type: 'error',
            text: data.error || 'Failed to record attendance',
            details: data.details
              ? `Distance: ${data.details.currentDistance}m (Allowed radius: ${data.details.allowedRadius}m at ${data.details.officeName})`
              : undefined,
          });
        } else {
          setFeedbackMessage({
            type: 'success',
            text: data.message,
          });
          setTodayRecord(data.record);
          fetchDashboardData();
        }
      } catch (err: any) {
        setFeedbackMessage({
          type: 'error',
          text: err.message || 'Network error while contacting server.',
        });
      } finally {
        setSubmitting(false);
      }
    };

    if (simulateAtOffice && officeConfig) {
      // Use office coordinates with tiny realistic jitter
      await submitCoords(
        officeConfig.officeLatitude + 0.0001,
        officeConfig.officeLongitude + 0.0001
      );
      return;
    }

    if (!navigator.geolocation) {
      setFeedbackMessage({
        type: 'error',
        text: 'Geolocation is not supported by your device.',
      });
      return;
    }

    setSubmitting(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await submitCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        setSubmitting(false);
        setFeedbackMessage({
          type: 'error',
          text: `GPS Permission Required: ${err.message}. Please allow location access.`,
        });
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  const hasMarkedIn = Boolean(todayRecord && todayRecord.inTime);
  const hasMarkedOut = Boolean(todayRecord && todayRecord.outTime);

  return (
    <div className="space-y-5 pb-24 max-w-2xl mx-auto">
      {/* Top Welcome Card */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-2xl p-5 shadow-xl border border-blue-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-300 bg-blue-950/80 px-2.5 py-1 rounded-full border border-blue-700/50">
              Employee Portal
            </span>
            <h2 className="text-xl sm:text-2xl font-bold mt-2 text-white tracking-tight">
              {user?.name || 'Employee'}
            </h2>
            <p className="text-xs text-blue-200 mt-0.5 font-mono">
              ID: <span className="font-bold text-white">{(user as any)?.employeeId}</span> •{' '}
              {(user as any)?.department} • {(user as any)?.designation}
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            title="Refresh status"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition active:scale-95"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Live Clock & Date */}
        <div className="mt-4 pt-3 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
          <div className="flex items-center gap-2 text-blue-100">
            <Calendar className="w-4 h-4 text-blue-300" />
            <span className="font-medium">{todayDate || 'Today'}</span>
          </div>
          <div className="flex items-center gap-2 bg-black/30 px-3 py-1.5 rounded-lg border border-white/10">
            <Clock className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-mono font-bold text-white tracking-wider">{currentTime || '--:--:--'}</span>
            <span className="text-[10px] text-blue-300 uppercase">IST</span>
          </div>
        </div>
      </div>

      {/* GPS Geofence Quick Check Status */}
      <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                locationStatus?.isInside
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              <Navigation className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Office Geofence Status
                </span>
                {locationChecking && (
                  <span className="text-[10px] text-blue-600 animate-pulse">Checking GPS...</span>
                )}
              </div>
              <p
                className={`text-sm font-bold mt-0.5 ${
                  locationStatus?.isInside ? 'text-emerald-700' : 'text-amber-800'
                }`}
              >
                {locationStatus?.isInside ? 'Inside Office Location' : 'Outside Office Location'}
                {locationStatus && (
                  <span className="text-xs font-normal text-slate-500 ml-1.5">
                    ({locationStatus.distance}m from {officeConfig?.officeName || 'Office'}, radius:{' '}
                    {officeConfig?.allowedRadius || 300}m)
                  </span>
                )}
              </p>
            </div>
          </div>
          <button
            onClick={() => checkCurrentLocation()}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2.5 py-1 rounded-md hover:bg-blue-50 border border-blue-200"
          >
            Recheck
          </button>
        </div>

        {/* GPS Testing Mode Toggle for Instant Testing */}
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Compass className="w-3.5 h-3.5 text-blue-600" />
            <span>GPS Geofence Test Mode:</span>
          </div>
          <button
            type="button"
            onClick={() => setSimulateAtOffice(!simulateAtOffice)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold transition ${
              simulateAtOffice
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
            }`}
          >
            {simulateAtOffice ? '✓ At Office (Passes Geofence)' : 'Real Device GPS'}
          </button>
        </div>

        {gpsError && (
          <p className="mt-2 text-xs text-rose-600 bg-rose-50 p-2 rounded-md border border-rose-200">
            {gpsError}
          </p>
        )}
      </div>

      {/* Feedback Alert */}
      {feedbackMessage && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 shadow-md animate-fade-in ${
            feedbackMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-rose-50 border-rose-300 text-rose-900'
          }`}
        >
          {feedbackMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1 text-sm">
            <p className="font-bold leading-tight">{feedbackMessage.text}</p>
            {feedbackMessage.details && (
              <p className="text-xs mt-1 text-slate-600">{feedbackMessage.details}</p>
            )}
          </div>
          <button
            onClick={() => setFeedbackMessage(null)}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* TODAY'S ATTENDANCE CARD */}
      <div className="bg-white rounded-2xl p-5 sm:p-6 shadow-md border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-base text-slate-900">Today's Attendance</h3>
          </div>
          {todayRecord && (
            <div className="flex items-center gap-1.5">
              <StatusBadge status={todayRecord.attendanceStatus} size="sm" />
              <LateBadge isLate={todayRecord.lateMark} />
            </div>
          )}
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold uppercase text-slate-500">IN Time</span>
            <p className="text-base font-bold text-slate-900 mt-1 font-mono">
              {todayRecord?.inTime || <span className="text-slate-400 font-normal">Not Marked</span>}
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold uppercase text-slate-500">OUT Time</span>
            <p className="text-base font-bold text-slate-900 mt-1 font-mono">
              {todayRecord?.outTime || (
                <span className="text-slate-400 font-normal">
                  {hasMarkedIn ? 'Pending' : 'Not Marked'}
                </span>
              )}
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Working Hours</span>
            <p className="text-base font-bold text-slate-900 mt-1 font-mono">
              {todayRecord?.workingHours || '0h 0m'}
            </p>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[11px] font-semibold uppercase text-slate-500">Status</span>
            <p className="text-sm font-bold text-slate-900 mt-1">
              {todayRecord?.attendanceStatus || (
                <span className="text-rose-600 font-semibold">Pending IN</span>
              )}
            </p>
          </div>
        </div>

        {/* Additional status details */}
        {todayRecord && (
          <div className="bg-blue-50/60 p-3 rounded-xl border border-blue-100 text-xs space-y-1 text-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Location Verification:</span>
              <span className="font-semibold text-emerald-800">{todayRecord.locationStatus}</span>
            </div>
            {todayRecord.lateMark && (
              <div className="flex items-center justify-between text-orange-800">
                <span className="font-medium">Late Arrival Notice:</span>
                <span className="font-semibold">Late Mark Recorded (After {officeConfig?.lateAfter || '12:30'})</span>
              </div>
            )}
            {todayRecord.earlyOut && (
              <div className="flex items-center justify-between text-amber-800">
                <span className="font-medium">Early Out Notice:</span>
                <span className="font-semibold">Left before {officeConfig?.earlyOutTime || '16:30'}</span>
              </div>
            )}
          </div>
        )}

        {/* MAIN BUTTONS: MARK IN & MARK OUT */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mt-5">
          {/* MARK IN BUTTON */}
          <button
            type="button"
            disabled={hasMarkedIn || submitting}
            onClick={() => handleAttendanceAction('IN')}
            className={`py-4 px-6 rounded-xl font-bold text-base shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
              hasMarkedIn
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-[0.98]'
            }`}
          >
            {submitting ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : hasMarkedIn ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <span>IN MARKED ({todayRecord?.inTime})</span>
              </>
            ) : (
              <>
                <MapPin className="w-5 h-5" />
                <span>MARK IN</span>
              </>
            )}
          </button>

          {/* MARK OUT BUTTON */}
          <button
            type="button"
            disabled={!hasMarkedIn || hasMarkedOut || submitting}
            onClick={() => handleAttendanceAction('OUT')}
            className={`py-4 px-6 rounded-xl font-bold text-base shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
              !hasMarkedIn || hasMarkedOut
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                : 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30 active:scale-[0.98]'
            }`}
          >
            {submitting ? (
              <span className="inline-block w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : hasMarkedOut ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-amber-600" />
                <span>OUT MARKED ({todayRecord?.outTime})</span>
              </>
            ) : !hasMarkedIn ? (
              <>
                <Clock className="w-5 h-5" />
                <span>MARK OUT (Requires IN First)</span>
              </>
            ) : (
              <>
                <LogOut className="w-5 h-5" />
                <span>MARK OUT</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-center text-slate-400 mt-3">
          Compulsory GPS check enforced. Allowed radius: {officeConfig?.allowedRadius || 300} meters from{' '}
          {officeConfig?.officeName || 'Office'}.
        </p>
      </div>

      {/* CLICKABLE SUMMARY KPI CARDS */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="font-bold text-sm text-slate-800 uppercase tracking-wider">
            Monthly Summary (September 2026)
          </h3>
          <span className="text-xs text-blue-600 font-semibold cursor-pointer" onClick={() => onNavigate('REPORTS')}>
            View Report →
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('ATTENDANCE')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition text-left cursor-pointer group"
          >
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Working Days
            </span>
            <p className="text-2xl font-bold text-slate-900 mt-1 group-hover:text-blue-600">
              {monthlyStats?.workingDays ?? '--'}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">Scheduled days</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ATTENDANCE', 'Present')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-emerald-400 hover:shadow-md transition text-left cursor-pointer group"
          >
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
              Present
            </span>
            <p className="text-2xl font-bold text-emerald-700 mt-1 group-hover:text-emerald-800">
              {monthlyStats?.present ?? '--'}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">Full attendance</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ATTENDANCE', 'Absent')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-rose-400 hover:shadow-md transition text-left cursor-pointer group"
          >
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wide">
              Absent
            </span>
            <p className="text-2xl font-bold text-rose-700 mt-1 group-hover:text-rose-800">
              {monthlyStats?.absent ?? '--'}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">Unexcused</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ATTENDANCE', 'Half Day')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-amber-400 hover:shadow-md transition text-left cursor-pointer group"
          >
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wide">
              Half Day
            </span>
            <p className="text-2xl font-bold text-amber-700 mt-1 group-hover:text-amber-800">
              {monthlyStats?.halfDay ?? '--'}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">&lt; 6 working hrs</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('ATTENDANCE', 'Late')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-orange-400 hover:shadow-md transition text-left cursor-pointer group"
          >
            <span className="text-xs font-semibold text-orange-600 uppercase tracking-wide">
              Late
            </span>
            <p className="text-2xl font-bold text-orange-700 mt-1 group-hover:text-orange-800">
              {monthlyStats?.late ?? '--'}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">After {officeConfig?.lateAfter || '12:30'}</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('REPORTS')}
            className="p-4 rounded-xl bg-white border border-slate-200 hover:border-blue-400 hover:shadow-md transition text-left cursor-pointer group"
          >
            <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
              Total Hours
            </span>
            <p className="text-xl font-bold text-indigo-700 mt-1 font-mono group-hover:text-indigo-800">
              {monthlyStats?.totalWorkingHours ?? '--'}
            </p>
            <span className="text-[11px] text-slate-400 mt-1 block">
              Avg: {monthlyStats?.averageWorkingHours || '0h 0m'}/day
            </span>
          </button>
        </div>
      </div>

      {/* QUICK ACTION BUTTONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
        <button
          onClick={() => onNavigate('ATTENDANCE')}
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-800 flex items-center justify-center gap-2 shadow-xs transition"
        >
          <Layers className="w-4 h-4 text-blue-600" />
          <span>MY ATTENDANCE</span>
        </button>

        <button
          onClick={() => onNavigate('REPORTS')}
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-800 flex items-center justify-center gap-2 shadow-xs transition"
        >
          <FileText className="w-4 h-4 text-indigo-600" />
          <span>MY REPORT</span>
        </button>

        <button
          onClick={() => onNavigate('PROFILE')}
          className="p-3 bg-white hover:bg-slate-50 border border-slate-200 rounded-xl font-semibold text-xs text-slate-800 flex items-center justify-center gap-2 shadow-xs transition"
        >
          <User className="w-4 h-4 text-slate-600" />
          <span>PROFILE</span>
        </button>

        <button
          onClick={logout}
          className="p-3 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl font-semibold text-xs text-rose-700 flex items-center justify-center gap-2 transition"
        >
          <LogOut className="w-4 h-4 text-rose-600" />
          <span>LOGOUT</span>
        </button>
      </div>

      {/* Office Timings Rule Reminder */}
      <div className="bg-slate-100/80 rounded-xl p-3 text-xs text-slate-600 flex items-start gap-2 border border-slate-200">
        <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-slate-800">Company Attendance Rules:</strong> Normal IN:{' '}
          <strong>{officeConfig?.normalInTime || '10:15 AM'}</strong> • Late after:{' '}
          <strong>{officeConfig?.lateAfter || '12:30 PM'}</strong> • Half day after:{' '}
          <strong>{officeConfig?.halfDayAfter || '2:00 PM'}</strong> • Min working hours:{' '}
          <strong>{officeConfig?.minWorkingHours || 6} Hours</strong>.
        </div>
      </div>
    </div>
  );
};
