import { db } from '@/lib/db';
import { orders, expenses, orderItems, outlets, expenseCategories } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import { formatRupiah, getDateRangeFromParams } from '@/lib/utils';
import { sql, eq, and, gte, lte, inArray, desc } from 'drizzle-orm';
import Link from 'next/link';
import {
  TrendingUp,
  Coins,
  Receipt,
  WalletCards,
  BarChart3,
  Store,
  FileSpreadsheet,
  Layers,
  Percent,
  Tag,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
} from 'lucide-react';

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; outletId?: string; from?: string; to?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const { effectiveOutletId, accessibleOutlets, accessibleOutletIds } = await requireAuthRole(
    ['owner'],
    resolvedParams.outletId
  );
  const outletId = effectiveOutletId;

  const { startEpoch, endEpoch, label: periodLabel } = getDateRangeFromParams(resolvedParams);

  let allOutlets: any[] = accessibleOutlets;
  let grossSales = 0;
  let totalDiscounts = 0;
  let totalTax = 0;
  let totalRevenue = 0;
  let totalTrx = 0;
  let totalCOGS = 0;
  let totalExpenses = 0;
  let expenseCategoryBreakdown: any[] = [];
  let outletBreakdowns: any[] = [];

  try {
    const orderConditions = [eq(orders.status, 'completed')];
    if (startEpoch > 0) orderConditions.push(gte(orders.createdAt, startEpoch));
    if (endEpoch > 0) orderConditions.push(lte(orders.createdAt, endEpoch));
    if (outletId !== 'all') {
      orderConditions.push(eq(orders.outletId, outletId));
    } else {
      orderConditions.push(inArray(orders.outletId, accessibleOutletIds));
    }

    const expenseConditions = [];
    if (startEpoch > 0) expenseConditions.push(gte(expenses.expenseDate, startEpoch));
    if (endEpoch > 0) expenseConditions.push(lte(expenses.expenseDate, endEpoch));
    if (outletId !== 'all') {
      expenseConditions.push(eq(expenses.outletId, outletId));
    } else {
      expenseConditions.push(inArray(expenses.outletId, accessibleOutletIds));
    }

    const salesQuery = db
      .select({
        gross: sql<number>`COALESCE(SUM(${orders.subtotal}), 0)`,
        discounts: sql<number>`COALESCE(SUM(${orders.discountAmount}), 0)`,
        tax: sql<number>`COALESCE(SUM(${orders.taxAmount}), 0)`,
        total: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .where(and(...orderConditions));

    const cogsQuery = db
      .select({
        totalCost: sql<number>`COALESCE(SUM(order_items.cost_price * order_items.quantity), 0)`,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(...orderConditions));

    const expensesQuery = db
      .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
      .from(expenses)
      .where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined);

    const expenseCategoryQuery = db
      .select({
        categoryId: expenses.categoryId,
        categoryName: expenseCategories.name,
        totalAmount: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(expenses)
      .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined)
      .groupBy(expenses.categoryId, expenseCategories.name)
      .orderBy(desc(sql`SUM(${expenses.amount})`));

    const outletRevenueQuery = db
      .select({
        outletId: orders.outletId,
        outletName: outlets.name,
        revenue: sql<number>`COALESCE(SUM(${orders.total}), 0)`,
        count: sql<number>`COUNT(*)`,
      })
      .from(orders)
      .leftJoin(outlets, eq(orders.outletId, outlets.id))
      .where(and(...orderConditions))
      .groupBy(orders.outletId, outlets.name);

    const [salesRes, cogsRes, expenseRes, expenseCatRes, outletRevRes] = await Promise.all([
      salesQuery,
      cogsQuery,
      expensesQuery,
      expenseCategoryQuery,
      outletRevenueQuery,
    ]);

    grossSales = Number(salesRes[0]?.gross || 0);
    totalDiscounts = Number(salesRes[0]?.discounts || 0);
    totalTax = Number(salesRes[0]?.tax || 0);
    totalRevenue = Number(salesRes[0]?.total || 0);
    totalTrx = Number(salesRes[0]?.count || 0);
    totalCOGS = Number(cogsRes[0]?.totalCost || 0);
    totalExpenses = Number(expenseRes[0]?.total || 0);
    expenseCategoryBreakdown = expenseCatRes;
    outletBreakdowns = outletRevRes;
  } catch (e) {
    console.warn('Profit Loss DB query error:', e);
  }

  const grossProfit = Math.max(0, totalRevenue - totalCOGS);
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';
  const cogsRatio = totalRevenue > 0 ? ((totalCOGS / totalRevenue) * 100).toFixed(1) : '0';
  const expenseRatio = totalRevenue > 0 ? ((totalExpenses / totalRevenue) * 100).toFixed(1) : '0';

  const exportUrl = `/api/export/profit-loss?period=${resolvedParams.period || 'this_month'}${
    resolvedParams.from ? `&from=${resolvedParams.from}` : ''
  }${resolvedParams.to ? `&to=${resolvedParams.to}` : ''}${
    outletId !== 'all' ? `&outletId=${outletId}` : ''
  }`;

  return (
    <div className="space-y-8">
      {/* Header Bento */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
            Laporan Rinci Laba Rugi (P&L Statement)
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Rincian pendapatan kotor, diskon, PPN, beban pokok HPP, dan beban operasional Kopi Seruni
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href={exportUrl}
            download
            className="flex items-center gap-2 bg-white px-3.5 py-2 rounded-2xl border border-[#EBE7DF] hover:bg-[#FAF8F5] text-xs font-bold text-[#2D7A47] shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#2D7A47]" />
            <span>Ekspor Excel (.csv)</span>
          </a>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Total Omset (Net Sales)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#54382B] flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-serif font-black text-2xl text-[#201C1A]">
              {formatRupiah(totalRevenue)}
            </h3>
            <p className="text-[10px] text-[#2D7A47] font-semibold mt-1">
              Dari {totalTrx} transaksi berhasil
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Laba Kotor (Gross Profit)
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#2D7A47] flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-serif font-black text-2xl text-[#2D7A47]">
              {formatRupiah(grossProfit)}
            </h3>
            <p className="text-[10px] text-[#2D7A47] font-semibold mt-1">
              Margin Kotor: {grossMargin}%
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl border border-[#EBE7DF] p-5 shadow-xs flex flex-col justify-between space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#8E867C] uppercase tracking-wider">
              Total Beban Usaha
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#964B3B] flex items-center justify-center">
              <WalletCards className="w-4 h-4" />
            </div>
          </div>
          <div>
            <h3 className="font-serif font-black text-2xl text-[#964B3B]">
              {formatRupiah(totalExpenses)}
            </h3>
            <p className="text-[10px] text-[#8E867C] mt-1">
              Rasio Beban: {expenseRatio}% dari omset
            </p>
          </div>
        </div>

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
            <h3
              className={`font-serif font-black text-2xl ${
                netProfit >= 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'
              }`}
            >
              {formatRupiah(netProfit)}
            </h3>
            <p className="text-[10px] text-[#2D7A47] font-semibold mt-1">
              Net Profit Margin: {netMargin}%
            </p>
          </div>
        </div>
      </div>

      {/* Detailed Financial Statement Table */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-[#F0ECE4] flex justify-between items-center bg-[#FAF8F5]">
          <div>
            <h2 className="font-bold text-base text-[#201C1A]">Rincian Laporan Laba Rugi Komprehensif</h2>
            <p className="text-xs text-[#8E867C]">Standar akuntansi pencatatan F&B Kopi Seruni</p>
          </div>
          <span className="text-xs font-bold text-[#54382B] px-3 py-1 bg-white rounded-xl border border-[#EBE7DF]">
            {periodLabel}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                <th className="py-3 px-6">Pos Akun Finansial</th>
                <th className="py-3 px-4">Keterangan / Komposisi</th>
                <th className="py-3 px-6 text-right">Nominal (Rupiah)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F4F0E8]">
              {/* SECTION A: PENDAPATAN */}
              <tr className="bg-[#FAF8F5]/60">
                <td colSpan={3} className="py-2.5 px-6 font-bold text-[#54382B] uppercase tracking-wider text-[11px]">
                  1. PENDAPATAN OPERASIONAL (REVENUE)
                </td>
              </tr>
              <tr className="hover:bg-[#FBF9F6]">
                <td className="py-3 px-6 pl-10 font-bold text-[#201C1A]">
                  Penjualan Kotor (Gross Sales)
                </td>
                <td className="py-3 px-4 text-[#8E867C]">Total subtotal harga menu sebelum diskon</td>
                <td className="py-3 px-6 text-right font-mono font-bold text-[#201C1A]">
                  {formatRupiah(grossSales)}
                </td>
              </tr>
              <tr className="hover:bg-[#FBF9F6]">
                <td className="py-3 px-6 pl-10 font-medium text-[#964B3B]">
                  (-) Potongan & Diskon Promosi
                </td>
                <td className="py-3 px-4 text-[#8E867C]">Total voucher dan diskon penjualan</td>
                <td className="py-3 px-6 text-right font-mono font-bold text-[#964B3B]">
                  ({formatRupiah(totalDiscounts)})
                </td>
              </tr>
              <tr className="hover:bg-[#FBF9F6]">
                <td className="py-3 px-6 pl-10 font-medium text-[#201C1A]">
                  (+) PPN / Pajak Terkumpul (11%)
                </td>
                <td className="py-3 px-4 text-[#8E867C]">Pajak pertambahan nilai pada struk</td>
                <td className="py-3 px-6 text-right font-mono font-bold text-[#201C1A]">
                  {formatRupiah(totalTax)}
                </td>
              </tr>
              <tr className="bg-[#F8F5EE] font-bold">
                <td className="py-3.5 px-6 pl-8 text-[#201C1A] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#54382B]" />
                  <span>TOTAL OMSET PENJUALAN BERSIH</span>
                </td>
                <td className="py-3.5 px-4 text-[#7A7268]">Kas dan piutang penjualan masuk</td>
                <td className="py-3.5 px-6 text-right font-mono font-black text-sm text-[#201C1A]">
                  {formatRupiah(totalRevenue)}
                </td>
              </tr>

              {/* SECTION B: BEBAN POKOK */}
              <tr className="bg-[#FAF8F5]/60">
                <td colSpan={3} className="py-2.5 px-6 font-bold text-[#54382B] uppercase tracking-wider text-[11px]">
                  2. HARGA POKOK PENJUALAN (COGS / HPP)
                </td>
              </tr>
              <tr className="hover:bg-[#FBF9F6]">
                <td className="py-3 px-6 pl-10 font-bold text-[#7A7268]">
                  (-) Total Biaya Modal Bahan Baku
                </td>
                <td className="py-3 px-4 text-[#8E867C]">Biji kopi, susu segar, sirup, cup, & packaging</td>
                <td className="py-3 px-6 text-right font-mono font-bold text-[#964B3B]">
                  ({formatRupiah(totalCOGS)})
                </td>
              </tr>
              <tr className="bg-[#F8F5EE] font-bold">
                <td className="py-3.5 px-6 pl-8 text-[#201C1A] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-[#2D7A47]" />
                  <span>= LABA KOTOR (GROSS PROFIT)</span>
                </td>
                <td className="py-3.5 px-4 text-[#2D7A47] font-semibold">Gross Profit Margin: {grossMargin}%</td>
                <td className="py-3.5 px-6 text-right font-mono font-black text-base text-[#2D7A47]">
                  {formatRupiah(grossProfit)}
                </td>
              </tr>

              {/* SECTION C: BEBAN OPERASIONAL RINCI */}
              <tr className="bg-[#FAF8F5]/60">
                <td colSpan={3} className="py-2.5 px-6 font-bold text-[#54382B] uppercase tracking-wider text-[11px]">
                  3. RINCIAN BEBAN PENGELUARAN OPERASIONAL (EXPENSES)
                </td>
              </tr>
              {expenseCategoryBreakdown.map((cat) => {
                const amount = Number(cat.totalAmount || 0);
                const share = totalRevenue > 0 ? ((amount / totalRevenue) * 100).toFixed(1) : '0';

                return (
                  <tr key={cat.categoryId || 'uncategorized'} className="hover:bg-[#FBF9F6]">
                    <td className="py-3 px-6 pl-10 font-medium text-[#201C1A]">
                      (-) {cat.categoryName || 'Pengeluaran Operasional Umum'}
                    </td>
                    <td className="py-3 px-4 text-[#8E867C]">
                      {cat.count} Transaksi ({share}% dari omset)
                    </td>
                    <td className="py-3 px-6 text-right font-mono font-bold text-[#964B3B]">
                      ({formatRupiah(amount)})
                    </td>
                  </tr>
                );
              })}

              {expenseCategoryBreakdown.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-3 px-6 pl-10 text-[#8E867C]">
                    Tidak ada catatan beban pengeluaran pada periode ini.
                  </td>
                </tr>
              )}

              <tr className="bg-[#F8F5EE] font-bold">
                <td className="py-3.5 px-6 pl-8 text-[#201C1A] flex items-center gap-2">
                  <WalletCards className="w-4 h-4 text-[#964B3B]" />
                  <span>TOTAL BEBAN OPERASIONAL</span>
                </td>
                <td className="py-3.5 px-4 text-[#7A7268]">Akumulasi seluruh biaya operasional</td>
                <td className="py-3.5 px-6 text-right font-mono font-black text-sm text-[#964B3B]">
                  ({formatRupiah(totalExpenses)})
                </td>
              </tr>

              {/* SECTION D: LABA BERSIH */}
              <tr className={netProfit >= 0 ? 'bg-[#EBF6EE]' : 'bg-[#FBEBE8]'}>
                <td className="py-5 px-6 font-bold text-sm text-[#201C1A] flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-xs ${netProfit >= 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'}`}>
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-base font-black text-[#201C1A]">= LABA BERSIH USAHA (NET PROFIT)</span>
                    <p className="text-[10px] text-[#7A7268] font-normal mt-0.5">Dasar pembagian dividen & bagi hasil mitra</p>
                  </div>
                </td>
                <td className="py-5 px-4">
                  <span className={`text-xs font-black uppercase px-2.5 py-1 rounded-md ${netProfit >= 0 ? 'bg-[#D1EBD8] text-[#2D7A47]' : 'bg-[#F5D5CE] text-[#964B3B]'}`}>
                    Net Margin: {netMargin}%
                  </span>
                </td>
                <td className={`py-5 px-6 text-right font-mono font-black text-xl ${netProfit >= 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'}`}>
                  {formatRupiah(netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Multi-Outlet Summary (if viewing all) */}
      {allOutlets.length > 1 && outletBreakdowns.length > 0 && (
        <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs p-6 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-[#F0ECE4]">
            <Store className="w-4 h-4 text-[#54382B]" />
            <h3 className="font-bold text-sm text-[#201C1A]">Rincian Pendapatan Antar Cabang</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#F0ECE4] bg-[#FAF8F5] text-[#8E867C] text-[10px] font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Nama Outlet</th>
                  <th className="py-3 px-4">Jumlah Transaksi</th>
                  <th className="py-3 px-4">Proporsi Omset</th>
                  <th className="py-3 px-4 text-right">Total Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F0E8]">
                {outletBreakdowns.map((ob) => {
                  const rev = Number(ob.revenue || 0);
                  const share = totalRevenue > 0 ? ((rev / totalRevenue) * 100).toFixed(1) : '0';

                  return (
                    <tr key={ob.outletId} className="hover:bg-[#FBF9F6]">
                      <td className="py-3.5 px-4 font-bold text-[#201C1A]">
                        {ob.outletName || ob.outletId}
                      </td>
                      <td className="py-3.5 px-4 text-[#4A4238]">
                        {ob.count} Transaksi
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
                        {formatRupiah(rev)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
