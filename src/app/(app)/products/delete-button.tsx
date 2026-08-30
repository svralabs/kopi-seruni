'use client';

import { useTransition } from 'react';
import { deleteProduct } from '@/app/actions/products';
import { Trash2 } from 'lucide-react';

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
      className="p-1.5 rounded-xl text-[#9E968B] hover:text-[#A34730] hover:bg-[#FBEBE8] transition-colors disabled:opacity-50"
      title="Hapus Produk"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
