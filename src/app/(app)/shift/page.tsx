import { db } from '@/lib/db';
import { shifts, outlets, user } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import ShiftClient from './shift-client';
import { desc, eq, isNull, and, sql } from 'drizzle-orm';

export default async function ShiftPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string; page?: string }>;
}) {
  const params = await searchParams;
  const outletId = params?.outletId || 'out_default';
  const page = Math.max(1, Number(params?.page || 1));
  const pageSize = 15;
  const offset = (page - 1) * pageSize;

  let activeShift: any = null;
  let recentShifts: any[] = [];
  let allOutlets: any[] = [];
  let totalItems = 0;
  let totalPages = 1;

  try {
    const [outletsRes, activeList, countRes, rawShifts] = await Promise.all([
      getOutlets(),
      db
        .select()
        .from(shifts)
        .where(and(eq(shifts.outletId, outletId), isNull(shifts.closedAt)))
        .limit(1),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(shifts)
        .where(eq(shifts.outletId, outletId)),
      db
        .select({
          shift: shifts,
          kasir: user,
        })
        .from(shifts)
        .leftJoin(user, eq(shifts.kasirId, user.id))
        .where(eq(shifts.outletId, outletId))
        .orderBy(desc(shifts.openedAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    allOutlets = outletsRes;
    activeShift = activeList[0] || null;
    totalItems = Number(countRes[0]?.count || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    recentShifts = rawShifts.map((r) => ({
      ...r.shift,
      kasirName: r.kasir?.name || 'Kasir',
    }));
  } catch (e) {
    console.warn('Error fetching shifts:', e);
  }

  return (
    <ShiftClient
      activeShift={activeShift}
      recentShifts={recentShifts}
      outletId={outletId}
      allOutlets={allOutlets}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      pageSize={pageSize}
    />
  );
}
