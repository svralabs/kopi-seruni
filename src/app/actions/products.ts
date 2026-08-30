'use server';

import { db } from '@/lib/db';
import { products } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function createProduct(formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const name = formData.get('name') as string;
  const categoryId = (formData.get('categoryId') as string) || null;
  const price = Math.round(Number(formData.get('price')) || 0);
  const costPrice = Math.round(Number(formData.get('costPrice')) || 0);
  const description = (formData.get('description') as string) || null;
  const imageUrl = (formData.get('imageUrl') as string) || null;
  const outletId = (formData.get('outletId') as string) || 'out_default';

  if (!name || price <= 0) {
    throw new Error('Nama produk dan harga wajib diisi');
  }

  const id = `prd_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const now = Math.floor(Date.now() / 1000);

  await db.insert(products).values({
    id,
    outletId,
    categoryId,
    name,
    description,
    price,
    costPrice,
    imageUrl,
    isActive: 1,
    createdAt: now,
    updatedAt: now,
  });

  revalidatePath('/products');
  revalidatePath('/pos');
  redirect('/products');
}

export async function updateProduct(productId: string, formData: FormData) {
  const session = await getSession();
  if (!session) redirect('/login');

  const name = formData.get('name') as string;
  const categoryId = (formData.get('categoryId') as string) || null;
  const price = Math.round(Number(formData.get('price')) || 0);
  const costPrice = Math.round(Number(formData.get('costPrice')) || 0);
  const description = (formData.get('description') as string) || null;
  const imageUrl = (formData.get('imageUrl') as string) || null;
  const isActive = formData.get('isActive') === '0' ? 0 : 1;

  if (!name || price <= 0) {
    throw new Error('Nama produk dan harga jual wajib diisi');
  }

  const now = Math.floor(Date.now() / 1000);

  await db
    .update(products)
    .set({
      name: name.trim(),
      categoryId,
      price,
      costPrice,
      description: description ? description.trim() : null,
      imageUrl,
      isActive,
      updatedAt: now,
    })
    .where(eq(products.id, productId));

  revalidatePath('/products');
  revalidatePath('/pos');
  return { success: true };
}

export async function deleteProduct(productId: string) {
  const session = await getSession();
  if (!session) redirect('/login');

  const now = Math.floor(Date.now() / 1000);

  // Soft delete
  await db
    .update(products)
    .set({ deletedAt: now, isActive: 0 })
    .where(eq(products.id, productId));

  revalidatePath('/products');
  revalidatePath('/pos');
  return { success: true };
}

