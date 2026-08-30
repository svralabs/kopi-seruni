import { db } from '@/lib/db';
import { expenses, expenseCategories } from '@/lib/schema';
import { formatRupiah, formatDate } from '@/lib/utils';
import { createExpense } from '@/app/actions/expenses';
import { desc } from 'drizzle-orm';
import { Plus, WalletCards, Calendar } from 'lucide-react';

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
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Pengeluaran & Operasional
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Catat semua belanja bahan baku, operasional harian, dan kas keluar
          </p>
        </div>

        <div className="bg-white px-5 py-2.5 rounded-2xl border border-[#EBE7DF] shadow-xs text-right">
          <p className="text-[11px] text-[#8E867C] font-semibold uppercase tracking-wider">Total Beban Terhitung</p>
          <p className="text-xl font-black text-[#964B3B]">{formatRupiah(totalExpense)}</p>
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
            <label className="block font-bold text-[#4A4238] mb-1.5">Nominal (Rp)</label>
            <input
              type="number"
              name="amount"
              required
              min="0"
              step="1"
              placeholder="125000"
              className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-black"
            />
          </div>

          <div>
            <label className="block font-bold text-[#4A4238] mb-1.5">Metode Bayar</label>
            <select
              name="paymentMethod"
              className="w-full px-3.5 py-2.5 bg-[#F9F7F2] border border-[#E5E0D6] rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#2E2520] text-[#201C1A] font-semibold"
            >
              <option value="cash">Kas Tunai (Cash)</option>
              <option value="transfer">Transfer Bank</option>
              <option value="qris">QRIS</option>
            </select>
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-[#2E2520] hover:bg-[#453932] text-white font-bold rounded-2xl text-xs transition-all shadow-xs"
            >
              Simpan Pengeluaran
            </button>
          </div>
        </form>
      </div>

      {/* Tabel Riwayat Pengeluaran */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden">
        {expenseList.length === 0 ? (
          <div className="text-center py-16 text-[#9E968B] space-y-2">
            <WalletCards className="w-10 h-10 mx-auto text-[#C8BFB2] stroke-1" />
            <p className="text-sm font-semibold text-[#665E54]">Belum ada catatan pengeluaran</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-5">Tanggal</th>
                  <th className="py-3.5 px-5">Keterangan</th>
                  <th className="py-3.5 px-5">Metode Bayar</th>
                  <th className="py-3.5 px-5 text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {expenseList.map((exp) => (
                  <tr key={exp.id} className="hover:bg-[#FBF9F6] transition-colors">
                    <td className="py-3 px-5 text-[#7A7268] whitespace-nowrap">
                      {formatDate(exp.expenseDate)}
                    </td>
                    <td className="py-3 px-5 font-bold text-[#201C1A]">
                      {exp.description}
                    </td>
                    <td className="py-3 px-5 capitalize">
                      <span className="px-2.5 py-0.5 rounded-lg bg-[#F2EDE5] border border-[#E5DFD4] text-[#54382B] font-semibold text-[11px]">
                        {exp.paymentMethod}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-right font-black text-[#964B3B]">
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
