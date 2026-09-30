import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) return null;

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`inline-flex items-center gap-1.5 font-medium transition rounded-lg shadow-sm ${
          compact
            ? 'px-2.5 py-1.5 text-xs bg-blue-600 text-white hover:bg-blue-700'
            : 'px-3.5 py-2 text-sm bg-blue-600 text-white hover:bg-blue-700'
        }`}
        title="Install AttendFlow on your Android phone or PC"
      >
        <Smartphone className="w-4 h-4" />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition border border-slate-300"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Install iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-xl bg-white p-5 shadow-2xl text-slate-900 border border-slate-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="font-semibold text-base flex items-center gap-2">
                  <Smartphone className="w-5 h-5 text-blue-600" />
                  Install AttendFlow on iOS
                </h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="mt-3 space-y-2 text-sm text-slate-600">
                <p>1. Tap the <strong className="text-slate-900">Share</strong> icon at the bottom of Safari.</p>
                <p>2. Scroll down and tap <strong className="text-slate-900">Add to Home Screen</strong>.</p>
                <p>3. Tap <strong className="text-slate-900">Add</strong> to install AttendFlow as a standalone app.</p>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Got It
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
