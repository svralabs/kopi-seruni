import { db } from '@/lib/db';
import { user, userOutletRoles, outlets } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import StaffClient, { type StaffMember } from './staff-client';
import { eq, desc } from 'drizzle-orm';

export default async function StaffPage() {
  let allOutlets: any[] = [];
  let staffList: StaffMember[] = [];

  try {
    const [outletsRes, usersData] = await Promise.all([
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

    allOutlets = outletsRes;

    staffList = usersData.map((u) => ({
      id: u.user.id,
      name: u.user.name,
      email: u.user.email,
      role: u.role || 'owner',
      outletId: u.outlet?.id || 'out_default',
      outletName: u.outlet?.name || 'Semua Cabang (Pusat)',
      createdAt: u.user.createdAt ? new Date(u.user.createdAt).toLocaleDateString('id-ID') : '-',
    }));
  } catch (e) {
    console.warn('Error fetching staff list:', e);
  }

  return <StaffClient staffList={staffList} outlets={allOutlets} />;
}
