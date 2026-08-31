import { getUserAccessibleOutlets } from '@/lib/auth-helpers';
import NavbarPills from '@/components/navbar-pills';

export default async function Header({
  userId,
  userName = 'Kasir',
}: {
  userId?: string;
  userName?: string;
}) {
  let allOutlets: any[] = [];
  let userRole = 'kasir';
  let activeOutletName = 'Outlet Pusat';

  try {
    if (userId) {
      const { outlets, userRole: role, isOwner } = await getUserAccessibleOutlets(userId);
      allOutlets = outlets;
      userRole = role;
      activeOutletName = isOwner
        ? 'Semua Cabang'
        : outlets[0]?.name || 'Outlet Seruni';
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
