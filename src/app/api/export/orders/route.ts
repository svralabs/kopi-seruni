import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { orders, outlets, user } from '@/lib/schema';
import { eq, and, desc, asc, gte, lte, like, or } from 'drizzle-orm';
import { formatDateTime, getDateRangeFromParams } from '@/lib/utils';
import { generateOrdersPdf } from '@/lib/pdf-generator';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const outletId = searchParams.get('outletId') || 'all';
  const status = searchParams.get('status') || 'all';
  const payment = searchParams.get('payment') || 'all';
  const q = searchParams.get('q') || undefined;
  const period = searchParams.get('period') || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const sort = searchParams.get('sort') || undefined;
  const dir = searchParams.get('dir') || 'desc';
  const format = searchParams.get('format') || 'csv';

  const { startEpoch, endEpoch, label } = getDateRangeFromParams({ period, from, to });

  const conditions = [];
  if (outletId !== 'all') conditions.push(eq(orders.outletId, outletId));
  if (startEpoch > 0) conditions.push(gte(orders.createdAt, startEpoch));
  if (endEpoch > 0) conditions.push(lte(orders.createdAt, endEpoch));
  if (status !== 'all') conditions.push(eq(orders.status, status as any));
  if (payment !== 'all') conditions.push(eq(orders.paymentMethod, payment as any));
  if (q) {
    const query = `%${q}%`;
    conditions.push(or(like(orders.id, query), like(orders.customerName, query)));
  }

  let orderBy = desc(orders.createdAt);
  if (sort === 'createdAt') orderBy = dir === 'asc' ? asc(orders.createdAt) : desc(orders.createdAt);
  else if (sort === 'total') orderBy = dir === 'asc' ? asc(orders.total) : desc(orders.total);
  else if (sort === 'status') orderBy = dir === 'asc' ? asc(orders.status) : desc(orders.status);
  else if (sort === 'paymentMethod') orderBy = dir === 'asc' ? asc(orders.paymentMethod) : desc(orders.paymentMethod);

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
    .orderBy(orderBy);

  let outletName = 'Semua Cabang';
  if (outletId !== 'all') {
    const [found] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (found) outletName = found.name;
  }

  // 1. PDF Export (Server-Side Backend Generation)
  if (format === 'pdf') {
    const filterInfo: string[] = [];
    if (status !== 'all') filterInfo.push(`Status: ${status.toUpperCase()}`);
    if (payment !== 'all') filterInfo.push(`Metode: ${payment.toUpperCase()}`);
    if (q) filterInfo.push(`Cari: "${q}"`);
    const statusLabel = filterInfo.length > 0 ? filterInfo.join(' | ') : 'Semua Status';

    const pdfBuffer = await generateOrdersPdf(rows, {
      outletName,
      periodLabel: label,
      statusLabel,
      printedAt: new Date().toLocaleString('id-ID'),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laporan-penjualan-seruni-${Date.now()}.pdf"`,
      },
    });
  }

  // 2. CSV Export (Default)
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
