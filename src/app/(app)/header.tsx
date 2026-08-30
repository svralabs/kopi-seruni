import { db } from '@/lib/db';
import { outlets, userOutletRoles } from '@/lib/schema';
import NavbarPills from '@/components/navbar-pills';
import { eq } from 'drizzle-orm';

export default async function Header({
  userId,
  userName = 'Kasir',
}: {
  userId?: string;
  userName?: string;
}) {
  let allOutlets: any[] = [];
  let userRole = 'owner';
  let activeOutletName = 'Outlet Pusat';

  try {
    allOutlets = await db.select().from(outlets);

    if (userId) {
      const [roleRow] = await db
        .select({
          role: userOutletRoles.role,
          outletName: outlets.name,
        })
        .from(userOutletRoles)
        .leftJoin(outlets, eq(userOutletRoles.outletId, outlets.id))
        .where(eq(userOutletRoles.userId, userId))
        .limit(1);

      if (roleRow) {
        userRole = roleRow.role;
        activeOutletName = roleRow.outletName || activeOutletName;
      }
    }
  } catch (e) {
    console.warn('Error fetching header context:', e);
  }

  return (
    <NavbarPills
      outlets={allOutlets}
      userName={userName}
      userRole={userRole}
      activeOutletName={activeOutletName}
    />
  );
}
