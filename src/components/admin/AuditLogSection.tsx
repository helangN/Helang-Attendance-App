import React, { useEffect, useState } from 'react';
import { Calendar, Clock, Download, RefreshCw, ScrollText, Search, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AuditLogEntry } from '../../types';

export const AuditLogSection: React.FC = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchAuditLogs = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch('/api/admin/audit-logs', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setLogs(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [token]);

  const filteredLogs = logs.filter((log) => {
    const q = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.user.toLowerCase().includes(q) ||
      log.date.includes(q) ||
      (log.newValue && log.newValue.toLowerCase().includes(q))
    );
  });

  const exportAuditCSV = () => {
    const headers = ['Log ID', 'User', 'Action', 'Date', 'Time', 'Old Value', 'New Value'];
    const rows = filteredLogs.map((l) => [
      l.logId,
      `"${l.user}"`,
      `"${l.action}"`,
      l.date,
      l.time,
      `"${(l.oldValue || '').replace(/"/g, '""')}"`,
      `"${(l.newValue || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Log_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-24">
      {/* Top Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Security Audit Trail</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all administrative modifications, attendance corrections, and credential
            changes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportAuditCSV}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl border border-slate-200 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={fetchAuditLogs}
            className="p-2 text-slate-500 hover:text-slate-800 rounded-xl hover:bg-slate-100 border border-slate-200"
            title="Refresh Logs"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by action, user, or date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-xs">Loading audit events...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <ScrollText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-semibold text-slate-700">No audit events match your query</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white font-semibold uppercase text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">User</th>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Old Value</th>
                  <th className="py-3 px-4">New Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log.logId} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-slate-900">{log.date}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.time} IST</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{log.user}</td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-md font-semibold text-[11px] bg-slate-100 text-slate-800 border border-slate-200">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 max-w-[200px] truncate">
                      {log.oldValue || '-'}
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-900 max-w-[260px] truncate font-medium">
                      {log.newValue || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
