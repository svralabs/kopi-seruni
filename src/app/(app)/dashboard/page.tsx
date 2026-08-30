import { db } from '@/lib/db';
import { orders, expenses, orderItems } from '@/lib/schema';
import { formatRupiah, formatDateTime } from '@/lib/utils';
import { sql, desc, eq, gte } from 'drizzle-orm';
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
} from 'lucide-react';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const period = resolvedParams.period || 'today';

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
    const revenueQuery =
      startEpoch > 0
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

    const expenseQuery =
      startEpoch > 0
        ? await db
            .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
            .from(expenses)
            .where(gte(expenses.expenseDate, startEpoch))
        : await db
            .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
            .from(expenses);

    totalExpenses = expenseQuery[0]?.total || 0;

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

    estimatedCOGS = cogsQuery[0]?.totalCost || 0;

    recentOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(5);
  } catch (e) {
    console.warn('DB query error:', e);
  }

  const netProfit = totalRevenue - estimatedCOGS - totalExpenses;

  return (
    <div className="space-y-6">
      {/* Bento Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Dashboard Utama
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Ringkasan performa penjualan dan operasional Toko Kopi Seruni
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-white p-1 rounded-2xl border border-[#EBE7DF] shadow-xs text-xs">
          <Link
            href="/dashboard?period=today"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              period === 'today'
                ? 'bg-[#2E2520] text-white shadow-xs'
                : 'text-[#7A7268] hover:text-[#201C1A]'
            }`}
          >
            Hari Ini
          </Link>
          <Link
            href="/dashboard?period=7d"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              period === '7d'
                ? 'bg-[#2E2520] text-white shadow-xs'
                : 'text-[#7A7268] hover:text-[#201C1A]'
            }`}
          >
            7 Hari
          </Link>
          <Link
            href="/dashboard?period=30d"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              period === '30d'
                ? 'bg-[#2E2520] text-white shadow-xs'
                : 'text-[#7A7268] hover:text-[#201C1A]'
            }`}
          >
            30 Hari
          </Link>
          <Link
            href="/dashboard?period=all"
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors ${
              period === 'all'
                ? 'bg-[#2E2520] text-white shadow-xs'
                : 'text-[#7A7268] hover:text-[#201C1A]'
            }`}
          >
            Semua
          </Link>
        </div>
      </div>

      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Omset */}
        <div className="bg-white p-5 rounded-3xl border border-[#EBE7DF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8E867C] mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Penjualan</span>
            <div className="w-8 h-8 rounded-xl bg-[#F4EFE6] text-[#54382B] flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-[#201C1A] tracking-tight">{formatRupiah(totalRevenue)}</p>
            <p className="text-[11px] text-[#9E968B] mt-1">Akumulasi pesanan selesai</p>
          </div>
        </div>

        {/* Transaksi Struk */}
        <div className="bg-white p-5 rounded-3xl border border-[#EBE7DF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8E867C] mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Jumlah Transaksi</span>
            <div className="w-8 h-8 rounded-xl bg-[#F4EFE6] text-[#54382B] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-[#201C1A] tracking-tight">
              {totalTrx} <span className="text-xs font-semibold text-[#8E867C]">struk</span>
            </p>
            <p className="text-[11px] text-[#9E968B] mt-1">Total checkout kasir</p>
          </div>
        </div>

        {/* Total Pengeluaran */}
        <div className="bg-white p-5 rounded-3xl border border-[#EBE7DF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8E867C] mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Beban Pengeluaran</span>
            <div className="w-8 h-8 rounded-xl bg-[#FBEBE8] text-[#964B3B] flex items-center justify-center">
              <WalletCards className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-2xl font-black text-[#964B3B] tracking-tight">{formatRupiah(totalExpenses)}</p>
            <p className="text-[11px] text-[#9E968B] mt-1">Operasional & belanja stok</p>
          </div>
        </div>

        {/* Laba Bersih */}
        <div className="bg-white p-5 rounded-3xl border border-[#EBE7DF] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between text-[#8E867C] mb-3">
            <span className="text-[11px] font-bold uppercase tracking-wider">Estimasi Laba Bersih</span>
            <div className="w-8 h-8 rounded-xl bg-[#EAF5EC] text-[#2D7A47] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className={`text-2xl font-black tracking-tight ${netProfit >= 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'}`}>
              {formatRupiah(netProfit)}
            </p>
            <p className="text-[11px] text-[#9E968B] mt-1">Omset - HPP - Beban Kas</p>
          </div>
        </div>
      </div>

      {/* Bento Main Grid: 2/3 Recent Orders + 1/3 Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Bento: Recent Orders */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#F0ECE4]">
            <div>
              <h3 className="font-bold text-[#201C1A] text-base tracking-tight">
                Transaksi Kasir Terkini
              </h3>
              <p className="text-xs text-[#8E867C]">Riwayat 5 pesanan terakhir</p>
            </div>
            <Link
              href="/pos"
              className="text-xs font-bold text-[#54382B] hover:text-[#201C1A] inline-flex items-center gap-1"
            >
              <span>Buka POS</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {recentOrders.length === 0 ? (
            <div className="text-center py-12 text-[#9E968B] text-xs">
              Belum ada transaksi pada periode yang dipilih.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-[#8E867C] font-bold uppercase text-[10px] tracking-wider border-b border-[#F0ECE4] pb-2">
                    <th className="pb-3">ID Struk</th>
                    <th className="pb-3">Waktu</th>
                    <th className="pb-3">Metode</th>
                    <th className="pb-3">Total</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F0E8]">
                  {recentOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FBF9F6] transition-colors">
                      <td className="py-3 font-mono font-bold text-[#201C1A]">{ord.id}</td>
                      <td className="py-3 text-[#7A7268]">{formatDateTime(ord.createdAt)}</td>
                      <td className="py-3 uppercase font-medium">
                        <span className="px-2 py-0.5 rounded-lg bg-[#F2EDE5] text-[#54382B] border border-[#E5DFD4]">
                          {ord.paymentMethod}
                        </span>
                      </td>
                      <td className="py-3 font-black text-[#201C1A]">{formatRupiah(ord.total)}</td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] ${
                            ord.status === 'completed'
                              ? 'bg-[#EBF6EE] text-[#2D7A47]'
                              : ord.status === 'voided'
                              ? 'bg-[#FBEBE8] text-[#964B3B]'
                              : 'bg-[#FDF4E5] text-[#96631E]'
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

        {/* Right Bento: Shortcuts & Quick Launch */}
        <div className="bg-[#2E2520] text-white rounded-3xl p-6 shadow-md flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <span className="px-3 py-1 rounded-xl bg-white/10 text-[10px] font-bold uppercase tracking-wider text-[#EAE2D5] border border-white/10">
              Kasir Seruni
            </span>
            <h3 className="text-xl font-serif font-bold text-[#FAF8F5] leading-snug">
              Mulai Layani Transaksi Pelanggan
            </h3>
            <p className="text-xs text-[#C8BFB2] leading-relaxed">
              Buka menu kasir POS untuk pemesanan cepat, pilih varian suhu dan gula, serta cetak struk instan.
            </p>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/pos"
              className="w-full py-3 px-4 bg-[#FAF8F5] hover:bg-white text-[#201C1A] font-bold rounded-2xl text-center block transition-all shadow text-xs"
            >
              Mulai Transaksi Kasir POS
            </Link>
            <Link
              href="/shift"
              className="w-full py-2.5 px-4 bg-white/10 hover:bg-white/15 text-[#EFEBE4] font-semibold rounded-2xl text-center block transition-colors text-xs border border-white/10"
            >
              Rekonsiliasi Shift & Kas
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
