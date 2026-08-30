import { db } from '@/lib/db';
import { products, categories } from '@/lib/schema';
import { formatRupiah } from '@/lib/utils';
import { isNull, desc } from 'drizzle-orm';
import Link from 'next/link';
import DeleteProductButton from './delete-button';

export default async function ProductsPage() {
  let productList: any[] = [];
  let categoryMap: Record<string, string> = {};

  try {
    productList = await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.createdAt));

    const cats = await db.select().from(categories);
    cats.forEach((c) => {
      categoryMap[c.id] = c.name;
    });
  } catch (e) {
    console.warn('Error fetching products:', e);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Manajemen Produk & Menu</h1>
          <p className="text-sm text-zinc-500">Kelola harga jual, HPP, dan ketersediaan menu</p>
        </div>

        <Link
          href="/products/baru"
          className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm inline-flex items-center gap-2 self-start"
        >
          <span>➕</span> Tambah Menu Baru
        </Link>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {productList.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 space-y-2">
            <span className="text-4xl block">📦</span>
            <p className="text-sm font-medium">Belum ada produk terdaftar</p>
            <p className="text-xs text-zinc-400">Klik "Tambah Menu Baru" atau jalankan migrasi data master</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase">
                  <th className="py-3.5 px-4">Menu / Produk</th>
                  <th className="py-3.5 px-4">Kategori</th>
                  <th className="py-3.5 px-4">Harga Jual</th>
                  <th className="py-3.5 px-4">HPP (Modal)</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {productList.map((prod) => (
                  <tr key={prod.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-zinc-100 overflow-hidden flex items-center justify-center text-lg shrink-0">
                          {prod.imageUrl ? (
                            <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>☕</span>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-900">{prod.name}</p>
                          <p className="text-xs text-zinc-400 font-mono">{prod.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-zinc-600">
                      {prod.categoryId ? categoryMap[prod.categoryId] || 'Lainnya' : '-'}
                    </td>
                    <td className="py-3 px-4 font-bold text-zinc-900">
                      {formatRupiah(prod.price)}
                    </td>
                    <td className="py-3 px-4 text-zinc-600 font-medium">
                      {prod.costPrice > 0 ? (
                        formatRupiah(prod.costPrice)
                      ) : (
                        <span className="text-xs text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Belum diisi
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                          prod.isActive
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-zinc-100 text-zinc-600'
                        }`}
                      >
                        {prod.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <DeleteProductButton productId={prod.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
