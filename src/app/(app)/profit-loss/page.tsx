import { db } from '@/lib/db';
import { orders, expenses, orderItems } from '@/lib/schema';
import { formatRupiah } from '@/lib/utils';
import { sql, eq } from 'drizzle-orm';
import Link from 'next/link';
import { TrendingUp, Coins, Receipt, WalletCards, BarChart3 } from 'lucide-react';

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const period = resolvedParams.period || 'this_month';

  const now = new Date();
  let startEpoch = 0;
  let periodLabel = 'Bulan Ini';

  if (period === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startEpoch = Math.floor(startOfMonth.getTime() / 1000);
    periodLabel = now.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
  } else if (period === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startEpoch = Math.floor(startOfDay.getTime() / 1000);
    periodLabel = 'Hari Ini';
  } else if (period === 'all') {
    startEpoch = 0;
    periodLabel = 'Semua Periode';
  }

  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalExpenses = 0;

  try {
    const revenueQuery =
      startEpoch > 0
        ? await db
            .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
            .from(orders)
            .where(sql`status = 'completed' AND created_at >= ${startEpoch}`)
        : await db
            .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
            .from(orders)
            .where(eq(orders.status, 'completed'));

    totalRevenue = revenueQuery[0]?.total || 0;

    const cogsQuery =
      startEpoch > 0
        ? await db
            .select({
              totalCost: sql<number>`COALESCE(SUM(order_items.cost_price * order_items.quantity), 0)`,
            })
            .from(orderItems)
            .innerJoin(orders, eq(orderItems.orderId, orders.id))
            .where(sql`orders.status = 'completed' AND orders.created_at >= ${startEpoch}`)
        : await db
            .select({
              totalCost: sql<number>`COALESCE(SUM(cost_price * quantity), 0)`,
            })
            .from(orderItems);

    totalCOGS = cogsQuery[0]?.totalCost || 0;

    const expenseQuery =
      startEpoch > 0
        ? await db
            .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
            .from(expenses)
            .where(sql`expense_date >= ${startEpoch}`)
        : await db
            .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
            .from(expenses);

    totalExpenses = expenseQuery[0]?.total || 0;
  } catch (e) {
    console.warn('Error querying profit loss:', e);
  }

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Laporan Laba Rugi
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Laporan keuangan & profitabilitas periode: <span className="font-bold text-[#201C1A]">{periodLabel}</span>
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#EBE7DF] shadow-xs text-xs">
          <Link
            href="/profit-loss?period=today"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              period === 'today' ? 'bg-[#2E2520] text-white shadow-xs' : 'text-[#7A7268] hover:text-[#201C1A]'
            }`}
          >
            Hari Ini
          </Link>
          <Link
            href="/profit-loss?period=this_month"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              period === 'this_month' ? 'bg-[#2E2520] text-white shadow-xs' : 'text-[#7A7268] hover:text-[#201C1A]'
            }`}
          >
            Bulan Ini
          </Link>
          <Link
            href="/profit-loss?period=all"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              period === 'all' ? 'bg-[#2E2520] text-white shadow-xs' : 'text-[#7A7268] hover:text-[#201C1A]'
            }`}
          >
            Semua
          </Link>
        </div>
      </div>

      {/* Summary KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-[#EBE7DF] shadow-xs">
          <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">Pendapatan (Omset)</span>
          <p className="text-2xl font-black text-[#201C1A] mt-2">{formatRupiah(totalRevenue)}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#EBE7DF] shadow-xs">
          <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">Beban Pokok (HPP)</span>
          <p className="text-2xl font-black text-[#6B635A] mt-2">{formatRupiah(totalCOGS)}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#EBE7DF] shadow-xs">
          <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">Laba Kotor (Gross)</span>
          <p className="text-2xl font-black text-[#54382B] mt-2">{formatRupiah(grossProfit)}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-[#EBE7DF] shadow-xs">
          <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">Laba Bersih (Net)</span>
          <p className={`text-2xl font-black mt-2 ${netProfit >= 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'}`}>
            {formatRupiah(netProfit)}
          </p>
          <span className="text-[10px] font-bold text-[#8E867C] mt-1 inline-block">Margin: {netMargin}%</span>
        </div>
      </div>

      {/* Financial Statement Card */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-6">
        <div className="border-b border-[#F0ECE4] pb-4 flex items-center justify-between">
          <h3 className="font-bold text-base text-[#201C1A]">
            Rincian Laba Rugi Operasional
          </h3>
          <span className="text-xs text-[#8E867C] font-semibold">Standar Finansial POS</span>
        </div>

        <div className="space-y-4 text-xs">
          {/* Pendapatan */}
          <div>
            <div className="flex justify-between font-bold text-[#201C1A] py-2 border-b border-[#F0ECE4]">
              <span>1. PENDAPATAN OPERASIONAL</span>
              <span>{formatRupiah(totalRevenue)}</span>
            </div>
            <div className="pl-4 py-1.5 flex justify-between text-[#7A7268]">
              <span>Penjualan Menu Kasir Selesai</span>
              <span>{formatRupiah(totalRevenue)}</span>
            </div>
          </div>

          {/* HPP */}
          <div>
            <div className="flex justify-between font-bold text-[#201C1A] py-2 border-b border-[#F0ECE4]">
              <span>2. HARGA POKOK PENJUALAN (HPP BAHAN)</span>
              <span className="text-[#6B635A]">({formatRupiah(totalCOGS)})</span>
            </div>
            <div className="pl-4 py-1.5 flex justify-between text-[#7A7268]">
              <span>Beban Modal Produk & Menu</span>
              <span>({formatRupiah(totalCOGS)})</span>
            </div>
          </div>

          {/* Laba Kotor */}
          <div className="bg-[#FAF8F5] border border-[#ECE7DE] p-3.5 rounded-2xl flex justify-between font-bold text-[#201C1A]">
            <span>LABA KOTOR (GROSS PROFIT)</span>
            <span className="text-[#54382B] font-black">{formatRupiah(grossProfit)}</span>
          </div>

          {/* Beban Pengeluaran */}
          <div>
            <div className="flex justify-between font-bold text-[#201C1A] py-2 border-b border-[#F0ECE4]">
              <span>3. BEBAN OPERASIONAL & KAS KELUAR</span>
              <span className="text-[#964B3B]">({formatRupiah(totalExpenses)})</span>
            </div>
            <div className="pl-4 py-1.5 flex justify-between text-[#7A7268]">
              <span>Pengeluaran Operasional & Kas Kecil</span>
              <span>({formatRupiah(totalExpenses)})</span>
            </div>
          </div>

          {/* Laba Bersih Final */}
          <div
            className={`p-5 rounded-2xl flex justify-between font-black text-sm ${
              netProfit >= 0
                ? 'bg-[#EBF6EE] text-[#2D7A47] border border-[#D1EBD8]'
                : 'bg-[#FBEBE8] text-[#964B3B] border border-[#F5C7BE]'
            }`}
          >
            <span>LABA BERSIH FINAL (NET PROFIT)</span>
            <span className="text-base">{formatRupiah(netProfit)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
