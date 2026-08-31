import { getSession, getCurrentUserRole } from '@/lib/auth-helpers';
import { redirect } from 'next/navigation';

export default async function RootPage() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }

  const { role } = await getCurrentUserRole(session.user.id);
  if (role === 'kasir') {
    redirect('/pos');
  }

  redirect('/dashboard');
}
