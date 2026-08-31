'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { openShift, closeShift } from '@/app/actions/shift';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import type { Shift, Outlet } from '@/lib/schema';
import { toast } from '@/lib/toast';
import { Clock, Lock, Play, Store, CheckCircle, AlertTriangle, X, Wallet, ArrowRight } from 'lucide-react';
import PaginationControls from '@/components/pagination-controls';

export default function ShiftClient({
  activeShift,
  recentShifts,
  outletId = 'out_default',
  allOutlets = [],
  totalItems = 0,
  totalPages = 1,
  currentPage = 1,
  pageSize = 15,
}: {
  activeShift: Shift | null;
  recentShifts: any[];
  outletId?: string;
  allOutlets?: Outlet[];
  totalItems?: number;
  totalPages?: number;
  currentPage?: number;
  pageSize?: number;
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [openingCash, setOpeningCash] = useState(100000);
  const [closingCash, setClosingCash] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      try {
        await openShift(outletId, openingCash);
        toast.success('Shift kasir berhasil dibuka!');
        setIsModalOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || 'Gagal membuka shift');
      }
    });
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    if (closingCash === '') return;

    startTransition(async () => {
      try {
        await closeShift(activeShift.id, outletId, Number(closingCash), notes);
        toast.success('Shift kasir berhasil ditutup & direkonsiliasi!');
        setIsModalOpen(false);
        router.refresh();
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menutup shift');
      }
    });
  };

  const currentOutletName = allOutlets.find((o) => o.id === outletId)?.name || 'Outlet Utama';

  return (
    <div className="space-y-6">
      {/* Header & Primary Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Shift Kasir & Rekonsiliasi Kas
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Kelola sesi buka/tutup kasir, modal kas kecil, dan audit selisih fisik laci di {currentOutletName}
          </p>
        </div>

        {activeShift ? (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#964B3B] hover:bg-red-800 text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Lock className="w-4 h-4" />
            <span>Tutup Shift & Rekonsiliasi</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto"
          >
            <Play className="w-4 h-4" />
            <span>Buka Shift Baru</span>
          </button>
        )}
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Status Kasir Saat Ini</p>
            <h3 className="text-xl font-black mt-1">
              {activeShift ? (
                <span className="text-[#2D7A47] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  Shift Aktif
                </span>
              ) : (
                <span className="text-[#8E867C]">Kasir Tutup</span>
              )}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#54382B]">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Modal Awal Kas</p>
            <h3 className="text-2xl font-black text-[#54382B] mt-1">
              {activeShift ? formatRupiah(activeShift.openingCash) : '-'}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#F4EFE6] border border-[#E5DEC3] flex items-center justify-center text-[#54382B]">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Waktu Buka Shift</p>
            <h3 className="text-sm font-bold text-[#201C1A] mt-1">
              {activeShift ? formatDateTime(activeShift.openedAt) : 'Belum Ada Shift'}
            </h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#7A7268]">
            <Store className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. FULL-WIDTH DATA TABLE */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#201C1A]">
            Riwayat Sesi Shift & Rekonsiliasi Kas ({totalItems || recentShifts.length} Sesi)
          </h3>
          <span className="text-xs font-bold text-[#8E867C] px-3 py-1 bg-[#FAF8F5] rounded-xl border border-[#EBE7DF]">
            {currentOutletName}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Waktu Buka / Tutup</th>
                <th className="py-3.5 px-4">Modal Awal</th>
                <th className="py-3.5 px-4">Kas Seharusnya</th>
                <th className="py-3.5 px-4">Kas Fisik Laci</th>
                <th className="py-3.5 px-4 text-right">Selisih Rekonsiliasi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {recentShifts.map((s) => {
                const diff =
                  s.closingCash != null && s.expectedCash != null ? s.closingCash - s.expectedCash : null;
                return (
                  <tr key={s.id} className="hover:bg-[#FBF9F6] transition-colors">
                    <td className="py-3.5 px-4 text-xs">
                      <p className="font-bold text-[#201C1A]">{formatDateTime(s.openedAt)}</p>
                      <p className="text-[10px] text-[#9E968B] mt-0.5">
                        {s.closedAt ? `s/d ${formatDateTime(s.closedAt)}` : '🟢 Sedang Berjalan'}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 text-[#6B635A] font-semibold">{formatRupiah(s.openingCash)}</td>
                    <td className="py-3.5 px-4 font-bold text-[#201C1A]">
                      {s.expectedCash != null ? formatRupiah(s.expectedCash) : '-'}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#201C1A]">
                      {s.closingCash != null ? formatRupiah(s.closingCash) : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-black text-sm">
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
                        <span className="text-xs text-[#9E968B] font-normal">Sedang aktif</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {recentShifts.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-[#9E968B] text-xs">
                    Belum ada riwayat shift pada outlet ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          pageParam="page"
        />
      </div>

      {/* 3. MODAL DIALOG: BUKA SHIFT ATAU TUTUP SHIFT */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                {activeShift ? <Lock className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <h3 className="font-bold text-sm text-[#201C1A]">
                  {activeShift ? 'Tutup Shift & Rekonsiliasi Kas' : 'Buka Shift Kasir Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeShift ? (
              <form onSubmit={handleCloseShift} className="space-y-3.5 text-xs">
                <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <span className="text-[#8E867C]">Waktu Buka</span>
                    <span className="font-bold text-[#201C1A]">{formatDateTime(activeShift.openedAt)}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-[#F0ECE4]">
                    <span className="text-[#8E867C]">Modal Awal</span>
                    <span className="font-bold text-[#54382B]">{formatRupiah(activeShift.openingCash)}</span>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Hitung Total Kas Fisik di Laci (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={closingCash || ''}
                    onChange={(e) => setClosingCash(Number(e.target.value))}
                    placeholder="Contoh: 1250000"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black text-sm"
                  />
                  <p className="text-[10px] text-[#9E968B] mt-1">Uang tunai fisik yang ada di laci kasir saat ini</p>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Catatan Shift (Opsional)</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Catatan jika ada selisih kembalian atau pengeluaran kas kecil..."
                    className="w-full px-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />
                </div>

                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 py-2.5 bg-[#964B3B] hover:bg-red-800 text-white font-bold rounded-2xl shadow-xs disabled:opacity-50"
                  >
                    {isPending ? 'Menghitung...' : 'Tutup Shift Sekarang'}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleOpenShift} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Modal Awal di Laci (Rp) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={openingCash}
                    onChange={(e) => setOpeningCash(Number(e.target.value))}
                    placeholder="100000"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black text-sm"
                  />
                  <p className="text-[10px] text-[#8E867C] mt-1">Uang modal kembalian kasir sebelum melayani transaksi</p>
                </div>

                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5]"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs disabled:opacity-50"
                  >
                    {isPending ? 'Membuka...' : 'Buka Shift Sekarang'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
