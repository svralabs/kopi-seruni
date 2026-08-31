import { db } from '@/lib/db';
import { discounts, outlets } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import DiscountsClient from './discount-client';
import { isNull, desc, eq, and } from 'drizzle-orm';

export default async function DiscountsPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string }>;
}) {
  await requireAuthRole(['owner', 'manager']);
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'all';

  let allOutlets: any[] = [];
  let discountsList: any[] = [];

  try {
    const conditions = [isNull(discounts.deletedAt)];
    if (outletId !== 'all') {
      conditions.push(eq(discounts.outletId, outletId));
    }

    const [outletsRes, rawDiscounts] = await Promise.all([
      getOutlets(),
      db
        .select({
          discount: discounts,
          outlet: outlets,
        })
        .from(discounts)
        .leftJoin(outlets, eq(discounts.outletId, outlets.id))
        .where(and(...conditions))
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
