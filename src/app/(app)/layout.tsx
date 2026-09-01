import AppShell from './app-shell';
import Header from './header';
import { getSession, getCurrentUserRole } from '@/lib/auth-helpers';
import ToastContainer from '@/components/toast-container';
import { FilterLoadingProvider } from '@/context/filter-loading-context';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const userName = session?.user?.name || 'Staff Seruni';
  let userRole: 'owner' | 'manager' | 'kasir' = 'kasir';

  if (session?.user?.id) {
    const roleData = await getCurrentUserRole(session.user.id);
    userRole = roleData.role;
  }

  return (
    <FilterLoadingProvider>
      <AppShell userName={userName} userRole={userRole}>
        <Header userId={session?.user?.id} userName={userName} />
        {children}
        <ToastContainer />
      </AppShell>
    </FilterLoadingProvider>
  );
}
