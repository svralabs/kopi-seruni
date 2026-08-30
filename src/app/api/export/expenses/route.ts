import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { expenses, outlets } from '@/lib/schema';
import { eq, desc } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const outletId = searchParams.get('outletId') || 'all';

  const rows = await db
    .select({
      expense: expenses,
      outlet: outlets,
    })
    .from(expenses)
    .leftJoin(outlets, eq(expenses.outletId, outlets.id))
    .where(outletId !== 'all' ? eq(expenses.outletId, outletId) : undefined)
    .orderBy(desc(expenses.expenseDate));

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
