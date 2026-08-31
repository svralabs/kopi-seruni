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
  const resolvedParams = searchParams ? await searchParams : {};
  const { isOwner, effectiveOutletId, accessibleOutlets } = await requireAuthRole(
    ['owner', 'manager'],
    resolvedParams.outletId
  );
  const outletId = isOwner ? (resolvedParams.outletId || 'all') : effectiveOutletId;

  let allOutlets: any[] = accessibleOutlets;
  let discountsList: any[] = [];

  try {
    const conditions = [isNull(discounts.deletedAt)];
    if (outletId !== 'all') {
      conditions.push(eq(discounts.outletId, outletId));
    }

    const [rawDiscounts] = await Promise.all([
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
