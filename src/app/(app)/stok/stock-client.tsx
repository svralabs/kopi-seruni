'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adjustStock } from '@/app/actions/stock';
import { formatDate } from '@/lib/utils';
import { 
  Warehouse, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  X, 
  ArrowRight,
  History,
  FileSpreadsheet,
  FlaskConical,
} from 'lucide-react';

export default function StockClient({
  productStockList,
  movementList,
  outlets,
  currentOutletId = 'out_default',
  rawMaterialList = [],
  rawMaterialMovementList = [],
  initialTab = 'produk',
}: {
  productStockList: any[];
  movementList: any[];
  outlets: any[];
  currentOutletId?: string;
  rawMaterialList?: any[];
  rawMaterialMovementList?: any[];
  initialTab?: string;
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'inventory' | 'bahan-baku' | 'history'>(
    initialTab === 'bahan-baku' ? 'bahan-baku' : initialTab === 'history' ? 'history' : 'inventory'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [rmSearchQuery, setRmSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'safe' | 'low' | 'out'>('all');
  const [isPending, startTransition] = useTransition();

  // Metrics
  let countSafe = 0;
  let countLow = 0;
  let countOut = 0;

  productStockList.forEach(({ stock: s }) => {
    const q = s?.quantity ?? 0;
    if (q > 10) countSafe++;
    else if (q > 0) countLow++;
    else countOut++;
  });

  // Filtered Sisa Stok
  const filteredProducts = productStockList.filter(({ product: p, stock: s }) => {
    const q = s?.quantity ?? 0;
    const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus =
      statusFilter === 'all'
        ? true
        : statusFilter === 'safe'
        ? q > 10
        : statusFilter === 'low'
        ? q > 0 && q <= 10
        : q <= 0;
    return matchSearch && matchStatus;
  });

  const currentOutletName = outlets.find((o) => o.id === currentOutletId)?.name || 'Outlet Utama';

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Stok & Inventori Bahan
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Monitoring sisa stok bahan gudang dan log mutasi keluar/masuk di {currentOutletName}
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Input Mutasi Stok</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Stok Aman (&gt;10 pcs)</p>
            <h3 className="text-2xl font-black text-[#2D7A47] mt-1">{countSafe} Menu</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EBF6EE] border border-[#D1EBD8] flex items-center justify-center text-[#2D7A47]">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Stok Menipis (1-10 pcs)</p>
            <h3 className="text-2xl font-black text-[#96631E] mt-1">{countLow} Menu</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FDF4E5] border border-[#F2E0C4] flex items-center justify-center text-[#96631E]">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Stok Habis (0 pcs)</p>
            <h3 className="text-2xl font-black text-[#964B3B] mt-1">{countOut} Menu</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FBEBE8] border border-[#F3DAD5] flex items-center justify-center text-[#964B3B]">
            <XCircle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. FULL-WIDTH DATA TABLE WITH TABS */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        {/* Tab Switcher & Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F0ECE4]">
          {/* Tabs */}
          <div className="flex items-center gap-1.5 bg-[#F9F7F2] p-1 rounded-2xl border border-[#E5E0D6] text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'inventory'
                  ? 'bg-white text-[#201C1A] shadow-xs'
                  : 'text-[#8E867C] hover:text-[#201C1A]'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Sisa Stok Produk ({productStockList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('bahan-baku')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'bahan-baku'
                  ? 'bg-white text-[#201C1A] shadow-xs'
                  : 'text-[#8E867C] hover:text-[#201C1A]'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Bahan Baku ({rawMaterialList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-[#201C1A] shadow-xs'
                  : 'text-[#8E867C] hover:text-[#201C1A]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Mutasi ({movementList.length})</span>
            </button>
          </div>

          {activeTab === 'inventory' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari bahan..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#F9F7F2] p-1 rounded-xl border border-[#E5E0D6] text-xs">
                {(
                  [
                    { key: 'all', label: 'Semua' },
                    { key: 'safe', label: 'Aman' },
                    { key: 'low', label: 'Menipis' },
                    { key: 'out', label: 'Habis' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setStatusFilter(t.key)}
                    className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-all ${
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
          )}
        </div>

        {/* Tab 1: Sisa Stok Fisik */}
        {activeTab === 'inventory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nama Produk / Bahan</th>
                  <th className="py-3.5 px-4 text-right">Sisa Stok Fisik</th>
                  <th className="py-3.5 px-4 text-right">Status Ketersediaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {filteredProducts.map(({ product: p, stock: s }) => {
                  const qty = s?.quantity ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-[#FBF9F6] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#201C1A]">{p.name}</td>
                      <td className="py-3.5 px-4 text-right font-black text-sm text-[#201C1A]">
                        {qty} pcs
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${
                            qty > 10
                              ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                              : qty > 0
                              ? 'bg-[#FDF4E5] text-[#96631E] border border-[#F2E0C4]'
                              : 'bg-[#FBEBE8] text-[#964B3B] border border-[#F3DAD5]'
                          }`}
                        >
                          {qty > 10 ? 'Aman' : qty > 0 ? 'Menipis' : 'Habis'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredProducts.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-12 text-[#9E968B] text-xs">
                      Tidak ada bahan yang cocok dengan pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Bahan Baku */}
        {activeTab === 'bahan-baku' && (
          <div className="space-y-3">
            {/* Search bahan baku */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari bahan baku..."
                value={rmSearchQuery}
                onChange={(e) => setRmSearchQuery(e.target.value)}
                className="w-full sm:w-64 pl-8 pr-3 py-1.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Nama Bahan Baku</th>
                    <th className="py-3.5 px-4 text-right">Satuan</th>
                    <th className="py-3.5 px-4 text-right">Stok Saat Ini</th>
                    <th className="py-3.5 px-4 text-right">Harga / Satuan</th>
                    <th className="py-3.5 px-4 text-right">Nilai Stok</th>
                    <th className="py-3.5 px-4 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F0E8]">
                  {rawMaterialList
                    .filter(({ material: m }) =>
                      m.name.toLowerCase().includes(rmSearchQuery.toLowerCase())
                    )
                    .map(({ material: m, stock: s }) => {
                      const qty = s?.quantityOnHand ?? 0;
                      const nilai = qty * (m.costPerUnit ?? 0);
                      const isLow = qty > 0 && qty < 500;
                      const isOut = qty <= 0;
                      return (
                        <tr key={m.id} className="hover:bg-[#FBF9F6] transition-colors">
                          <td className="py-3.5 px-4 font-bold text-[#201C1A]">{m.name}</td>
                          <td className="py-3.5 px-4 text-right text-[#5C5650]">{m.unit}</td>
                          <td className="py-3.5 px-4 text-right font-black text-[#201C1A]">
                            {qty.toLocaleString('id-ID')} {m.unit}
                          </td>
                          <td className="py-3.5 px-4 text-right text-[#5C5650]">
                            Rp {(m.costPerUnit ?? 0).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4 text-right font-bold text-[#201C1A]">
                            Rp {nilai.toLocaleString('id-ID')}
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${
                              isOut
                                ? 'bg-[#FBEBE8] text-[#964B3B] border border-[#F3DAD5]'
                                : isLow
                                ? 'bg-[#FDF4E5] text-[#96631E] border border-[#F2E0C4]'
                                : 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                            }`}>
                              {isOut ? 'Habis' : isLow ? 'Menipis' : 'Aman'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  {rawMaterialList.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-[#9E968B] text-xs">
                        Belum ada data bahan baku. Bahan baku akan muncul setelah resep menu dikonfigurasi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Log Riwayat Mutasi */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Bahan Baku / Menu</th>
                  <th className="py-3.5 px-4">Tipe Mutasi</th>
                  <th className="py-3.5 px-4 text-right">Kuantitas</th>
                  <th className="py-3.5 px-4">Catatan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {movementList.map(({ movement: m, product: p }) => (
                  <tr key={m.id} className="hover:bg-[#FBF9F6] transition-colors">
                    <td className="py-3 px-4 text-[#7A7268] whitespace-nowrap font-medium">
                      {formatDate(m.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#201C1A]">
                      {p?.name || m.productId}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] px-2.5 py-1 rounded-full font-bold uppercase ${
                          m.type === 'in' || m.type === 'po_receive'
                            ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                            : m.type === 'adjustment'
                            ? 'bg-[#FDF4E5] text-[#96631E] border border-[#F2E0C4]'
                            : 'bg-[#FBEBE8] text-[#964B3B] border border-[#F3DAD5]'
                        }`}
                      >
                        {m.type === 'in'
                          ? 'Stok Masuk (+)'
                          : m.type === 'out'
                          ? 'Stok Keluar (-)'
                          : m.type === 'po_receive'
                          ? 'PO Terima (+)'
                          : m.type === 'adjustment'
                          ? 'Opname Fisik'
                          : m.type === 'waste'
                          ? 'Waste / Basi (-)'
                          : m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-[#201C1A]">
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} pcs
                    </td>
                    <td className="py-3 px-4 text-[#7A7268] max-w-xs truncate">
                      {m.notes || '-'}
                    </td>
                  </tr>
                ))}
                {movementList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[#9E968B] text-xs">
                      Belum ada catatan mutasi stok untuk outlet ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. MODAL DIALOG: INPUT MUTASI STOK */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <Plus className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#201C1A]">Input Mutasi Stok</h3>
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
                await adjustStock(formData);
                setIsModalOpen(false);
              }}
              className="space-y-3.5 text-xs"
            >
              <input type="hidden" name="outletId" value={currentOutletId} />

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Pilih Menu / Bahan Baku <span className="text-red-500">*</span>
                </label>
                <select
                  name="productId"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                >
                  {productStockList.map(({ product: p, stock: s }) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Sisa: {s?.quantity ?? 0} pcs)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Jenis Mutasi <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="type"
                    required
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                  >
                    <option value="in">Stok Masuk (+)</option>
                    <option value="out">Stok Keluar (-)</option>
                    <option value="adjustment">Opname Fisik</option>
                    <option value="waste">Waste / Basi (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Kuantitas (Pcs) <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="1"
                    step="1"
                    placeholder="10"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Catatan / Keterangan
                </label>
                <input
                  type="text"
                  name="notes"
                  placeholder="Contoh: Restock vendor kopi batch 4"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
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
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
