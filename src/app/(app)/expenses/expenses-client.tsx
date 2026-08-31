'use client';

import { useState, useTransition } from 'react';
import { formatRupiah, formatDate, formatDateTime } from '@/lib/utils';
import { createExpense, updateExpense, deleteExpense } from '@/app/actions/expenses';
import type { Outlet } from '@/lib/schema';
import ConfirmModal from '@/components/confirm-modal';
import { toast } from '@/lib/toast';
import { 
  Plus, 
  WalletCards, 
  Receipt, 
  TrendingDown, 
  X, 
  Search, 
  ArrowRight,
  Pencil,
  Trash2
} from 'lucide-react';
import PaginationControls from '@/components/pagination-controls';

export default function ExpensesClient({
  expensesList,
  categories,
  outlets,
  totalItems,
  totalPages,
  currentPage,
  pageSize,
  totalAmount,
}: {
  expensesList: any[];
  categories: any[];
  outlets: Outlet[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
  totalAmount: number;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const outletMap = Object.fromEntries(outlets.map((o) => [o.id, o.name]));
  const averageAmount = totalItems > 0 ? Math.round(totalAmount / totalItems) : 0;

  const handleConfirmDelete = () => {
    if (!deletingExpense) return;
    startTransition(async () => {
      try {
        await deleteExpense(deletingExpense.id);
        toast.success(`Pengeluaran "${deletingExpense.description}" berhasil dihapus`);
        setDeletingExpense(null);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menghapus pengeluaran');
      }
    });
  };

  const filteredList = expensesList.filter((e) => {
    const desc = e.description?.toLowerCase() || '';
    const cat = e.categoryName?.toLowerCase() || '';
    const out = e.outletName?.toLowerCase() || '';
    const q = searchQuery.toLowerCase();
    return desc.includes(q) || cat.includes(q) || out.includes(q);
  });

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Pengeluaran & Beban Operasional
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Pencatatan kas keluar, belanja operasional, gaji, dan biaya pemeliharaan toko
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Pengeluaran</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Total Pengeluaran</p>
            <h3 className="text-2xl font-black text-[#964B3B] mt-1">{formatRupiah(totalAmount)}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FBEBE8] border border-[#F3DAD5] flex items-center justify-center text-[#964B3B]">
            <TrendingDown className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Jumlah Transaksi</p>
            <h3 className="text-2xl font-black text-[#201C1A] mt-1">{totalItems} Transaksi</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#54382B]">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Rata-rata per Kas Keluar</p>
            <h3 className="text-2xl font-black text-[#7A7268] mt-1">{formatRupiah(averageAmount)}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#7A7268]">
            <WalletCards className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. FULL-WIDTH DATA TABLE */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        {/* Search Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F0ECE4]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#8E867C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari keterangan / kategori / cabang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Cabang</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Keterangan Pengeluaran</th>
                <th className="py-3.5 px-4 text-right">Nominal Beban</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {filteredList.map((e) => (
                <tr key={e.id} className="hover:bg-[#FBF9F6] transition-colors">
                  <td className="py-3.5 px-4 text-[#7A7268] whitespace-nowrap font-medium">
                    {formatDateTime(e.expenseDate)}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-[#201C1A]">{e.outletName}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-2.5 py-1 bg-[#F5F2EB] text-[#54382B] rounded-full text-[10px] font-bold">
                      {e.categoryName || 'Umum'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#201C1A] font-semibold">{e.description}</td>
                  <td className="py-3.5 px-4 text-right font-black text-sm text-[#964B3B]">
                    {formatRupiah(e.amount)}
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                    <button
                      type="button"
                      onClick={() => setEditingExpense(e)}
                      className="p-1.5 text-[#54382B] hover:bg-[#F2EDE5] bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl transition-colors inline-flex cursor-pointer"
                      title="Edit Pengeluaran"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setDeletingExpense(e)}
                      className="p-1.5 text-[#964B3B] hover:bg-[#FBEBE8] rounded-xl transition-colors inline-flex cursor-pointer"
                      title="Hapus Pengeluaran"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#9E968B]">
                    <WalletCards className="w-8 h-8 mx-auto mb-2 text-[#D5CEC2]" />
                    <p className="font-bold text-xs text-[#4A4238]">Belum ada data pengeluaran</p>
                    <p className="text-[11px] text-[#9E968B] mt-0.5">
                      Klik tombol &quot;Catat Pengeluaran&quot; di atas untuk memasukkan pengeluaran baru.
                    </p>
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
        />
      </div>

      {/* 3. MODAL: CATAT PENGELUARAN BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <Plus className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#201C1A]">Catat Pengeluaran Kas</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                try {
                  await createExpense(formData);
                  toast.success('Pengeluaran baru berhasil dicatat');
                  setIsModalOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal mencatat pengeluaran');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Keterangan / Keperluan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="description"
                  required
                  placeholder="Contoh: Beli Es Batu & Cup Plastik"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nominal Pengeluaran (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1000"
                  step="1"
                  placeholder="75000"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Cabang Outlet</label>
                  <select
                    name="outletId"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Kategori</label>
                  <select
                    name="categoryId"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer"
                  >
                    <option value="">Umum / Lainnya</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {outletMap[c.outletId] ? `(${outletMap[c.outletId]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Metode Bayar</label>
                  <select
                    name="paymentMethod"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer font-bold"
                  >
                    <option value="cash">Kas Fisik Toko</option>
                    <option value="transfer">Transfer Bank Toko</option>
                    <option value="qris">QRIS / Saldo Digital</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Tanggal Beban</label>
                  <input
                    type="date"
                    name="expenseDate"
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer font-medium"
                  />
                </div>
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
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs cursor-pointer"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: EDIT / KOREKSI PENGELUARAN */}
      {editingExpense && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#201C1A]">Koreksi Catatan Pengeluaran</h3>
                <p className="text-[11px] text-[#8E867C]">Perbaiki keterangan atau nominal beban</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingExpense(null)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                try {
                  await updateExpense(editingExpense.id, formData);
                  toast.success('Catatan pengeluaran berhasil diperbarui');
                  setEditingExpense(null);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal memperbarui pengeluaran');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Keterangan / Keperluan <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="description"
                  required
                  defaultValue={editingExpense.description}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nominal Pengeluaran (Rp) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="amount"
                  required
                  min="1000"
                  step="1"
                  defaultValue={editingExpense.amount}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Cabang Outlet</label>
                  <select
                    name="outletId"
                    defaultValue={editingExpense.outletId || ''}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Kategori</label>
                  <select
                    name="categoryId"
                    defaultValue={editingExpense.categoryId || ''}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer"
                  >
                    <option value="">Umum / Lainnya</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {outletMap[c.outletId] ? `(${outletMap[c.outletId]})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingExpense(null)}
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL: KONFIRMASI HAPUS PENGELUARAN */}
      <ConfirmModal
        isOpen={!!deletingExpense}
        title="Hapus Catatan Pengeluaran?"
        description="Data pengeluaran operasional ini akan dihapus permanen dari buku kas."
        confirmLabel="Hapus Pengeluaran"
        cancelLabel="Batal"
        variant="danger"
        isPending={isPending}
        onClose={() => setDeletingExpense(null)}
        onConfirm={handleConfirmDelete}
        itemDetails={
          deletingExpense
            ? [
                { label: 'Keterangan', value: deletingExpense.description },
                { label: 'Nominal', value: formatRupiah(deletingExpense.amount) },
                { label: 'Cabang', value: deletingExpense.outletName || '-' },
                { label: 'Tanggal', value: formatDate(deletingExpense.expenseDate) },
              ]
            : undefined
        }
      />
    </div>
  );
}
