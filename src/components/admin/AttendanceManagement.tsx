import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit,
  Filter,
  RefreshCw,
  Search,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceRecord, AttendanceStatus, Employee } from '../../types';
import { EarlyOutBadge, LateBadge, StatusBadge } from '../common/Badge';

interface AttendanceManagementProps {
  initialFilter?: {
    employeeId?: string;
  };
}

export const AttendanceManagement: React.FC<AttendanceManagementProps> = ({ initialFilter }) => {
  const { token } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filterMode, setFilterMode] = useState<'DATE' | 'RANGE' | 'MONTH'>('MONTH');
  const [singleDate, setSingleDate] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState<number>(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>(
    initialFilter?.employeeId || 'ALL'
  );
  const [selectedDepartment, setSelectedDepartment] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [filterLate, setFilterLate] = useState<boolean>(false);
  const [filterEarlyOut, setFilterEarlyOut] = useState<boolean>(false);

  // Correction Modal
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [correctionForm, setCorrectionForm] = useState<{
    inTime: string;
    outTime: string;
    attendanceStatus: AttendanceStatus;
    remarks: string;
  }>({
    inTime: '',
    outTime: '',
    attendanceStatus: 'Present',
    remarks: '',
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchEmployees = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/admin/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEmployees(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAttendance = async () => {
    if (!token) return;
    setLoading(true);
    try {
      let query = '';
      if (filterMode === 'DATE' && singleDate) {
        query += `&date=${singleDate}`;
      } else if (filterMode === 'RANGE' && startDate && endDate) {
        query += `&startDate=${startDate}&endDate=${endDate}`;
      } else if (filterMode === 'MONTH') {
        query += `&month=${selectedMonth}&year=${selectedYear}`;
      }

      if (selectedEmployeeId !== 'ALL') query += `&employeeId=${selectedEmployeeId}`;
      if (selectedDepartment !== 'ALL') query += `&department=${selectedDepartment}`;
      if (selectedStatus !== 'ALL') query += `&status=${selectedStatus}`;
      if (filterLate) query += `&late=true`;
      if (filterEarlyOut) query += `&earlyOut=true`;

      const res = await fetch(`/api/admin/attendance?${query.replace(/^&/, '')}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setRecords(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [token]);

  useEffect(() => {
    fetchAttendance();
  }, [
    token,
    filterMode,
    singleDate,
    startDate,
    endDate,
    selectedMonth,
    selectedYear,
    selectedEmployeeId,
    selectedDepartment,
    selectedStatus,
    filterLate,
    filterEarlyOut,
  ]);

  const handleResetFilters = () => {
    setFilterMode('MONTH');
    setSelectedMonth(now.getMonth() + 1);
    setSelectedYear(now.getFullYear());
    setSingleDate('');
    setStartDate('');
    setEndDate('');
    setSelectedEmployeeId('ALL');
    setSelectedDepartment('ALL');
    setSelectedStatus('ALL');
    setFilterLate(false);
    setFilterEarlyOut(false);
  };

  // Open Correction Modal
  const openCorrection = (record: AttendanceRecord) => {
    setEditingRecord(record);
    setCorrectionForm({
      inTime: record.inTime || '',
      outTime: record.outTime || '',
      attendanceStatus: record.attendanceStatus,
      remarks: record.remarks || 'Admin corrected',
    });
  };

  // Submit Correction
  const handleSaveCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRecord) return;
    setModalSubmitting(true);

    try {
      const res = await fetch(`/api/admin/attendance/${editingRecord.attendanceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(correctionForm),
      });

      if (res.ok) {
        setFeedback(`Attendance updated for ${editingRecord.employeeName}`);
        setEditingRecord(null);
        fetchAttendance();
      }
    } catch (err: any) {
      alert(`Correction failed: ${err.message}`);
    } finally {
      setModalSubmitting(false);
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      'Attendance ID',
      'Employee ID',
      'Employee Name',
      'Date',
      'IN Time',
      'OUT Time',
      'Hours',
      'Status',
      'Late',
      'Early Out',
      'Location',
      'Remarks',
    ];

    const rows = records.map((r) => [
      r.attendanceId,
      r.employeeId,
      `"${r.employeeName.replace(/"/g, '""')}"`,
      r.date,
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
    link.setAttribute('download', `Attendance_Log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const departments = Array.from(new Set(employees.map((e) => e.department).filter(Boolean)));

  return (
    <div className="space-y-5 pb-24">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Attendance Administration
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Review, filter, and manually correct employee attendance records with audit logging.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchAttendance}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 border border-slate-200"
            title="Refresh Attendance"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {feedback && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-xl text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="font-semibold">{feedback}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs font-bold text-emerald-700">
            ✕
          </button>
        </div>
      )}

      {/* FILTER CONTROLS PANEL */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4 text-xs text-slate-700">
        <div className="flex flex-wrap items-center justify-between pb-3 border-b border-slate-100 gap-2">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Filter className="w-4 h-4 text-blue-600" />
            <span>Filter Attendance Records</span>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            <button
              onClick={() => setFilterMode('MONTH')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterMode === 'MONTH' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
              }`}
            >
              By Month
            </button>
            <button
              onClick={() => setFilterMode('DATE')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterMode === 'DATE' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
              }`}
            >
              Single Date
            </button>
            <button
              onClick={() => setFilterMode('RANGE')}
              className={`px-3 py-1 rounded-md font-semibold transition ${
                filterMode === 'RANGE' ? 'bg-white shadow-xs text-blue-600' : 'text-slate-600'
              }`}
            >
              Date Range
            </button>
          </div>
        </div>

        {/* Filter Input Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Timeframe Filter */}
          {filterMode === 'MONTH' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Month
                </label>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
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
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>
            </>
          )}

          {filterMode === 'DATE' && (
            <div className="col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                Specific Date
              </label>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => setSingleDate(e.target.value)}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
              />
            </div>
          )}

          {filterMode === 'RANGE' && (
            <>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
                />
              </div>
            </>
          )}

          {/* Employee Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Employee
            </label>
            <select
              value={selectedEmployeeId}
              onChange={(e) => setSelectedEmployeeId(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">All Staff</option>
              {employees.map((emp) => (
                <option key={emp.employeeId} value={emp.employeeId}>
                  {emp.name} ({emp.employeeId})
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">All Departments</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 uppercase mb-1">
              Status
            </label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Half Day">Half Day</option>
              <option value="Absent">Absent</option>
            </select>
          </div>

          {/* Flags Toggles & Reset */}
          <div className="flex items-center gap-4 pt-4">
            <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={filterLate}
                onChange={(e) => setFilterLate(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
              <span>Late Only</span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer font-semibold text-slate-700">
              <input
                type="checkbox"
                checked={filterEarlyOut}
                onChange={(e) => setFilterEarlyOut(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded-sm"
              />
              <span>Early Out Only</span>
            </label>
          </div>

          <div className="flex items-center justify-end pt-3">
            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-bold underline"
            >
              Reset All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading attendance records...</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <Calendar className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No attendance records found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Employee</th>
                  <th className="py-3 px-3">Date</th>
                  <th className="py-3 px-3">IN Time</th>
                  <th className="py-3 px-3">OUT Time</th>
                  <th className="py-3 px-3">Hours</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3">Flags</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-3 text-right">Correct</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {records.map((r) => (
                  <tr key={r.attendanceId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{r.employeeName}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{r.employeeId}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-medium text-slate-900">{r.date}</td>
                    <td className="py-3 px-3 font-mono text-slate-800">{r.inTime || '-'}</td>
                    <td className="py-3 px-3 font-mono text-slate-800">{r.outTime || '-'}</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">
                      {r.workingHours || '0h 0m'}
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={r.attendanceStatus} size="sm" />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1">
                        <LateBadge isLate={r.lateMark} />
                        <EarlyOutBadge isEarly={r.earlyOut} />
                        {!r.lateMark && !r.earlyOut && <span className="text-slate-400">-</span>}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-[11px] text-slate-500 max-w-[170px] truncate">
                      {r.locationStatus || r.remarks || '-'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => openCorrection(r)}
                        className="px-2.5 py-1 text-[11px] font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-md border border-blue-200 transition"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MANUAL ATTENDANCE CORRECTION MODAL */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-400" />
                Correct Attendance Record
              </h3>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCorrection} className="p-5 space-y-3.5 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1">
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Employee:</span>
                  <span className="font-bold text-slate-900">
                    {editingRecord.employeeName} ({editingRecord.employeeId})
                  </span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-slate-500">Record Date:</span>
                  <span className="font-mono text-slate-900">{editingRecord.date}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold mb-1">IN Time</label>
                  <input
                    type="text"
                    value={correctionForm.inTime}
                    onChange={(e) =>
                      setCorrectionForm({ ...correctionForm, inTime: e.target.value })
                    }
                    placeholder="e.g. 09:30 AM"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">OUT Time</label>
                  <input
                    type="text"
                    value={correctionForm.outTime}
                    onChange={(e) =>
                      setCorrectionForm({ ...correctionForm, outTime: e.target.value })
                    }
                    placeholder="e.g. 06:30 PM"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold mb-1">Attendance Status</label>
                <select
                  value={correctionForm.attendanceStatus}
                  onChange={(e) =>
                    setCorrectionForm({
                      ...correctionForm,
                      attendanceStatus: e.target.value as AttendanceStatus,
                    })
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold text-slate-900"
                >
                  <option value="Present">Present</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Absent">Absent</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Correction Remarks / Reason *</label>
                <textarea
                  required
                  rows={2}
                  value={correctionForm.remarks}
                  onChange={(e) =>
                    setCorrectionForm({ ...correctionForm, remarks: e.target.value })
                  }
                  placeholder="e.g. Biometric misread / manager approved work outside office"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <p className="text-[11px] text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                Notice: All corrections will recalculate hours and be logged in the permanent Audit
                Log.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border border-slate-200 rounded-lg font-semibold text-slate-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg shadow-sm"
                >
                  {modalSubmitting ? 'Saving...' : 'Save Correction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
