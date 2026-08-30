import { db } from '@/lib/db';
import { expenses, expenseCategories } from '@/lib/schema';
import { formatRupiah, formatDate } from '@/lib/utils';
import { createExpense } from '@/app/actions/expenses';
import { desc } from 'drizzle-orm';

export default async function ExpensesPage() {
  let expenseList: any[] = [];
  let categoryList: any[] = [];

  try {
    expenseList = await db
      .select()
      .from(expenses)
      .orderBy(desc(expenses.expenseDate));

    categoryList = await db.select().from(expenseCategories);
  } catch (e) {
    console.warn('Error fetching expenses:', e);
  }

  const totalExpense = expenseList.reduce((sum, e) => sum + (e.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Pengeluaran & Operasional</h1>
          <p className="text-sm text-zinc-500">Catat semua pengeluaran bahan baku, listrik, sewa, dan lainnya</p>
        </div>

        <div className="bg-white px-4 py-2 rounded-xl border border-zinc-200 shadow-sm text-right">
          <p className="text-xs text-zinc-400 font-medium">Total Terhitung</p>
          <p className="text-xl font-extrabold text-red-600">{formatRupiah(totalExpense)}</p>
        </div>
      </div>

      {/* Form Tambah Pengeluaran Inline */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm p-5">
        <h3 className="text-sm font-bold text-zinc-900 mb-3 flex items-center gap-2">
          <span>➕</span> Catat Pengeluaran Baru
        </h3>
        <form action={createExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
          <div className="lg:col-span-2">
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Keterangan / Keperluan</label>
            <input
              type="text"
              name="description"
              required
              placeholder="Contoh: Beli Es Batu & Susu UHT 5 Box"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Nominal (Rp)</label>
            <input
              type="number"
              name="amount"
              required
              min="0"
              step="1"
              placeholder="125000"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900 font-bold"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-700 mb-1">Metode Bayar</label>
            <select
              name="paymentMethod"
              className="w-full px-3 py-2 bg-zinc-50 border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 text-zinc-900"
            >
              <option value="cash">Kas Tunai (Cash)</option>
              <option value="transfer">Transfer Bank</option>
              <option value="qris">QRIS</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm"
            >
              Simpan Pengeluaran
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Riwayat Pengeluaran */}
      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        {expenseList.length === 0 ? (
          <div className="text-center py-16 text-zinc-400 space-y-2">
            <span className="text-4xl block">💳</span>
            <p className="text-sm font-medium">Belum ada catatan pengeluaran</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50 text-zinc-500 text-xs font-semibold uppercase">
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Keterangan</th>
                  <th className="py-3.5 px-4">Metode Bayar</th>
                  <th className="py-3.5 px-4 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {expenseList.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-50/70 transition-colors">
                    <td className="py-3 px-4 text-zinc-500 text-xs whitespace-nowrap">
                      {formatDate(exp.expenseDate)}
                    </td>
                    <td className="py-3 px-4 font-medium text-zinc-900">
                      {exp.description}
                    </td>
                    <td className="py-3 px-4 capitalize text-xs">
                      <span className="px-2 py-0.5 rounded bg-zinc-100 border border-zinc-200 text-zinc-700">
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-red-600">
                      {formatRupiah(exp.amount)}
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
