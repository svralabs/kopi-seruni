'use client';

import React, { useEffect, useState } from 'react';
import { toast, type ToastItem } from '@/lib/toast';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export default function ToastContainer() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    return toast.subscribe((newToast) => {
      setToasts((prev) => [...prev, newToast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newToast.id));
      }, 4000);
    });
  }, []);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((t) => {
        let bg = 'bg-[#2E2520] text-white border-[#453932]';
        let icon = <CheckCircle2 className="w-4 h-4 text-[#A8D5BA]" />;

        if (t.type === 'error') {
          bg = 'bg-[#964B3B] text-white border-[#803E30]';
          icon = <AlertCircle className="w-4 h-4 text-white" />;
        } else if (t.type === 'warning') {
          bg = 'bg-[#96631E] text-white border-[#7D5217]';
          icon = <AlertTriangle className="w-4 h-4 text-white" />;
        } else if (t.type === 'info') {
          bg = 'bg-[#2E2520] text-white border-[#453932]';
          icon = <Info className="w-4 h-4 text-white" />;
        }

        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-2xl shadow-xl border text-xs leading-relaxed animate-in slide-in-from-bottom-3 duration-200 ${bg}`}
          >
            <div className="mt-0.5 shrink-0">{icon}</div>
            <div className="flex-1 font-medium">{t.message}</div>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== t.id))}
              className="opacity-70 hover:opacity-100 transition-opacity p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
