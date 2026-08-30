'use client';

import { useState, useTransition } from 'react';
import { formatRupiah, formatDate } from '@/lib/utils';
import { createDiscount, toggleDiscount, deleteDiscount } from '@/app/actions/discounts';
import type { Discount, Outlet } from '@/lib/schema';
import { Plus, Tag, Trash2, Power, Percent, ArrowRight } from 'lucide-react';

export default function DiscountsClient({
  discountsList,
  outlets,
  currentOutletId = 'all',
}: {
  discountsList: (Discount & { outletName: string })[];
  outlets: Outlet[];
  currentOutletId?: string;
}) {
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [isPending, startTransition] = useTransition();

  const handleToggle = (id: string, currentStatus: number) => {
    startTransition(async () => {
      await toggleDiscount(id, currentStatus);
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Yakin ingin menghapus promo/diskon ini?')) return;
    startTransition(async () => {
      await deleteDiscount(id);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Diskon & Voucher Promo
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Atur promo potongan harga persentase atau nominal rupiah untuk kasir POS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form Tambah Promo */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#54382B]">
            <Plus className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Buat Promo Baru</h3>
          </div>

          <form action={createDiscount} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Nama Promo / Voucher</label>
              <input
                type="text"
                name="name"
                required
                placeholder="Contoh: Diskon Grand Opening 20%"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Cabang Outlet</label>
              <select
                name="outletId"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
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
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                >
                  <option value="percentage">Persen (%)</option>
                  <option value="fixed">Nominal (Rp)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  {discountType === 'percentage' ? 'Nilai (%)' : 'Potongan (Rp)'}
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
              <label className="block font-bold text-[#4A4238] mb-1.5">Min. Belanja (Rp, Opsional)</label>
              <input
                type="number"
                name="minPurchase"
                min="0"
                step="1000"
                placeholder="0"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
            >
              <span>Simpan Promo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right: Table Daftar Diskon */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#201C1A]">Daftar Voucher & Diskon</h3>
            <span className="text-xs text-[#8E867C]">{discountsList.length} Promo Terdaftar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Promo</th>
                  <th className="py-3 px-4">Cabang</th>
                  <th className="py-3 px-4">Nilai Potongan</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {discountsList.map((d) => (
                  <tr key={d.id} className="hover:bg-[#FBF9F6]">
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#201C1A]">{d.name}</p>
                      {d.minPurchase && d.minPurchase > 0 ? (
                        <p className="text-[10px] text-[#8E867C]">Min: {formatRupiah(d.minPurchase)}</p>
                      ) : (
                        <p className="text-[10px] text-[#8E867C]">Tanpa min. belanja</p>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-[#4A4238]">{d.outletName}</td>
                    <td className="py-3.5 px-4 font-black text-[#54382B]">
                      {d.type === 'percentage' ? `${d.value}%` : formatRupiah(d.value)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          d.isActive === 1
                            ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                            : 'bg-[#F2EDE5] text-[#8E867C] border border-[#E0D8CC]'
                        }`}
                      >
                        {d.isActive === 1 ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        type="button"
                        onClick={() => handleToggle(d.id, d.isActive)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-colors ${
                          d.isActive === 1
                            ? 'bg-[#FAF8F5] hover:bg-[#F2ECE5] text-[#8E867C] border-[#E0D8CC]'
                            : 'bg-[#EBF6EE] hover:bg-[#DCF0E2] text-[#2D7A47] border-[#D1EBD8]'
                        }`}
                      >
                        {d.isActive === 1 ? 'Nonaktifkan' : 'Aktifkan'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(d.id)}
                        className="p-1 text-[#9E968B] hover:text-[#964B3B] transition-colors"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </td>
                  </tr>
                ))}

                {discountsList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[#9E968B]">
                      <Tag className="w-8 h-8 mx-auto mb-2 text-[#D5CEC2]" />
                      <p className="font-bold text-xs text-[#4A4238]">Belum ada promo terdaftar</p>
                      <p className="text-[11px] text-[#9E968B] mt-0.5">Buat diskon pertama di sebelah kiri</p>
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
