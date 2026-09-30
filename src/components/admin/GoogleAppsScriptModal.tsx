import React from 'react';
import { Check, Copy, Download, ExternalLink, FileCode, X } from 'lucide-react';
import { GOOGLE_APPS_SCRIPT_CODE } from '../../../server/googleAppsScriptTemplate';

interface GoogleAppsScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GoogleAppsScriptModal: React.FC<GoogleAppsScriptModalProps> = ({ isOpen, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(GOOGLE_APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleDownload = () => {
    const blob = new Blob([GOOGLE_APPS_SCRIPT_CODE], { type: 'text/javascript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Code.gs';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <FileCode className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="font-bold text-base">Google Apps Script Connector (Code.gs)</h3>
              <p className="text-[11px] text-slate-300">
                Paste into your Google Spreadsheet (Extensions &gt; Apps Script)
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Instructions banner */}
        <div className="p-4 bg-emerald-50 border-b border-emerald-100 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <p className="font-bold">Quick 3-Step Setup:</p>
            <ol className="list-decimal list-inside space-y-0.5 text-emerald-900">
              <li>Open Google Sheets &gt; <strong>Extensions</strong> &gt; <strong>Apps Script</strong>.</li>
              <li>Replace <code>Code.gs</code> with this script &amp; click <strong>Deploy as Web App</strong>.</li>
              <li>Set <em>"Who has access: Anyone"</em>, copy the URL and paste in Settings.</li>
            </ol>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg flex items-center gap-1.5 transition text-xs shadow-xs"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Script!' : 'Copy Code.gs'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded-lg flex items-center gap-1.5 transition text-xs shadow-xs"
            >
              <Download className="w-4 h-4" />
              <span>Download File</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="p-4 flex-1 overflow-y-auto bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed select-all">
          <pre>{GOOGLE_APPS_SCRIPT_CODE}</pre>
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-slate-100 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
