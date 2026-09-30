import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Filter,
  Layers,
  MapPin,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AttendanceStatus } from '../../types';
import { EarlyOutBadge, LateBadge, StatusBadge } from '../common/Badge';

interface AdminDashboardProps {
  onNavigateTab: (tab: string, filterParam?: any) => void;
  onOpenCorrectionModal: (recordId: string) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  onOpenCorrectionModal,
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDashboard = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to load admin dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const kpi = data?.kpi || {
    totalEmployees: 0,
    activeEmployees: 0,
    inactiveEmployees: 0,
    todayPresent: 0,
    todayAbsent: 0,
    todayHalfDay: 0,
    todayLate: 0,
    missingOut: 0,
  };

  const roster = (data?.roster || []).filter((emp: any) => {
    // KPI filter
    let matchesStatus = true;
    if (activeFilter === 'Present') matchesStatus = emp.status === 'Present';
    else if (activeFilter === 'Absent') matchesStatus = emp.status === 'Absent';
    else if (activeFilter === 'Half Day') matchesStatus = emp.status === 'Half Day';
    else if (activeFilter === 'Late') matchesStatus = emp.late === true;
    else if (activeFilter === 'Missing OUT') matchesStatus = emp.inTime !== '-' && emp.outTime === '-';

    // Search query
    let matchesSearch = true;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      matchesSearch =
        emp.name.toLowerCase().includes(q) ||
        emp.employeeId.toLowerCase().includes(q) ||
        emp.department.toLowerCase().includes(q);
    }

    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
            Real-Time Operations Console
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mt-1.5 tracking-tight">
            Admin Attendance Dashboard
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Today's Date: <strong className="text-slate-800">{data?.today || 'Today'}</strong> • Server
            Time: <strong className="text-slate-800 font-mono">{data?.serverTime || '--:--'}</strong> (Asia/Kolkata)
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onNavigateTab('REPORTS')}
            className="px-3.5 py-2 text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl border border-blue-200 transition"
          >
            Full Reports
          </button>
          <button
            onClick={fetchDashboard}
            className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-100 border border-slate-200"
            title="Refresh Live Dashboard"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* TOP KPI CARDS (ALL CLICKABLE TO DRILL DOWN) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Employees */}
        <button
          type="button"
          onClick={() => {
            setActiveFilter('ALL');
            onNavigateTab('EMPLOYEES');
          }}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md transition text-left cursor-pointer group"
        >
          <span className="text-[11px] font-semibold uppercase text-slate-500 block truncate">
            Total Staff
          </span>
          <p className="text-2xl font-bold text-slate-900 mt-1 group-hover:text-blue-600">
            {kpi.totalEmployees}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">All registered</span>
        </button>

        {/* Active Employees */}
        <button
          type="button"
          onClick={() => {
            setActiveFilter('ALL');
            onNavigateTab('EMPLOYEES');
          }}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md transition text-left cursor-pointer group"
        >
          <span className="text-[11px] font-semibold uppercase text-emerald-600 block truncate">
            Active
          </span>
          <p className="text-2xl font-bold text-emerald-700 mt-1 group-hover:text-emerald-800">
            {kpi.activeEmployees}
          </p>
          <span className="text-[10px] text-slate-400 mt-1 block">Can mark IN</span>
        </button>

        {/* Inactive Employees */}
        <button
          type="button"
          onClick={() => {
            setActiveFilter('ALL');
            onNavigateTab('EMPLOYEES');
          }}
          className="bg-white p-3.5 rounded-xl border border-slate-200 hover:border-slate-400 hover:shadow-md transition text-left cursor-pointer group"
        >
          <span className="text-[11px] font-semibold uppercase text-slate-400 block truncate">
            Inactive
          </span>
          <p className="text-2xl font-bold text-slate-500 mt-1">{kpi.inactiveEmployees}</p>
          <span className="text-[10px] text-slate-400 mt-1 block">Deactivated</span>
        </button>

        {/* Today's Present */}
        <button
          type="button"
          onClick={() => setActiveFilter(activeFilter === 'Present' ? 'ALL' : 'Present')}
          className={`p-3.5 rounded-xl border transition text-left cursor-pointer group ${
            activeFilter === 'Present'
              ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/40'
              : 'bg-white border-slate-200 hover:border-emerald-300'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase text-emerald-700 block truncate">
            Today Present
          </span>
          <p className="text-2xl font-bold text-emerald-800 mt-1">{kpi.todayPresent}</p>
          <span className="text-[10px] text-emerald-600 font-medium mt-1 block">
            {activeFilter === 'Present' ? '● Filtering active' : 'Click to filter'}
          </span>
        </button>

        {/* Today's Absent */}
        <button
          type="button"
          onClick={() => setActiveFilter(activeFilter === 'Absent' ? 'ALL' : 'Absent')}
          className={`p-3.5 rounded-xl border transition text-left cursor-pointer group ${
            activeFilter === 'Absent'
              ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-400/40'
              : 'bg-white border-slate-200 hover:border-rose-300'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase text-rose-700 block truncate">
            Today Absent
          </span>
          <p className="text-2xl font-bold text-rose-800 mt-1">{kpi.todayAbsent}</p>
          <span className="text-[10px] text-rose-600 font-medium mt-1 block">
            {activeFilter === 'Absent' ? '● Filtering active' : 'Click to filter'}
          </span>
        </button>

        {/* Today's Half Day */}
        <button
          type="button"
          onClick={() => setActiveFilter(activeFilter === 'Half Day' ? 'ALL' : 'Half Day')}
          className={`p-3.5 rounded-xl border transition text-left cursor-pointer group ${
            activeFilter === 'Half Day'
              ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-400/40'
              : 'bg-white border-slate-200 hover:border-amber-300'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase text-amber-700 block truncate">
            Half Day
          </span>
          <p className="text-2xl font-bold text-amber-800 mt-1">{kpi.todayHalfDay}</p>
          <span className="text-[10px] text-amber-600 font-medium mt-1 block">
            {activeFilter === 'Half Day' ? '● Filtering active' : 'Click to filter'}
          </span>
        </button>

        {/* Today's Late */}
        <button
          type="button"
          onClick={() => setActiveFilter(activeFilter === 'Late' ? 'ALL' : 'Late')}
          className={`p-3.5 rounded-xl border transition text-left cursor-pointer group ${
            activeFilter === 'Late'
              ? 'bg-orange-50 border-orange-400 ring-2 ring-orange-400/40'
              : 'bg-white border-slate-200 hover:border-orange-300'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase text-orange-700 block truncate">
            Today Late
          </span>
          <p className="text-2xl font-bold text-orange-800 mt-1">{kpi.todayLate}</p>
          <span className="text-[10px] text-orange-600 font-medium mt-1 block">
            {activeFilter === 'Late' ? '● Filtering active' : 'Click to filter'}
          </span>
        </button>

        {/* Missing OUT */}
        <button
          type="button"
          onClick={() => setActiveFilter(activeFilter === 'Missing OUT' ? 'ALL' : 'Missing OUT')}
          className={`p-3.5 rounded-xl border transition text-left cursor-pointer group ${
            activeFilter === 'Missing OUT'
              ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-400/40'
              : 'bg-white border-slate-200 hover:border-purple-300'
          }`}
        >
          <span className="text-[11px] font-semibold uppercase text-purple-700 block truncate">
            Missing OUT
          </span>
          <p className="text-2xl font-bold text-purple-800 mt-1">{kpi.missingOut}</p>
          <span className="text-[10px] text-purple-600 font-medium mt-1 block">
            {activeFilter === 'Missing OUT' ? '● Filtering active' : 'Click to filter'}
          </span>
        </button>
      </div>

      {/* TODAY'S LIVE ATTENDANCE ROSTER */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-base text-slate-900">
              Today's Live Employee Roster ({roster.length})
            </h3>
            {activeFilter !== 'ALL' && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Filtered: {activeFilter}
                <button
                  onClick={() => setActiveFilter('ALL')}
                  className="hover:text-blue-950 font-bold ml-1"
                >
                  ✕
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search staff, ID, department..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-64"
              />
            </div>
            {activeFilter !== 'ALL' && (
              <button
                onClick={() => setActiveFilter('ALL')}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Name</th>
                <th className="py-3 px-3">Department</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">IN Time</th>
                <th className="py-3 px-3">OUT Time</th>
                <th className="py-3 px-3">Hours</th>
                <th className="py-3 px-3">Flags</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {roster.map((emp: any) => (
                <tr key={emp.employeeId} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{emp.employeeId}</td>
                  <td className="py-3 px-4 font-medium text-slate-900">{emp.name}</td>
                  <td className="py-3 px-3 text-slate-500">{emp.department}</td>
                  <td className="py-3 px-3">
                    <StatusBadge status={emp.status} size="sm" />
                  </td>
                  <td className="py-3 px-3 font-mono font-medium text-slate-800">{emp.inTime}</td>
                  <td className="py-3 px-3 font-mono font-medium text-slate-800">{emp.outTime}</td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-900">{emp.hours}</td>
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-1">
                      <LateBadge isLate={emp.late} />
                      <EarlyOutBadge isEarly={emp.early} />
                      {!emp.late && !emp.early && <span className="text-slate-400">-</span>}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-[11px] text-slate-500 max-w-[160px] truncate">
                    {emp.location}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        if (emp.recordId) {
                          onOpenCorrectionModal(emp.recordId);
                        } else {
                          onNavigateTab('ATTENDANCE', { employeeId: emp.employeeId });
                        }
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-700 rounded-md border border-slate-200 transition"
                    >
                      {emp.recordId ? 'Correct' : 'History'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
