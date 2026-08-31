'use client';

import { useState, useTransition } from 'react';
import { deleteProduct } from '@/app/actions/products';
import { Trash2 } from 'lucide-react';
import ConfirmModal from '@/components/confirm-modal';
import { toast } from '@/lib/toast';

export default function DeleteProductButton({
  productId,
  productName = 'menu ini',
}: {
  productId: string;
  productName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleConfirmDelete = () => {
    startTransition(async () => {
      try {
        await deleteProduct(productId);
        toast.success(`Menu "${productName}" berhasil dihapus`);
        setIsOpen(false);
      } catch (err: any) {
        toast.error(err?.message || 'Gagal menghapus produk');
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        disabled={isPending}
        className="p-1.5 rounded-xl text-[#9E968B] hover:text-[#A34730] hover:bg-[#FBEBE8] transition-colors disabled:opacity-50 cursor-pointer"
        title="Hapus Produk"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>

      <ConfirmModal
        isOpen={isOpen}
        title="Hapus Menu Produk?"
        description={`Menu "${productName}" akan dihapus (nonaktif) dari daftar katalog POS.`}
        confirmLabel="Hapus Menu"
        cancelLabel="Batal"
        variant="danger"
        isPending={isPending}
        onClose={() => setIsOpen(false)}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
