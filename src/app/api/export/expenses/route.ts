import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expenses, expenseCategories, outlets } from '@/lib/schema';
import { eq, desc, and, gte, lte, like, or } from 'drizzle-orm';
import { formatDate, getDateRangeFromParams } from '@/lib/utils';
import { generateExpensesPdf } from '@/lib/pdf-generator';

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

  const period = searchParams.get('period') || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const q = searchParams.get('q') || undefined;
  const format = searchParams.get('format') || 'csv';

  const { startEpoch, endEpoch, label } = getDateRangeFromParams({ period, from, to });

  const conditions = [];
  if (outletId !== 'all') conditions.push(eq(expenses.outletId, outletId));
  if (startEpoch > 0) conditions.push(gte(expenses.expenseDate, startEpoch));
  if (endEpoch > 0) conditions.push(lte(expenses.expenseDate, endEpoch));
  if (q) {
    const query = `%${q}%`;
    conditions.push(or(like(expenses.description, query), like(expenses.id, query)));
  }

  const rows = await db
    .select({
      expense: expenses,
      outlet: outlets,
      category: expenseCategories,
    })
    .from(expenses)
    .leftJoin(outlets, eq(expenses.outletId, outlets.id))
    .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(expenses.expenseDate));

  // 1. PDF Export (Server-Side Backend Generation)
  if (format === 'pdf') {
    const pdfBuffer = await generateExpensesPdf(rows, {
      outletName,
      periodLabel: label,
      printedAt: new Date().toLocaleString('id-ID'),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laporan-pengeluaran-seruni-${Date.now()}.pdf"`,
      },
    });
  }

  // 2. CSV Export (Default)
  const headers = ['ID Pengeluaran', 'Tanggal', 'Cabang Outlet', 'Kategori', 'Keterangan', 'Metode Bayar', 'Nominal (Rp)'];
  
  const csvRows = rows.map((r) => [
    `"${r.expense.id}"`,
    `"${formatDate(r.expense.expenseDate)}"`,
    `"${r.outlet?.name || 'Pusat'}"`,
    `"${r.category?.name || 'Umum'}"`,
    `"${r.expense.description.replace(/"/g, '""')}"`,
    `"${r.expense.paymentMethod.toUpperCase()}"`,
    r.expense.amount,
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...csvRows.map((e) => e.join(','))].join('\n');

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="laporan-pengeluaran-seruni-${Date.now()}.csv"`,
    },
  });
}
