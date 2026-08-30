import 'server-only';
import { auth } from './auth';
import { db } from './db';
import { userOutletRoles } from './schema';
import { eq, and } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import type { AppRole } from './schema';

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Ambil session + validasi role user di outlet tertentu.
 * Redirect ke /unauthorized jika role tidak diizinkan.
 */
export async function requireRole(outletId: string, allowed: AppRole[]) {
  const session = await getSession();
  if (!session) redirect('/login');

  const [row] = await db
    .select({ role: userOutletRoles.role })
    .from(userOutletRoles)
    .where(and(
      eq(userOutletRoles.userId, session.user.id),
      eq(userOutletRoles.outletId, outletId),
    ))
    .limit(1);

  if (!row || !allowed.includes(row.role as AppRole)) {
    redirect('/unauthorized');
  }

  return { session, role: row.role as AppRole };
}

/**
 * Ambil outlet_id aktif dari session.
 * Kasir hanya boleh punya 1 outlet aktif.
 */
export async function getActiveOutlet(userId: string) {
  const [row] = await db
    .select({ outletId: userOutletRoles.outletId, role: userOutletRoles.role })
    .from(userOutletRoles)
    .where(eq(userOutletRoles.userId, userId))
    .limit(1);
  return row ?? null;
}
