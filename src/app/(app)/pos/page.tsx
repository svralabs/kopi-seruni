import { db } from '@/lib/db';
import { products, categories, discounts } from '@/lib/schema';
import POSClient from './pos-client';
import { eq, and, isNull } from 'drizzle-orm';

export default async function POSPage() {
  let productList: any[] = [];
  let categoryList: any[] = [];
  let discountList: any[] = [];

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
  } catch (e) {
    console.warn('DB query in POS failed (likely DB empty or not setup yet):', e);
  }

  return (
    <div className="space-y-4">
      <POSClient
        initialProducts={productList}
        categories={categoryList}
        discounts={discountList}
      />
    </div>
  );
}
