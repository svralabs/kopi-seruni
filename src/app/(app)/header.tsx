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
      const { outlets, userRole: role, primaryOutletId } = await getUserAccessibleOutlets(userId);
      allOutlets = outlets;
      userRole = role;
      const primary = outlets.find((o) => o.id === primaryOutletId) || outlets[0];
      activeOutletName = primary?.name || 'Kopi Seruni - Pusat';
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
