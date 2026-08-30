import Sidebar from './sidebar';
import Header from './header';
import { getSession } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const userName = session?.user?.name || 'Kasir / Owner';

  return (
    <div className="flex min-h-screen bg-[#F7F5F0] text-[#1E1B18]">
      <Sidebar userName={userName} />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-4 md:p-6 lg:p-8 flex-1 max-w-[1600px] w-full mx-auto">
          <Header userId={session?.user?.id} userName={userName} />
          {children}
        </div>

      </main>
    </div>
  );
}
