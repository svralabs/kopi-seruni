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
  const outletId = (formData.get('outletId') as string) || 'out_default';
  const role = (formData.get('role') as 'kasir' | 'manager' | 'owner') || 'kasir';

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

    // 2. Assign Outlet Role(s)
    if (outletId === 'all') {
      for (const out of allOutlets) {
        await db.insert(userOutletRoles).values({
          id: `uor_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
          userId: newUser.user.id,
          outletId: out.id,
          role,
          createdAt: now,
        });
      }
    } else {
      await db.insert(userOutletRoles).values({
        id: `uor_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
        userId: newUser.user.id,
        outletId,
        role,
        createdAt: now,
      });
    }

    revalidatePath('/staff');
  } catch (err: any) {
    throw new Error(err?.message || 'Gagal mendaftarkan staff baru');
  }
}

export async function updateStaffRole(userId: string, outletId: string, role: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const now = Math.floor(Date.now() / 1000);
  const allOutlets = await getOutlets();

  // Reset / replace assigned roles
  await db.delete(userOutletRoles).where(eq(userOutletRoles.userId, userId));

  if (outletId === 'all') {
    for (const out of allOutlets) {
      await db.insert(userOutletRoles).values({
        id: `uor_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
        userId,
        outletId: out.id,
        role: role as any,
        createdAt: now,
      });
    }
  } else {
    await db.insert(userOutletRoles).values({
      id: `uor_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
      userId,
      outletId,
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
