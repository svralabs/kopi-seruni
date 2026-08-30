import { db } from '@/lib/db';
import { products, categories } from '@/lib/schema';
import { formatRupiah } from '@/lib/utils';
import { isNull, desc, sql } from 'drizzle-orm';
import Link from 'next/link';
import DeleteProductButton from './delete-button';
import PaginationControls from '@/components/pagination-controls';
import { Plus, Coffee, Package } from 'lucide-react';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const page = Math.max(1, Number(params.page || 1));
  const pageSize = 12;
  const offset = (page - 1) * pageSize;

  let productList: any[] = [];
  let categoryMap: Record<string, string> = {};
  let totalItems = 0;
  let totalPages = 1;

  try {
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

    const cats = await db.select().from(categories);
    cats.forEach((c) => {
      categoryMap[c.id] = c.name;
    });
  } catch (e) {
    console.warn('Error fetching products:', e);
  }

  return (
    <div className="space-y-6">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Katalog Produk & Menu
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Kelola harga jual, HPP, dan status menu Toko Kopi Seruni
          </p>
        </div>

        <Link
          href="/products/baru"
          className="px-4 py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs inline-flex items-center gap-2 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Tambah Menu Baru</span>
        </Link>
      </div>

      {/* Table Bento Box */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden p-6 space-y-4">
        {productList.length === 0 ? (
          <div className="text-center py-16 text-[#9E968B] space-y-2">
            <Package className="w-10 h-10 mx-auto text-[#C8BFB2] stroke-1" />
            <p className="text-sm font-semibold text-[#665E54]">Belum ada produk terdaftar</p>
            <p className="text-xs text-[#9E968B]">
              Klik tombol &quot;Tambah Menu Baru&quot; untuk menambahkan menu
            </p>
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                    <th className="py-3.5 px-4">Menu</th>
                    <th className="py-3.5 px-4">Kategori</th>
                    <th className="py-3.5 px-4">Harga Jual</th>
                    <th className="py-3.5 px-4">HPP (Modal)</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F0E8]">
                  {productList.map((prod) => (
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
                        <DeleteProductButton productId={prod.id} />
                      </td>
                    </tr>
                  ))}
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
        )}
      </div>
    </div>
  );
}
