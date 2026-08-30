'use server';
import { getSession } from '@/lib/auth-helpers';
import { isAllowedType, getUploadUrl } from '@/lib/r2';
import { redirect } from 'next/navigation';

export async function requestUploadUrl(contentType: string) {
  const session = await getSession();
  if (!session) redirect('/login');
  if (!isAllowedType(contentType)) throw new Error('Tipe file tidak diizinkan');
  return getUploadUrl(contentType);
}
