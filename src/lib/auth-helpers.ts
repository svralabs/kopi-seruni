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
 * Ambil role user (global highest role atau spesifik per outlet).
 */
export async function getCurrentUserRole(
  userId: string,
  outletId?: string
): Promise<{
  role: AppRole;
  outletId: string | null;
  allRoles: Array<{ outletId: string; role: AppRole }>;
}> {
  const roles = await db
    .select({ outletId: userOutletRoles.outletId, role: userOutletRoles.role })
    .from(userOutletRoles)
    .where(eq(userOutletRoles.userId, userId));

  if (roles.length === 0) {
    return { role: 'kasir', outletId: null, allRoles: [] };
  }

  // Jika user punya role owner di cabang manapun, berikan previlege owner
  const isOwner = roles.some((r) => r.role === 'owner');
  const isManager = roles.some((r) => r.role === 'manager');

  let effectiveRole: AppRole = 'kasir';
  if (isOwner) effectiveRole = 'owner';
  else if (isManager) effectiveRole = 'manager';

  // Jika spesifik outlet diminta
  if (outletId && outletId !== 'all') {
    const specific = roles.find((r) => r.outletId === outletId);
    if (specific) {
      return {
        role: specific.role as AppRole,
        outletId: specific.outletId,
        allRoles: roles as any[],
      };
    }
  }

  return {
    role: effectiveRole,
    outletId: roles[0]?.outletId || null,
    allRoles: roles as any[],
  };
}

/**
 * Route RBAC guard untuk Server Component:
 * Jika role tidak diizinkan, redirect ke /pos (untuk kasir) atau /unauthorized.
 */
export async function requireAuthRole(allowedRoles: AppRole[], outletId?: string) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { role, outletId: userOutletId, allRoles } = await getCurrentUserRole(
    session.user.id,
    outletId
  );

  if (!allowedRoles.includes(role)) {
    // Jika kasir mencoba akses menu admin/owner, lempar ke POS
    if (role === 'kasir') {
      redirect('/pos');
    }
    redirect('/unauthorized');
  }

  return { session, role, userOutletId, allRoles };
}

/**
 * Ambil session + validasi role user di outlet tertentu.
 * Redirect ke /unauthorized jika role tidak diizinkan.
 */
export async function requireRole(outletId: string, allowed: AppRole[]) {
  return requireAuthRole(allowed, outletId);
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
