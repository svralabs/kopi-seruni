import { db } from '@/lib/db';
import { orders, expenses, orderItems } from '@/lib/schema';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { sql, desc, eq, gte } from 'drizzle-orm';
import Link from 'next/link';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const period = resolvedParams.period || 'today';

  // Calculate start epoch based on period
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

  let totalRevenue = 0;
  let totalTrx = 0;
  let totalExpenses = 0;
  let estimatedCOGS = 0;
  let recentOrders: any[] = [];

  try {
    // 1. Total Revenue & Count
    const revenueQuery = startEpoch > 0
      ? await db
          .select({
            total: sql<number>`COALESCE(SUM(total), 0)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(sql`status = 'completed' AND created_at >= ${startEpoch}`)
      : await db
          .select({
            total: sql<number>`COALESCE(SUM(total), 0)`,
            count: sql<number>`COUNT(*)`,
          })
          .from(orders)
          .where(eq(orders.status, 'completed'));

    totalRevenue = revenueQuery[0]?.total || 0;
    totalTrx = revenueQuery[0]?.count || 0;

    // 2. Total Expenses
    const expenseQuery = startEpoch > 0
      ? await db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(expenses)
          .where(gte(expenses.expenseDate, startEpoch))
      : await db
          .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
          .from(expenses);

    totalExpenses = expenseQuery[0]?.total || 0;

    // 3. Estimated COGS (HPP) from order_items
    const cogsQuery = startEpoch > 0
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

    estimatedCOGS = cogsQuery[0]?.totalCost || 0;

    // 4. Recent 5 orders
    recentOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5);
  } catch (e) {
    console.warn('DB not connected yet or empty:', e);
  }

  const netProfit = totalRevenue - estimatedCOGS - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Dashboard Utama</h1>
          <p className="text-sm text-zinc-500">Ringkasan performa penjualan dan operasional</p>
        </div>

        <div className="flex items-center gap-2 bg-white p-1 rounded-xl border border-zinc-200 shadow-sm text-sm">
          <Link
            href="/dashboard?period=today"
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'today' ? 'bg-amber-600 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Hari Ini
          </Link>
          <Link
            href="/dashboard?period=7d"
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === '7d' ? 'bg-amber-600 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            7 Hari
          </Link>
          <Link
            href="/dashboard?period=30d"
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === '30d' ? 'bg-amber-600 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            30 Hari
          </Link>
          <Link
            href="/dashboard?period=all"
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
              period === 'all' ? 'bg-amber-600 text-white' : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            Semua
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Penjualan</span>
            <span className="text-lg">💰</span>
          </div>
          <p className="text-2xl font-extrabold text-zinc-900">{formatRupiah(totalRevenue)}</p>
          <p className="text-xs text-zinc-500 mt-1">dari pesanan selesai</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Jumlah Transaksi</span>
            <span className="text-lg">🧾</span>
          </div>
          <p className="text-2xl font-extrabold text-zinc-900">{totalTrx} <span className="text-sm font-normal text-zinc-500">struk</span></p>
          <p className="text-xs text-zinc-500 mt-1">total checkout</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Pengeluaran Biaya</span>
            <span className="text-lg">💳</span>
          </div>
          <p className="text-2xl font-extrabold text-red-600">{formatRupiah(totalExpenses)}</p>
          <p className="text-xs text-zinc-500 mt-1">operasional & belanja</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-zinc-200 shadow-sm">
          <div className="flex items-center justify-between text-zinc-500 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Estimasi Laba Bersih</span>
            <span className="text-lg">📈</span>
          </div>
          <p className={`text-2xl font-extrabold ${netProfit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {formatRupiah(netProfit)}
          </p>
          <p className="text-xs text-zinc-500 mt-1">Omset - HPP - Beban</p>
        </div>
      </div>

      {/* Quick Actions & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Recent Transactions Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-zinc-900 text-lg">Transaksi Terbaru</h2>
            <Link href="/pos" className="text-xs font-semibold text-amber-600 hover:text-amber-700">
              Buka POS &rarr;
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-10 text-zinc-400 text-sm">
              Belum ada transaksi pada periode ini.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500 text-xs font-semibold uppercase">
                    <th className="pb-3">ID Pesanan</th>
                    <th className="pb-3">Waktu</th>
                    <th className="pb-3">Metode</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-zinc-50/60 transition-colors">
                      <td className="py-3 font-mono font-medium text-xs text-zinc-900">{ord.id}</td>
                      <td className="py-3 text-zinc-500 text-xs">{formatDateTime(ord.createdAt)}</td>
                      <td className="py-3 capitalize text-xs">
                        <span className="px-2 py-0.5 rounded-md bg-zinc-100 border border-zinc-200 text-zinc-700">
                          {ord.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-zinc-900">{formatRupiah(ord.total)}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            ord.status === 'completed'
                              ? 'bg-emerald-100 text-emerald-800'
                              : ord.status === 'voided'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {ord.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Quick Launch Card */}
        <div className="bg-gradient-to-br from-amber-600 to-amber-700 text-white rounded-2xl p-6 shadow-md flex flex-col justify-between space-y-6">
          <div>
            <span className="px-2.5 py-1 rounded-lg bg-white/20 text-xs font-semibold uppercase tracking-wider backdrop-blur-sm">
              Kasir Aktif
            </span>
            <h3 className="text-xl font-bold mt-4 leading-snug">
              Siap melayani pesanan pelanggan hari ini?
            </h3>
            <p className="text-amber-100 text-sm mt-2">
              Buka menu POS untuk memilih produk, hitung diskon otomatis, dan cetak struk penjualan.
            </p>
          </div>

          <div className="space-y-2">
            <Link
              href="/pos"
              className="w-full py-3 px-4 bg-white hover:bg-amber-50 text-amber-800 font-bold rounded-xl text-center block transition-colors shadow"
            >
              🛒 Mulai Transaksi POS
            </Link>
            <Link
              href="/shift"
              className="w-full py-2.5 px-4 bg-black/20 hover:bg-black/30 text-white font-medium rounded-xl text-center block transition-colors text-sm"
            >
              🕐 Cek Shift & Kas Masuk
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
