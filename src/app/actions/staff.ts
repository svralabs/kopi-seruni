'use server';

import { db } from '@/lib/db';
import { user, userOutletRoles, outlets } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { auth } from '@/lib/auth';
import { getSession } from '@/lib/auth-helpers';
import { eq, and } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createStaff(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  const role = (formData.get('role') as 'kasir' | 'manager' | 'owner') || 'kasir';

  // Support multiple outlet checkboxes or single select
  const rawOutletIds = formData.getAll('outletIds') as string[];
  const singleOutletId = formData.get('outletId') as string;
  let selectedOutletIds = rawOutletIds.length > 0 ? rawOutletIds : singleOutletId ? [singleOutletId] : [];

  if (!name || !email || !password) {
    throw new Error('Nama, email, dan password wajib diisi');
  }

  if (password.length < 6) {
    throw new Error('Password minimal 6 karakter');
  }

  try {
    // 1. Create User via BetterAuth
    const newUser = await auth.api.signUpEmail({
      body: {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
      },
    });

    if (!newUser?.user?.id) {
      throw new Error('Gagal membuat user BetterAuth');
    }

    const allOutlets = await getOutlets();
    const now = Math.floor(Date.now() / 1000);

    if (selectedOutletIds.includes('all') || selectedOutletIds.length === 0) {
      selectedOutletIds = allOutlets.map((o) => o.id);
    }

    // 2. Assign Outlet Roles
    for (const outId of selectedOutletIds) {
      await db.insert(userOutletRoles).values({
        id: `uor_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
        userId: newUser.user.id,
        outletId: outId,
        role,
        createdAt: now,
      });
    }

    revalidatePath('/staff');
  } catch (err: any) {
    throw new Error(err?.message || 'Gagal mendaftarkan staff baru');
  }
}

export async function updateStaffRole(userId: string, outletIds: string[] | string, role: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const now = Math.floor(Date.now() / 1000);
  const allOutlets = await getOutlets();

  let targetOutletIds = Array.isArray(outletIds) ? outletIds : [outletIds];
  if (targetOutletIds.includes('all') || targetOutletIds.length === 0) {
    targetOutletIds = allOutlets.map((o) => o.id);
  }

  // Reset / replace assigned roles
  await db.delete(userOutletRoles).where(eq(userOutletRoles.userId, userId));

  for (const outId of targetOutletIds) {
    await db.insert(userOutletRoles).values({
      id: `uor_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
      userId,
      outletId: outId,
      role: role as any,
      createdAt: now,
    });
  }

  revalidatePath('/staff');
  return { success: true };
}

export async function deleteStaff(userId: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  if (session.user.id === userId) {
    throw new Error('Tidak dapat menghapus akun yang sedang login');
  }

  await db.delete(userOutletRoles).where(eq(userOutletRoles.userId, userId));
  await db.delete(user).where(eq(user.id, userId));

  revalidatePath('/staff');
}
