import { db } from '@/lib/db';
import { expenses, expenseCategories, outlets } from '@/lib/schema';
import { formatRupiah, formatDate } from '@/lib/utils';
import { createExpense } from '@/app/actions/expenses';
import { desc, eq } from 'drizzle-orm';
import { Plus, WalletCards, Store, ArrowRight } from 'lucide-react';
import OutletFilter from '@/components/outlet-filter';


export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'all';

  let allOutlets: any[] = [];
  let expenseList: any[] = [];
  let categoryList: any[] = [];

  try {
    allOutlets = await db.select().from(outlets);

    expenseList = await db
      .select({
        expense: expenses,
        outlet: outlets,
      })
      .from(expenses)
      .leftJoin(outlets, eq(expenses.outletId, outlets.id))
      .where(outletId !== 'all' ? eq(expenses.outletId, outletId) : undefined)
      .orderBy(desc(expenses.expenseDate));

    categoryList = await db.select().from(expenseCategories);
  } catch (e) {
    console.warn('Error fetching expenses:', e);
  }

  const totalExpense = expenseList.reduce((sum, e) => sum + (e.expense.amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Pengeluaran & Beban Operasional
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Catat semua belanja bahan baku, operasional harian, dan kas keluar per outlet
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Outlet Filter */}
          <OutletFilter outlets={allOutlets} selectedOutletId={outletId} />


          <div className="bg-white px-5 py-2 rounded-2xl border border-[#EBE7DF] shadow-xs text-right">
            <p className="text-[10px] text-[#8E867C] font-semibold uppercase tracking-wider">Total Beban</p>
            <p className="text-lg font-black text-[#964B3B]">{formatRupiah(totalExpense)}</p>
          </div>
        </div>
      </div>

      {/* Form Bento: Catat Pengeluaran */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#54382B] mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> Catat Pengeluaran Baru
        </h3>

        <form action={createExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 items-end text-xs">
          <div className="lg:col-span-2">
            <label className="block font-bold text-[#4A4238] mb-1.5">Keterangan / Keperluan</label>
            <input
              type="text"
              name="description"
              required
              placeholder="Contoh: Beli Susu Fresh Milk 10 Liter & Es Batu"
              className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
            />
          </div>

          <div>
            <label className="block font-bold text-[#4A4238] mb-1.5">Cabang Outlet</label>
            <select
              name="outletId"
              defaultValue={outletId !== 'all' ? outletId : allOutlets[0]?.id || 'out_default'}
              className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A]"
            >
              {allOutlets.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-[#4A4238] mb-1.5">Nominal (Rp)</label>
            <input
              type="number"
              name="amount"
              required
              min="1000"
              step="1"
              placeholder="75000"
              className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2.5 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl transition-all shadow-xs"
            >
              Simpan Pengeluaran
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Riwayat Pengeluaran */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden p-6 space-y-4">
        <h3 className="font-bold text-base text-[#201C1A]">Riwayat Beban Pengeluaran</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3.5 px-4">Tanggal</th>
                <th className="py-3.5 px-4">Outlet</th>
                <th className="py-3.5 px-4">Keterangan</th>
                <th className="py-3.5 px-4">Metode Bayar</th>
                <th className="py-3.5 px-4 text-right">Nominal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {expenseList.map((row) => (
                <tr key={row.expense.id} className="hover:bg-[#FBF9F6]">
                  <td className="py-3 px-4 text-[#7A7268] whitespace-nowrap">{formatDate(row.expense.expenseDate)}</td>
                  <td className="py-3 px-4 font-bold text-[#201C1A]">{row.outlet?.name || 'Pusat'}</td>
                  <td className="py-3 px-4 font-medium text-[#201C1A]">{row.expense.description}</td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#E8E3DA] text-[#54382B] text-[10px] font-bold uppercase">
                      {row.expense.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-black text-[#964B3B] text-sm">
                    {formatRupiah(row.expense.amount)}
                  </td>
                </tr>
              ))}
              {expenseList.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-[#9E968B] text-xs">
                    Belum ada data pengeluaran.
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
