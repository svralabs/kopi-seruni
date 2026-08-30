'use client';

import { useTransition } from 'react';
import { generateProfitSharing, markSharePaid } from '@/app/actions/profit-sharing';
import { toggleRule } from '@/app/actions/profit-sharing-crud';

export function GeneratePeriodButton({ outletId = 'out_default' }: { outletId?: string }) {
  const [isPending, startTransition] = useTransition();

  const handleGenerate = () => {
    const netProfitInput = prompt('Masukkan Laba Bersih (Net Profit) periode ini (Rp):', '10000000');
    if (!netProfitInput) return;

    const netProfit = Math.round(Number(netProfitInput));
    if (isNaN(netProfit) || netProfit <= 0) {
      alert('Nominal laba bersih tidak valid.');
      return;
    }

    const now = Math.floor(Date.now() / 1000);
    const startOfMonth = Math.floor(new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime() / 1000);

    startTransition(async () => {
      try {
        await generateProfitSharing(outletId, startOfMonth, now, netProfit);
        alert('Bagi hasil berhasil digenerate ke Ledger!');
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
      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
    >
      {isPending ? 'Mengalkulasi...' : '⚡ Generate Ledger Periode Ini'}
    </button>
  );
}

export function MarkPaidButton({ id, outletId = 'out_default' }: { id: string; outletId?: string }) {
  const [isPending, startTransition] = useTransition();

  const handlePay = () => {
    if (confirm('Tandai bagi hasil ini sudah ditransfer/lunas?')) {
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
      className="px-2.5 py-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded-lg text-xs transition-colors disabled:opacity-50"
    >
      {isPending ? '...' : 'Tandai Lunas'}
    </button>
  );
}

export function ToggleRuleButton({ id, currentStatus }: { id: string; currentStatus: number }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = () => {
    startTransition(async () => {
      await toggleRule(id, currentStatus);
    });
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isPending}
      className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
        currentStatus === 1
          ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
          : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
      }`}
    >
      {currentStatus === 1 ? 'Aktif' : 'Nonaktif'}
    </button>
  );
}
