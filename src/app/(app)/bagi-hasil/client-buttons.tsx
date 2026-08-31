'use client';

import { useState, useTransition } from 'react';
import { generateProfitSharing, markSharePaid, toggleRule, deleteRule } from '@/app/actions/profit-sharing';
import { Zap, Check, Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/confirm-modal';
import { toast } from '@/lib/toast';

export function GeneratePeriodButton({ outletId = 'out_default' }: { outletId?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    const now = Math.floor(Date.now() / 1000);
    const startOfMonth = Math.floor(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000
    );

    startTransition(async () => {
      try {
        await generateProfitSharing(outletId, startOfMonth, now, undefined);
        toast.success('Bagi hasil berhasil dihitung & dicatat ke Buku Besar Ledger!');
      } catch (e: any) {
        toast.error(e?.message || 'Gagal generate bagi hasil');
      }
    });
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isPending}
      className="px-4 py-2 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
    >
      <Zap className="w-3.5 h-3.5" />
      <span>{isPending ? 'Mengalkulasi...' : 'Generate Ledger Periode Ini'}</span>
    </button>
  );
}

export function MarkPaidButton({ id, outletId = 'out_default', name }: { id: string; outletId?: string; name?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirmPay = () => {
    startTransition(async () => {
      try {
        await markSharePaid(id, outletId);
        toast.success(`Dividen ${name ? `untuk "${name}" ` : ''}berhasil ditandai LUNAS`);
        setIsOpen(false);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menandai lunas');
      }
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        className="px-3 py-1 bg-[#EBF6EE] hover:bg-[#DDF0E2] text-[#2D7A47] font-bold rounded-xl text-[11px] transition-colors disabled:opacity-50 inline-flex items-center gap-1 border border-[#D1EBD8] cursor-pointer"
      >
        <Check className="w-3 h-3" />
        <span>{isPending ? '...' : 'Tandai Lunas'}</span>
      </button>

      <ConfirmModal
        isOpen={isOpen}
        title="Tandai Dividen Lunas?"
        description="Pastikan nominal dividen bagi hasil ini telah ditransfer kepada penerima/pemilik."
        confirmLabel="Tandai Lunas"
        cancelLabel="Batal"
        variant="success"
        isPending={isPending}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirmPay}
      />
    </>
  );
}

export function ToggleRuleButton({ id, currentStatus, name }: { id: string; currentStatus: number; name?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await toggleRule(id, currentStatus);
        toast.success(`Status rule ${name ? `"${name}" ` : ''}berhasil diubah`);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal mengubah status rule');
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-colors cursor-pointer ${
        currentStatus === 1
          ? 'bg-[#EBF6EE] text-[#2D7A47] hover:bg-[#DDF0E2]'
          : 'bg-[#F2ECE4] text-[#7A7268] hover:bg-[#EAE2D6]'
      }`}
    >
      {currentStatus === 1 ? 'Aktif' : 'Nonaktif'}
    </button>
  );
}

export function DeleteRuleButton({ id, name }: { id: string; name: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirmDelete = () => {
    startTransition(async () => {
      try {
        await deleteRule(id);
        toast.success(`Penerima bagi hasil "${name}" berhasil dihapus`);
        setIsOpen(false);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menghapus rule');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        className="p-1 text-[#9E968B] hover:text-[#964B3B] transition-colors rounded-lg hover:bg-[#FBEBE8] cursor-pointer"
        title="Hapus Rule"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <ConfirmModal
        isOpen={isOpen}
        title="Hapus Penerima Bagi Hasil?"
        description={`Penerima "${name}" akan dihapus dari konfigurasi pembagian dividen cabang ini.`}
        confirmLabel="Hapus Penerima"
        cancelLabel="Batal"
        variant="danger"
        isPending={isPending}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
