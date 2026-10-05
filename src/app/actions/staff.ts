'use server';

import { db } from '@/lib/db';
import { user, userOutletRoles, outlets, session as sessionTable } from '@/lib/schema';
import { account } from '@/lib/auth-schema';
import { getOutlets } from '@/lib/queries';
import { hashPassword } from 'better-auth/crypto';
import { getSession, getUserAccessibleOutlets } from '@/lib/auth-helpers';
import { eq, and, ne } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

export async function createStaff(formData: FormData): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Sesi anda telah berakhir. Silakan login kembali.' };
    }

    const { isOwner, userRole, accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
    if (!isOwner && userRole !== 'manager') {
      return { success: false, error: 'Akses ditolak: Hanya Owner dan Manager yang berhak menambah staf' };
    }

    const name = (formData.get('name') as string)?.trim();
    const rawUsername = (formData.get('username') as string)?.trim();
    const rawEmail = (formData.get('email') as string)?.trim();
    const password = (formData.get('password') as string)?.trim();
    let role = (formData.get('role') as 'kasir' | 'manager' | 'owner') || 'kasir';

    // Support multiple outlet checkboxes or single select
    const rawOutletIds = formData.getAll('outletIds') as string[];
    const singleOutletId = formData.get('outletId') as string;
    let selectedOutletIds = rawOutletIds.length > 0 ? rawOutletIds : singleOutletId ? [singleOutletId] : [];

    if (!name || !rawUsername || !password) {
      return { success: false, error: 'Nama, username, dan password wajib diisi' };
    }

    const cleanUsername = rawUsername.toLowerCase();
    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      return { success: false, error: 'Username minimal 3 dan maksimal 30 karakter' };
    }
    const usernameRegex = /^[a-z0-9_.-]+$/;
    if (!usernameRegex.test(cleanUsername)) {
      return { success: false, error: 'Username hanya boleh mengandung huruf kecil, angka, titik, strip, atau underscore' };
    }

    const cleanEmail = rawEmail ? rawEmail.toLowerCase() : `${cleanUsername}@kopiseruni.id`;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Format email tidak valid' };
    }

    if (password.length < 6) {
      return { success: false, error: 'Password minimal 6 karakter' };
    }

    // Manager constraints: can only create 'kasir' for own outlets
    if (!isOwner && userRole === 'manager') {
      if (role !== 'kasir') {
        return { success: false, error: 'Akses ditolak: Manager hanya berhak mendaftarkan staf Kasir' };
      }
      selectedOutletIds = selectedOutletIds.filter((id) => id !== 'all');
      if (selectedOutletIds.length === 0) {
        selectedOutletIds = [accessibleOutletIds[0]];
      }
      for (const outId of selectedOutletIds) {
        if (!accessibleOutletIds.includes(outId)) {
          return {
            success: false,
            error: 'Akses ditolak: Manager hanya dapat menugaskan staf ke cabang yang dinaunginya',
          };
        }
      }
    }

    // Check duplicate username in user table
    const [existingUsername] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.username, cleanUsername))
      .limit(1);

    if (existingUsername) {
      return { success: false, error: `Username "${cleanUsername}" sudah digunakan oleh akun lain.` };
    }

    // Check duplicate email in user table
    const [existingUser] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, cleanEmail))
      .limit(1);

    if (existingUser) {
      return { success: false, error: `Email "${cleanEmail}" sudah digunakan oleh akun lain.` };
    }

    const allOutlets = await getOutlets();
    if (isOwner && (selectedOutletIds.includes('all') || selectedOutletIds.length === 0)) {
      selectedOutletIds = allOutlets.map((o) => o.id);
    }

    if (selectedOutletIds.length === 0) {
      return { success: false, error: 'Pilih minimal 1 cabang penempatan untuk staf baru.' };
    }

    const newUserId = crypto.randomUUID().replace(/-/g, '').slice(0, 32);
    const hashedPassword = await hashPassword(password);
    const now = new Date();
    const nowUnix = Math.floor(now.getTime() / 1000);

    // Atomic transaction: Insert User, Account, and Outlet Roles
    await db.transaction(async (tx) => {
      // 1. User table
      await tx.insert(user).values({
        id: newUserId,
        name,
        email: cleanEmail,
        emailVerified: false,
        image: null,
        username: cleanUsername,
        displayUsername: rawUsername,
        createdAt: now,
        updatedAt: now,
      });

      // 2. Account table with credential provider and local:credential issuer
      await tx.insert(account).values({
        id: `acc_${crypto.randomUUID().replace(/-/g, '').slice(0, 24)}`,
        accountId: newUserId,
        providerId: 'credential',
        userId: newUserId,
        password: hashedPassword,
        issuer: 'local:credential',
        createdAt: now,
        updatedAt: now,
      });

      // 3. User Outlet Roles
      for (const outId of selectedOutletIds) {
        await tx.insert(userOutletRoles).values({
          id: `uor_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`,
          userId: newUserId,
          outletId: outId,
          role,
          createdAt: nowUnix,
        });
      }
    });

    try {
      revalidatePath('/staff');
    } catch (e) {
      console.warn('revalidatePath warning:', e);
    }

    return { success: true };
  } catch (err: any) {
    console.error('createStaff error:', err);
    return { success: false, error: err?.message || 'Gagal mendaftarkan staff baru' };
  }
}

export async function updateStaffUser(
  userId: string,
  payload: {
    name: string;
    username?: string;
    email: string;
    role: 'kasir' | 'manager' | 'owner';
    outletIds: string[];
    newPassword?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Sesi anda telah berakhir. Silakan login kembali.' };
    }

    const { isOwner, userRole, accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
    if (!isOwner && userRole !== 'manager') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengelola data pengguna' };
    }

    const { name, username: rawUsername, email, role, outletIds, newPassword } = payload;

    if (!name || !name.trim()) {
      return { success: false, error: 'Nama pengguna tidak boleh kosong' };
    }

    let cleanUsername: string | undefined = undefined;
    if (rawUsername !== undefined) {
      cleanUsername = rawUsername.trim().toLowerCase();
      if (!cleanUsername) {
        return { success: false, error: 'Username tidak boleh kosong' };
      }
      if (cleanUsername.length < 3 || cleanUsername.length > 30) {
        return { success: false, error: 'Username minimal 3 dan maksimal 30 karakter' };
      }
      const usernameRegex = /^[a-z0-9_.-]+$/;
      if (!usernameRegex.test(cleanUsername)) {
        return { success: false, error: 'Username hanya boleh mengandung huruf kecil, angka, titik, strip, atau underscore' };
      }

      const [existingUserWithUsername] = await db
        .select({ id: user.id })
        .from(user)
        .where(and(ne(user.id, userId), eq(user.username, cleanUsername)))
        .limit(1);

      if (existingUserWithUsername) {
        return { success: false, error: `Username "${cleanUsername}" sudah digunakan oleh pengguna lain` };
      }
    }

    if (!email || !email.trim()) {
      return { success: false, error: 'Email tidak boleh kosong' };
    }

    const cleanEmail = email.trim().toLowerCase();

    // Check email uniqueness if changed
    const [existingUserWithEmail] = await db
      .select({ id: user.id })
      .from(user)
      .where(and(ne(user.id, userId), eq(user.email, cleanEmail)))
      .limit(1);

    if (existingUserWithEmail) {
      return { success: false, error: `Email "${cleanEmail}" sudah digunakan oleh pengguna lain` };
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
          return { success: false, error: 'Akses ditolak: Manager tidak diizinkan mengubah data akun Owner' };
        }

        if (targetRoles.some((r) => r.role === 'manager')) {
          return { success: false, error: 'Akses ditolak: Manager tidak diizinkan mengubah data akun sesama Manager' };
        }

        const targetOutletIds = targetRoles.map((r) => r.outletId);
        const isTargetInManagerBranch = targetOutletIds.some((id) => accessibleOutletIds.includes(id));
        if (!isTargetInManagerBranch && targetRoles.length > 0) {
          return { success: false, error: 'Akses ditolak: Staf ini bukan bagian dari cabang yang Anda naungi' };
        }

        if (role !== 'kasir') {
          return { success: false, error: 'Akses ditolak: Manager tidak dapat mengubah peran staf menjadi Manager atau Owner' };
        }

        const requestedOutletIds = Array.isArray(outletIds) ? outletIds : [outletIds];
        for (const outId of requestedOutletIds) {
          if (!accessibleOutletIds.includes(outId)) {
            return { success: false, error: 'Akses ditolak: Tidak dapat menugaskan staf ke cabang di luar wewenang Anda' };
          }
        }
      }
    }

    // 1. Update basic user profile (Name, Username, Email)
    await db
      .update(user)
      .set({
        name: name.trim(),
        ...(cleanUsername !== undefined
          ? { username: cleanUsername, displayUsername: rawUsername?.trim() }
          : {}),
        email: cleanEmail,
        updatedAt: new Date(),
      })
      .where(eq(user.id, userId));

    // 2. Update password if provided
    if (newPassword && newPassword.trim().length > 0) {
      if (newPassword.trim().length < 6) {
        return { success: false, error: 'Password baru minimal 6 karakter' };
      }
      const hashedPassword = await hashPassword(newPassword.trim());
      await db
        .update(account)
        .set({
          password: hashedPassword,
          issuer: 'local:credential',
          updatedAt: new Date(),
        })
        .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')));
    }

    // 3. Update outlet assignments and role (ONLY IF NOT SELF-EDIT)
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

    try {
      revalidatePath('/staff');
    } catch (e) {
      console.warn('revalidatePath warning:', e);
    }
    return { success: true };
  } catch (err: any) {
    console.error('updateStaffUser error:', err);
    return { success: false, error: err?.message || 'Gagal memperbarui data pengguna' };
  }
}

export async function updateStaffRole(
  userId: string,
  outletIds: string[] | string,
  role: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Sesi anda telah berakhir. Silakan login kembali.' };
    }

    const { isOwner, userRole, accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
    if (!isOwner && userRole !== 'manager') {
      return { success: false, error: 'Akses ditolak: Anda tidak memiliki wewenang untuk mengubah hak akses pengguna' };
    }

    if (session.user.id === userId) {
      return { success: false, error: 'Tidak dapat mengubah peran akun Anda sendiri' };
    }

    if (!isOwner && userRole === 'manager') {
      const targetRoles = await db
        .select()
        .from(userOutletRoles)
        .where(eq(userOutletRoles.userId, userId));

      if (targetRoles.some((r) => r.role === 'owner' || r.role === 'manager')) {
        return { success: false, error: 'Akses ditolak: Manager tidak dapat mengubah hak akses Owner atau Manager' };
      }

      if (role !== 'kasir') {
        return { success: false, error: 'Akses ditolak: Manager hanya dapat menugaskan peran Kasir' };
      }

      const requestedOutletIds = Array.isArray(outletIds) ? outletIds : [outletIds];
      for (const outId of requestedOutletIds) {
        if (!accessibleOutletIds.includes(outId)) {
          return { success: false, error: 'Akses ditolak: Cabang di luar wewenang Anda' };
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

    try {
      revalidatePath('/staff');
    } catch (e) {
      console.warn('revalidatePath warning:', e);
    }
    return { success: true };
  } catch (err: any) {
    console.error('updateStaffRole error:', err);
    return { success: false, error: err?.message || 'Gagal memperbarui hak akses pengguna' };
  }
}

export async function deleteStaff(userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const session = await getSession();
    if (!session) {
      return { success: false, error: 'Sesi anda telah berakhir. Silakan login kembali.' };
    }

    if (session.user.id === userId) {
      return { success: false, error: 'Tidak dapat menghapus akun yang sedang login' };
    }

    const { isOwner, userRole, accessibleOutletIds } = await getUserAccessibleOutlets(session.user.id);
    if (!isOwner && userRole !== 'manager') {
      return { success: false, error: 'Akses ditolak: Hanya Owner dan Manager yang berhak menghapus staf' };
    }

    if (!isOwner && userRole === 'manager') {
      const targetRoles = await db
        .select()
        .from(userOutletRoles)
        .where(eq(userOutletRoles.userId, userId));

      if (targetRoles.some((r) => r.role === 'owner')) {
        return { success: false, error: 'Akses ditolak: Manager tidak dapat menghapus akun Owner' };
      }
      if (targetRoles.some((r) => r.role === 'manager')) {
        return { success: false, error: 'Akses ditolak: Manager tidak dapat menghapus akun Manager' };
      }

      const targetOutletIds = targetRoles.map((r) => r.outletId);
      const isInBranch = targetOutletIds.some((id) => accessibleOutletIds.includes(id));
      if (!isInBranch && targetRoles.length > 0) {
        return { success: false, error: 'Akses ditolak: Staf ini bukan bagian dari cabang yang Anda naungi' };
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(sessionTable).where(eq(sessionTable.userId, userId));
      await tx.delete(userOutletRoles).where(eq(userOutletRoles.userId, userId));
      await tx.delete(account).where(eq(account.userId, userId));
      await tx.delete(user).where(eq(user.id, userId));
    });

    try {
      revalidatePath('/staff');
    } catch (e) {
      console.warn('revalidatePath warning:', e);
    }

    return { success: true };
  } catch (err: any) {
    console.error('deleteStaff error:', err);
    return { success: false, error: err?.message || 'Gagal menghapus akun pengguna' };
  }
}
