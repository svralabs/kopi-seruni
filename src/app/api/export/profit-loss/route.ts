import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, expenses, orderItems, outlets } from '@/lib/schema';
import { sql, eq, and, gte, lte, inArray } from 'drizzle-orm';
import { formatRupiah, getDateRangeFromParams } from '@/lib/utils';
import { generateProfitLossPdf } from '@/lib/pdf-generator';
import { generateProfitLossExcel } from '@/lib/excel-generator';
import { auth } from '@/lib/auth';
import { userOutletRoles } from '@/lib/schema';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const rawOutletId = searchParams.get('outletId');
  let outletId = rawOutletId;
  let outletName = 'Semua Cabang';

  if (outletId === 'all') {
    outletName = 'Semua Cabang';
  } else if (outletId) {
    const [found] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (found) outletName = found.name;
  } else {
    const [found] = await db.select().from(outlets).limit(1);
    outletId = found?.id || 'out_default';
    outletName = found?.name || 'Kopi Seruni - Pusat';
  }

  const period = searchParams.get('period') || 'today';
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const format = searchParams.get('format') || 'xlsx';

  const { startEpoch, endEpoch, label: periodLabel } = getDateRangeFromParams({ period, from, to });

  const orderConditions = [eq(orders.status, 'completed')];
  if (startEpoch > 0) orderConditions.push(gte(orders.createdAt, startEpoch));
  if (endEpoch > 0) orderConditions.push(lte(orders.createdAt, endEpoch));

  const expenseConditions: any[] = [];
  if (startEpoch > 0) expenseConditions.push(gte(expenses.expenseDate, startEpoch));
  if (endEpoch > 0) expenseConditions.push(lte(expenses.expenseDate, endEpoch));

  try {
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session && process.env.NODE_ENV === 'production') {
      return new NextResponse('Akses ditolak: Sesi tidak valid atau telah berakhir.', { status: 401 });
    }
    if (session?.user?.id) {
      const roles = await db
        .select({ outletId: userOutletRoles.outletId })
        .from(userOutletRoles)
        .where(eq(userOutletRoles.userId, session.user.id));
      if (roles.length > 0) {
        const allowedIds = roles.map((r) => r.outletId);
        if (outletId === 'all') {
          orderConditions.push(inArray(orders.outletId, allowedIds));
          expenseConditions.push(inArray(expenses.outletId, allowedIds));
        } else if (!allowedIds.includes(outletId)) {
          return new NextResponse('Akses ditolak ke cabang ini', { status: 403 });
        }
      }
    }
  } catch {
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Akses ditolak: Sesi tidak valid atau telah berakhir.', { status: 401 });
    }
  }

  if (outletId !== 'all') {
    if (!orderConditions.some((c: any) => c === eq(orders.outletId, outletId))) {
      orderConditions.push(eq(orders.outletId, outletId));
    }
    if (!expenseConditions.some((c: any) => c === eq(expenses.outletId, outletId))) {
      expenseConditions.push(eq(expenses.outletId, outletId));
    }
  }

  const revenueQuery = await db
    .select({ total: sql<number>`COALESCE(SUM(total), 0)` })
    .from(orders)
    .where(and(...orderConditions));

  const totalRevenue = Number(revenueQuery[0]?.total || 0);

  const cogsQuery = await db
    .select({
      totalCost: sql<number>`COALESCE(SUM(order_items.cost_price * order_items.quantity), 0)`,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(and(...orderConditions));

  const totalCOGS = Number(cogsQuery[0]?.totalCost || 0);

  const expenseQuery = await db
    .select({ total: sql<number>`COALESCE(SUM(amount), 0)` })
    .from(expenses)
    .where(expenseConditions.length > 0 ? and(...expenseConditions) : undefined);

  const totalExpenses = Number(expenseQuery[0]?.total || 0);

  const grossProfit = Math.max(0, totalRevenue - totalCOGS);
  const netProfit = grossProfit - totalExpenses;
  const netMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0';

  // 1. PDF Export (Server-Side Backend Generation)
  if (format === 'pdf') {
    const pdfBuffer = await generateProfitLossPdf(
      {
        totalRevenue,
        totalCOGS,
        grossProfit,
        totalExpenses,
        netProfit,
        netMargin,
      },
      {
        outletName,
        periodLabel,
        printedAt: new Date().toLocaleString('id-ID'),
      }
    );

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laporan-laba-rugi-seruni-${Date.now()}.pdf"`,
      },
    });
  }

  // 2. CSV Export (Fallback)
  if (format === 'csv') {
    const rows = [
      ['LAPORAN LABA RUGI — KOPI SERUNI', ''],
      ['Periode', periodLabel.toUpperCase()],
      ['Cabang Outlet', outletName.toUpperCase()],
      ['Waktu Ekspor', new Date().toLocaleString('id-ID')],
      ['', ''],
      ['KOMPONEN KEUANGAN', 'NOMINAL (RP)'],
      ['1. Total Revenue / Omset Penjualan', totalRevenue],
      ['2. Beban Pokok Penjualan (HPP / COGS)', totalCOGS],
      ['3. LABA KOTOR (GROSS PROFIT)', grossProfit],
      ['4. Beban Pengeluaran Operasional', totalExpenses],
      ['5. LABA BERSIH (NET PROFIT)', netProfit],
      ['Net Profit Margin (%)', `${netMargin}%`],
    ];

    const csvContent = '\uFEFF' + rows.map((e) => e.map(val => `"${val}"`).join(',')).join('\n');

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="laporan-laba-rugi-${Date.now()}.csv"`,
      },
    });
  }

  // 3. Excel (.xlsx) Export (Default)
  const excelBuffer = await generateProfitLossExcel(
    {
      totalRevenue,
      totalCOGS,
      grossProfit,
      totalExpenses,
      netProfit,
      netMargin,
    },
    {
      outletName,
      periodLabel,
      printedAt: new Date().toLocaleString('id-ID'),
    }
  );

  return new NextResponse(new Uint8Array(excelBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="laporan-laba-rugi-seruni-${Date.now()}.xlsx"`,
    },
  });
}
