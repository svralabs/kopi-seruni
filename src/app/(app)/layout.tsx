import AppShell from './app-shell';
import Header from './header';
import { getSession } from '@/lib/auth-helpers';
import ToastContainer from '@/components/toast-container';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const userName = session?.user?.name || 'Kasir / Owner';

  return (
    <AppShell userName={userName}>
      <Header userId={session?.user?.id} userName={userName} />
      {children}
      <ToastContainer />
    </AppShell>
  );
}
