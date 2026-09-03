import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expenses, outlets } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';
import { generateExpensesPdf } from '@/lib/pdf-generator';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const outletId = searchParams.get('outletId') || 'all';
  const format = searchParams.get('format') || 'csv';

  const rows = await db
    .select({
      expense: expenses,
      outlet: outlets,
    })
    .from(expenses)
    .leftJoin(outlets, eq(expenses.outletId, outlets.id))
    .where(outletId !== 'all' ? eq(expenses.outletId, outletId) : undefined)
    .orderBy(desc(expenses.expenseDate));

  let outletName = 'Semua Cabang';
  if (outletId !== 'all') {
    const [found] = await db.select().from(outlets).where(eq(outlets.id, outletId)).limit(1);
    if (found) outletName = found.name;
  }

  // 1. PDF Export (Server-Side Backend Generation)
  if (format === 'pdf') {
    const pdfBuffer = await generateExpensesPdf(rows, {
      outletName,
      periodLabel: 'Semua Waktu',
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
  const headers = ['ID Pengeluaran', 'Tanggal', 'Cabang Outlet', 'Keterangan', 'Metode Bayar', 'Nominal (Rp)'];
  
  const csvRows = rows.map((r) => [
    `"${r.expense.id}"`,
    `"${formatDate(r.expense.expenseDate)}"`,
    `"${r.outlet?.name || 'Pusat'}"`,
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
