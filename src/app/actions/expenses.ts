'use server';

import { db } from '@/lib/db';
import { expenses } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createExpense(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const description = formData.get('description') as string;
  const amount = Math.round(Number(formData.get('amount')) || 0);
  const paymentMethod = (formData.get('paymentMethod') as string) || 'cash';
  const categoryId = (formData.get('categoryId') as string) || null;
  const expenseDateInput = formData.get('expenseDate') as string;
  const outletId = (formData.get('outletId') as string) || 'out_default';

  if (!description || amount <= 0) {
    throw new Error('Deskripsi dan nominal pengeluaran wajib diisi');
  }

  const expenseDate = expenseDateInput
    ? Math.floor(new Date(expenseDateInput).getTime() / 1000)
    : Math.floor(Date.now() / 1000);

  const id = `exp_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = Math.floor(Date.now() / 1000);

  await db.insert(expenses).values({
    id,
    outletId,
    categoryId,
    createdBy: session.user.id,
    description,
    amount,
    paymentMethod,
    expenseDate,
    createdAt: now,
  });

  revalidatePath('/expenses');
  revalidatePath('/dashboard');
  revalidatePath('/profit-loss');
}
