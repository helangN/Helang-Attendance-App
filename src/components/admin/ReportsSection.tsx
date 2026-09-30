import React, { useEffect, useState } from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileSpreadsheet,
  Filter,
  Printer,
  RefreshCw,
  Search,
  User,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Employee, EmployeeMonthlyStats } from '../../types';
import { EarlyOutBadge, LateBadge, StatusBadge } from '../common/Badge';

export const ReportsSection: React.FC = () => {
  const { token } = useAuth();
  const [activeReportTab, setActiveReportTab] = useState<'DAY' | 'MONTH' | 'EMPLOYEE'>('DAY');
  const [employees, setEmployees] = useState<Employee[]>([]);

  // DAY-WISE STATE
  const [dayDate, setDayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [dayReportData, setDayReportData] = useState<any>(null);
  const [dayLoading, setDayLoading] = useState(false);

  // MONTH-WISE STATE
  const now = new Date();
  const [monthNumber, setMonthNumber] = useState<number>(now.getMonth() + 1);
  const [monthYear, setMonthYear] = useState<number>(now.getFullYear());
  const [monthReportData, setMonthReportData] = useState<any>(null);
  const [monthLoading, setMonthLoading] = useState(false);

  // EMPLOYEE-WISE STATE
  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [empReportMonth, setEmpReportMonth] = useState<number>(now.getMonth() + 1);
  const [empReportYear, setEmpReportYear] = useState<number>(now.getFullYear());
  const [empReportData, setEmpReportData] = useState<any>(null);
  const [empLoading, setEmpLoading] = useState(false);

  // Fetch employees list
  useEffect(() => {
    if (!token) return;
    fetch('/api/admin/employees', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setEmployees(data);
          if (data.length > 0 && !selectedEmpId) {
            setSelectedEmpId(data[0].employeeId);
          }
        }
      })
      .catch(console.error);
  }, [token]);

  // Fetch Day-wise Report
  const fetchDayReport = async () => {
    if (!token) return;
    setDayLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/day-wise?date=${dayDate}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setDayReportData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDayLoading(false);
    }
  };

  // Fetch Month-wise Report
  const fetchMonthReport = async () => {
    if (!token) return;
    setMonthLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reports/month-wise?month=${monthNumber}&year=${monthYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setMonthReportData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMonthLoading(false);
    }
  };

  // Fetch Employee-wise Report
  const fetchEmpReport = async () => {
    if (!token || !selectedEmpId) return;
    setEmpLoading(true);
    try {
      const res = await fetch(
        `/api/admin/reports/employee-wise?employeeId=${selectedEmpId}&month=${empReportMonth}&year=${empReportYear}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.ok) {
        setEmpReportData(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEmpLoading(false);
    }
  };

  useEffect(() => {
    if (activeReportTab === 'DAY') fetchDayReport();
    else if (activeReportTab === 'MONTH') fetchMonthReport();
    else if (activeReportTab === 'EMPLOYEE' && selectedEmpId) fetchEmpReport();
  }, [
    token,
    activeReportTab,
    dayDate,
    monthNumber,
    monthYear,
    selectedEmpId,
    empReportMonth,
    empReportYear,
  ]);

  // CSV Exporters
  const exportDayCSV = () => {
    if (!dayReportData) return;
    const headers = [
      'Emp ID',
      'Name',
      'Department',
      'Designation',
      'IN Time',
      'OUT Time',
      'Hours',
      'Status',
      'Late',
      'Early Out',
      'Remarks',
    ];
    const rows = dayReportData.employeeRows.map((r: any) => [
      r.employeeId,
      `"${r.name}"`,
      r.department,
      `"${r.designation}"`,
      r.inTime,
      r.outTime,
      r.workingHours,
      r.status,
      r.lateMark ? 'Yes' : 'No',
      r.earlyOut ? 'Yes' : 'No',
      `"${r.remarks || '-'}"`,
    ]);

    downloadCSV(
      [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n'),
      `Day_Report_${dayDate}.csv`
    );
  };

  const exportMonthCSV = () => {
    if (!monthReportData) return;
    const headers = [
      'Employee ID',
      'Employee Name',
      'Working Days',
      'Present',
      'Absent',
      'Half Day',
      'Late',
      'Early Out',
      'Total Hours',
      'Average Hours',
    ];
    const rows = monthReportData.employees.map((r: EmployeeMonthlyStats) => [
      r.employeeId,
      `"${r.employeeName}"`,
      r.workingDays,
      r.present,
      r.absent,
      r.halfDay,
      r.late,
      r.earlyOut,
      r.totalWorkingHours,
      r.averageWorkingHours,
    ]);

    downloadCSV(
      [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n'),
      `Month_Report_${monthYear}_${monthNumber}.csv`
    );
  };

  const exportEmpCSV = () => {
    if (!empReportData) return;
    const headers = [
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
    const rows = empReportData.dailyRecords.map((r: any) => [
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

    downloadCSV(
      [headers.join(','), ...rows.map((e: any) => e.join(','))].join('\n'),
      `Employee_Report_${selectedEmpId}_${empReportYear}_${empReportMonth}.csv`
    );
  };

  const downloadCSV = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5 pb-24 print:p-0 print:m-0">
      {/* Tab Switcher */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
          <button
            onClick={() => setActiveReportTab('DAY')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeReportTab === 'DAY' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Day-Wise Report
          </button>
          <button
            onClick={() => setActiveReportTab('MONTH')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeReportTab === 'MONTH' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Month-Wise Report
          </button>
          <button
            onClick={() => setActiveReportTab('EMPLOYEE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeReportTab === 'EMPLOYEE' ? 'bg-white text-blue-700 shadow-sm' : 'text-slate-600'
            }`}
          >
            Employee-Wise Report
          </button>
        </div>

        <button
          onClick={() => window.print()}
          className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 flex items-center gap-1.5 transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / PDF View</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 1. DAY-WISE REPORT */}
      {/* ========================================================================= */}
      {activeReportTab === 'DAY' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-slate-600 uppercase text-[11px]">
                Select Date:
              </label>
              <input
                type="date"
                value={dayDate}
                onChange={(e) => setDayDate(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 font-bold"
              />
              <button
                onClick={fetchDayReport}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 border border-slate-200"
              >
                <RefreshCw className={`w-4 h-4 ${dayLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={exportDayCSV}
              className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT DAY REPORT</span>
            </button>
          </div>

          {/* Day Summary Badges */}
          {dayReportData?.summary && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Staff</span>
                <p className="text-2xl font-bold text-slate-900 mt-1">
                  {dayReportData.summary.totalEmployees}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-emerald-600 uppercase">Present</span>
                <p className="text-2xl font-bold text-emerald-700 mt-1">
                  {dayReportData.summary.present}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-rose-600 uppercase">Absent</span>
                <p className="text-2xl font-bold text-rose-700 mt-1">
                  {dayReportData.summary.absent}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-amber-600 uppercase">Half Day</span>
                <p className="text-2xl font-bold text-amber-700 mt-1">
                  {dayReportData.summary.halfDay}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-orange-600 uppercase">Late</span>
                <p className="text-2xl font-bold text-orange-700 mt-1">
                  {dayReportData.summary.late}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-purple-600 uppercase">Early Out</span>
                <p className="text-2xl font-bold text-purple-700 mt-1">
                  {dayReportData.summary.earlyOut}
                </p>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[11px] font-semibold text-indigo-600 uppercase">Missing OUT</span>
                <p className="text-2xl font-bold text-indigo-700 mt-1">
                  {dayReportData.summary.missingOut}
                </p>
              </div>
            </div>
          )}

          {/* Day Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Emp ID</th>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-3">Department</th>
                    <th className="py-3 px-3">IN Time</th>
                    <th className="py-3 px-3">OUT Time</th>
                    <th className="py-3 px-3">Working Hours</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Flags</th>
                    <th className="py-3 px-4">Remarks / Geofence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {dayReportData?.employeeRows?.map((r: any) => (
                    <tr key={r.employeeId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.employeeId}</td>
                      <td className="py-3 px-4 font-semibold text-slate-900">{r.name}</td>
                      <td className="py-3 px-3 text-slate-500">{r.department}</td>
                      <td className="py-3 px-3 font-mono text-slate-800">{r.inTime}</td>
                      <td className="py-3 px-3 font-mono text-slate-800">{r.outTime}</td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-900">
                        {r.workingHours}
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-1">
                          <LateBadge isLate={r.lateMark} />
                          <EarlyOutBadge isEarly={r.earlyOut} />
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[200px] truncate">
                        {r.locationStatus !== '-' ? r.locationStatus : r.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. MONTH-WISE REPORT */}
      {/* ========================================================================= */}
      {activeReportTab === 'MONTH' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
            <div className="flex items-center gap-3">
              <label className="font-semibold text-slate-600 uppercase text-[11px]">Month:</label>
              <select
                value={monthNumber}
                onChange={(e) => setMonthNumber(Number(e.target.value))}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                  </option>
                ))}
              </select>

              <label className="font-semibold text-slate-600 uppercase text-[11px]">Year:</label>
              <select
                value={monthYear}
                onChange={(e) => setMonthYear(Number(e.target.value))}
                className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>

              <button
                onClick={fetchMonthReport}
                className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 border border-slate-200"
              >
                <RefreshCw className={`w-4 h-4 ${monthLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            <button
              onClick={exportMonthCSV}
              className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT MONTH REPORT</span>
            </button>
          </div>

          {/* Month Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Employee</th>
                    <th className="py-3 px-3">Working Days</th>
                    <th className="py-3 px-3">Present</th>
                    <th className="py-3 px-3">Absent</th>
                    <th className="py-3 px-3">Half Day</th>
                    <th className="py-3 px-3">Late Mark</th>
                    <th className="py-3 px-3">Early Out</th>
                    <th className="py-3 px-3 font-mono">Total Hours</th>
                    <th className="py-3 px-3 font-mono">Average / Day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {monthReportData?.employees?.map((emp: EmployeeMonthlyStats) => (
                    <tr key={emp.employeeId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{emp.employeeName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{emp.employeeId}</div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-700">{emp.workingDays}</td>
                      <td className="py-3 px-3 font-bold text-emerald-700">{emp.present}</td>
                      <td className="py-3 px-3 font-bold text-rose-700">{emp.absent}</td>
                      <td className="py-3 px-3 font-bold text-amber-700">{emp.halfDay}</td>
                      <td className="py-3 px-3 font-medium text-orange-700">{emp.late}</td>
                      <td className="py-3 px-3 font-medium text-purple-700">{emp.earlyOut}</td>
                      <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                        {emp.totalWorkingHours}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-700">
                        {emp.averageWorkingHours}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {monthReportData?.totals && (
                  <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300">
                    <tr>
                      <td className="py-3 px-4">Company Totals</td>
                      <td className="py-3 px-3">-</td>
                      <td className="py-3 px-3 text-emerald-700">
                        {monthReportData.totals.totalPresent}
                      </td>
                      <td className="py-3 px-3 text-rose-700">
                        {monthReportData.totals.totalAbsent}
                      </td>
                      <td className="py-3 px-3 text-amber-700">
                        {monthReportData.totals.totalHalfDay}
                      </td>
                      <td className="py-3 px-3 text-orange-700">
                        {monthReportData.totals.totalLate}
                      </td>
                      <td className="py-3 px-3 text-purple-700">
                        {monthReportData.totals.totalEarlyOut}
                      </td>
                      <td className="py-3 px-3 font-mono text-indigo-700">
                        {monthReportData.totals.totalWorkingHours}
                      </td>
                      <td className="py-3 px-3">-</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EMPLOYEE-WISE REPORT */}
      {/* ========================================================================= */}
      {activeReportTab === 'EMPLOYEE' && (
        <div className="space-y-4">
          {/* Controls */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Employee
                </label>
                <select
                  value={selectedEmpId}
                  onChange={(e) => setSelectedEmpId(e.target.value)}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-semibold"
                >
                  {employees.map((emp) => (
                    <option key={emp.employeeId} value={emp.employeeId}>
                      {emp.name} ({emp.employeeId})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Month
                </label>
                <select
                  value={empReportMonth}
                  onChange={(e) => setEmpReportMonth(Number(e.target.value))}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-500 uppercase mb-1">
                  Year
                </label>
                <select
                  value={empReportYear}
                  onChange={(e) => setEmpReportYear(Number(e.target.value))}
                  className="p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                >
                  <option value={2025}>2025</option>
                  <option value={2026}>2026</option>
                  <option value={2027}>2027</option>
                </select>
              </div>

              <div className="pt-4">
                <button
                  onClick={fetchEmpReport}
                  className="p-2 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-slate-100 border border-slate-200"
                >
                  <RefreshCw className={`w-4 h-4 ${empLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            <button
              onClick={exportEmpCSV}
              className="px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-sm flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>EXPORT EMPLOYEE LOG</span>
            </button>
          </div>

          {/* Employee Summary Card */}
          {empReportData?.stats && (
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex flex-wrap items-center justify-between pb-4 border-b border-slate-100 gap-2">
                <div>
                  <h3 className="font-bold text-base text-slate-900">
                    {empReportData.employee.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    ID: {empReportData.employee.employeeId} • Dept:{' '}
                    {empReportData.employee.department} • {empReportData.employee.designation}
                  </p>
                </div>
                <div className="text-xs text-right">
                  <span className="font-semibold text-slate-700">Period:</span>{' '}
                  <span className="font-bold text-blue-700">
                    {new Date(empReportYear, empReportMonth - 1).toLocaleString('default', {
                      month: 'long',
                    })}{' '}
                    {empReportYear}
                  </span>
                </div>
              </div>

              {/* Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-4 text-center">
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Working Days
                  </span>
                  <span className="text-lg font-bold text-slate-800">
                    {empReportData.stats.workingDays}
                  </span>
                </div>
                <div className="bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
                  <span className="text-[10px] text-emerald-700 uppercase block font-semibold">
                    Present
                  </span>
                  <span className="text-lg font-bold text-emerald-800">
                    {empReportData.stats.present}
                  </span>
                </div>
                <div className="bg-rose-50 p-2.5 rounded-lg border border-rose-100">
                  <span className="text-[10px] text-rose-700 uppercase block font-semibold">
                    Absent
                  </span>
                  <span className="text-lg font-bold text-rose-800">
                    {empReportData.stats.absent}
                  </span>
                </div>
                <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                  <span className="text-[10px] text-amber-700 uppercase block font-semibold">
                    Half Day
                  </span>
                  <span className="text-lg font-bold text-amber-800">
                    {empReportData.stats.halfDay}
                  </span>
                </div>
                <div className="bg-orange-50 p-2.5 rounded-lg border border-orange-100">
                  <span className="text-[10px] text-orange-700 uppercase block font-semibold">
                    Late
                  </span>
                  <span className="text-lg font-bold text-orange-800">
                    {empReportData.stats.late}
                  </span>
                </div>
                <div className="bg-purple-50 p-2.5 rounded-lg border border-purple-100">
                  <span className="text-[10px] text-purple-700 uppercase block font-semibold">
                    Early Out
                  </span>
                  <span className="text-lg font-bold text-purple-800">
                    {empReportData.stats.earlyOut}
                  </span>
                </div>
                <div className="bg-indigo-50 p-2.5 rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-indigo-700 uppercase block font-semibold">
                    Total Hours
                  </span>
                  <span className="text-sm font-bold text-indigo-800 font-mono">
                    {empReportData.stats.totalWorkingHours}
                  </span>
                </div>
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                    Avg Hours
                  </span>
                  <span className="text-sm font-bold text-slate-800 font-mono">
                    {empReportData.stats.averageWorkingHours}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Daily Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">IN Time</th>
                    <th className="py-3 px-3">OUT Time</th>
                    <th className="py-3 px-3">Working Hours</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Flags</th>
                    <th className="py-3 px-4">Geofence / Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {empReportData?.dailyRecords?.map((r: any) => (
                    <tr key={r.attendanceId} className="hover:bg-slate-50 transition">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{r.date}</td>
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
                        </div>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[200px] truncate">
                        {r.locationStatus !== '-' ? r.locationStatus : r.remarks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
