import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  Printer,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, EmployeeMonthlyStats } from '../../types';

export const EmployeeReport: React.FC = () => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<EmployeeMonthlyStats | null>(null);
  const [dailyRecords, setDailyRecords] = useState<AttendanceRecord[]>([]);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());

  const fetchReport = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [resStats, resRecords] = await Promise.all([
        fetch(`/api/employee/monthly-report?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/employee/attendance?month=${selectedMonth}&year=${selectedYear}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (resStats.ok) {
        setStats(await resStats.json());
      }
      if (resRecords.ok) {
        const data = await resRecords.json();
        setDailyRecords(data.records);
      }
    } catch (err) {
      console.error('Failed to fetch report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [token, selectedMonth, selectedYear]);

  // Export report to CSV
  const handleExportCSV = () => {
    if (!stats) return;
    const lines = [
      `Employee Attendance Report - ${user?.name} (${(user as any)?.employeeId})`,
      `Month: ${new Date(selectedYear, selectedMonth - 1).toLocaleString('default', { month: 'long' })} ${selectedYear}`,
      '',
      'SUMMARY METRICS',
      `Calendar Days,${stats.calendarDays}`,
      `Working Days,${stats.workingDays}`,
      `Present Days,${stats.present}`,
      `Absent Days,${stats.absent}`,
      `Half Days,${stats.halfDay}`,
      `Late Marks,${stats.late}`,
      `Early Outs,${stats.earlyOut}`,
      `Total Working Hours,${stats.totalWorkingHours}`,
      `Average Working Hours,${stats.averageWorkingHours}`,
      '',
      'DAY-WISE BREAKDOWN',
      'Date,IN Time,OUT Time,Working Hours,Status,Late,Early Out,Location Status',
      ...dailyRecords.map(
        (r) =>
          `${r.date},${r.inTime || '-'},${r.outTime || '-'},${r.workingHours || '0h 0m'},${r.attendanceStatus},${r.lateMark ? 'Yes' : 'No'},${r.earlyOut ? 'Yes' : 'No'},"${r.locationStatus || '-'}"`
      ),
    ];

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Monthly_Report_${(user as any)?.employeeId}_${selectedYear}_${selectedMonth}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  // Build calendar matrix for selected month
  const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
  const firstDayOfWeek = new Date(selectedYear, selectedMonth - 1, 1).getDay(); // 0 = Sunday

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-24 print:p-0 print:m-0">
      {/* Header and Controls */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Monthly Attendance Report
            </h2>
            <p className="text-xs text-slate-500">
              Complete performance analytics and attendance calendar.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg flex items-center gap-1.5 border border-slate-200 transition"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-1.5 shadow-sm transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT REPORT</span>
            </button>
          </div>
        </div>

        {/* Month Selector */}
        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Month:</span>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs text-slate-800"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 uppercase">Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg font-medium text-xs text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
          <p className="text-xs">Generating monthly performance analytics...</p>
        </div>
      ) : (
        <>
          {/* Printable Report Header */}
          <div className="hidden print:block mb-4 pb-3 border-b border-slate-300">
            <h1 className="text-xl font-bold">Employee Attendance Summary</h1>
            <p className="text-sm">
              Employee: {user?.name} ({(user as any)?.employeeId}) • Department:{' '}
              {(user as any)?.department}
            </p>
            <p className="text-xs text-slate-600">
              Period:{' '}
              {new Date(selectedYear, selectedMonth - 1).toLocaleString('default', {
                month: 'long',
              })}{' '}
              {selectedYear}
            </p>
          </div>

          {/* KPI Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-slate-500">
                Calendar Days
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{stats?.calendarDays ?? 0}</p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Days in month</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-blue-600">
                Working Days
              </span>
              <p className="text-2xl font-bold text-blue-700 mt-1">{stats?.workingDays ?? 0}</p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Excludes off/holidays</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-emerald-600">Present</span>
              <p className="text-2xl font-bold text-emerald-700 mt-1">{stats?.present ?? 0}</p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Full days</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-rose-600">Absent</span>
              <p className="text-2xl font-bold text-rose-700 mt-1">{stats?.absent ?? 0}</p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Unexcused</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-amber-600">Half Day</span>
              <p className="text-2xl font-bold text-amber-700 mt-1">{stats?.halfDay ?? 0}</p>
              <span className="text-[11px] text-slate-400 block mt-0.5">&lt; 6 hrs or late arrival</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-orange-600">Late Mark</span>
              <p className="text-2xl font-bold text-orange-700 mt-1">{stats?.late ?? 0}</p>
              <span className="text-[11px] text-slate-400 block mt-0.5">After late threshold</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-purple-600">Early Out</span>
              <p className="text-2xl font-bold text-purple-700 mt-1">{stats?.earlyOut ?? 0}</p>
              <span className="text-[11px] text-slate-400 block mt-0.5">Left before threshold</span>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[11px] font-semibold uppercase text-indigo-600">
                Total Hours
              </span>
              <p className="text-2xl font-bold text-indigo-700 mt-1 font-mono">
                {stats?.totalWorkingHours ?? '0h 0m'}
              </p>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Avg: {stats?.averageWorkingHours ?? '0h 0m'}/day
              </span>
            </div>
          </div>

          {/* MONTHLY ATTENDANCE CALENDAR */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Attendance Calendar View
              </h3>
              {/* Legend */}
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Present</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span>Half Day</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Absent</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-500" />
                  <span>Holiday/Off</span>
                </span>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-slate-500 uppercase tracking-wider mb-2">
              <span>Sun</span>
              <span>Mon</span>
              <span>Tue</span>
              <span>Wed</span>
              <span>Thu</span>
              <span>Fri</span>
              <span>Sat</span>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Empty leading padding days */}
              {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                <div key={`empty-${i}`} className="h-16 sm:h-20 bg-slate-50/50 rounded-lg" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const dayStr = String(day).padStart(2, '0');
                const monthStr = String(selectedMonth).padStart(2, '0');
                const dateStr = `${selectedYear}-${monthStr}-${dayStr}`;

                const record = dailyRecords.find((r) => r.date === dateStr);

                let cellClass = 'bg-slate-50 border-slate-200 text-slate-700';
                let statusText = '-';

                if (record) {
                  switch (record.attendanceStatus) {
                    case 'Present':
                      cellClass =
                        'bg-emerald-50/90 border-emerald-300 text-emerald-900 font-semibold';
                      statusText = 'Present';
                      break;
                    case 'Half Day':
                      cellClass = 'bg-amber-50/90 border-amber-300 text-amber-900 font-semibold';
                      statusText = 'Half Day';
                      break;
                    case 'Absent':
                      cellClass = 'bg-rose-50/90 border-rose-300 text-rose-900 font-semibold';
                      statusText = 'Absent';
                      break;
                    case 'Holiday':
                      cellClass = 'bg-purple-50/90 border-purple-300 text-purple-900 font-medium';
                      statusText = 'Holiday';
                      break;
                    case 'Weekly Off':
                      cellClass = 'bg-blue-50/90 border-blue-200 text-blue-900 font-medium';
                      statusText = 'Weekly Off';
                      break;
                    default:
                      cellClass = 'bg-slate-50 border-slate-200';
                  }
                }

                return (
                  <div
                    key={dateStr}
                    className={`h-16 sm:h-20 p-1.5 rounded-lg border flex flex-col justify-between transition hover:shadow-xs ${cellClass}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs">{day}</span>
                      {record?.lateMark && (
                        <span className="text-[9px] font-bold bg-orange-200 text-orange-900 px-1 rounded-sm">
                          L
                        </span>
                      )}
                    </div>

                    <div className="text-[10px] leading-tight truncate">
                      <div className="font-semibold truncate">{statusText}</div>
                      {record?.workingHours && record.workingHours !== '0h 0m' && (
                        <div className="font-mono text-[9px] text-slate-600">
                          {record.workingHours}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
