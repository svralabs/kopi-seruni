'use server';

import { db } from '@/lib/db';
import { outlets } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createOutlet(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const name = formData.get('name') as string;
  const address = (formData.get('address') as string) || null;
  const phone = (formData.get('phone') as string) || null;

  if (!name || name.trim() === '') {
    throw new Error('Nama outlet wajib diisi');
  }

  const id = `out_${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const now = Math.floor(Date.now() / 1000);

  await db.insert(outlets).values({
    id,
    name: name.trim(),
    address: address ? address.trim() : null,
    phone: phone ? phone.trim() : null,
    createdAt: now,
  });

  revalidatePath('/outlets');
  revalidatePath('/pos');
}

export async function updateOutlet(id: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const name = formData.get('name') as string;
  const address = (formData.get('address') as string) || null;
  const phone = (formData.get('phone') as string) || null;

  if (!name || name.trim() === '') {
    throw new Error('Nama outlet wajib diisi');
  }

  await db
    .update(outlets)
    .set({
      name: name.trim(),
      address: address ? address.trim() : null,
      phone: phone ? phone.trim() : null,
    })
    .where(eq(outlets.id, id));

  revalidatePath('/outlets');
  revalidatePath('/pos');
}

