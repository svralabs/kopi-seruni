import { db } from '@/lib/db';
import { purchaseOrders, purchaseOrderItems, products, outlets } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import PurchasesClient, { type PurchaseOrderRecord } from './purchases-client';
import { desc, eq, isNull, and } from 'drizzle-orm';

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string }>;
}) {
  await requireAuthRole(['owner', 'manager']);
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'all';

  let allOutlets: any[] = [];
  let allProducts: any[] = [];
  let ordersList: PurchaseOrderRecord[] = [];

  try {
    const poConditions = [];
    if (outletId !== 'all') {
      poConditions.push(eq(purchaseOrders.outletId, outletId));
    }

    const prodConditions = [isNull(products.deletedAt)];
    if (outletId !== 'all') {
      prodConditions.push(eq(products.outletId, outletId));
    }

    const [outletsRes, productsRes, rawOrders] = await Promise.all([
      getOutlets(),
      db
        .select()
        .from(products)
        .where(and(...prodConditions)),
      db
        .select({
          po: purchaseOrders,
          item: purchaseOrderItems,
          prod: products,
          outlet: outlets,
        })
        .from(purchaseOrders)
        .leftJoin(purchaseOrderItems, eq(purchaseOrders.id, purchaseOrderItems.poId))
        .leftJoin(products, eq(purchaseOrderItems.productId, products.id))
        .leftJoin(outlets, eq(purchaseOrders.outletId, outlets.id))
        .where(poConditions.length > 0 ? and(...poConditions) : undefined)
        .orderBy(desc(purchaseOrders.createdAt)),
    ]);

    allOutlets = outletsRes;
    allProducts = productsRes;
    ordersList = rawOrders.map((r) => ({
      id: r.po.id,
      outletId: r.po.outletId,
      outletName: r.outlet?.name || 'Pusat',
      productName: r.prod?.name || 'Item Bahan',
      quantity: r.item?.quantity || 0,
      unitCost: r.item?.unitCost || 0,
      total: r.po.total,
      status: r.po.status as any,
      notes: r.po.notes,
      createdAt: r.po.createdAt,
      receivedAt: r.po.receivedAt,
    }));
  } catch (e) {
    console.warn('Error fetching purchase orders:', e);
  }

  return (
    <PurchasesClient
      ordersList={ordersList}
      productsList={allProducts}
      outlets={allOutlets}
    />
  );
}
