import { db } from '@/lib/db';
import { discounts, outlets } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import DiscountsClient from './discount-client';
import { isNull, desc, eq } from 'drizzle-orm';

export default async function DiscountsPage() {
  let allOutlets: any[] = [];
  let discountsList: any[] = [];

  try {
    const [outletsRes, rawDiscounts] = await Promise.all([
      getOutlets(),
      db
        .select({
          discount: discounts,
          outlet: outlets,
        })
        .from(discounts)
        .leftJoin(outlets, eq(discounts.outletId, outlets.id))
        .where(isNull(discounts.deletedAt))
        .orderBy(desc(discounts.createdAt)),
    ]);

    allOutlets = outletsRes;
    discountsList = rawDiscounts.map((r) => ({
      ...r.discount,
      outletName: r.outlet?.name || 'Pusat',
    }));
  } catch (e) {
    console.warn('Error fetching discounts:', e);
  }

  return (
    <DiscountsClient
      discountsList={discountsList}
      outlets={allOutlets}
    />
  );
}
