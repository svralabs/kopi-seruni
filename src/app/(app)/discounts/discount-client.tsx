'use client';

import { useState, useTransition } from 'react';
import { formatRupiah } from '@/lib/utils';
import { createDiscount, updateDiscount, toggleDiscount, deleteDiscount } from '@/app/actions/discounts';
import type { Discount, Outlet } from '@/lib/schema';
import ConfirmModal from '@/components/confirm-modal';
import { toast } from '@/lib/toast';
import { Plus, Tag, Trash2, Pencil, ArrowRight, X, CheckCircle, Percent, Coins, Search } from 'lucide-react';

export default function DiscountsClient({
  discountsList,
  outlets,
  currentOutletId = 'all',
}: {
  discountsList: (Discount & { outletName: string })[];
  outlets: Outlet[];
  currentOutletId?: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<(Discount & { outletName: string }) | null>(null);
  const [deletingDiscount, setDeletingDiscount] = useState<(Discount & { outletName: string }) | null>(null);
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [isPending, startTransition] = useTransition();

  const handleToggle = (id: string, currentStatus: number, name: string) => {
    startTransition(async () => {
      try {
        await toggleDiscount(id, currentStatus);
        toast.success(`Status promo "${name}" berhasil diubah`);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal mengubah status promo');
      }
    });
  };

  const handleConfirmDelete = () => {
    if (!deletingDiscount) return;
    startTransition(async () => {
      try {
        await deleteDiscount(deletingDiscount.id);
        toast.success(`Diskon "${deletingDiscount.name}" berhasil dihapus`);
        setDeletingDiscount(null);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menghapus diskon');
      }
    });
  };

  // Metrics
  const totalCount = discountsList.length;
  const activeCount = discountsList.filter((d) => d.isActive === 1).length;
  const inactiveCount = totalCount - activeCount;

  // Filtered List
  const filteredList = discountsList.filter((d) => {
    const matchQuery = d.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'active'
        ? d.isActive === 1
        : d.isActive === 0;
    return matchQuery && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Primary Action Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Diskon & Voucher Promo
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Kelola diskon persentase dan potongan harga rupiah yang berlaku di kasir POS
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat Promo Baru</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Total Promo</p>
            <h3 className="text-2xl font-black text-[#201C1A] mt-1">{totalCount} Voucher</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#54382B]">
            <Tag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Promo Aktif (POS)</p>
            <h3 className="text-2xl font-black text-[#2D7A47] mt-1">{activeCount} Voucher</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EBF6EE] border border-[#D1EBD8] flex items-center justify-center text-[#2D7A47]">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Promo Nonaktif</p>
            <h3 className="text-2xl font-black text-[#8E867C] mt-1">{inactiveCount} Voucher</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#F2EFE8] border border-[#E2DDD3] flex items-center justify-center text-[#8E867C]">
            <Percent className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. FULL-WIDTH DATA TABLE */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        {/* Table Filters Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F0ECE4]">
          {/* Search Box */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#8E867C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari promo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
            />
          </div>

          {/* Status Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-[#F9F7F2] p-1 rounded-xl border border-[#E5E0D6] text-xs">
            {(
              [
                { key: 'all', label: 'Semua' },
                { key: 'active', label: 'Aktif' },
                { key: 'inactive', label: 'Nonaktif' },
              ] as const
            ).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setStatusFilter(t.key)}
                className={`px-3 py-1 rounded-lg font-bold transition-all text-xs ${
                  statusFilter === t.key
                    ? 'bg-white text-[#201C1A] shadow-xs'
                    : 'text-[#8E867C] hover:text-[#201C1A]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Nama Promo / Voucher</th>
                <th className="py-3.5 px-4">Cabang Penempatan</th>
                <th className="py-3.5 px-4">Nilai Potongan</th>
                <th className="py-3.5 px-4">Syarat Belanja</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {filteredList.map((d) => (
                <tr key={d.id} className="hover:bg-[#FBF9F6] transition-colors">
                  <td className="py-3.5 px-4 font-bold text-[#201C1A]">{d.name}</td>
                  <td className="py-3.5 px-4 font-medium text-[#7A7268]">{d.outletName}</td>
                  <td className="py-3.5 px-4 font-black text-sm text-[#201C1A]">
                    {d.type === 'percentage' ? `${d.value}%` : formatRupiah(d.value)}
                  </td>
                  <td className="py-3.5 px-4 text-[#7A7268]">
                    {d.minPurchase && d.minPurchase > 0 ? `Min. ${formatRupiah(d.minPurchase)}` : 'Tanpa minimum'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        d.isActive
                          ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                          : 'bg-[#F2EFE8] text-[#8E867C] border border-[#E2DDD3]'
                      }`}
                    >
                      {d.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setEditingDiscount(d)}
                      className="p-1.5 text-[#54382B] hover:bg-[#F2EDE5] bg-[#FAF8F5] border border-[#E5E0D6] rounded-xl transition-colors inline-flex cursor-pointer"
                      title="Edit Promo / Voucher"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleToggle(d.id, d.isActive, d.name)}
                      className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                        d.isActive
                          ? 'border-[#EBE7DF] text-[#7A7268] hover:bg-[#FAF8F5]'
                          : 'border-[#D1EBD8] bg-[#EBF6EE] text-[#2D7A47] hover:bg-[#DDF0E2]'
                      }`}
                    >
                      {d.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => setDeletingDiscount(d)}
                      className="p-1.5 text-[#964B3B] hover:bg-[#FBEBE8] rounded-xl transition-colors inline-flex cursor-pointer"
                      title="Hapus Promo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#9E968B]">
                    <Tag className="w-8 h-8 mx-auto mb-2 text-[#D5CEC2]" />
                    <p className="font-bold text-xs text-[#4A4238]">Tidak ada promo yang cocok</p>
                    <p className="text-[11px] text-[#9E968B] mt-0.5">
                      Klik tombol &quot;Buat Promo Baru&quot; di atas untuk menambahkan voucher promo.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. TRANSACTIONAL / SETUP MODAL DIALOG: BUAT PROMO BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <Plus className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#201C1A]">Buat Promo / Voucher Baru</h3>
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
                  await createDiscount(formData);
                  toast.success('Promo baru berhasil dibuat');
                  setIsModalOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal membuat promo');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nama Promo / Voucher <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Diskon Grand Opening 20%"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Cabang Outlet Penerima</label>
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Tipe Diskon</label>
                  <select
                    name="type"
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as any)}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold cursor-pointer"
                  >
                    <option value="percentage">Persen (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    {discountType === 'percentage' ? 'Nilai (%)' : 'Potongan (Rp)'}{' '}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="value"
                    required
                    min="1"
                    max={discountType === 'percentage' ? 100 : undefined}
                    step="1"
                    placeholder={discountType === 'percentage' ? '15' : '10000'}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Minimal Belanja (Rp, Opsional)</label>
                <input
                  type="number"
                  name="minPurchase"
                  min="0"
                  step="1000"
                  placeholder="0 (Tanpa minimum belanja)"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
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
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs cursor-pointer"
                >
                  Simpan Promo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL DIALOG: EDIT PROMO / VOUCHER */}
      {editingDiscount && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#201C1A]">Edit Promo / Voucher</h3>
                <p className="text-[11px] text-[#8E867C]">Perbarui nilai diskon, tipe potongan, atau cabang</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingDiscount(null)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                try {
                  await updateDiscount(editingDiscount.id, formData);
                  toast.success(`Promo "${editingDiscount.name}" berhasil diperbarui`);
                  setEditingDiscount(null);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal memperbarui promo');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Nama Promo / Voucher <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingDiscount.name}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Cabang Outlet Penerima</label>
                <select
                  name="outletId"
                  defaultValue={editingDiscount.outletId || ''}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer"
                >
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Tipe Diskon</label>
                  <select
                    name="type"
                    defaultValue={editingDiscount.type}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold cursor-pointer"
                  >
                    <option value="percentage">Persen (%)</option>
                    <option value="fixed">Nominal Tetap (Rp)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Nilai / Potongan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="value"
                    required
                    min="1"
                    step="1"
                    defaultValue={editingDiscount.value}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Minimal Belanja (Rp, Opsional)</label>
                <input
                  type="number"
                  name="minPurchase"
                  min="0"
                  step="1000"
                  defaultValue={editingDiscount.minPurchase || 0}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingDiscount(null)}
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

      {/* 5. MODAL: KONFIRMASI HAPUS DISKON */}
      <ConfirmModal
        isOpen={!!deletingDiscount}
        title="Hapus Promo / Voucher?"
        description="Voucher promo ini akan dihapus dan tidak bisa lagi digunakan pada kasir POS."
        confirmLabel="Hapus Promo"
        cancelLabel="Batal"
        variant="danger"
        isPending={isPending}
        onClose={() => setDeletingDiscount(null)}
        onConfirm={handleConfirmDelete}
        itemDetails={
          deletingDiscount
            ? [
                { label: 'Nama Promo', value: deletingDiscount.name },
                {
                  label: 'Potongan',
                  value:
                    deletingDiscount.type === 'percentage'
                      ? `${deletingDiscount.value}%`
                      : formatRupiah(deletingDiscount.value),
                },
                { label: 'Cabang', value: deletingDiscount.outletName || '-' },
              ]
            : undefined
        }
      />
    </div>
  );
}
