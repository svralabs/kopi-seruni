'use client';

import { useTransition } from 'react';
import { generateProfitSharing, markSharePaid, toggleRule, deleteRule } from '@/app/actions/profit-sharing';
import { Zap, Check, Trash2 } from 'lucide-react';


export function GeneratePeriodButton({ outletId = 'out_default' }: { outletId?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    const netProfitInput = prompt(
      'Masukkan Laba Bersih (Net Profit) periode ini (Rp) atau kosongkan untuk auto-hitung dari omset & pengeluaran:',
      ''
    );

    const netProfit = netProfitInput ? Math.round(Number(netProfitInput)) : undefined;

    const now = Math.floor(Date.now() / 1000);
    const startOfMonth = Math.floor(
      new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000
    );

    startTransition(async () => {
      try {
        await generateProfitSharing(outletId, startOfMonth, now, netProfit);
        alert('Bagi hasil berhasil dihitung & dicatat ke Buku Besar Ledger!');
        window.location.reload();
      } catch (e: any) {
        alert(e?.message || 'Gagal generate bagi hasil');
      }
    });
  };

  return (
    <button
      onClick={handleGenerate}
      disabled={isPending}
      className="px-4 py-2 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center gap-1.5 disabled:opacity-50"
    >
      <Zap className="w-3.5 h-3.5" />
      <span>{isPending ? 'Mengalkulasi...' : 'Generate Ledger Periode Ini'}</span>
    </button>
  );
}

export function MarkPaidButton({ id, outletId = 'out_default' }: { id: string; outletId?: string }) {
  const [isPending, startTransition] = useTransition();

  const handlePay = () => {
    if (confirm('Tandai bagi hasil ini sudah ditransfer/lunas ke pemilik?')) {
      startTransition(async () => {
        await markSharePaid(id, outletId);
        window.location.reload();
      });
    }
  };

  return (
    <button
      onClick={handlePay}
      disabled={isPending}
      className="px-3 py-1 bg-[#EBF6EE] hover:bg-[#DDF0E2] text-[#2D7A47] font-bold rounded-xl text-[11px] transition-colors disabled:opacity-50 inline-flex items-center gap-1 border border-[#D1EBD8]"
    >
      <Check className="w-3 h-3" />
      <span>{isPending ? '...' : 'Tandai Lunas'}</span>
    </button>
  );
}

export function ToggleRuleButton({ id, currentStatus }: { id: string; currentStatus: number }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      try {
        await toggleRule(id, currentStatus);
      } catch (err: any) {
        alert(err?.message || 'Gagal mengubah status rule');
      }
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full transition-colors ${
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
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm(`Hapus penerima "${name}" dari pembagian hasil?`)) return;
    startTransition(async () => {
      await deleteRule(id);
    });
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isPending}
      className="p-1 text-[#9E968B] hover:text-[#964B3B] transition-colors rounded-lg hover:bg-[#FBEBE8]"
      title="Hapus Rule"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
