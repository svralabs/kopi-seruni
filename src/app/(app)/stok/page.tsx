import { db } from '@/lib/db';
import { stock, products, stockMovements } from '@/lib/schema';
import { formatDate } from '@/lib/utils';
import { adjustStock } from '@/app/actions/stock';
import { eq, isNull, desc } from 'drizzle-orm';
import { Warehouse, Plus, ArrowDownLeft, ArrowUpRight, RotateCcw } from 'lucide-react';

export default async function StockPage() {
  let productList: any[] = [];
  let stockList: any[] = [];
  let movementList: any[] = [];

  try {
    productList = await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt));

    stockList = await db.select().from(stock);

    movementList = await db
      .select()
      .from(stockMovements)
      .orderBy(desc(stockMovements.createdAt))
      .limit(15);
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

  return (
    <div className="space-y-8">
      {/* Header Bento */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Stok & Inventori
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Monitor sisa stok menu/bahan dan riwayat mutasi otomatis dari transaksi POS
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Penyesuaian Stok */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#54382B] flex items-center gap-2">
            <Plus className="w-4 h-4" /> Penyesuaian & Restock
          </h3>

          <form action={adjustStock} className="space-y-3.5 text-xs">
            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Pilih Produk</label>
              <select
                name="productId"
                required
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              >
                <option value="">-- Pilih Produk --</option>
                {productList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Sisa: {stockMap[p.id] ?? 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Jenis Mutasi</label>
                <select
                  name="type"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
                >
                  <option value="in">Masuk (Restock)</option>
                  <option value="out">Keluar (Waste/Rusak)</option>
                  <option value="adjustment">Koreksi Opname</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Jumlah (Qty)</label>
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
          <h3 className="font-bold text-sm text-[#201C1A]">Sisa Stok Menu Saat Ini</h3>

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
                {productList.length === 0 && (
                  <tr>
                    <td colSpan={3} className="text-center py-6 text-[#9E968B] text-xs">
                      Belum ada data produk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: Riwayat Mutasi Log */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <h3 className="font-bold text-base text-[#201C1A]">Riwayat Mutasi Stok Terakhir (Log)</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Waktu</th>
                <th className="py-3.5 px-4">Produk</th>
                <th className="py-3.5 px-4">Tipe Mutasi</th>
                <th className="py-3.5 px-4">Jumlah (Qty)</th>
                <th className="py-3.5 px-4">Catatan / Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {movementList.map((m) => (
                <tr key={m.id} className="hover:bg-[#FBF9F6]">
                  <td className="py-3 px-4 text-[#7A7268] whitespace-nowrap">{formatDate(m.createdAt)}</td>
                  <td className="py-3 px-4 font-bold text-[#201C1A]">{productMap[m.productId] || m.productId}</td>
                  <td className="py-3 px-4 text-[11px] capitalize">
                    <span
                      className={`px-2.5 py-0.5 rounded-lg font-bold ${
                        m.type === 'in'
                          ? 'bg-[#EBF6EE] text-[#2D7A47]'
                          : m.type === 'out'
                          ? 'bg-[#FBEBE8] text-[#964B3B]'
                          : 'bg-[#F2EDE5] text-[#54382B]'
                      }`}
                    >
                      {m.type === 'in' ? 'Masuk' : m.type === 'out' ? 'Keluar (POS)' : m.type}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-black">
                    <span className={m.quantity > 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} pcs
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#7A7268]">{m.notes || m.referenceId || '-'}</td>
                </tr>
              ))}
              {movementList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#9E968B] text-xs">
                    Belum ada log mutasi stok.
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
