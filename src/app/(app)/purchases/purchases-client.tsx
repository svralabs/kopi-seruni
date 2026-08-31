'use client';

import { useState, useTransition } from 'react';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { createPurchaseOrder, receivePurchaseOrder, cancelPurchaseOrder } from '@/app/actions/purchases';
import type { Outlet, Product } from '@/lib/schema';
import ConfirmModal from '@/components/confirm-modal';
import { toast } from '@/lib/toast';
import { 
  Plus, 
  PackageCheck, 
  Truck, 
  ShoppingBag, 
  Clock, 
  CheckCircle, 
  X, 
  Search, 
  ArrowRight 
} from 'lucide-react';

export interface PurchaseOrderRecord {
  id: string;
  outletId: string;
  outletName: string;
  productId?: string;
  productName: string;
  quantity: number;
  unitCost: number;
  total: number;
  status: 'ordered' | 'received' | 'cancelled';
  notes: string | null;
  createdAt: number;
  receivedAt: number | null;
}

export default function PurchasesClient({
  ordersList,
  productsList,
  outlets,
  currentOutletId = 'all',
}: {
  ordersList: PurchaseOrderRecord[];
  productsList: any[];
  outlets: Outlet[];
  currentOutletId?: string;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receivingPo, setReceivingPo] = useState<PurchaseOrderRecord | null>(null);
  const [cancellingPo, setCancellingPo] = useState<PurchaseOrderRecord | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'ordered' | 'received' | 'cancelled'>('all');
  const [isPending, startTransition] = useTransition();

  // Form State
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);

  const handleProductChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const prodId = e.target.value;
    setSelectedProductId(prodId);
    const prod = productsList.find((p) => p.id === prodId);
    if (prod && prod.costPrice) {
      setUnitCost(prod.costPrice);
    } else {
      setUnitCost(0);
    }
  };

  const handleConfirmReceive = () => {
    if (!receivingPo) return;
    startTransition(async () => {
      try {
        await receivePurchaseOrder(receivingPo.id, receivingPo.outletId);
        toast.success(`Barang PO #${receivingPo.id} berhasil diterima & stok bertambah`);
        setReceivingPo(null);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menerima barang PO');
      }
    });
  };

  const handleConfirmCancel = () => {
    if (!cancellingPo) return;
    startTransition(async () => {
      try {
        await cancelPurchaseOrder(cancellingPo.id);
        toast.success(`Purchase Order #${cancellingPo.id} berhasil dibatalkan`);
        setCancellingPo(null);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal membatalkan PO');
      }
    });
  };

  // Metrics
  const totalCount = ordersList.length;
  const orderedCount = ordersList.filter((o) => o.status === 'ordered').length;
  const receivedCount = ordersList.filter((o) => o.status === 'received').length;

  // Filtered List
  const filteredList = ordersList.filter((o) => {
    const matchQuery =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.outletName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === 'all' ? true : o.status === statusFilter;
    return matchQuery && matchStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Purchase Order (PO) Pembelian Bahan
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Pesan bahan baku dari vendor dan otomatis tambah stok saat barang diterima di gudang
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Buat PO Baru</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Total Purchase Order</p>
            <h3 className="text-2xl font-black text-[#201C1A] mt-1">{totalCount} Pesanan</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#54382B]">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Menunggu Barang</p>
            <h3 className="text-2xl font-black text-[#96631E] mt-1">{orderedCount} Pesanan</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FDF4E5] border border-[#F2E0C4] flex items-center justify-center text-[#96631E]">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Selesai Diterima</p>
            <h3 className="text-2xl font-black text-[#2D7A47] mt-1">{receivedCount} Pesanan</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EBF6EE] border border-[#D1EBD8] flex items-center justify-center text-[#2D7A47]">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. FULL-WIDTH DATA TABLE */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F0ECE4]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#8E867C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari PO / bahan / cabang..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
            />
          </div>

          <div className="flex items-center gap-1 bg-[#F9F7F2] p-1 rounded-xl border border-[#E5E0D6] text-xs">
            {(
              [
                { key: 'all', label: 'Semua' },
                { key: 'ordered', label: 'Dipesan' },
                { key: 'received', label: 'Diterima' },
                { key: 'cancelled', label: 'Batal' },
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

        {/* PO Table */}
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
              {filteredList.map((po) => (
                <tr key={po.id} className="hover:bg-[#FBF9F6] transition-colors">
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
                          disabled={isPending}
                          onClick={() => setReceivingPo(po)}
                          className="px-3 py-1.5 bg-[#2D7A47] hover:bg-[#236338] text-white font-bold rounded-xl text-xs transition-colors inline-flex items-center gap-1 shadow-xs cursor-pointer"
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>Terima Barang</span>
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setCancellingPo(po)}
                          className="px-2.5 py-1.5 bg-[#FAF8F5] hover:bg-[#FBEBE8] text-[#964B3B] font-bold rounded-xl text-xs border border-[#E5E0D6] transition-colors cursor-pointer"
                        >
                          Batal
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#9E968B]">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-[#D5CEC2]" />
                    <p className="font-bold text-xs text-[#4A4238]">Belum ada Purchase Order</p>
                    <p className="text-[11px] text-[#9E968B] mt-0.5">
                      Klik tombol &quot;Buat PO Baru&quot; di atas untuk membuat pesanan pembelian bahan.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. MODAL DIALOG: BUAT PO BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <Plus className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#201C1A]">Buat Purchase Order (PO) Baru</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-[#9E968B] hover:text-[#201C1A] p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              action={async (formData) => {
                try {
                  await createPurchaseOrder(formData);
                  toast.success('Purchase Order berhasil dibuat');
                  setIsModalOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal membuat Purchase Order');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Cabang Penerima <span className="text-red-500">*</span>
                  </label>
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
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Pilih Menu / Bahan <span className="text-red-500">*</span>
                  </label>
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
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Jumlah (Qty) <span className="text-red-500">*</span>
                  </label>
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
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Biaya / Unit (Rp) <span className="text-red-500">*</span>
                  </label>
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
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
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
                  Kirim Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL: KONFIRMASI TERIMA BARANG */}
      <ConfirmModal
        isOpen={!!receivingPo}
        title="Konfirmasi Penerimaan Barang?"
        description="Barang pesanan telah sampai di cabang. Stok produk di cabang terkait akan otomatis bertambah."
        confirmLabel="Terima & Tambah Stok"
        cancelLabel="Batal"
        variant="success"
        isPending={isPending}
        onClose={() => setReceivingPo(null)}
        onConfirm={handleConfirmReceive}
        itemDetails={
          receivingPo
            ? [
                { label: 'No. PO', value: receivingPo.id },
                { label: 'Produk', value: receivingPo.productName },
                { label: 'Cabang Penerima', value: receivingPo.outletName },
                { label: 'Jumlah Masuk', value: `${receivingPo.quantity} pcs` },
                { label: 'Total Nilai', value: formatRupiah(receivingPo.total) },
              ]
            : undefined
        }
      />

      {/* 5. MODAL: KONFIRMASI BATAL PO */}
      <ConfirmModal
        isOpen={!!cancellingPo}
        title="Batalkan Purchase Order?"
        description="Pesanan pembelian bahan ini akan dibatalkan."
        confirmLabel="Batalkan PO"
        cancelLabel="Kembali"
        variant="danger"
        isPending={isPending}
        onClose={() => setCancellingPo(null)}
        onConfirm={handleConfirmCancel}
        itemDetails={
          cancellingPo
            ? [
                { label: 'No. PO', value: cancellingPo.id },
                { label: 'Produk', value: cancellingPo.productName },
                { label: 'Cabang', value: cancellingPo.outletName },
                { label: 'Total', value: formatRupiah(cancellingPo.total) },
              ]
            : undefined
        }
      />
    </div>
  );
}
