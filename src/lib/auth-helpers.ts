import 'server-only';
import { auth } from './auth';
import { db } from './db';
import { userOutletRoles } from './schema';
import { eq, and } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getOutlets } from './queries';
import type { AppRole, Outlet } from './schema';

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Ambil daftar outlet yang boleh diakses user berdasarkan role per cabang.
 * - User (Owner, Manager, Kasir) HANYA memiliki akses ke outlet yang secara eksplisit di-assign.
 */
export async function getUserAccessibleOutlets(userId: string): Promise<{
  outlets: Outlet[];
  isOwner: boolean;
  isGlobalOwner: boolean;
  userRole: AppRole;
  primaryOutletId: string;
  userRoles: Array<{ outletId: string; role: AppRole }>;
  accessibleOutletIds: string[];
}> {
  const allOutlets = await getOutlets();
  const roles = await db
    .select({ outletId: userOutletRoles.outletId, role: userOutletRoles.role })
    .from(userOutletRoles)
    .where(eq(userOutletRoles.userId, userId));

  if (roles.length === 0) {
    const fallback = allOutlets.slice(0, 1);
    return {
      outlets: fallback,
      isOwner: false,
      isGlobalOwner: false,
      userRole: 'kasir',
      primaryOutletId: fallback[0]?.id || 'out_default',
      userRoles: [],
      accessibleOutletIds: fallback.map((o) => o.id),
    };
  }

  const isOwner = roles.some((r) => r.role === 'owner');
  const isManager = roles.some((r) => r.role === 'manager');
  const userRole: AppRole = isOwner ? 'owner' : isManager ? 'manager' : 'kasir';

  const allowedOutletIds = new Set(roles.map((r) => r.outletId));
  const filteredOutlets = allOutlets.filter((o) => allowedOutletIds.has(o.id));
  const finalOutlets = filteredOutlets.length > 0 ? filteredOutlets : allOutlets.slice(0, 1);
  const accessibleOutletIds = finalOutlets.map((o) => o.id);
  const isGlobalOwner = isOwner && finalOutlets.length >= allOutlets.length;

  return {
    outlets: finalOutlets,
    isOwner,
    isGlobalOwner,
    userRole,
    primaryOutletId: finalOutlets[0]?.id || 'out_default',
    userRoles: roles as any[],
    accessibleOutletIds,
  };
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
 * Memvalidasi hak akses role & batasan outlet yang boleh diakses.
 */
export async function requireAuthRole(allowedRoles: AppRole[], requestedOutletId?: string) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const {
    outlets: accessibleOutlets,
    isOwner,
    isGlobalOwner,
    userRole,
    primaryOutletId,
    userRoles,
    accessibleOutletIds,
  } = await getUserAccessibleOutlets(session.user.id);

  if (!allowedRoles.includes(userRole)) {
    if (userRole === 'kasir') {
      redirect('/pos');
    }
    redirect('/unauthorized');
  }

  // Tentukan outlet yang valid untuk user ini:
  // User (baik Owner, Manager, atau Kasir) HANYA bisa mengakses outlet yang ada di accessibleOutlets miliknya.
  let effectiveOutletId = primaryOutletId;
  if (requestedOutletId && requestedOutletId !== 'all') {
    const hasAccess = accessibleOutletIds.includes(requestedOutletId);
    effectiveOutletId = hasAccess ? requestedOutletId : primaryOutletId;
  } else if (requestedOutletId === 'all') {
    // Jika meminta 'all' tapi hanya punya 1 outlet, clamp ke single outlet-nya
    if (accessibleOutlets.length === 1) {
      effectiveOutletId = primaryOutletId;
    } else {
      effectiveOutletId = 'all';
    }
  }

  return {
    session,
    role: userRole,
    isOwner,
    isGlobalOwner,
    userOutletId: primaryOutletId,
    allRoles: userRoles,
    accessibleOutlets,
    accessibleOutletIds,
    effectiveOutletId,
  };
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
