import { db } from '@/lib/db';
import { orders, expenses, orderItems, outlets, user } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import { formatRupiah, formatDateTime, getDateRangeFromParams } from '@/lib/utils';
import { sql, desc, eq, and, gte, lte, inArray } from 'drizzle-orm';
import Link from 'next/link';
import {
  TrendingUp,
  Receipt,
  WalletCards,
  Coins,
  ArrowRight,
  Clock,
  Layers,
  Store,
  QrCode,
  Banknote,
  CreditCard,
  Trophy,
  Percent,
  PieChart,
  ShoppingBag,
  Flame,
} from 'lucide-react';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; outletId?: string; from?: string; to?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const { effectiveOutletId, accessibleOutlets, accessibleOutletIds } = await requireAuthRole(
    ['owner', 'manager'],
    resolvedParams.outletId
  );
  const outletId = effectiveOutletId;

  const { startEpoch, endEpoch, label: periodLabel } = getDateRangeFromParams(resolvedParams);

  let allOutlets: any[] = accessibleOutlets;
  let totalRevenue = 0;
  let totalTrx = 0;
  let totalExpenses = 0;
  let estimatedCOGS = 0;
  let topProducts: any[] = [];
  let paymentDistribution: any[] = [];
  let outletPerformance: any[] = [];

  try {
    // Filter conditions for orders
    const orderConditions = [eq(orders.status, 'completed')];
    if (startEpoch > 0) orderConditions.push(gte(orders.createdAt, startEpoch));
    if (endEpoch > 0) orderConditions.push(lte(orders.createdAt, endEpoch));
    if (outletId !== 'all') {
      orderConditions.push(eq(orders.outletId, outletId));
    } else {
      orderConditions.push(inArray(orders.outletId, accessibleOutletIds));
    }

    // Filter conditions for expenses
    const expenseConditions = [];
    if (startEpoch > 0) expenseConditions.push(gte(expenses.expenseDate, startEpoch));
    if (endEpoch > 0) expenseConditions.push(lte(expenses.expenseDate, endEpoch));
    if (outletId !== 'all') {
      expenseConditions.push(eq(expenses.outletId, outletId));
    } else {
      expenseConditions.push(inArray(expenses.outletId, accessibleOutletIds));
    }

    const revenuePromise = db
      .select({
        total: sql<number>`COALESCE(SUM(total), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(...orderConditions));

    const expensePromise = db
      .select({
        total: sql<number>`COALESCE(SUM(amount), 0)`,
      })
      .from(expenses)
      .where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined);

    const cogsPromise = db
      .select({
        cogs: sql<number>`COALESCE(SUM(order_items.cost_price * order_items.quantity), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...orderConditions));

    // Top 5 Best-Selling Products
    const topProductsPromise = db
      .select({
        productName: orderItems.productName,
        totalQty: sql<number>`COALESCE(SUM(${orderItems.quantity}), 0)`,
        totalSales: sql<number>`COALESCE(SUM(${orderItems.subtotal}), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...orderConditions))
      .groupBy(orderItems.productName)
      .orderBy(desc(sql`SUM(${orderItems.quantity})`))
      .limit(5);

    // Payment Method Distribution
    const paymentDistributionPromise = db
      .select({
        paymentMethod: orders.paymentMethod,
        count: sql<number>`COUNT(*)`,
        total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
      })
      .from(orders)
      .where(and(...orderConditions))
      .groupBy(orders.paymentMethod)
      .orderBy(desc(sql`SUM(${orders.total})`));

    // Multi-Outlet Comparison
    const outletPerformancePromise = db
      .select({
        outletId: orders.outletId,
        outletName: outlets.name,
        totalSales: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        trxCount: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .leftJoin(outlets, eq(orders.outletId, outlets.id))
      .where(and(...orderConditions))
      .groupBy(orders.outletId, outlets.name)
      .orderBy(desc(sql`SUM(${orders.total})`));

    const [revenueRes, expenseRes, cogsRes, topProductsRes, paymentDistRes, outletPerfRes] =
      await Promise.all([
        revenuePromise,
        expensePromise,
        cogsPromise,
        topProductsPromise,
        paymentDistributionPromise,
        outletPerformancePromise,
      ]);

    totalRevenue = Number(revenueRes[0]?.total || 0);
    totalTrx = Number(revenueRes[0]?.count || 0);
    totalExpenses = Number(expenseRes[0]?.total || 0);
    estimatedCOGS = Number(cogsRes[0]?.cogs || 0);
    topProducts = topProductsRes;
    paymentDistribution = paymentDistRes;
    outletPerformance = outletPerfRes;
  } catch (e) {
    console.warn('Dashboard DB query error:', e);
  }

  const grossProfit = Math.max(0, totalRevenue - estimatedCOGS);
  const netProfit = totalRevenue - estimatedCOGS - totalExpenses;
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';
  const aov = totalTrx > 0 ? Math.round(totalRevenue / totalTrx) : 0;
  const cogsRatio = totalRevenue > 0 ? ((estimatedCOGS / totalRevenue) * 100).toFixed(1) : '0';

  const maxProductQty = Math.max(1, ...topProducts.map((p) => Number(p.totalQty || 0)));

  return (
    <div className="space-y-8">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Dashboard Ringkasan Bisnis
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Analisis metrik finansial, produk terlaris, dan distribusi pembayaran Kopi Seruni
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#54382B] px-3.5 py-1.5 bg-[#FAF8F5] rounded-2xl border border-[#ECE7DE] shadow-2xs">
            Periode: {periodLabel}
          </span>
        </div>
      </div>

      {/* KPI Bento Grid — 6 Business Executive Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI 1: Omset Penjualan */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
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

        {/* KPI 2: Average Order Value (AOV) */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Rata-rata Transaksi (AOV)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#54382B] flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-2xl text-[#201C1A]">
              {formatRupiah(aov)}
            </h2>
            <p className="text-[10px] text-[#8E867C] mt-1">Nilai belanja rata-rata per pelanggan</p>
          </div>
        </div>

        {/* KPI 3: Laba Kotor (Gross Profit) */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Laba Kotor (Gross Profit)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#2D7A47] flex items-center justify-center">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-2xl text-[#2D7A47]">
              {formatRupiah(grossProfit)}
            </h2>
            <p className="text-[10px] text-[#2D7A47] font-semibold mt-1">
              Gross Margin: {grossMargin}%
            </p>
          </div>
        </div>

        {/* KPI 4: Estimasi HPP / Modal Pokok */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Beban Pokok (HPP / COGS)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#7A7268] flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h2 className="font-serif font-black text-2xl text-[#201C1A]">
              {formatRupiah(estimatedCOGS)}
            </h2>
            <p className="text-[10px] text-[#8E867C] mt-1">Rasio HPP: {cogsRatio}% dari omset</p>
          </div>
        </div>

        {/* KPI 5: Beban Operasional */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
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

        {/* KPI 6: Laba Bersih (Net Profit) */}
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
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
              Net Margin: {netMargin}%
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 2: TOP PRODUCTS & PAYMENT DISTRIBUTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left (7 Cols): Top 5 Best-Selling Menu Items */}
        <div className="lg:col-span-7 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE4]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#FAF8F5] text-[#54382B] flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#201C1A]">5 Menu Terlaris (Best Seller)</h3>
                <p className="text-[11px] text-[#8E867C]">Berdasarkan volume penjualan periode ini</p>
              </div>
            </div>
            <Link
              href="/products"
              className="text-xs font-bold text-[#54382B] hover:underline flex items-center gap-1"
            >
              <span>Kelola Menu</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5 pt-1">
            {topProducts.map((p, idx) => {
              const qty = Number(p.totalQty || 0);
              const sales = Number(p.totalSales || 0);
              const percentage = Math.round((qty / maxProductQty) * 100);

              return (
                <div key={p.productName} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-lg bg-[#FAF8F5] text-[#54382B] font-bold text-[10px] flex items-center justify-center border border-[#ECE7DE]">
                        #{idx + 1}
                      </span>
                      <span className="font-bold text-[#201C1A]">{p.productName}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-black text-[#201C1A]">{qty} Terjual</span>
                      <span className="text-[10px] text-[#8E867C] ml-2">({formatRupiah(sales)})</span>
                    </div>
                  </div>
                  <div className="w-full h-2 bg-[#FAF8F5] border border-[#ECE7DE] rounded-full overflow-hidden">
                    <div
                      style={{ width: `${percentage}%` }}
                      className="bg-[#54382B] h-full rounded-full transition-all duration-500"
                    />
                  </div>
                </div>
              );
            })}

            {topProducts.length === 0 && (
              <div className="py-8 text-center text-xs text-[#8E867C]">
                Belum ada data penjualan produk pada periode ini.
              </div>
            )}
          </div>
        </div>

        {/* Right (5 Cols): Payment Method Distribution */}
        <div className="lg:col-span-5 bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE4]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#FAF8F5] text-[#54382B] flex items-center justify-center">
                <PieChart className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#201C1A]">Distribusi Pembayaran</h3>
                <p className="text-[11px] text-[#8E867C]">Metode transaksi kasir</p>
              </div>
            </div>
            <Link
              href="/orders"
              className="text-xs font-bold text-[#54382B] hover:underline flex items-center gap-1"
            >
              <span>Riwayat</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          <div className="space-y-3 pt-1">
            {paymentDistribution.map((pm) => {
              const count = Number(pm.count || 0);
              const totalAmount = Number(pm.total || 0);
              const share = totalRevenue > 0 ? ((totalAmount / totalRevenue) * 100).toFixed(1) : '0';

              const isQris = pm.paymentMethod === 'qris';
              const isCash = pm.paymentMethod === 'cash';

              return (
                <div
                  key={pm.paymentMethod}
                  className="p-3 bg-[#FAF8F5] border border-[#ECE7DE] rounded-2xl flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white border border-[#E2DDD3] flex items-center justify-center text-[#54382B]">
                      {isQris ? (
                        <QrCode className="w-4 h-4" />
                      ) : isCash ? (
                        <Banknote className="w-4 h-4" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-xs text-[#201C1A] uppercase tracking-wide">
                        {pm.paymentMethod}
                      </p>
                      <p className="text-[10px] text-[#8E867C]">{count} Transaksi ({share}%)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-xs text-[#201C1A]">{formatRupiah(totalAmount)}</p>
                  </div>
                </div>
              );
            })}

            {paymentDistribution.length === 0 && (
              <div className="py-8 text-center text-xs text-[#8E867C]">
                Belum ada transaksi pembayaran pada periode ini.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 3: Multi-Outlet Performance Breakdown (if multiple outlets) */}
      {allOutlets.length > 1 && (
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#F0ECE4]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl bg-[#FAF8F5] text-[#54382B] flex items-center justify-center">
                <Store className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[#201C1A]">Perbandingan Kinerja Antar Cabang</h3>
                <p className="text-[11px] text-[#8E867C]">Performa omset dan kontribusi per outlet Kopi Seruni</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Cabang / Outlet</th>
                  <th className="py-3 px-4">Volume Transaksi</th>
                  <th className="py-3 px-4">Kontribusi Omset</th>
                  <th className="py-3 px-4 text-right">Total Penjualan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {outletPerformance.map((op) => {
                  const sales = Number(op.totalSales || 0);
                  const share = totalRevenue > 0 ? ((sales / totalRevenue) * 100).toFixed(1) : '0';

                  return (
                    <tr key={op.outletId} className="hover:bg-[#FBF9F6]">
                      <td className="py-3.5 px-4 font-bold text-[#201C1A]">
                        {op.outletName || op.outletId}
                      </td>
                      <td className="py-3.5 px-4 text-[#4A4238]">
                        {op.trxCount} Transaksi
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-[#FAF8F5] border border-[#ECE7DE] rounded-full overflow-hidden">
                            <div
                              style={{ width: `${share}%` }}
                              className="bg-[#54382B] h-full rounded-full"
                            />
                          </div>
                          <span className="font-bold text-[11px] text-[#54382B]">{share}%</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-sm text-[#201C1A]">
                        {formatRupiah(sales)}
                      </td>
                    </tr>
                  );
                })}

                {outletPerformance.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-xs text-[#8E867C]">
                      Belum ada aktivitas transaksi per cabang pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
