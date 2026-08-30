import { db } from '@/lib/db';
import { purchaseOrders, purchaseOrderItems, products, outlets } from '@/lib/schema';
import PurchasesClient, { type PurchaseOrderRecord } from './purchases-client';
import { desc, eq, isNull } from 'drizzle-orm';

export default async function PurchasesPage() {
  let allOutlets: any[] = [];
  let allProducts: any[] = [];
  let ordersList: PurchaseOrderRecord[] = [];

  try {
    allOutlets = await db.select().from(outlets);

    allProducts = await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt));

    const rawOrders = await db
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
      .orderBy(desc(purchaseOrders.createdAt));

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
