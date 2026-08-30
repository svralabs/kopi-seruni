import { db } from '@/lib/db';
import { products, categories, discounts, shifts } from '@/lib/schema';
import POSClient from './pos-client';
import { eq, and, isNull } from 'drizzle-orm';

export default async function POSPage() {
  let productList: any[] = [];
  let categoryList: any[] = [];
  let discountList: any[] = [];
  let activeShiftId: string | undefined = undefined;

  try {
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
      .select({ id: shifts.id })
      .from(shifts)
      .where(isNull(shifts.closedAt))
      .limit(1);

    if (activeShifts.length > 0) {
      activeShiftId = activeShifts[0].id;
    }
  } catch (e) {
    console.warn('DB query in POS failed:', e);
  }

  return (
    <div className="space-y-4">
      <POSClient
        initialProducts={productList}
        categories={categoryList}
        discounts={discountList}
        shiftId={activeShiftId}
      />
    </div>
  );
}

