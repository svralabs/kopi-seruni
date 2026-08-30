import { db } from '@/lib/db';
import { orders, expenses, orderItems, outlets, user } from '@/lib/schema';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { sql, desc, eq, and, gte } from 'drizzle-orm';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  WalletCards,
  Coins,
  ArrowRight,
  Clock,
  UtensilsCrossed,
  Layers,
  Store,
} from 'lucide-react';



export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; outletId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const period = resolvedParams.period || 'today';
  const outletId = resolvedParams.outletId || 'all';

  const now = new Date();
  let startEpoch = 0;

  if (period === 'today') {
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    startEpoch = Math.floor(startOfDay.getTime() / 1000);
  } else if (period === '7d') {
    startEpoch = Math.floor(Date.now() / 1000) - 7 * 86400;
  } else if (period === '30d') {
    startEpoch = Math.floor(Date.now() / 1000) - 30 * 86400;
  }

  let allOutlets: any[] = [];
  let totalRevenue = 0;
  let totalTrx = 0;
  let totalExpenses = 0;
  let estimatedCOGS = 0;
  let recentOrders: any[] = [];

  try {
    allOutlets = await db.select().from(outlets);

    // Filter conditions for orders
    const orderConditions = [eq(orders.status, 'completed')];
    if (startEpoch > 0) orderConditions.push(gte(orders.createdAt, startEpoch));
    if (outletId !== 'all') orderConditions.push(eq(orders.outletId, outletId));

    const revenueQuery = await db
      .select({
        total: sql<number>`COALESCE(SUM(total), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(...orderConditions));

    totalRevenue = Number(revenueQuery[0]?.total || 0);
    totalTrx = Number(revenueQuery[0]?.count || 0);

    // Filter conditions for expenses
    const expenseConditions = [];
    if (startEpoch > 0) expenseConditions.push(gte(expenses.expenseDate, startEpoch));
    if (outletId !== 'all') expenseConditions.push(eq(expenses.outletId, outletId));

    const expenseQuery = await db
      .select({
        total: sql<number>`COALESCE(SUM(amount), 0)`,
      })
      .from(expenses)
      .where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined);

    totalExpenses = Number(expenseQuery[0]?.total || 0);

    // COGS estimation
    const cogsQuery = await db
      .select({
        cogs: sql<number>`COALESCE(SUM(order_items.cost_price * order_items.quantity), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...orderConditions));

    estimatedCOGS = Number(cogsQuery[0]?.cogs || 0);

    // Recent 5 transactions
    recentOrders = await db
      .select({
        order: orders,
        outlet: outlets,
        user: user,
      })
      .from(orders)
      .leftJoin(outlets, eq(orders.outletId, outlets.id))
      .leftJoin(user, eq(orders.kasirId, user.id))
      .where(outletId !== 'all' ? eq(orders.outletId, outletId) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(5);
  } catch (e) {
    console.warn('Dashboard DB query error:', e);
  }

  const grossProfit = Math.max(0, totalRevenue - estimatedCOGS);
  const netProfit = totalRevenue - estimatedCOGS - totalExpenses;
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-8">
      {/* Header Bento */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Dashboard Ringkasan Penjualan
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Performa finansial, laba kotor, dan operasional kasir multi-outlet Kopi Seruni
        </p>
      </div>


      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Omset Penjualan */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Total Penjualan (Omset)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#54382B] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-2xl text-[#201C1A]">
              {formatRupiah(totalRevenue)}
            </h2>
            <p className="text-[10px] text-[#2D7A47] font-semibold mt-1">
              Dari {totalTrx} transaksi berhasil
            </p>
          </div>
        </div>

        {/* KPI 2: Total Beban / Pengeluaran */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Beban Pengeluaran
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#964B3B] flex items-center justify-center">
              <WalletCards className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-2xl text-[#964B3B]">
              {formatRupiah(totalExpenses)}
            </h2>
            <p className="text-[10px] text-[#8E867C] mt-1">Operasional & belanja bahan</p>
          </div>
        </div>

        {/* KPI 3: Estimasi HPP / Modal */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Estimasi HPP (COGS)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#7A7268] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-2xl text-[#201C1A]">
              {formatRupiah(estimatedCOGS)}
            </h2>
            <p className="text-[10px] text-[#8E867C] mt-1">Modal dasar menu terjual</p>
          </div>
        </div>

        {/* KPI 4: Net Profit (Laba Bersih) */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Laba Bersih (Net Profit)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#2D7A47] flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2
              className={`font-serif font-black text-2xl ${
                netProfit >= 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'
              }`}
            >
              {formatRupiah(netProfit)}
            </h2>
            <p className="text-[10px] text-[#2D7A47] font-semibold mt-1">
              Margin Bersih: {netMargin}%
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: Transaksi Terbaru */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-serif font-black text-base text-[#201C1A]">
              5 Transaksi Terakhir
            </h3>
            <p className="text-xs text-[#8E867C]">Penjualan kasir real-time</p>
          </div>
          <Link
            href="/orders"
            className="text-xs font-bold text-[#54382B] hover:underline flex items-center gap-1"
          >
            <span>Lihat Semua Transaksi</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-4">No. Struk</th>
                <th className="py-3 px-4">Outlet & Kasir</th>
                <th className="py-3 px-4">Pelanggan</th>
                <th className="py-3 px-4">Metode Bayar</th>
                <th className="py-3 px-4">Waktu</th>
                <th className="py-3 px-4 text-right">Total Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {recentOrders.map((row) => (
                <tr key={row.order.id} className="hover:bg-[#FBF9F6]">
                  <td className="py-3.5 px-4 font-mono font-bold text-[#201C1A]">
                    {row.order.id}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="font-bold text-[#201C1A]">{row.outlet?.name || 'Pusat'}</p>
                    <p className="text-[10px] text-[#7A7268]">Kasir: {row.user?.name || 'Kasir'}</p>
                  </td>
                  <td className="py-3.5 px-4 text-[#4A4238]">
                    {row.order.customerName || 'Walk-in'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-[10px] font-bold uppercase bg-[#F4EFE6] text-[#54382B] px-2.5 py-0.5 rounded-md">
                      {row.order.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-[#7A7268]">
                    {formatDateTime(row.order.createdAt)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-black text-sm text-[#201C1A]">
                    {formatRupiah(row.order.total)}
                  </td>
                </tr>
              ))}

              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#9E968B] text-xs">
                    Belum ada transaksi pada periode ini.
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
