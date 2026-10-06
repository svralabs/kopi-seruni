import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { shifts, outlets, user, userOutletRoles } from '@/lib/schema';
import { eq, and, desc, asc, gte, lte, like, or, inArray, isNull, isNotNull, sql } from 'drizzle-orm';
import { getDateRangeFromParams } from '@/lib/utils';
import { generateShiftsPdf } from '@/lib/pdf-generator';
import { generateShiftsExcel } from '@/lib/excel-generator';
import { auth } from '@/lib/auth';

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

  const status = searchParams.get('status') || 'all';
  const q = searchParams.get('q') || undefined;
  const period = searchParams.get('period') || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const sort = searchParams.get('sort') || 'openedAt';
  const dir = searchParams.get('dir') || 'desc';
  const format = searchParams.get('format') || 'xlsx';

  const { startEpoch, endEpoch, label } = getDateRangeFromParams({ period, from, to });

  const conditions = [];

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
          conditions.push(inArray(shifts.outletId, allowedIds));
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

  if (outletId !== 'all' && !conditions.some((c: any) => c === eq(shifts.outletId, outletId))) {
    conditions.push(eq(shifts.outletId, outletId));
  }
  if (startEpoch > 0) conditions.push(gte(shifts.openedAt, startEpoch));
  if (endEpoch > 0) conditions.push(lte(shifts.openedAt, endEpoch));

  if (status === 'active') {
    conditions.push(isNull(shifts.closedAt));
  } else if (status === 'closed') {
    conditions.push(isNotNull(shifts.closedAt));
  }

  if (q && q.trim()) {
    const term = `%${q.trim()}%`;
    conditions.push(or(like(shifts.notes, term), like(user.name, term)));
  }

  let orderBy = dir === 'asc' ? asc(shifts.openedAt) : desc(shifts.openedAt);
  if (sort === 'closedAt') orderBy = dir === 'asc' ? asc(shifts.closedAt) : desc(shifts.closedAt);
  else if (sort === 'openingCash') orderBy = dir === 'asc' ? asc(shifts.openingCash) : desc(shifts.openingCash);
  else if (sort === 'expectedCash') orderBy = dir === 'asc' ? asc(shifts.expectedCash) : desc(shifts.expectedCash);
  else if (sort === 'closingCash') orderBy = dir === 'asc' ? asc(shifts.closingCash) : desc(shifts.closingCash);
  else if (sort === 'kasir') orderBy = dir === 'asc' ? asc(user.name) : desc(user.name);
  else if (sort === 'diff' || sort === 'selisih') {
    orderBy = dir === 'asc' 
      ? sql`(${shifts.closingCash} - ${shifts.expectedCash}) ASC`
      : sql`(${shifts.closingCash} - ${shifts.expectedCash}) DESC`;
  }

  const rows = await db
    .select({
      shift: shifts,
      outlet: outlets,
      user: user,
    })
    .from(shifts)
    .leftJoin(outlets, eq(shifts.outletId, outlets.id))
    .leftJoin(user, eq(shifts.kasirId, user.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(orderBy);

  const filterInfo: string[] = [];
  if (status !== 'all') filterInfo.push(`Status: ${status === 'active' ? 'AKTIF' : 'SELESAI'}`);
  if (q) filterInfo.push(`Cari: "${q}"`);
  const statusLabel = filterInfo.length > 0 ? filterInfo.join(' | ') : 'Semua Status';

  // 1. PDF Export (Server-Side Backend Generation)
  if (format === 'pdf') {
    const pdfBuffer = await generateShiftsPdf(rows, {
      outletName,
      periodLabel: label,
      statusLabel,
      printedAt: new Date().toLocaleString('id-ID'),
    });

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="laporan-shift-kasir-seruni-${Date.now()}.pdf"`,
      },
    });
  }

  // 2. Excel Export (.xlsx)
  const excelBuffer = await generateShiftsExcel(rows, {
    outletName,
    periodLabel: label,
    statusLabel,
    printedAt: new Date().toLocaleString('id-ID'),
  });

  return new NextResponse(new Uint8Array(excelBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="laporan-shift-kasir-seruni-${Date.now()}.xlsx"`,
    },
  });
}
