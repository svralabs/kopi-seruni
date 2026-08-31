import { db } from '@/lib/db';
import { orders, expenses, orderItems, outlets } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import { formatRupiah, getDateRangeFromParams } from '@/lib/utils';
import { sql, eq, and, gte, lte } from 'drizzle-orm';
import Link from 'next/link';
import { TrendingUp, Coins, Receipt, WalletCards, BarChart3, Store, FileSpreadsheet } from 'lucide-react';

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams?: Promise<{ period?: string; outletId?: string; from?: string; to?: string }>;
}) {
  await requireAuthRole(['owner']);
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'all';

  const { startEpoch, endEpoch, label: periodLabel } = getDateRangeFromParams(resolvedParams);

  let allOutlets: any[] = [];
  let totalRevenue = 0;
  let totalCOGS = 0;
  let totalExpenses = 0;

  try {
    const orderConditions = [eq(orders.status, 'completed')];
    if (startEpoch > 0) orderConditions.push(gte(orders.createdAt, startEpoch));
    if (endEpoch > 0) orderConditions.push(lte(orders.createdAt, endEpoch));
    if (outletId !== 'all') orderConditions.push(eq(orders.outletId, outletId));

    const expenseConditions = [];
    if (startEpoch > 0) expenseConditions.push(gte(expenses.expenseDate, startEpoch));
    if (endEpoch > 0) expenseConditions.push(lte(expenses.expenseDate, endEpoch));
    if (outletId !== 'all') expenseConditions.push(eq(expenses.outletId, outletId));

    const [outletsRes, revenueQuery, cogsQuery, expenseQuery] = await Promise.all([
      getOutlets(),
      db
        .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
        .from(orders)
        .where(and(...orderConditions)),
      db
        .select({
          totalCost: sql<number>`COALESCE(SUM(order_items.cost_price * order_items.quantity), 0)`,
        })
        .from(orderItems)
        .innerJoin(orders, eq(orderItems.orderId, orders.id))
        .where(and(...orderConditions)),
      db
        .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
        .from(expenses)
        .where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined),
    ]);

    allOutlets = outletsRes;
    totalRevenue = Number(revenueQuery[0]?.total || 0);
    totalCOGS = Number(cogsQuery[0]?.totalCost || 0);
    totalExpenses = Number(expenseQuery[0]?.total || 0);
  } catch (e) {
    console.warn('Profit Loss DB query error:', e);
  }

  const grossProfit = totalRevenue - totalCOGS;
  const netProfit = grossProfit - totalExpenses;
  const grossMargin = totalRevenue > 0 ? ((grossProfit / totalRevenue) * 100).toFixed(1) : '0';
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

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
            Laporan Keuangan & Laba Rugi
          </h1>
          <p className="text-xs text-[#8E867C] mt-0.5">
            Analisis pendapatan kotor (Gross Profit), beban modal (COGS), dan laba bersih (Net Profit)
          </p>
        </div>

        {/* Action Button */}
        <div>
          <a
            href={exportUrl}
            download
            className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-2xl border border-[#EBE7DF] hover:bg-[#FAF8F5] text-xs font-bold text-[#2D7A47] shadow-xs transition-colors"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#2D7A47]" />
            <span>Ekspor Excel (.csv)</span>
          </a>
        </div>
      </div>


      {/* Waterfall Breakdown Table */}
      <div className="bg-white rounded-3xl border border-[#EBE7DF] shadow-xs overflow-hidden max-w-4xl">
        <div className="px-6 py-5 border-b border-[#F0ECE4] flex justify-between items-center bg-[#FAF8F5]">
          <h2 className="font-bold text-base text-[#201C1A]">Breakdown Laba Rugi</h2>
          <span className="text-xs font-bold text-[#8E867C] px-3 py-1 bg-white rounded-lg border border-[#EBE7DF]">
            {periodLabel}
          </span>
        </div>
        
        <div className="p-0">
          <table className="w-full text-left text-sm">
            <tbody className="divide-y divide-[#F4F0E8]">
              {/* Revenue */}
              <tr className="hover:bg-[#FBF9F6]">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#201C1A] flex items-center justify-center">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#201C1A]">Total Revenue (Omset)</p>
                      <p className="text-[10px] text-[#8E867C] uppercase tracking-wider font-bold mt-0.5">Penjualan produk lunas</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-black text-[#201C1A] text-base">
                  {formatRupiah(totalRevenue)}
                </td>
              </tr>
              
              {/* COGS */}
              <tr className="hover:bg-[#FBF9F6]">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3 ml-4">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#7A7268] flex items-center justify-center">
                      <BarChart3 className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#7A7268]">(-) Beban Pokok Penjualan (HPP)</p>
                      <p className="text-[10px] text-[#8E867C] uppercase tracking-wider font-bold mt-0.5">Total harga pokok bahan</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-bold text-[#964B3B]">
                  ({formatRupiah(totalCOGS)})
                </td>
              </tr>
              
              {/* Gross Profit */}
              <tr className="bg-[#FAF8F5]">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-white text-[#2D7A47] flex items-center justify-center border border-[#EBE7DF]">
                      <TrendingUp className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#201C1A]">= Laba Kotor (Gross Profit)</p>
                      <p className="text-[10px] text-[#2D7A47] uppercase tracking-wider font-bold mt-0.5">Margin Kotor: {grossMargin}%</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-black text-[#2D7A47] text-lg">
                  {formatRupiah(grossProfit)}
                </td>
              </tr>
              
              {/* Expenses */}
              <tr className="hover:bg-[#FBF9F6]">
                <td className="py-4 px-6">
                  <div className="flex items-center gap-3 ml-4">
                    <div className="w-8 h-8 rounded-xl bg-[#FAF8F5] text-[#964B3B] flex items-center justify-center">
                      <WalletCards className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#7A7268]">(-) Beban Operasional (Expenses)</p>
                      <p className="text-[10px] text-[#8E867C] uppercase tracking-wider font-bold mt-0.5">Gaji, listrik, sewa, & supplies</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-6 text-right font-bold text-[#964B3B]">
                  ({formatRupiah(totalExpenses)})
                </td>
              </tr>
              
              {/* Net Profit */}
              <tr className={netProfit >= 0 ? 'bg-[#EBF6EE]' : 'bg-[#FBEBE8]'}>
                <td className="py-5 px-6">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-xs ${netProfit >= 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'}`}>
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <p className={`font-bold text-lg ${netProfit >= 0 ? 'text-[#201C1A]' : 'text-[#964B3B]'}`}>
                        = Laba Bersih (Net Profit)
                      </p>
                      <p className={`text-[10px] uppercase tracking-wider font-bold mt-0.5 ${netProfit >= 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'}`}>
                        Net Profit Margin: {netMargin}% • Dasar Bagi Hasil
                      </p>
                    </div>
                  </div>
                </td>
                <td className={`py-5 px-6 text-right font-black text-2xl ${netProfit >= 0 ? 'text-[#2D7A47]' : 'text-[#964B3B]'}`}>
                  {formatRupiah(netProfit)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
