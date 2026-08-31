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
 * - Owner: Akses semua outlet + opsi 'all' (Semua Cabang)
 * - Manager / Kasir: HANYA outlet yang secara eksplisit di-assign ke user tersebut
 */
export async function getUserAccessibleOutlets(userId: string): Promise<{
  outlets: Outlet[];
  isOwner: boolean;
  userRole: AppRole;
  primaryOutletId: string;
  userRoles: Array<{ outletId: string; role: AppRole }>;
}> {
  const allOutlets = await getOutlets();
  const roles = await db
    .select({ outletId: userOutletRoles.outletId, role: userOutletRoles.role })
    .from(userOutletRoles)
    .where(eq(userOutletRoles.userId, userId));

  if (roles.length === 0) {
    return {
      outlets: allOutlets.slice(0, 1),
      isOwner: false,
      userRole: 'kasir',
      primaryOutletId: allOutlets[0]?.id || 'out_default',
      userRoles: [],
    };
  }

  const isOwner = roles.some((r) => r.role === 'owner');
  const isManager = roles.some((r) => r.role === 'manager');
  const userRole: AppRole = isOwner ? 'owner' : isManager ? 'manager' : 'kasir';

  if (isOwner) {
    return {
      outlets: allOutlets,
      isOwner: true,
      userRole: 'owner',
      primaryOutletId: allOutlets[0]?.id || 'out_default',
      userRoles: roles as any[],
    };
  }

  // Kasir & Manajer hanya melihat cabang yang di-assign
  const allowedOutletIds = new Set(roles.map((r) => r.outletId));
  const filteredOutlets = allOutlets.filter((o) => allowedOutletIds.has(o.id));
  const finalOutlets = filteredOutlets.length > 0 ? filteredOutlets : allOutlets.slice(0, 1);

  return {
    outlets: finalOutlets,
    isOwner: false,
    userRole,
    primaryOutletId: finalOutlets[0]?.id || 'out_default',
    userRoles: roles as any[],
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
 * Memvalidasi hak akses role & batasan outlet yang boleh diakses.
 */
export async function requireAuthRole(allowedRoles: AppRole[], requestedOutletId?: string) {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { outlets: accessibleOutlets, isOwner, userRole, primaryOutletId, userRoles } =
    await getUserAccessibleOutlets(session.user.id);

  if (!allowedRoles.includes(userRole)) {
    // Jika kasir mencoba akses menu admin/owner, lempar ke POS
    if (userRole === 'kasir') {
      redirect('/pos');
    }
    redirect('/unauthorized');
  }

  // Tentukan outlet yang valid untuk user ini:
  let effectiveOutletId = primaryOutletId;
  if (isOwner) {
    effectiveOutletId = requestedOutletId || primaryOutletId;
  } else if (requestedOutletId && requestedOutletId !== 'all') {
    const hasAccess = accessibleOutlets.some((o) => o.id === requestedOutletId);
    effectiveOutletId = hasAccess ? requestedOutletId : primaryOutletId;
  }

  return {
    session,
    role: userRole,
    isOwner,
    userOutletId: primaryOutletId,
    allRoles: userRoles,
    accessibleOutlets,
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
