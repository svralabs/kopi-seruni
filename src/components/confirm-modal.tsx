'use client';

import React from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Info, X } from 'lucide-react';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  description: string | React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success';
  onConfirm: () => void | Promise<void>;
  onClose: () => void;
  isPending?: boolean;
  itemDetails?: { label: string; value: string | React.ReactNode }[];
}

export default function ConfirmModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Konfirmasi',
  cancelLabel = 'Batal',
  variant = 'danger',
  onConfirm,
  onClose,
  isPending = false,
  itemDetails,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'danger':
        return {
          iconBg: 'bg-[#FBEBE8]',
          iconBorder: 'border-[#F5C7BE]',
          iconColor: 'text-[#964B3B]',
          btnBg: 'bg-[#964B3B] hover:bg-[#803E30]',
          icon: <Trash2 className="w-6 h-6" />,
        };
      case 'warning':
        return {
          iconBg: 'bg-[#FDF4E5]',
          iconBorder: 'border-[#F2E0C4]',
          iconColor: 'text-[#96631E]',
          btnBg: 'bg-[#96631E] hover:bg-[#7D5217]',
          icon: <AlertTriangle className="w-6 h-6" />,
        };
      case 'success':
        return {
          iconBg: 'bg-[#EBF6EE]',
          iconBorder: 'border-[#D1EBD8]',
          iconColor: 'text-[#2D7A47]',
          btnBg: 'bg-[#2D7A47] hover:bg-[#236339]',
          icon: <CheckCircle2 className="w-6 h-6" />,
        };
      default:
        return {
          iconBg: 'bg-[#F4EFEA]',
          iconBorder: 'border-[#E5DDD3]',
          iconColor: 'text-[#2E2520]',
          btnBg: 'bg-[#2E2520] hover:bg-[#453932]',
          icon: <Info className="w-6 h-6" />,
        };
    }
  };

  const style = getVariantStyles();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl border border-[#EBE7DF] p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="p-1 rounded-xl text-[#9E968B] hover:text-[#201C1A] hover:bg-[#FAF8F5] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className={`w-12 h-12 rounded-2xl ${style.iconBg} ${style.iconColor} border ${style.iconBorder} flex items-center justify-center mx-auto -mt-6`}>
          {style.icon}
        </div>

        <div className="text-center space-y-1.5">
          <h3 className="font-bold text-base text-[#201C1A]">{title}</h3>
          <div className="text-xs text-[#8E867C] leading-relaxed">{description}</div>
        </div>

        {itemDetails && itemDetails.length > 0 && (
          <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] text-xs space-y-1.5">
            {itemDetails.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-[11px]">
                <span className="text-[#8E867C]">{item.label}</span>
                <span className="font-bold text-[#201C1A] text-right">{item.value}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="flex-1 py-2.5 bg-[#F2ECE3] hover:bg-[#E8E0D4] text-[#4A4238] font-bold rounded-2xl text-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={async () => {
              await onConfirm();
            }}
            className={`flex-1 py-2.5 ${style.btnBg} text-white font-bold rounded-2xl text-xs transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5`}
          >
            {isPending ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Memproses...</span>
              </>
            ) : (
              <span>{confirmLabel}</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
