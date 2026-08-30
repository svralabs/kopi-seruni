import { db } from '@/lib/db';
import { categories } from '@/lib/schema';
import { createProduct } from '@/app/actions/products';
import Link from 'next/link';

export default async function NewProductPage() {
  let categoryList: any[] = [];
  try {
    categoryList = await db.select().from(categories);
  } catch (e) {
    console.warn('Categories query error:', e);
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="w-8 h-8 rounded-lg bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:bg-zinc-50"
        >
          &larr;
        </Link>
        <div>
          <h1 className="text-xl font-bold text-zinc-900">Tambah Produk Baru</h1>
          <p className="text-xs text-zinc-500">Masukkan detail menu dan kalkulasi harga</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-6">
        <form action={createProduct} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">
              Nama Produk / Menu <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              required
              placeholder="Contoh: Es Kopi Susu Seruni"
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-zinc-900"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">Kategori</label>
              <select
                name="categoryId"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-zinc-900"
              >
                <option value="">-- Pilih Kategori --</option>
                {categoryList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Harga Jual (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                required
                min="0"
                step="1"
                placeholder="25000"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-zinc-900 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                HPP / Harga Pokok Produksi (Rp)
              </label>
              <input
                type="number"
                name="costPrice"
                min="0"
                step="1"
                placeholder="8000"
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-zinc-900"
              />
              <span className="text-[10px] text-zinc-400">Digunakan untuk menghitung Laba Rugi real</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">URL Foto Produk</label>
              <input
                type="url"
                name="imageUrl"
                placeholder="https://media.kopiseruni.com/products/..."
                className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-zinc-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Deskripsi Singkat</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Perpaduan espresso arabika, susu segar, dan gula aren pilihan..."
              className="w-full px-3.5 py-2.5 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white text-zinc-900"
            />
          </div>

          <div className="pt-3 border-t border-zinc-100 flex items-center justify-end gap-3">
            <Link
              href="/products"
              className="px-4 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-700 font-medium rounded-xl text-sm transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
            >
              Simpan Menu Baru
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
