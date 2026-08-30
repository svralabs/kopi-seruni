import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, outlets, user } from '@/lib/schema';
import { eq, and, desc, gte, lte } from 'drizzle-orm';
import { formatDateTime, getDateRangeFromParams } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const outletId = searchParams.get('outletId') || 'all';
  const status = searchParams.get('status') || 'all';
  const period = searchParams.get('period') || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;

  const { startEpoch, endEpoch } = getDateRangeFromParams({ period, from, to });

  const conditions = [];
  if (outletId !== 'all') conditions.push(eq(orders.outletId, outletId));
  if (startEpoch > 0) conditions.push(gte(orders.createdAt, startEpoch));
  if (endEpoch > 0) conditions.push(lte(orders.createdAt, endEpoch));
  if (status !== 'all') conditions.push(eq(orders.status, status as any));

  const rows = await db
    .select({
      order: orders,
      outlet: outlets,
      user: user,
    })
    .from(orders)
    .leftJoin(outlets, eq(orders.outletId, outlets.id))
    .leftJoin(user, eq(orders.kasirId, user.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(orders.createdAt));

  // CSV headers with UTF-8 BOM for Microsoft Excel compatibility
  const headers = ['No Struk', 'Waktu', 'Cabang Outlet', 'Kasir', 'Pelanggan', 'Subtotal', 'Diskon', 'PPN', 'Total', 'Metode Bayar', 'Status'];
  
  const csvRows = rows.map((r) => [
    `"${r.order.id}"`,
    `"${formatDateTime(r.order.createdAt)}"`,
    `"${r.outlet?.name || 'Pusat'}"`,
    `"${r.user?.name || 'Kasir'}"`,
    `"${r.order.customerName || 'Walk-in'}"`,
    r.order.subtotal,
    r.order.discountAmount || 0,
    r.order.taxAmount || 0,
    r.order.total,
    `"${r.order.paymentMethod.toUpperCase()}"`,
    `"${r.order.status.toUpperCase()}"`,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="laporan-penjualan-seruni-${Date.now()}.csv"`,
    },
  });
}
