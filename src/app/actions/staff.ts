'use server';

import { db } from '@/lib/db';
import { user, userOutletRoles, outlets } from '@/lib/schema';
import { account } from '@/lib/auth-schema';
import { getOutlets } from '@/lib/queries';
import { auth } from '@/lib/auth';
import { hashPassword } from 'better-auth/crypto';
import { getSession, getUserAccessibleOutlets } from '@/lib/auth-helpers';
import { eq, and, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createStaff(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { isOwner, userRole, accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
  if (!isOwner && userRole !== 'manager') {
    throw new Error('Akses ditolak: Hanya Owner dan Manager yang berhak menambah staf');
  }

  const name = formData.get('name') as string;
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;
  let role = (formData.get('role') as 'kasir' | 'manager' | 'owner') || 'kasir';

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

  // Manager constraints: can only create 'kasir' for own outlets
  if (!isOwner && userRole === 'manager') {
    if (role !== 'kasir') {
      throw new Error('Akses ditolak: Manager hanya berhak mendaftarkan staf Kasir');
    }
    selectedOutletIds = selectedOutletIds.filter((id) => id !== 'all');
    if (selectedOutletIds.length === 0) {
      selectedOutletIds = [accessibleOutletIds[0]];
    }
    for (const outId of selectedOutletIds) {
      if (!accessibleOutletIds.includes(outId)) {
        throw new Error('Akses ditolak: Manager hanya dapat menugaskan staf ke cabang yang dinaunginya');
      }
    }
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

    if (isOwner && (selectedOutletIds.includes('all') || selectedOutletIds.length === 0)) {
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

export async function updateStaffUser(
  userId: string,
  payload: {
    name: string;
    email: string;
    role: 'kasir' | 'manager' | 'owner';
    outletIds: string[];
    newPassword?: string;
  }
) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { isOwner, userRole, accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
  if (!isOwner && userRole !== 'manager') {
    throw new Error('Akses ditolak: Anda tidak memiliki wewenang untuk mengelola data pengguna');
  }

  const { name, email, role, outletIds, newPassword } = payload;

  if (!name || !name.trim()) {
    throw new Error('Nama pengguna tidak boleh kosong');
  }

  if (!email || !email.trim()) {
    throw new Error('Email tidak boleh kosong');
  }

  const cleanEmail = email.trim().toLowerCase();

  // Check email uniqueness if changed
  const [existingUserWithEmail] = await db
    .select({ id: user.id })
    .from(user)
    .where(and(ne(user.id, userId), eq(user.email, cleanEmail)))
    .limit(1);

  if (existingUserWithEmail) {
    throw new Error(`Email "${cleanEmail}" sudah digunakan oleh pengguna lain`);
  }

  const isSelf = session.user.id === userId;

  if (!isSelf) {
    // If editing someone else, enforce strict branch-manager RBAC
    if (!isOwner && userRole === 'manager') {
      const targetRoles = await db
        .select()
        .from(userOutletRoles)
        .where(eq(userOutletRoles.userId, userId));

      if (targetRoles.some((r) => r.role === 'owner')) {
        throw new Error('Akses ditolak: Manager tidak diizinkan mengubah data akun Owner');
      }

      if (targetRoles.some((r) => r.role === 'manager')) {
        throw new Error('Akses ditolak: Manager tidak diizinkan mengubah data akun sesama Manager');
      }

      const targetOutletIds = targetRoles.map((r) => r.outletId);
      const isTargetInManagerBranch = targetOutletIds.some((id) => accessibleOutletIds.includes(id));
      if (!isTargetInManagerBranch && targetRoles.length > 0) {
        throw new Error('Akses ditolak: Staf ini bukan bagian dari cabang yang Anda naungi');
      }

      if (role !== 'kasir') {
        throw new Error('Akses ditolak: Manager tidak dapat mengubah peran staf menjadi Manager atau Owner');
      }

      const requestedOutletIds = Array.isArray(outletIds) ? outletIds : [outletIds];
      for (const outId of requestedOutletIds) {
        if (!accessibleOutletIds.includes(outId)) {
          throw new Error('Akses ditolak: Tidak dapat menugaskan staf ke cabang di luar wewenang Anda');
        }
      }
    }
  }

  // 1. Update basic user profile (Name & Email)
  await db
    .update(user)
    .set({
      name: name.trim(),
      email: cleanEmail,
      updatedAt: new Date(),
    })
    .where(eq(user.id, userId));

  // 2. Update password if provided
  if (newPassword && newPassword.trim().length > 0) {
    if (newPassword.trim().length < 6) {
      throw new Error('Password baru minimal 6 karakter');
    }
    const hashedPassword = await hashPassword(newPassword.trim());
    await db
      .update(account)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
  }

  // 3. Update outlet assignments and role (ONLY IF NOT SELF-EDIT)
  // Self-edit preserves user role and outlet assignments to prevent accidental lockouts/escalation
  if (!isSelf) {
    const allOutlets = await getOutlets();
    let targetOutletIds = Array.isArray(outletIds) ? outletIds : [outletIds];
    if (isOwner && (targetOutletIds.includes('all') || targetOutletIds.length === 0)) {
      targetOutletIds = allOutlets.map((o) => o.id);
    } else {
      targetOutletIds = targetOutletIds.filter((id) => id !== 'all');
    }

    const now = Math.floor(Date.now() / 1000);
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
  }

  revalidatePath('/staff');
  return { success: true };
}

export async function updateStaffRole(userId: string, outletIds: string[] | string, role: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const { isOwner, userRole, accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
  if (!isOwner && userRole !== 'manager') {
    throw new Error('Akses ditolak: Anda tidak memiliki wewenang untuk mengubah hak akses pengguna');
  }

  if (session.user.id === userId) {
    throw new Error('Tidak dapat mengubah peran akun Anda sendiri');
  }

  if (!isOwner && userRole === 'manager') {
    const targetRoles = await db
      .select()
      .from(userOutletRoles)
      .where(eq(userOutletRoles.userId, userId));

    if (targetRoles.some((r) => r.role === 'owner' || r.role === 'manager')) {
      throw new Error('Akses ditolak: Manager tidak dapat mengubah hak akses Owner atau Manager');
    }

    if (role !== 'kasir') {
      throw new Error('Akses ditolak: Manager hanya dapat menugaskan peran Kasir');
    }

    const requestedOutletIds = Array.isArray(outletIds) ? outletIds : [outletIds];
    for (const outId of requestedOutletIds) {
      if (!accessibleOutletIds.includes(outId)) {
        throw new Error('Akses ditolak: Cabang di luar wewenang Anda');
      }
    }
  }

  const now = Math.floor(Date.now() / 1000);
  const allOutlets = await getOutlets();

  let targetOutletIds = Array.isArray(outletIds) ? outletIds : [outletIds];
  if (isOwner && (targetOutletIds.includes('all') || targetOutletIds.length === 0)) {
    targetOutletIds = allOutlets.map((o) => o.id);
  } else {
    targetOutletIds = targetOutletIds.filter((id) => id !== 'all');
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

  const { isOwner, userRole, accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
  if (!isOwner && userRole !== 'manager') {
    throw new Error('Akses ditolak: Hanya Owner dan Manager yang berhak menghapus staf');
  }

  if (!isOwner && userRole === 'manager') {
    const targetRoles = await db
      .select()
      .from(userOutletRoles)
      .where(eq(userOutletRoles.userId, userId));

    if (targetRoles.some((r) => r.role === 'owner')) {
      throw new Error('Akses ditolak: Manager tidak dapat menghapus akun Owner');
    }
    if (targetRoles.some((r) => r.role === 'manager')) {
      throw new Error('Akses ditolak: Manager tidak dapat menghapus akun Manager');
    }

    const targetOutletIds = targetRoles.map((r) => r.outletId);
    const isInBranch = targetOutletIds.some((id) => accessibleOutletIds.includes(id));
    if (!isInBranch && targetRoles.length > 0) {
      throw new Error('Akses ditolak: Staf ini bukan bagian dari cabang yang Anda naungi');
    }
  }

  await db.delete(userOutletRoles).where(eq(userOutletRoles.userId, userId));
  await db.delete(account).where(eq(account.userId, userId));
  await db.delete(user).where(eq(user.id, userId));

  revalidatePath('/staff');
}
