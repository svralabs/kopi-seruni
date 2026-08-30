import { db } from '@/lib/db';
import { stock, products, stockMovements, outlets } from '@/lib/schema';
import { formatDate } from '@/lib/utils';
import { adjustStock } from '@/app/actions/stock';
import { eq, and, isNull, desc, sql } from 'drizzle-orm';
import { Warehouse, Plus, ArrowDownLeft, ArrowUpRight, RotateCcw, Store } from 'lucide-react';
import PaginationControls from '@/components/pagination-controls';


export default async function StockPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string; page?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'out_default';
  const page = Math.max(1, Number(resolvedParams.page || 1));
  const pageSize = 12;
  const offset = (page - 1) * pageSize;

  let allOutlets: any[] = [];
  let productList: any[] = [];
  let stockList: any[] = [];
  let movementList: any[] = [];
  let totalItems = 0;
  let totalPages = 1;

  try {
    allOutlets = await db.select().from(outlets);

    const countQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(isNull(products.deletedAt));

    totalItems = Number(countQuery[0]?.count || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    productList = await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset(offset);

    stockList = await db
      .select()
      .from(stock)
      .where(eq(stock.outletId, outletId));

    movementList = await db
      .select()
      .from(stockMovements)
      .where(eq(stockMovements.outletId, outletId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(10);
  } catch (e) {
    console.warn('Error fetching stock data:', e);
  }

  const stockMap: Record<string, number> = {};
  stockList.forEach((s) => {
    stockMap[s.productId] = s.quantity;
  });

  const productMap: Record<string, string> = {};
  productList.forEach((p) => {
    productMap[p.id] = p.name;
  });

  const currentOutletName = allOutlets.find((o) => o.id === outletId)?.name || 'Outlet Utama';

  return (
    <div className="space-y-8">
      {/* Header Bento */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Inventori & Stok Bahan Baku
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Manajemen stok masuk, penyesuaian opname fisik, dan log riwayat mutasi per outlet ({currentOutletName})
        </p>
      </div>


      {/* Grid 2 Kolom: Form Input Mutasi & Daftar Sisa Stok */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Adjust Stok */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#54382B] flex items-center gap-2">
              <Plus className="w-4 h-4" /> Input Mutasi Stok
            </h3>
            <span className="text-[10px] font-bold text-[#8E867C]">{currentOutletName}</span>
          </div>

          <form action={adjustStock} className="space-y-3.5 text-xs">
            <input type="hidden" name="outletId" value={outletId} />

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Pilih Menu / Bahan</label>
              <select
                name="productId"
                required
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
              >
                {productList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Sisa: {stockMap[p.id] ?? 0} pcs)
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Jenis Mutasi</label>
                <select
                  name="type"
                  required
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                >
                  <option value="in">Stok Masuk (+)</option>
                  <option value="out">Stok Keluar (-)</option>
                  <option value="adjustment">Penyesuaian (Opname)</option>
                  <option value="waste">Rusak / Basi (-)</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Jumlah (Pcs)</label>
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
              <label className="block font-bold text-[#4A4238] mb-1.5">Catatan / Alasan</label>
              <input
                type="text"
                name="notes"
                placeholder="Contoh: Pembelian bahan batch 1 dari supplier"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-[11px] focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs"
            >
              Simpan Mutasi Stok
            </button>
          </form>
        </div>

        {/* Right Column: Daftar Sisa Stok */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-[#201C1A]">Sisa Stok: {currentOutletName}</h3>
            <span className="text-xs text-[#8E867C]">{totalItems} Menu Terdaftar</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Produk</th>
                  <th className="py-3 px-4 text-right">Sisa Stok</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {productList.map((p) => {
                  const qty = stockMap[p.id] ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-[#FBF9F6]">
                      <td className="py-3 px-4 font-bold text-[#201C1A]">{p.name}</td>
                      <td className="py-3 px-4 text-right font-black text-[#201C1A]">{qty} pcs</td>
                      <td className="py-3 px-4 text-right">
                        <span
                          className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                            qty > 10
                              ? 'bg-[#EBF6EE] text-[#2D7A47]'
                              : qty > 0
                              ? 'bg-[#FDF4E5] text-[#96631E]'
                              : 'bg-[#FBEBE8] text-[#964B3B]'
                          }`}
                        >
                          {qty > 10 ? 'Aman' : qty > 0 ? 'Menipis' : 'Habis'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <PaginationControls
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        </div>
      </div>

      {/* SECTION 2: Log Riwayat Mutasi Stok */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <h3 className="font-bold text-base text-[#201C1A]">Log Riwayat Mutasi Stok</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4">Produk</th>
                <th className="py-3 px-4">Tipe Mutasi</th>
                <th className="py-3 px-4 text-right">Jumlah</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {movementList.map((m) => (
                <tr key={m.id} className="hover:bg-[#FBF9F6]">
                  <td className="py-3 px-4 text-[#7A7268] whitespace-nowrap">{formatDate(m.createdAt)}</td>
                  <td className="py-3 px-4 font-bold text-[#201C1A]">
                    {productMap[m.productId] || m.productId}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        m.type === 'in' || m.type === 'po_receive'
                          ? 'bg-[#EBF6EE] text-[#2D7A47]'
                          : 'bg-[#FBEBE8] text-[#964B3B]'
                      }`}
                    >
                      {m.type === 'in'
                        ? 'Masuk'
                        : m.type === 'out'
                        ? 'Keluar'
                        : m.type === 'po_receive'
                        ? 'PO Terima'
                        : m.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-[#201C1A]">
                    {m.quantity > 0 ? `+${m.quantity}` : m.quantity} pcs
                  </td>
                  <td className="py-3 px-4 text-[#7A7268]">{m.notes || '-'}</td>
                </tr>
              ))}
              {movementList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#9E968B] text-xs">
                    Belum ada riwayat mutasi stok.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
