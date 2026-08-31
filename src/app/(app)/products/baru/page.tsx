import { getCategories, getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import { createProduct } from '@/app/actions/products';
import Link from 'next/link';
import { ArrowLeft, Save } from 'lucide-react';

export default async function NewProductPage() {
  await requireAuthRole(['owner', 'manager']);
  let categoryList: any[] = [];
  let outletList: any[] = [];
  try {
    const [cats, outs] = await Promise.all([getCategories(), getOutlets()]);
    categoryList = cats;
    outletList = outs;
  } catch (e) {
    console.warn('Categories/outlets query error:', e);
  }

  const outletMap = Object.fromEntries(outletList.map((o) => [o.id, o.name]));

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/products"
          className="w-9 h-9 rounded-2xl bg-white border border-[#EBE7DF] flex items-center justify-center text-[#7A7268] hover:text-[#201C1A] hover:bg-[#F7F5F0] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-[#201C1A]">Tambah Menu Baru</h1>
          <p className="text-xs text-[#8E867C]">Masukkan detail menu dan kalkulasi HPP modal</p>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6">
        <form action={createProduct} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">
                Nama Produk / Menu <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                placeholder="Contoh: Es Kopi Susu Seruni"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">
                Cabang Penempatan <span className="text-red-500">*</span>
              </label>
              <select
                name="outletId"
                required
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-medium"
              >
                {outletList.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">Kategori</label>
              <select
                name="categoryId"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              >
                <option value="">-- Pilih Kategori --</option>
                {categoryList.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name} {outletMap[cat.outletId] ? `(${outletMap[cat.outletId]})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">
                Harga Jual (Rp) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                name="price"
                required
                min="0"
                step="1"
                placeholder="25000"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">
                HPP / Harga Modal (Rp)
              </label>
              <input
                type="number"
                name="costPrice"
                min="0"
                step="1"
                placeholder="8000"
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
              <span className="text-[10px] text-[#9E968B] mt-1 block">
                Digunakan untuk menghitung laba rugi real time
              </span>
            </div>

            <div>
              <label className="block font-bold text-[#4A4238] mb-1.5">URL Foto Produk</label>
              <input
                type="url"
                name="imageUrl"
                placeholder="https://media.kopiseruni.com/..."
                className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#4A4238] mb-1.5">Deskripsi Singkat</label>
            <textarea
              name="description"
              rows={3}
              placeholder="Perpaduan espresso arabika, susu segar, dan gula aren pilihan..."
              className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
            />
          </div>

          <div className="pt-4 border-t border-[#F0ECE4] flex items-center justify-end gap-3">
            <Link
              href="/products"
              className="px-4 py-2.5 bg-[#F2ECE3] hover:bg-[#E8E0D4] text-[#4A4238] font-bold rounded-2xl transition-colors"
            >
              Batal
            </Link>
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl transition-all shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Menu</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
