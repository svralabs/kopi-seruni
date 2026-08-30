'use client';

import { useState, useTransition } from 'react';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { createPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder } from '@/app/actions/purchases';
import type { Outlet, Product } from '@/lib/schema';
import { Plus, PackageCheck, Ban, Truck, ArrowRight, Store, CheckCircle2, Clock } from 'lucide-react';

export interface PurchaseOrderRecord {
  id: string;
  outletId: string;
  outletName: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  status: 'draft' | 'ordered' | 'received' | 'cancelled';
  notes?: string | null;
  createdAt: number;
  receivedAt?: number | null;
}

export default function PurchasesClient({
  ordersList,
  productsList,
  outlets,
}: {
  ordersList: PurchaseOrderRecord[];
  productsList: Product[];
  outlets: Outlet[];
}) {
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [isPending, startTransition] = useTransition();

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const pId = e.target.value;
    setSelectedProductId(pId);
    const prod = productsList.find((p) => p.id === pId);
    if (prod && prod.costPrice) {
      setUnitCost(prod.costPrice);
    }
  };

  const handleReceive = (poId: string, outletId: string) => {
    if (!confirm('Konfirmasi penerimaan barang? Stok produk akan otomatis bertambah.')) return;
    startTransition(async () => {
      await receivePurchaseOrder(poId, outletId);
    });
  };

  const handleCancel = (poId: string) => {
    if (!confirm('Yakin ingin membatalkan Purchase Order ini?')) return;
    startTransition(async () => {
      await cancelPurchaseOrder(poId);
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Purchase Order (PO) Pembelian Bahan
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Pesan bahan baku dari vendor dan otomatis tambah stok saat barang diterima di gudang
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Form Buat PO Baru */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 text-[#54382B]">
            <Plus className="w-4 h-4" />
            <h3 className="font-bold text-xs uppercase tracking-wider">Buat Purchase Order Baru</h3>
          </div>

          <form action={createPurchaseOrder} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Cabang Penerima</label>
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

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Pilih Menu / Bahan</label>
              <select
                name="productId"
                required
                value={selectedProductId}
                onChange={handleProductChange}
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
              >
                <option value="">-- Pilih Produk --</option>
                {productsList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (HPP: {formatRupiah(p.costPrice || 0)})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Jumlah (Qty)</label>
                <input
                  type="number"
                  name="quantity"
                  required
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
                />
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Biaya / Unit (Rp)</label>
                <input
                  type="number"
                  name="unitCost"
                  required
                  min="0"
                  step="500"
                  value={unitCost || ''}
                  onChange={(e) => setUnitCost(Number(e.target.value))}
                  placeholder="8000"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
                />
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] flex items-center justify-between font-bold">
              <span className="text-[#8E867C]">Estimasi Total Biaya</span>
              <span className="text-sm text-[#201C1A]">{formatRupiah(quantity * unitCost)}</span>
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Catatan / Nama Supplier</label>
              <input
                type="text"
                name="notes"
                placeholder="Contoh: Supplier Biji Kopi Robusta Batch 12"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-[11px] focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-3 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 mt-2 disabled:opacity-50"
            >
              <span>Kirim Purchase Order</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Right: Table Riwayat PO */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#201C1A]">Riwayat Purchase Order</h3>
            <span className="text-xs text-[#8E867C]">{ordersList.length} PO Tercatat</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">No. PO & Waktu</th>
                  <th className="py-3 px-4">Cabang</th>
                  <th className="py-3 px-4">Barang & Qty</th>
                  <th className="py-3 px-4">Total Biaya</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {ordersList.map((po) => (
                  <tr key={po.id} className="hover:bg-[#FBF9F6]">
                    <td className="py-3.5 px-4">
                      <p className="font-mono font-bold text-[#201C1A]">{po.id}</p>
                      <p className="text-[10px] text-[#8E867C]">{formatDateTime(po.createdAt)}</p>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-[#201C1A]">{po.outletName}</td>
                    <td className="py-3.5 px-4">
                      <p className="font-bold text-[#201C1A]">{po.productName}</p>
                      <p className="text-[10px] text-[#8E867C]">
                        {po.quantity} pcs @ {formatRupiah(po.unitCost)}
                      </p>
                    </td>
                    <td className="py-3.5 px-4 font-black text-[#201C1A]">
                      {formatRupiah(po.total)}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          po.status === 'received'
                            ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                            : po.status === 'ordered'
                            ? 'bg-[#FDF4E5] text-[#96631E] border border-[#F5E2BE]'
                            : 'bg-[#FBEBE8] text-[#964B3B] border border-[#F5C7BE]'
                        }`}
                      >
                        {po.status === 'received'
                          ? 'Diterima'
                          : po.status === 'ordered'
                          ? 'Dipesan'
                          : 'Batal'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-1.5 whitespace-nowrap">
                      {po.status === 'ordered' && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleReceive(po.id, po.outletId)}
                            className="px-2.5 py-1 bg-[#2D7A47] hover:bg-[#236338] text-white font-bold rounded-xl text-[11px] transition-colors inline-flex items-center gap-1"
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>Terima Barang</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCancel(po.id)}
                            className="px-2 py-1 bg-[#FAF8F5] hover:bg-[#FBEBE8] text-[#964B3B] font-bold rounded-xl text-[11px] border border-[#E5E0D6] transition-colors"
                          >
                            Batal
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}

                {ordersList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#9E968B]">
                      <Truck className="w-8 h-8 mx-auto mb-2 text-[#D5CEC2]" />
                      <p className="font-bold text-xs text-[#4A4238]">Belum ada Purchase Order</p>
                      <p className="text-[11px] text-[#9E968B] mt-0.5">Buat PO bahan pertama di sebelah kiri</p>
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
