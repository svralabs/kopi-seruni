import { db } from '@/lib/db';
import { products, categories, discounts, shifts, outlets } from '@/lib/schema';
import { getSession } from '@/lib/auth-helpers';
import POSClient from './pos-client';
import { eq, and, isNull } from 'drizzle-orm';

export default async function POSPage({
  searchParams,
}: {
  searchParams: Promise<{ outletId?: string }>;
}) {
  const session = await getSession();
  const kasirName = session?.user?.name || 'Kasir Seruni';

  const params = await searchParams;
  let allOutlets: any[] = [];
  let currentOutlet: any = null;
  let productList: any[] = [];
  let categoryList: any[] = [];
  let discountList: any[] = [];
  let activeShift: any = null;

  try {
    allOutlets = await db.select().from(outlets);

    const targetOutletId = params?.outletId || allOutlets[0]?.id || 'out_default';
    currentOutlet = allOutlets.find((o) => o.id === targetOutletId) || allOutlets[0] || {
      id: 'out_default',
      name: 'Kopi Seruni - Pusat',
      address: 'Jl. Dipati Ukur No. 42, Bandung',
      phone: '0812-3456-7890',
    };

    productList = await db
      .select()
      .from(products)
      .where(and(eq(products.isActive, 1), isNull(products.deletedAt)));

    categoryList = await db
      .select()
      .from(categories)
      .where(isNull(categories.deletedAt));

    discountList = await db
      .select()
      .from(discounts)
      .where(and(eq(discounts.isActive, 1), isNull(discounts.deletedAt)));

    const activeShifts = await db
      .select()
      .from(shifts)
      .where(and(eq(shifts.outletId, currentOutlet.id), isNull(shifts.closedAt)))
      .limit(1);

    if (activeShifts.length > 0) {
      activeShift = activeShifts[0];
    }
  } catch (e) {
    console.warn('DB query in POS failed:', e);
  }

  return (
    <div className="h-full">
      <POSClient
        initialProducts={productList}
        categories={categoryList}
        discounts={discountList}
        allOutlets={allOutlets}
        currentOutlet={currentOutlet}
        shiftId={activeShift?.id}
        kasirName={kasirName}
      />
    </div>
  );
}
