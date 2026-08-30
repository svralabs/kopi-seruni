import { db } from '@/lib/db';
import { shifts } from '@/lib/schema';
import ShiftClient from './shift-client';
import { desc, isNull } from 'drizzle-orm';

export default async function ShiftPage() {
  let activeShift = null;
  let recentShifts: any[] = [];

  try {
    const active = await db
      .select()
      .from(shifts)
      .where(isNull(shifts.closedAt))
      .limit(1);

    activeShift = active[0] || null;

    recentShifts = await db
      .select()
      .from(shifts)
      .orderBy(desc(shifts.openedAt))
      .limit(10);
  } catch (e) {
    console.warn('Error fetching shifts:', e);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Shift & Rekonsiliasi Kas</h1>
        <p className="text-sm text-zinc-500">Kelola jam kerja kasir, modal kas kecil, dan cek selisih uang fisik</p>
      </div>

      <ShiftClient activeShift={activeShift} recentShifts={recentShifts} />
    </div>
  );
}
