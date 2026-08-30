import Sidebar from './sidebar';
import { getSession } from '@/lib/auth-helpers';

export const dynamic = 'force-dynamic';


export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  // In dev / before DB setup, allow fallback if session is null for UI preview
  const userName = session?.user?.name || 'Kasir / Owner';

  return (
    <div className="flex min-h-screen bg-zinc-100 text-zinc-900">
      <Sidebar userName={userName} />
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <div className="p-6 md:p-8 flex-1 max-w-7xl w-full mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
