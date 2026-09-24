'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { openShift, closeShift } from '@/app/actions/shift';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import type { Shift, Outlet } from '@/lib/schema';
import { toast } from '@/lib/toast';
import { Clock, Lock, Play, Store, CheckCircle, AlertTriangle, X, Wallet, ArrowRight, Receipt, CreditCard, Banknote, QrCode, Building2, ShoppingBag, Utensils } from 'lucide-react';
import PaginationControls from '@/components/pagination-controls';

export interface ShiftSalesSummary {
  totalSales: number;
  cashTotal: number;
  qrisTotal: number;
  edcTotal: number;
  transferTotal: number;
  debitTotal: number;
  shopeeFoodTotal: number;
  goFoodTotal: number;
  orderCount: number;
  expectedCash: number;
}

export default function ShiftClient({
  activeShift,
  activeShiftSales,
  recentShifts,
  outletId = 'out_default',
  allOutlets = [],
  totalItems = 0,
  totalPages = 1,
  currentPage = 1,
  pageSize = 15,
}: {
  activeShift: Shift | null;
  activeShiftSales?: ShiftSalesSummary;
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

  const expectedCash = activeShift ? (activeShiftSales?.expectedCash ?? activeShift.openingCash) : 0;
  const cashDiff = closingCash !== '' ? Number(closingCash) - expectedCash : 0;
  const hasDiff = closingCash !== '' && cashDiff !== 0;

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
    if (closingCash === '') {
      toast.error('Harap masukkan nominal uang fisik di laci kasir!');
      return;
    }

    const currentDiff = Number(closingCash) - expectedCash;
    if (currentDiff !== 0 && (!notes || notes.trim() === '')) {
      toast.error(
        `Terdapat selisih kas fisik sebesar ${currentDiff > 0 ? `+${formatRupiah(currentDiff)}` : formatRupiah(currentDiff)}. Alasan selisih wajib diisi pada catatan!`
      );
      return;
    }

    startTransition(async () => {
      try {
        await closeShift(activeShift.id, outletId, Number(closingCash), notes);
        toast.success('Shift kasir berhasil ditutup & direkonsiliasi!');
        setIsModalOpen(false);
        setClosingCash('');
        setNotes('');
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

      {/* ACTIVE SHIFT REAL-TIME SALES BREAKDOWN */}
      {activeShift && (
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#F0ECE4]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#EBF6EE] border border-[#D1EBD8] text-[#2D7A47] flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#201C1A]">Rincian Penjualan Shift Berjalan</h3>
                <p className="text-[11px] text-[#8E867C]">Akumulasi omset kasir pada sesi shift aktif saat ini</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-[#8E867C]">Total Omset Shift:</span>
              <span className="text-base font-black text-[#201C1A]">
                {formatRupiah(activeShiftSales?.totalSales || 0)}
              </span>
              <span className="text-[10px] text-[#8E867C]">({activeShiftSales?.orderCount || 0} pesanan)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE]">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8E867C] font-medium mb-0.5">
                <Banknote className="w-3.5 h-3.5 shrink-0" />
                <span>Tunai (Cash)</span>
              </div>
              <p className="text-sm font-black text-[#201C1A]">
                {formatRupiah(activeShiftSales?.cashTotal || 0)}
              </p>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE]">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8E867C] font-medium mb-0.5">
                <QrCode className="w-3.5 h-3.5 shrink-0" />
                <span>QRIS</span>
              </div>
              <p className="text-sm font-black text-[#201C1A]">
                {formatRupiah(activeShiftSales?.qrisTotal || 0)}
              </p>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE]">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8E867C] font-medium mb-0.5">
                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                <span>Mesin EDC</span>
              </div>
              <p className="text-sm font-black text-[#201C1A]">
                {formatRupiah(activeShiftSales?.edcTotal || 0)}
              </p>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE]">
              <div className="flex items-center gap-1.5 text-[10px] text-[#8E867C] font-medium mb-0.5">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <span>Debit / Transfer</span>
              </div>
              <p className="text-sm font-black text-[#201C1A]">
                {formatRupiah((activeShiftSales?.debitTotal || 0) + (activeShiftSales?.transferTotal || 0))}
              </p>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE]">
              <div className="flex items-center gap-1.5 text-[10px] text-[#D96B27] font-semibold mb-0.5">
                <ShoppingBag className="w-3.5 h-3.5 shrink-0 text-[#D96B27]" />
                <span>ShopeeFood</span>
              </div>
              <p className="text-sm font-black text-[#201C1A]">
                {formatRupiah(activeShiftSales?.shopeeFoodTotal || 0)}
              </p>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE]">
              <div className="flex items-center gap-1.5 text-[10px] text-[#00880D] font-semibold mb-0.5">
                <Utensils className="w-3.5 h-3.5 shrink-0 text-[#00880D]" />
                <span>GoFood</span>
              </div>
              <p className="text-sm font-black text-[#201C1A]">
                {formatRupiah(activeShiftSales?.goFoodTotal || 0)}
              </p>
            </div>
          </div>
        </div>
      )}

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
                      <p className="font-bold text-[#201C1A]">
                        {formatDateTime(s.openedAt)}
                      </p>
                      <p className="text-[10px] text-[#9E968B] mt-0.5 flex items-center gap-1.5">
                        {s.closedAt ? (
                          `s/d ${formatDateTime(s.closedAt)}`
                        ) : (
                          <>
                            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                            <span className="text-emerald-700 font-bold">Sedang Berjalan</span>
                          </>
                        )}
                      </p>
                      {s.notes && (
                        <p
                          className="text-[10px] text-[#8A5C1B] bg-[#FFF9EB] px-2 py-0.5 rounded-md mt-1 inline-block border border-[#F2DEAA] max-w-xs truncate"
                          title={s.notes}
                        >
                          Ket: {s.notes}
                        </p>
                      )}
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
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in overflow-y-auto">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-lg w-full p-6 space-y-4 my-8 max-h-[90dvh] overflow-y-auto">
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
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {activeShift ? (
              <form onSubmit={handleCloseShift} className="space-y-4 text-xs">
                {/* RINGKASAN PENJUALAN PER METODE BAYAR */}
                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] space-y-2">
                  <div className="flex items-center justify-between pb-2 border-b border-[#EAE5DC]">
                    <div>
                      <h4 className="font-bold text-[#201C1A]">Rincian Penjualan Shift Ini</h4>
                      <p className="text-[10px] text-[#8E867C]">Waktu: {formatDateTime(activeShift.openedAt)}</p>
                    </div>
                    <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]">
                      {activeShiftSales?.orderCount || 0} Transaksi
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                    <div className="p-2 bg-white rounded-xl border border-[#ECE7DE]">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8E867C] mb-0.5">
                        <Banknote className="w-3.5 h-3.5 shrink-0" />
                        <span>Tunai (Cash)</span>
                      </div>
                      <span className="font-bold text-[#201C1A]">
                        {formatRupiah(activeShiftSales?.cashTotal || 0)}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-[#ECE7DE]">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8E867C] mb-0.5">
                        <QrCode className="w-3.5 h-3.5 shrink-0" />
                        <span>QRIS</span>
                      </div>
                      <span className="font-bold text-[#201C1A]">
                        {formatRupiah(activeShiftSales?.qrisTotal || 0)}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-[#ECE7DE]">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8E867C] mb-0.5">
                        <CreditCard className="w-3.5 h-3.5 shrink-0" />
                        <span>Mesin EDC</span>
                      </div>
                      <span className="font-bold text-[#201C1A]">
                        {formatRupiah(activeShiftSales?.edcTotal || 0)}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-[#ECE7DE]">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#8E867C] mb-0.5">
                        <Building2 className="w-3.5 h-3.5 shrink-0" />
                        <span>Debit / Transfer</span>
                      </div>
                      <span className="font-bold text-[#201C1A]">
                        {formatRupiah((activeShiftSales?.debitTotal || 0) + (activeShiftSales?.transferTotal || 0))}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-[#ECE7DE]">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#D96B27] font-semibold mb-0.5">
                        <ShoppingBag className="w-3.5 h-3.5 shrink-0 text-[#D96B27]" />
                        <span>ShopeeFood</span>
                      </div>
                      <span className="font-bold text-[#201C1A]">
                        {formatRupiah(activeShiftSales?.shopeeFoodTotal || 0)}
                      </span>
                    </div>

                    <div className="p-2 bg-white rounded-xl border border-[#ECE7DE]">
                      <div className="flex items-center gap-1.5 text-[10px] text-[#00880D] font-semibold mb-0.5">
                        <Utensils className="w-3.5 h-3.5 shrink-0 text-[#00880D]" />
                        <span>GoFood</span>
                      </div>
                      <span className="font-bold text-[#201C1A]">
                        {formatRupiah(activeShiftSales?.goFoodTotal || 0)}
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2 border-t border-[#EAE5DC] text-xs font-black">
                    <span className="text-[#54382B]">Total Omset Shift (Semua Metode)</span>
                    <span className="text-[#201C1A] text-sm">
                      {formatRupiah(activeShiftSales?.totalSales || 0)}
                    </span>
                  </div>
                </div>

                {/* REKONSILIASI KAS LACI */}
                <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] space-y-2 text-xs">
                  <h4 className="font-bold text-[#201C1A]">Target Kas Fisik di Laci</h4>
                  <div className="space-y-1 text-[11px] text-[#6B635A]">
                    <div className="flex justify-between">
                      <span>Modal Awal Kas</span>
                      <span className="font-semibold text-[#201C1A]">{formatRupiah(activeShift.openingCash)}</span>
                    </div>
                    <div className="flex justify-between text-[#2D7A47]">
                      <span>(+) Penjualan Tunai di Shift Ini</span>
                      <span className="font-semibold">+{formatRupiah(activeShiftSales?.cashTotal || 0)}</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-[#EAE5DC] text-xs font-black text-[#54382B]">
                      <span>Target Kas Harus Ada di Laci</span>
                      <span className="text-sm font-black text-[#201C1A]">{formatRupiah(expectedCash)}</span>
                    </div>
                  </div>
                </div>

                {/* INPUT KAS FISIK */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-[#4A4238]">
                      Hitung Kas Fisik Laci Saat Ini (Rp) <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setClosingCash(expectedCash)}
                      className="text-[10px] text-[#54382B] hover:text-[#201C1A] font-bold underline cursor-pointer"
                    >
                      Isi Sesuai Target ({formatRupiah(expectedCash)})
                    </button>
                  </div>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={closingCash === '' ? '' : closingCash}
                    onChange={(e) => setClosingCash(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder={`Contoh: ${expectedCash}`}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black text-base"
                  />
                  <p className="text-[10px] text-[#9E968B] mt-1">
                    Hitung seluruh uang lembaran & koin fisik yang ada di laci kasir saat tutup sesi
                  </p>
                </div>

                {/* REAL-TIME SELISIH FEEDBACK */}
                {closingCash !== '' && (
                  <div>
                    {cashDiff === 0 ? (
                      <div className="p-3 bg-[#EBF6EE] border border-[#D1EBD8] rounded-2xl text-[#2D7A47] flex items-center justify-between font-bold">
                        <span className="flex items-center gap-1.5">
                          <CheckCircle className="w-4 h-4 shrink-0" />
                          Kas Fisik Pas (Sesuai Target Sistem)
                        </span>
                        <span>Selisih: Rp 0</span>
                      </div>
                    ) : cashDiff > 0 ? (
                      <div className="p-3 bg-[#EEF5FA] border border-[#CFE4F3] rounded-2xl text-[#1D638B] space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-[#1D638B]" />
                            Kelebihan Kas Fisik (Plus)
                          </span>
                          <span className="text-sm font-black">+{formatRupiah(cashDiff)}</span>
                        </div>
                        <p className="text-[10px] text-[#1D638B]/90 font-medium">
                          Uang fisik di laci lebih banyak dari pencatatan. Wajib isi alasan selisih pada catatan di bawah!
                        </p>
                      </div>
                    ) : (
                      <div className="p-3 bg-[#FBEBE8] border border-[#F5C7BE] rounded-2xl text-[#964B3B] space-y-1">
                        <div className="flex items-center justify-between font-bold">
                          <span className="flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 shrink-0 text-[#964B3B]" />
                            Kekurangan Kas Fisik (Minus)
                          </span>
                          <span className="text-sm font-black">-{formatRupiah(Math.abs(cashDiff))}</span>
                        </div>
                        <p className="text-[10px] text-[#964B3B]/90 font-medium">
                          Uang fisik di laci kurang dari pencatatan. Wajib isi alasan selisih pada catatan di bawah!
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* CATATAN SHIFT / SELISIH */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-[#4A4238]">
                      {hasDiff ? (
                        <span className="text-[#964B3B] flex items-center gap-1">
                          Catatan Alasan Selisih Kas <span className="text-red-600 font-black">* (Wajib Diisi)</span>
                        </span>
                      ) : (
                        <span>Catatan Shift (Opsional)</span>
                      )}
                    </label>
                    {hasDiff && (
                      <span className="text-[10px] text-[#964B3B] font-bold">Wajib karena ada selisih</span>
                    )}
                  </div>
                  <textarea
                    rows={2}
                    required={hasDiff}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder={
                      hasDiff
                        ? 'Wajib diisi! Jelaskan alasan selisih (misal: kembalian salah, tip kasir, pengeluaran darurat belum dicatat)...'
                        : 'Catatan tambahan bila ada...'
                    }
                    className={`w-full px-3.5 py-2 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] ${
                      hasDiff && !notes.trim()
                        ? 'bg-[#FFF8F7] border-2 border-[#E8998D] placeholder:text-red-400'
                        : 'bg-[#F9F7F2] border border-[#E5E0D6]'
                    }`}
                  />
                </div>

                <div className="flex items-center gap-2 pt-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending || (hasDiff && !notes.trim())}
                    className="flex-1 py-2.5 bg-[#964B3B] hover:bg-red-800 disabled:opacity-50 text-white font-bold rounded-2xl shadow-xs cursor-pointer transition-all"
                  >
                    {isPending ? 'Menghitung & Menutup...' : 'Tutup Shift Sekarang'}
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
                    className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs disabled:opacity-50 cursor-pointer"
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
