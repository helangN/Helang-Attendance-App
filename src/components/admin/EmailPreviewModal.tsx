import React from 'react';
import { Mail, Send, X } from 'lucide-react';

interface EmailPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  emailData: {
    recipient: string;
    scheduledTime: string;
    date: string;
    summary: any;
    htmlPreview: string;
  } | null;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({
  isOpen,
  onClose,
  emailData,
}) => {
  if (!isOpen || !emailData) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Mail className="w-5 h-5 text-indigo-400" />
            <div>
              <h3 className="font-bold text-base">Daily Attendance Email Preview</h3>
              <p className="text-[11px] text-slate-300">
                Scheduled daily at {emailData.scheduledTime} IST to {emailData.recipient}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Email Meta bar */}
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 text-xs text-slate-700 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="font-semibold text-slate-500">To:</span>{' '}
            <strong className="text-slate-900">{emailData.recipient}</strong>
          </div>
          <div>
            <span className="font-semibold text-slate-500">Date:</span>{' '}
            <strong className="text-slate-900">{emailData.date}</strong>
          </div>
          <div className="flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
            <Send className="w-3.5 h-3.5" />
            <span>Ready for Automated Dispatch</span>
          </div>
        </div>

        {/* HTML Preview Iframe */}
        <div className="flex-1 p-4 bg-slate-200 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-md overflow-hidden max-w-xl mx-auto border border-slate-300">
            <iframe
              title="Daily Attendance Email Preview"
              srcDoc={emailData.htmlPreview}
              className="w-full h-[450px] border-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-white border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Audit log entry recorded for this notification test.
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-xs"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
