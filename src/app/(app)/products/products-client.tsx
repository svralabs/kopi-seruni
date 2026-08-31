'use client';

import { useState } from 'react';
import { createProduct, updateProduct } from '@/app/actions/products';
import { formatRupiah } from '@/lib/utils';
import type { Category, Product } from '@/lib/schema';
import { 
  Package, 
  Plus, 
  Coffee, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Trash2,
  Pencil,
  ArrowRight
} from 'lucide-react';
import DeleteProductButton from './delete-button';
import PaginationControls from '@/components/pagination-controls';

export default function ProductsClient({
  productList,
  categoriesList,
  categoryMap,
  outlets = [],
  currentOutletId = 'all',
  totalItems,
  totalPages,
  currentPage,
  pageSize,
}: {
  productList: any[];
  categoriesList: Category[];
  categoryMap: Record<string, string>;
  outlets?: any[];
  currentOutletId?: string;
  totalItems: number;
  totalPages: number;
  currentPage: number;
  pageSize: number;
}) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  const activeCount = productList.filter((p) => p.isActive).length;
  const noHppCount = productList.filter((p) => !p.costPrice || p.costPrice === 0).length;

  const filteredList = productList.filter((p) => {
    const matchQuery = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = categoryFilter === 'all' ? true : p.categoryId === categoryFilter;
    return matchQuery && matchCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header & Primary Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Katalog Produk & Menu
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Kelola harga jual, HPP, dan status menu Toko Kopi Seruni
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white text-xs font-bold rounded-2xl shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Menu Baru</span>
        </button>
      </div>

      {/* 1. TOP SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Total Menu Terdaftar</p>
            <h3 className="text-2xl font-black text-[#201C1A] mt-1">{totalItems} Menu</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FAF8F5] border border-[#ECE7DE] flex items-center justify-center text-[#54382B]">
            <Package className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Menu Aktif Dijual</p>
            <h3 className="text-2xl font-black text-[#2D7A47] mt-1">{activeCount} Menu</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#EBF6EE] border border-[#D1EBD8] flex items-center justify-center text-[#2D7A47]">
            <CheckCircle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-[#8E867C]">Belum Ada HPP (Modal)</p>
            <h3 className="text-2xl font-black text-[#96631E] mt-1">{noHppCount} Menu</h3>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-[#FDF4E5] border border-[#F2E0C4] flex items-center justify-center text-[#96631E]">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 2. FULL-WIDTH DATA TABLE */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        {/* Search & Filter Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-[#F0ECE4]">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-[#8E867C] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Cari nama menu..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                categoryFilter === 'all'
                  ? 'bg-[#2E2520] text-white shadow-xs'
                  : 'bg-[#F9F7F2] text-[#8E867C] hover:text-[#201C1A] border border-[#E5E0D6]'
              }`}
            >
              Semua Kategori
            </button>
            {categoriesList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryFilter(c.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all ${
                  categoryFilter === c.id
                    ? 'bg-[#2E2520] text-white shadow-xs'
                    : 'bg-[#F9F7F2] text-[#8E867C] hover:text-[#201C1A] border border-[#E5E0D6]'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Menu</th>
                <th className="py-3.5 px-4">Cabang</th>
                <th className="py-3.5 px-4">Kategori</th>
                <th className="py-3.5 px-4">Harga Jual</th>
                <th className="py-3.5 px-4">HPP (Modal)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {filteredList.map((prod) => (
                <tr key={prod.id} className="hover:bg-[#FBF9F6] transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#F4EFE6] border border-[#E5DFD4] overflow-hidden flex items-center justify-center text-sm shrink-0">
                        {prod.imageUrl ? (
                          <img src={prod.imageUrl} alt={prod.name} className="w-full h-full object-cover" />
                        ) : (
                          <Coffee className="w-5 h-5 text-[#54382B]" />
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-[#201C1A] text-xs">{prod.name}</p>
                        <p className="text-[10px] text-[#A69E93] font-mono">{prod.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span className="px-2.5 py-1 bg-[#FAF8F5] border border-[#EBE7DF] text-[#54382B] rounded-lg text-[10px] font-bold">
                      {prod.outletName || 'Pusat'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#6B635A] font-medium">
                    {prod.categoryId ? categoryMap[prod.categoryId] || 'Lainnya' : '-'}
                  </td>
                  <td className="py-3 px-4 font-black text-[#201C1A]">
                    {formatRupiah(prod.price)}
                  </td>
                  <td className="py-3 px-4 text-[#6B635A] font-semibold">
                    {prod.costPrice > 0 ? (
                      formatRupiah(prod.costPrice)
                    ) : (
                      <span className="text-[10px] text-[#96631E] bg-[#FDF4E5] px-2 py-0.5 rounded-lg border border-[#F3E2C2]">
                        Belum diisi
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold ${
                        prod.isActive
                          ? 'bg-[#EBF6EE] text-[#2D7A47]'
                          : 'bg-[#F2ECE4] text-[#7A7268]'
                      }`}
                    >
                      {prod.isActive ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setEditingProduct(prod)}
                        className="p-1.5 bg-[#FAF8F5] hover:bg-[#F2EDE5] text-[#54382B] rounded-xl border border-[#E5E0D6] transition-colors cursor-pointer"
                        title="Edit Menu & HPP"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <DeleteProductButton productId={prod.id} />
                    </div>
                  </td>
                </tr>
              ))}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-[#9E968B]">
                    <Package className="w-8 h-8 mx-auto mb-2 text-[#D5CEC2]" />
                    <p className="font-bold text-xs text-[#4A4238]">Tidak ada menu yang cocok</p>
                    <p className="text-[11px] text-[#9E968B] mt-0.5">
                      Klik tombol &quot;Tambah Menu Baru&quot; di atas untuk mendaftarkan produk.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationControls
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
        />
      </div>

      {/* 3. MODAL DIALOG: TAMBAH PRODUK BARU */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <h3 className="font-bold text-base text-[#201C1A]">Tambah Menu Baru</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-[#8E867C] hover:text-[#201C1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form action={createProduct} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Nama Menu / Produk</label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="Contoh: Kopi Susu Gula Aren"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              {outlets.length > 0 && (
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Cabang Outlet</label>
                  <select
                    name="outletId"
                    defaultValue={currentOutletId !== 'all' ? currentOutletId : (outlets[0]?.id || 'out_default')}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer font-bold"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Kategori</label>
                <select
                  name="categoryId"
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer"
                >
                  <option value="">-- Tanpa Kategori --</option>
                  {categoriesList.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0"
                    step="500"
                    placeholder="20000"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />
                </div>
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">HPP (Modal)</label>
                  <input
                    type="number"
                    name="costPrice"
                    min="0"
                    step="500"
                    placeholder="10000"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                  />
                </div>
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
                  Simpan Menu
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. MODAL DIALOG: EDIT PRODUK & HPP */}
      {editingProduct && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-2xl max-w-md w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F0ECE4] pb-3">
              <div>
                <h3 className="font-bold text-base text-[#201C1A]">Edit Menu & HPP</h3>
                <p className="text-[11px] text-[#8E867C]">Perbarui harga jual, HPP modal, dan status</p>
              </div>
              <button
                onClick={() => setEditingProduct(null)}
                className="text-[#8E867C] hover:text-[#201C1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              action={async (formData) => {
                await updateProduct(editingProduct.id, formData);
                setEditingProduct(null);
              }}
              className="space-y-3.5 text-xs"
            >
              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Nama Menu / Produk</label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingProduct.name}
                  className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              {outlets.length > 0 && (
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Cabang Outlet</label>
                  <select
                    name="outletId"
                    defaultValue={editingProduct.outletId || (outlets[0]?.id || 'out_default')}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer font-bold"
                  >
                    {outlets.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Kategori</label>
                  <select
                    name="categoryId"
                    defaultValue={editingProduct.categoryId || ''}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer"
                  >
                    <option value="">-- Tanpa Kategori --</option>
                    {categoriesList.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Status Menu</label>
                  <select
                    name="isActive"
                    defaultValue={editingProduct.isActive ? '1' : '0'}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] cursor-pointer font-bold"
                  >
                    <option value="1">Aktif Dijual</option>
                    <option value="0">Nonaktif / Habis</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">Harga Jual (Rp)</label>
                  <input
                    type="number"
                    name="price"
                    required
                    min="0"
                    step="500"
                    defaultValue={editingProduct.price}
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
                  />
                </div>

                <div>
                  <label className="block font-bold text-[#4A4238] mb-1.5">HPP / Modal (Rp)</label>
                  <input
                    type="number"
                    name="costPrice"
                    min="0"
                    step="500"
                    defaultValue={editingProduct.costPrice || ''}
                    placeholder="Contoh: 8500"
                    className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-[#4A4238] mb-1.5">Deskripsi Singkat</label>
                <textarea
                  name="description"
                  rows={2}
                  defaultValue={editingProduct.description || ''}
                  className="w-full px-3.5 py-2 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
                />
              </div>

              <div className="flex items-center gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="flex-1 py-2.5 border border-[#E5E0D6] text-[#7A7268] font-bold rounded-2xl hover:bg-[#FAF8F5] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl shadow-xs cursor-pointer"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
