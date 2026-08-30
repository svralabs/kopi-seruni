import { db } from '@/lib/db';
import { stock, products, stockMovements } from '@/lib/schema';
import { formatDate } from '@/lib/utils';
import { adjustStock } from '@/app/actions/stock';
import { eq, isNull, desc } from 'drizzle-orm';

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Stok & Inventori</h1>
        <p className="text-sm text-zinc-500">Monitor sisa stok menu/bahan dan riwayat mutasi otomatis dari POS</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Penyesuaian Stok */}
        <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900 flex items-center gap-2">
            <span>📦</span> Penyesuaian / Tambah Stok
          </h3>
          <form action={adjustStock} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Pilih Produk</label>
              <select
                name="productId"
                required
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900"
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
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Jenis Mutasi</label>
                <select
                  name="type"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900"
                >
                  <option value="in">➕ Masuk (Restock)</option>
                  <option value="out">➖ Keluar (Rusak/Waste)</option>
                  <option value="adjustment">🔄 Koreksi Opname</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1">Jumlah (Qty)</label>
                <input
                  type="number"
                  name="quantity"
                  required
                  min="1"
                  step="1"
                  placeholder="10"
                  className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Catatan / Alasan</label>
              <input
                type="text"
                name="notes"
                placeholder="Contoh: Pembelian bahan baku batch 1"
                className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
            >
              Simpan Mutasi Stok
            </button>
          </form>
        </div>

        {/* Right Column: Daftar Sisa Stok Produk */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm p-5 space-y-4">
          <h3 className="font-bold text-sm text-zinc-900">Sisa Stok Menu Saat Ini</h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase">
                  <th className="py-2.5 px-3">Produk</th>
                  <th className="py-2.5 px-3 text-right">Sisa Stok</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {productList.map((p) => {
                  const qty = stockMap[p.id] ?? 0;
                  return (
                    <tr key={p.id} className="hover:bg-zinc-50/70">
                      <td className="py-2.5 px-3 font-semibold text-zinc-900">{p.name}</td>
                      <td className="py-2.5 px-3 text-right font-extrabold text-zinc-900">{qty} pcs</td>
                      <td className="py-2.5 px-3 text-right">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            qty > 10
                              ? 'bg-emerald-100 text-emerald-800'
                              : qty > 0
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
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
                    <td colSpan={3} className="text-center py-6 text-zinc-400 text-xs">
                      Belum ada produk.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 2: Riwayat Mutasi Stok */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
        <h3 className="font-bold text-base text-zinc-900">Riwayat Mutasi Stok Terakhir (Log)</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase">
                <th className="py-3 px-3">Waktu</th>
                <th className="py-3 px-3">Produk</th>
                <th className="py-3 px-3">Tipe Mutasi</th>
                <th className="py-3 px-3">Jumlah (Qty)</th>
                <th className="py-3 px-3">Catatan / Ref</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {movementList.map((m) => (
                <tr key={m.id} className="hover:bg-zinc-50/70">
                  <td className="py-3 px-3 text-xs text-zinc-500 whitespace-nowrap">{formatDate(m.createdAt)}</td>
                  <td className="py-3 px-3 font-semibold text-zinc-900">{productMap[m.productId] || m.productId}</td>
                  <td className="py-3 px-3 text-xs capitalize">
                    <span
                      className={`px-2 py-0.5 rounded font-medium ${
                        m.type === 'in'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.type === 'out'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-zinc-100 text-zinc-700'
                      }`}
                    >
                      {m.type === 'in' ? 'Masuk' : m.type === 'out' ? 'Keluar (POS)' : m.type}
                    </span>
                  </td>
                  <td className="py-3 px-3 font-bold text-zinc-900">
                    <span className={m.quantity > 0 ? 'text-emerald-600' : 'text-red-600'}>
                      {m.quantity > 0 ? `+${m.quantity}` : m.quantity} pcs
                    </span>
                  </td>
                  <td className="py-3 px-3 text-xs text-zinc-500">{m.notes || m.referenceId || '-'}</td>
                </tr>
              ))}
              {movementList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-zinc-400 text-xs">
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
