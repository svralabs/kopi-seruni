'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { adjustRawMaterialStock } from '@/app/actions/stock';
import { formatDate, formatDateTime, formatRupiah } from '@/lib/utils';
import { toast } from '@/lib/toast';
import { 
  Warehouse, 
  Plus, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  XCircle, 
  X, 
  History, 
  FlaskConical,
  Coffee,
  Coins,
  ArrowRight,
  Info
} from 'lucide-react';

export interface ProductEstimation {
  product: {
    id: string;
    name: string;
    price: number;
    costPrice: number;
    category?: string;
  };
  estimatedPortions: number | null;
  bottleneck: string;
  ingredients: Array<{
    name: string;
    quantityUsed: number;
    unit: string;
  }>;
}

export default function StockClient({
  rawMaterialList = [],
  rawMaterialMovementList = [],
  productEstimations = [],
  outlets = [],
  currentOutletId = 'out_default',
  initialTab = 'bahan-baku',
}: {
  rawMaterialList: any[];
  rawMaterialMovementList: any[];
  productEstimations: ProductEstimation[];
  outlets: any[];
  currentOutletId?: string;
  initialTab?: string;
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'bahan-baku' | 'estimasi-menu' | 'history'>(
    initialTab === 'estimasi-menu' || initialTab === 'produk'
      ? 'estimasi-menu'
      : initialTab === 'history'
      ? 'history'
      : 'bahan-baku'
  );

  const [rmSearchQuery, setRmSearchQuery] = useState('');
  const [rmStatusFilter, setRmStatusFilter] = useState<'all' | 'safe' | 'low' | 'out'>('all');

  const [menuSearchQuery, setMenuSearchQuery] = useState('');
  const [menuStatusFilter, setMenuStatusFilter] = useState<'all' | 'ready' | 'low' | 'out'>('all');

  const [selectedRmId, setSelectedRmId] = useState('');
  const [isPending, startTransition] = useTransition();

  // Metrics Bahan Baku
  let countSafeRm = 0;
  let countLowRm = 0;
  let countOutRm = 0;
  let totalAssetValue = 0;

  rawMaterialList.forEach(({ material: m, stock: s }) => {
    const q = s?.quantityOnHand ?? 0;
    const cost = m.costPerUnit ?? 0;
    totalAssetValue += q * cost;

    const isLow = (m.unit === 'pcs' && q > 0 && q <= 20) || ((m.unit === 'gr' || m.unit === 'ml') && q > 0 && q <= 500);
    const isOut = q <= 0;

    if (isOut) countOutRm++;
    else if (isLow) countLowRm++;
    else countSafeRm++;
  });

  // Filtered Bahan Baku
  const filteredRawMaterials = rawMaterialList.filter(({ material: m, stock: s }) => {
    const q = s?.quantityOnHand ?? 0;
    const isLow = (m.unit === 'pcs' && q > 0 && q <= 20) || ((m.unit === 'gr' || m.unit === 'ml') && q > 0 && q <= 500);
    const isOut = q <= 0;
    const isSafe = !isLow && !isOut;

    const matchSearch = m.name.toLowerCase().includes(rmSearchQuery.toLowerCase());
    const matchStatus =
      rmStatusFilter === 'all'
        ? true
        : rmStatusFilter === 'safe'
        ? isSafe
        : rmStatusFilter === 'low'
        ? isLow
        : isOut;

    return matchSearch && matchStatus;
  });

  // Filtered Menu Estimasi Porsi
  const filteredMenuEstimations = productEstimations.filter((item) => {
    const matchSearch = item.product.name.toLowerCase().includes(menuSearchQuery.toLowerCase());
    const p = item.estimatedPortions;
    const isOut = p !== null && p <= 0;
    const isLow = p !== null && p > 0 && p <= 10;
    const isReady = p !== null && p > 10;

    const matchStatus =
      menuStatusFilter === 'all'
        ? true
        : menuStatusFilter === 'ready'
        ? isReady
        : menuStatusFilter === 'low'
        ? isLow
        : isOut;

    return matchSearch && matchStatus;
  });

  const currentOutletName = outlets.find((o) => o.id === currentOutletId)?.name || 'Outlet Utama';

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Inventori Bahan Baku & Estimasi Stok
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Manajemen stok fisik bahan mentah gudang dan estimasi porsi menu berbasis resep di {currentOutletName}
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            if (rawMaterialList.length > 0 && !selectedRmId) {
              setSelectedRmId(rawMaterialList[0].material.id);
            }
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Input Mutasi Bahan Baku</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Total Bahan Baku Aman</p>
            <h3 className="text-2xl font-black text-[#2D7A47] mt-1">{countSafeRm} Bahan</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EBF6EE] border border-[#D1EBD8] flex items-center justify-center text-[#2D7A47]">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Perlu Restock / Menipis</p>
            <h3 className="text-2xl font-black text-[#96631E] mt-1">{countLowRm + countOutRm} Bahan</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FDF4E5] border border-[#F2E0C4] flex items-center justify-center text-[#96631E]">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Total Nilai Aset Bahan</p>
            <h3 className="text-2xl font-black text-[#201C1A] mt-1">{formatRupiah(totalAssetValue)}</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#54382B]">
            <Coins className="w-5 h-5" />
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
              onClick={() => setActiveTab('bahan-baku')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'bahan-baku'
                  ? 'bg-white text-[#201C1A] shadow-xs'
                  : 'text-[#8E867C] hover:text-[#201C1A]'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Bahan Baku Fisik ({rawMaterialList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('estimasi-menu')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'estimasi-menu'
                  ? 'bg-white text-[#201C1A] shadow-xs'
                  : 'text-[#8E867C] hover:text-[#201C1A]'
              }`}
            >
              <Coffee className="w-3.5 h-3.5" />
              <span>Estimasi Porsi Menu ({productEstimations.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'history'
                  ? 'bg-white text-[#201C1A] shadow-xs'
                  : 'text-[#8E867C] hover:text-[#201C1A]'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Riwayat Mutasi ({rawMaterialMovementList.length})</span>
            </button>
          </div>

          {/* Filter Bar Tab 1: Bahan Baku */}
          {activeTab === 'bahan-baku' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari bahan baku..."
                  value={rmSearchQuery}
                  onChange={(e) => setRmSearchQuery(e.target.value)}
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
                    onClick={() => setRmStatusFilter(t.key)}
                    className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      rmStatusFilter === t.key
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

          {/* Filter Bar Tab 2: Estimasi Menu */}
          {activeTab === 'estimasi-menu' && (
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#8E867C] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari menu minuman/makanan..."
                  value={menuSearchQuery}
                  onChange={(e) => setMenuSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div className="flex items-center gap-1 bg-[#F9F7F2] p-1 rounded-xl border border-[#E5E0D6] text-xs">
                {(
                  [
                    { key: 'all', label: 'Semua' },
                    { key: 'ready', label: 'Siap Jual' },
                    { key: 'low', label: 'Menipis' },
                    { key: 'out', label: 'Habis' },
                  ] as const
                ).map((t) => (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => setMenuStatusFilter(t.key)}
                    className={`px-2.5 py-0.5 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                      menuStatusFilter === t.key
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

        {/* Tab 1: Sisa Stok Fisik Bahan Baku */}
        {activeTab === 'bahan-baku' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Nama Bahan Baku</th>
                  <th className="py-3.5 px-4 text-right">Satuan</th>
                  <th className="py-3.5 px-4 text-right">Sisa Stok Fisik</th>
                  <th className="py-3.5 px-4 text-right">Harga Beli / Satuan</th>
                  <th className="py-3.5 px-4 text-right">Total Nilai Stok</th>
                  <th className="py-3.5 px-4 text-right">Status Ketersediaan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {filteredRawMaterials.map(({ material: m, stock: s }) => {
                  const qty = s?.quantityOnHand ?? 0;
                  const cost = m.costPerUnit ?? 0;
                  const totalValue = qty * cost;
                  const isLow = (m.unit === 'pcs' && qty > 0 && qty <= 20) || ((m.unit === 'gr' || m.unit === 'ml') && qty > 0 && qty <= 500);
                  const isOut = qty <= 0;

                  return (
                    <tr key={m.id} className="hover:bg-[#FBF9F6] transition-colors">
                      <td className="py-3.5 px-4 font-bold text-[#201C1A]">{m.name}</td>
                      <td className="py-3.5 px-4 text-right text-[#5C5650] font-mono">{m.unit}</td>
                      <td className="py-3.5 px-4 text-right font-black text-sm text-[#201C1A]">
                        {qty.toLocaleString('id-ID')} {m.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right text-[#5C5650]">
                        {formatRupiah(cost)} / {m.unit}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-[#201C1A]">
                        {formatRupiah(totalValue)}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span
                          className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${
                            isOut
                              ? 'bg-[#FBEBE8] text-[#964B3B] border border-[#F3DAD5]'
                              : isLow
                              ? 'bg-[#FDF4E5] text-[#96631E] border border-[#F2E0C4]'
                              : 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                          }`}
                        >
                          {isOut ? 'Habis' : isLow ? 'Menipis' : 'Aman'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {filteredRawMaterials.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-[#9E968B] text-xs">
                      Tidak ada bahan baku yang cocok dengan filter pencarian.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Estimasi Porsi Menu Berdasarkan Resep */}
        {activeTab === 'estimasi-menu' && (
          <div className="space-y-3">
            <div className="p-3.5 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] text-xs text-[#5C5650] flex items-center gap-2.5">
              <Info className="w-4 h-4 text-[#8E867C] shrink-0" />
              <span>
                <strong>Cara Kerja Estimasi:</strong> Stok menu dihitung otomatis secara <em>real-time</em> dari sisa bahan baku terkecil pada resep (Bottleneck Ingredient).
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Nama Menu Produk</th>
                    <th className="py-3.5 px-4">Komposisi Resep Bahan</th>
                    <th className="py-3.5 px-4">Bahan Pembatas (Bottleneck)</th>
                    <th className="py-3.5 px-4 text-right">Estimasi Porsi Siap Jual</th>
                    <th className="py-3.5 px-4 text-right">Status Kesiapan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F0E8]">
                  {filteredMenuEstimations.map((item) => {
                    const p = item.estimatedPortions;
                    const isOut = p !== null && p <= 0;
                    const isLow = p !== null && p > 0 && p <= 10;
                    const isReady = p !== null && p > 10;

                    return (
                      <tr key={item.product.id} className="hover:bg-[#FBF9F6] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#201C1A]">{item.product.name}</div>
                          <div className="text-[10px] text-[#8E867C] mt-0.5">
                            Harga: {formatRupiah(item.product.price)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          {item.ingredients.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-sm">
                              {item.ingredients.map((ing, i) => (
                                <span
                                  key={i}
                                  className="px-2 py-0.5 bg-[#F4F0E8] text-[#54382B] text-[10px] font-semibold rounded-md"
                                >
                                  {ing.quantityUsed}{ing.unit} {ing.name}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-[#8E867C] italic text-[11px]">Resep belum diset</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-[#54382B] font-medium text-xs">
                          {item.bottleneck}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-sm text-[#201C1A]">
                          {p !== null ? (
                            <span className={isOut ? 'text-[#964B3B]' : isLow ? 'text-[#96631E]' : 'text-[#2D7A47]'}>
                              ~{p.toLocaleString('id-ID')} Porsi
                            </span>
                          ) : (
                            <span className="text-[#8E867C] font-normal text-xs">-</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <span
                            className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${
                              isOut
                                ? 'bg-[#FBEBE8] text-[#964B3B] border border-[#F3DAD5]'
                                : isLow
                                ? 'bg-[#FDF4E5] text-[#96631E] border border-[#F2E0C4]'
                                : isReady
                                ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                                : 'bg-[#F4F0E8] text-[#8E867C] border border-[#E5E0D6]'
                            }`}
                          >
                            {isOut ? 'Habis (0)' : isLow ? 'Menipis' : isReady ? 'Siap Jual' : 'Manual'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredMenuEstimations.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-[#9E968B] text-xs">
                        Tidak ada menu yang cocok dengan filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 3: Riwayat Mutasi Bahan Baku */}
        {activeTab === 'history' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Waktu</th>
                  <th className="py-3.5 px-4">Nama Bahan Baku</th>
                  <th className="py-3.5 px-4">Tipe Mutasi</th>
                  <th className="py-3.5 px-4 text-right">Kuantitas</th>
                  <th className="py-3.5 px-4">Keterangan / Ref</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {rawMaterialMovementList.map(({ movement: m, material: mat }) => (
                  <tr key={m.id} className="hover:bg-[#FBF9F6] transition-colors">
                    <td className="py-3 px-4 text-[#7A7268] whitespace-nowrap">
                      {formatDateTime(m.createdAt)}
                    </td>
                    <td className="py-3 px-4 font-bold text-[#201C1A]">
                      {mat?.name || 'Bahan Baku'}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          m.type === 'purchase'
                            ? 'bg-[#EBF6EE] text-[#2D7A47]'
                            : m.type === 'usage'
                            ? 'bg-[#F2ECE4] text-[#7A7268]'
                            : m.type === 'waste'
                            ? 'bg-[#FBEBE8] text-[#964B3B]'
                            : 'bg-[#FDF4E5] text-[#96631E]'
                        }`}
                      >
                        {m.type === 'purchase'
                          ? 'Pembelian PO (+)'
                          : m.type === 'usage'
                          ? 'Pemakaian POS (-)'
                          : m.type === 'waste'
                          ? 'Waste / Basi (-)'
                          : 'Opname Fisik'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-black text-[#201C1A]">
                      {m.quantity > 0 ? `+${m.quantity.toLocaleString('id-ID')}` : m.quantity.toLocaleString('id-ID')} {mat?.unit || ''}
                    </td>
                    <td className="py-3 px-4 text-[#7A7268] max-w-xs truncate">
                      {m.notes || '-'}
                    </td>
                  </tr>
                ))}
                {rawMaterialMovementList.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-[#9E968B] text-xs">
                      Belum ada catatan mutasi bahan baku untuk outlet ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. MODAL DIALOG: INPUT MUTASI BAHAN BAKU */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div className="flex items-center gap-2 text-[#54382B]">
                <Plus className="w-4 h-4" />
                <h3 className="font-bold text-sm text-[#201C1A]">Input Mutasi Stok Bahan Baku</h3>
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
                  await adjustRawMaterialStock(formData);
                  toast.success('Mutasi bahan baku berhasil dicatat & disinkronisasi');
                  setIsModalOpen(false);
                } catch (err: any) {
                  toast.error(err?.message || 'Gagal mencatat mutasi bahan baku');
                }
              }}
              className="space-y-3.5 text-xs"
            >
              <input type="hidden" name="outletId" value={currentOutletId} />

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">
                  Pilih Bahan Baku <span className="text-red-500">*</span>
                </label>
                <select
                  name="rawMaterialId"
                  required
                  value={selectedRmId}
                  onChange={(e) => setSelectedRmId(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold cursor-pointer"
                >
                  {rawMaterialList.map(({ material: m, stock: s }) => (
                    <option key={m.id} value={m.id}>
                      {m.name} (Sisa: {(s?.quantityOnHand ?? 0).toLocaleString('id-ID')} {m.unit})
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
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold cursor-pointer"
                  >
                    <option value="purchase">Stok Masuk / Beli (+)</option>
                    <option value="adjustment">Opname Fisik (+)</option>
                    <option value="waste">Waste / Rusak / Basi (-)</option>
                    <option value="usage">Pemakaian Manual (-)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">
                    Jumlah Satuan <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    required
                    min="1"
                    step="1"
                    placeholder="Contoh: 1000"
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
                  placeholder="Contoh: Restock susu segar 10 liter dari supplier"
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
