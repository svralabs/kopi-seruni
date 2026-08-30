'use client';

import { useState, useTransition } from 'react';
import { openShift, closeShift } from '@/app/actions/shift';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import type { Shift } from '@/lib/schema';
import { Clock, Lock, Play, ShieldAlert, CheckCircle2 } from 'lucide-react';

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
        alert(
          `Shift berhasil ditutup!\nUang Fisik: ${formatRupiah(closingCash)}\nSistem: ${formatRupiah(
            res.expectedCash
          )}\nSelisih: ${formatRupiah(res.diff)}`
        );
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
        <div className="lg:col-span-1 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          {activeShift ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="px-3 py-1 bg-[#EBF6EE] text-[#2D7A47] text-[10px] font-bold rounded-full border border-[#D1EBD8]">
                  SHIFT SEDANG AKTIF
                </span>
                <span className="text-[10px] text-[#9E968B] font-mono">{activeShift.id}</span>
              </div>

              <div className="space-y-2 text-xs bg-[#FAF8F5] p-4 rounded-2xl border border-[#ECE7DE]">
                <div className="flex justify-between">
                  <span className="text-[#8E867C]">Waktu Buka</span>
                  <span className="font-bold text-[#201C1A]">{formatDateTime(activeShift.openedAt)}</span>
                </div>
                <div className="flex justify-between pt-1 border-t border-[#F0ECE4]">
                  <span className="text-[#8E867C]">Modal Awal Kas</span>
                  <span className="font-black text-[#54382B]">{formatRupiah(activeShift.openingCash)}</span>
                </div>
              </div>

              <form onSubmit={handleCloseShift} className="space-y-3 pt-2 border-t border-[#F0ECE4] text-xs">
                <h4 className="font-bold text-[#201C1A]">Tutup Shift & Rekonsiliasi</h4>
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Hitung Total Kas Fisik (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={closingCash || ''}
                    onChange={(e) => setClosingCash(Number(e.target.value))}
                    placeholder="Contoh: 1250000"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
                  />
                  <p className="text-[10px] text-[#9E968B] mt-1">Uang tunai fisik yang ada di laci saat ini</p>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Catatan Shift</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan jika ada selisih kembalian atau pengeluaran..."
                    className="w-full px-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-[11px] focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 bg-[#964B3B] hover:bg-[#803E30] text-white font-bold rounded-2xl text-xs transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{isPending ? 'Menghitung Rekonsiliasi...' : 'Tutup Shift & Rekonsiliasi Kas'}</span>
                </button>
              </form>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="w-12 h-12 bg-[#F4EFE6] text-[#54382B] rounded-2xl flex items-center justify-center">
                <Clock className="w-6 h-6 stroke-[1.5]" />
              </div>
              <div>
                <h3 className="font-bold text-base text-[#201C1A]">Buka Shift Kasir Baru</h3>
                <p className="text-xs text-[#8E867C] mt-1">
                  Masukkan modal kas awal di laci sebelum memulai operasional kasir.
                </p>
              </div>

              <form onSubmit={handleOpenShift} className="space-y-3 pt-2 text-xs">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Modal Awal di Laci (Rp)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full py-3 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>{isPending ? 'Membuka...' : 'Buka Shift Sekarang'}</span>
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Right Column: Shift History */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-sm text-[#201C1A]">Riwayat 10 Shift Terakhir</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Waktu Buka / Tutup</th>
                  <th className="py-3 px-4">Modal Awal</th>
                  <th className="py-3 px-4">Kas Seharusnya</th>
                  <th className="py-3 px-4">Kas Fisik</th>
                  <th className="py-3 px-4 text-right">Selisih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {recentShifts.map((s) => {
                  const diff =
                    s.closingCash != null && s.expectedCash != null ? s.closingCash - s.expectedCash : null;
                  return (
                    <tr key={s.id} className="hover:bg-[#FBF9F6]">
                      <td className="py-3 px-4 text-xs">
                        <p className="font-bold text-[#201C1A]">{formatDateTime(s.openedAt)}</p>
                        <p className="text-[10px] text-[#9E968B] mt-0.5">
                          {s.closedAt ? `s/d ${formatDateTime(s.closedAt)}` : '🟢 Sedang Berjalan'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-[#6B635A]">{formatRupiah(s.openingCash)}</td>
                      <td className="py-3 px-4 font-semibold text-[#201C1A]">
                        {s.expectedCash != null ? formatRupiah(s.expectedCash) : '-'}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#201C1A]">
                        {s.closingCash != null ? formatRupiah(s.closingCash) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-black">
                        {diff != null ? (
                          <span
                            className={
                              diff === 0
                                ? 'text-[#2D7A47]'
                                : diff > 0
                                ? 'text-[#1D638B]'
                                : 'text-[#964B3B]'
                            }
                          >
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
                    <td colSpan={5} className="text-center py-8 text-[#9E968B] text-xs">
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
