import { db } from '@/lib/db';
import { shifts, outlets } from '@/lib/schema';
import ShiftClient from './shift-client';
import { desc, isNull, eq, and } from 'drizzle-orm';

export default async function ShiftPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'out_default';

  let allOutlets: any[] = [];
  let activeShift = null;
  let recentShifts: any[] = [];

  try {
    allOutlets = await db.select().from(outlets);

    const active = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.outletId, outletId), isNull(shifts.closedAt)))
      .limit(1);

    activeShift = active[0] || null;

    recentShifts = await db
      .select()
      .from(shifts)
      .where(eq(shifts.outletId, outletId))
      .orderBy(desc(shifts.openedAt))
      .limit(10);
  } catch (e) {
    console.warn('Error fetching shifts:', e);
  }

  return (
    <div className="space-y-6">
      <ShiftClient
        activeShift={activeShift}
        recentShifts={recentShifts}
        outletId={outletId}
        allOutlets={allOutlets}
      />
    </div>
  );
}
