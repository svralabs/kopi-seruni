'use client';

import { useTransition } from 'react';
import { deleteProduct } from '@/app/actions/products';

export default function DeleteProductButton({ productId }: { productId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (confirm('Yakin ingin menghapus produk ini?')) {
      startTransition(async () => {
        await deleteProduct(productId);
      });
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-xs text-red-600 hover:text-red-800 font-medium disabled:opacity-50"
    >
      {isPending ? 'Menghapus...' : 'Hapus'}
    </button>
  );
}
