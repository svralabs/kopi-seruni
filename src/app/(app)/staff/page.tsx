import { db } from '@/lib/db';
import { user, userOutletRoles, outlets } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import StaffClient, { type StaffMember } from './staff-client';
import { eq } from 'drizzle-orm';
import { formatDate } from '@/lib/utils';

export default async function StaffPage() {
  const {
    session,
    isOwner,
    accessibleOutletIds,
    accessibleOutlets,
    role: currentUserRole,
  } = await requireAuthRole(['owner', 'manager']);

  let selectableOutlets: any[] = [];
  let staffList: StaffMember[] = [];

  try {
    const [allOutlets, usersData] = await Promise.all([
      getOutlets(),
      db
        .select({
          user: user,
          role: userOutletRoles.role,
          outlet: outlets,
        })
        .from(user)
        .leftJoin(userOutletRoles, eq(user.id, userOutletRoles.userId))
        .leftJoin(outlets, eq(userOutletRoles.outletId, outlets.id)),
    ]);

    selectableOutlets = isOwner ? allOutlets : accessibleOutlets;

    const userMap = new Map<
      string,
      {
        id: string;
        name: string;
        email: string;
        role: string;
        outletIds: string[];
        outletNames: string[];
        createdAt: string;
      }
    >();

    for (const row of usersData) {
      if (!userMap.has(row.user.id)) {
        userMap.set(row.user.id, {
          id: row.user.id,
          name: row.user.name,
          email: row.user.email,
          role: row.role || 'kasir',
          outletIds: row.outlet?.id ? [row.outlet.id] : ['out_default'],
          outletNames: row.outlet?.name ? [row.outlet.name] : [],
          createdAt: row.user.createdAt
            ? formatDate(Math.floor(new Date(row.user.createdAt).getTime() / 1000))
            : '-',
        });
      } else {
        const existing = userMap.get(row.user.id)!;
        if (row.outlet?.id && !existing.outletIds.includes(row.outlet.id)) {
          existing.outletIds.push(row.outlet.id);
        }
        if (row.outlet?.name && !existing.outletNames.includes(row.outlet.name)) {
          existing.outletNames.push(row.outlet.name);
        }
        if (row.role === 'owner') existing.role = 'owner';
        else if (row.role === 'manager' && existing.role !== 'owner') existing.role = 'manager';
      }
    }

    const allStaff = Array.from(userMap.values()).map((s) => {
      const isAllOutlets = s.outletNames.length >= allOutlets.length && allOutlets.length > 1;
      return {
        id: s.id,
        name: s.name,
        email: s.email,
        role: s.role,
        outletIds: s.outletIds,
        outletName: isAllOutlets
          ? `Semua Cabang (${s.outletNames.length} Cabang)`
          : s.outletNames.join(', ') || 'Semua Cabang (Pusat)',
        createdAt: s.createdAt,
      };
    });

    if (isOwner) {
      staffList = allStaff;
    } else {
      // Manager can see themselves + kasir in their branch
      staffList = allStaff.filter((s) => {
        if (s.id === session.user.id) return true;
        if (s.role === 'kasir') {
          return s.outletIds.some((id) => accessibleOutletIds.includes(id));
        }
        return false;
      });
    }
  } catch (e) {
    console.warn('Error fetching staff list:', e);
  }

  return (
    <StaffClient
      staffList={staffList}
      outlets={selectableOutlets}
      currentUserId={session.user.id}
      currentUserRole={currentUserRole}
    />
  );
}
