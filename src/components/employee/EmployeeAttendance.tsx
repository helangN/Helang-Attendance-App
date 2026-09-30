import React, { useEffect, useState } from 'react';
import { Calendar, Download, Filter, RefreshCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord } from '../../types';
import { EarlyOutBadge, LateBadge, StatusBadge } from '../common/Badge';

export const EmployeeAttendance: React.FC<{ initialFilter?: string }> = ({ initialFilter }) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);

  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>(initialFilter || 'ALL');

  const fetchAttendance = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(
        `/api/employee/attendance?month=${selectedMonth}&year=${selectedYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
      }
    } catch (err) {
      console.error('Failed to fetch attendance:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [token, selectedMonth, selectedYear]);

  // Filter records based on selected statusFilter
  const filteredRecords = records.filter((r) => {
    if (statusFilter === 'ALL') return true;
    if (statusFilter === 'Late') return r.lateMark;
    return r.attendanceStatus === statusFilter;
  });

  const getDayName = (dateStr: string) => {
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d);
  };

  const exportCSV = () => {
    const headers = [
      'Date',
      'Day',
      'IN Time',
      'OUT Time',
      'Working Hours',
      'Status',
      'Late',
      'Early Out',
      'Location',
      'Remarks',
    ];
    const rows = filteredRecords.map((r) => [
      r.date,
      getDayName(r.date),
      r.inTime || '-',
      r.outTime || '-',
      r.workingHours || '0h 0m',
      r.attendanceStatus,
      r.lateMark ? 'Yes' : 'No',
      r.earlyOut ? 'Yes' : 'No',
      `"${r.locationStatus || '-'}"`,
      `"${r.remarks || '-'}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `My_Attendance_${selectedYear}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto pb-24">
      {/* Header & Controls */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              My Attendance
            </h2>
            <p className="text-xs text-slate-500">
              Only your verified attendance logs are visible here.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={exportCSV}
              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg flex items-center gap-1.5 border border-slate-200 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
            <button
              onClick={fetchAttendance}
              className="p-1.5 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 border border-slate-200"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 border-t border-slate-100 text-xs">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Month
            </label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Year
            </label>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-medium text-slate-800"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <div className="col-span-2 sm:col-span-2">
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Filter By Status
            </label>
            <div className="flex flex-wrap gap-1">
              {['ALL', 'Present', 'Absent', 'Half Day', 'Late', 'Holiday', 'Weekly Off'].map(
                (status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-2.5 py-1 text-[11px] rounded-lg font-medium transition ${
                      statusFilter === status
                        ? 'bg-blue-600 text-white font-bold'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading attendance records...</p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-600">No attendance records found</p>
            <p className="text-xs mt-1">Try changing the month, year or status filter.</p>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Day</th>
                    <th className="py-3 px-3">IN Time</th>
                    <th className="py-3 px-3">OUT Time</th>
                    <th className="py-3 px-3">Hours</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-3">Flags</th>
                    <th className="py-3 px-4">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredRecords.map((r) => (
                    <tr key={r.attendanceId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.date}</td>
                      <td className="py-3 px-3 text-slate-500 font-medium">
                        {getDayName(r.date)}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-900">
                        {r.inTime || '-'}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-900">
                        {r.outTime || (r.inTime ? 'Pending' : '-')}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {r.workingHours || '0h 0m'}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge status={r.attendanceStatus} size="sm" />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <LateBadge isLate={r.lateMark} />
                          <EarlyOutBadge isEarly={r.earlyOut} />
                          {!r.lateMark && !r.earlyOut && <span className="text-slate-400">-</span>}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-500 max-w-[180px] truncate">
                        {r.locationStatus || r.remarks || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-slate-100">
              {filteredRecords.map((r) => (
                <div key={r.attendanceId} className="p-4 space-y-2 hover:bg-slate-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 font-mono">{r.date}</span>
                      <span className="text-xs text-slate-500">({getDayName(r.date)})</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <StatusBadge status={r.attendanceStatus} size="sm" />
                      <LateBadge isLate={r.lateMark} />
                      <EarlyOutBadge isEarly={r.earlyOut} />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">IN Time</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {r.inTime || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">OUT Time</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {r.outTime || (r.inTime ? 'Pending' : '-')}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Working Hrs</span>
                      <span className="font-mono font-bold text-slate-900">
                        {r.workingHours || '0h 0m'}
                      </span>
                    </div>
                  </div>

                  {r.locationStatus && r.locationStatus !== '-' && (
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <span className="font-medium text-slate-700">Location:</span>{' '}
                      {r.locationStatus}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
