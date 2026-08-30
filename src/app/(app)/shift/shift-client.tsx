'use client';

import { useState, useTransition } from 'react';
import { openShift, closeShift } from '@/app/actions/shift';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import type { Shift } from '@/lib/schema';

export default function ShiftClient({
  activeShift,
  recentShifts,
  outletId = 'out_default',
}: {
  activeShift?: Shift | null;
  recentShifts: Shift[];
  outletId?: string;
}) {
  const [openingCash, setOpeningCash] = useState<number>(100000);
  const [closingCash, setClosingCash] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [summaryResult, setSummaryResult] = useState<{ expected: number; diff: number } | null>(null);

  const handleOpenShift = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      await openShift(outletId, openingCash);
      window.location.reload();
    });
  };

  const handleCloseShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;

    startTransition(async () => {
      try {
        const res = await closeShift(activeShift.id, outletId, closingCash, notes);
        setSummaryResult({ expected: res.expectedCash, diff: res.diff });
        alert(`Shift berhasil ditutup!\nUang Fisik: ${formatRupiah(closingCash)}\nSistem: ${formatRupiah(res.expectedCash)}\nSelisih: ${formatRupiah(res.diff)}`);
        window.location.reload();
      } catch (err: any) {
        alert(err?.message || 'Gagal menutup shift');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Shift Status or Open Form */}
        <div className="lg:col-span-1 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
          {activeShift ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                  🟢 SHIFT AKTIF
                </span>
                <span className="text-xs text-zinc-400 font-mono">{activeShift.id}</span>
              </div>

              <div className="space-y-2 text-sm bg-zinc-50 p-4 rounded-xl border border-zinc-100">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Waktu Buka</span>
                  <span className="font-semibold text-zinc-900">{formatDateTime(activeShift.openedAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Modal Awal Kas</span>
                  <span className="font-bold text-amber-700">{formatRupiah(activeShift.openingCash)}</span>
                </div>
              </div>

              <form onSubmit={handleCloseShift} className="space-y-3 pt-2 border-t border-zinc-100">
                <h4 className="font-bold text-sm text-zinc-900">Tutup Shift Kasir</h4>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Hitung Total Uang Fisik Kas (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={closingCash || ''}
                    onChange={(e) => setClosingCash(Number(e.target.value))}
                    placeholder="Contoh: 1250000"
                    className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 font-bold"
                  />
                  <p className="text-[10px] text-zinc-400 mt-1">Uang tunai fisik yang ada di laci kasir saat ini</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">Catatan Shift</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ada selisih Rp 500 karena kembalian kurang..."
                    className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? 'Menghitung Kas...' : '🔒 Tutup Shift & Rekonsiliasi Kas'}
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center text-2xl">
                🕐
              </div>
              <div>
                <h3 className="font-bold text-lg text-zinc-900">Buka Shift Kasir Baru</h3>
                <p className="text-xs text-zinc-500 mt-1">
                  Masukkan modal kas kecil awal di laci sebelum memulai transaksi penjualan.
                </p>
              </div>

              <form onSubmit={handleOpenShift} className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1">
                    Modal Awal di Laci (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 font-bold"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
                >
                  {isPending ? 'Membuka...' : '🚀 Buka Shift Sekarang'}
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Shift History */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
          <h3 className="font-bold text-base text-zinc-900">Riwayat 10 Shift Terakhir</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase">
                  <th className="py-3 px-3">Waktu Buka / Tutup</th>
                  <th className="py-3 px-3">Modal Awal</th>
                  <th className="py-3 px-3">Kas Seharusnya</th>
                  <th className="py-3 px-3">Kas Fisik</th>
                  <th className="py-3 px-3 text-right">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {recentShifts.map((s) => {
                  const diff = s.closingCash != null && s.expectedCash != null ? s.closingCash - s.expectedCash : null;
                  return (
                    <tr key={s.id} className="hover:bg-zinc-50/70">
                      <td className="py-3 px-3 text-xs">
                        <p className="font-semibold text-zinc-900">{formatDateTime(s.openedAt)}</p>
                        <p className="text-zinc-400">
                          {s.closedAt ? `s/d ${formatDateTime(s.closedAt)}` : '🟢 Sedang Berjalan'}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-xs text-zinc-600">{formatRupiah(s.openingCash)}</td>
                      <td className="py-3 px-3 text-xs font-medium text-zinc-800">
                        {s.expectedCash != null ? formatRupiah(s.expectedCash) : '-'}
                      </td>
                      <td className="py-3 px-3 text-xs font-bold text-zinc-900">
                        {s.closingCash != null ? formatRupiah(s.closingCash) : '-'}
                      </td>
                      <td className="py-3 px-3 text-right text-xs font-bold">
                        {diff != null ? (
                          <span className={diff === 0 ? 'text-emerald-600' : diff > 0 ? 'text-blue-600' : 'text-red-600'}>
                            {diff > 0 ? `+${formatRupiah(diff)}` : formatRupiah(diff)}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  );
                })}
                {recentShifts.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-zinc-400 text-xs">
                      Belum ada riwayat shift.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
