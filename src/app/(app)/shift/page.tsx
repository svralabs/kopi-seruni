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
        <h1 className="text-2xl font-bold tracking-tight text-[#201C1A]">
          Shift Kasir & Rekonsiliasi
        </h1>
        <p className="text-xs text-[#8E867C] mt-0.5">
          Kelola sesi buka/tutup kasir, modal kas kecil, dan cek selisih fisik laci
        </p>
      </div>

      <ShiftClient activeShift={activeShift} recentShifts={recentShifts} />
    </div>
  );
}
