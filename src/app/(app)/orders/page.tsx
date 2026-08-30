import { db } from '@/lib/db';
import { orders, orderItems, outlets, user } from '@/lib/schema';
import OrdersClient, { type OrderWithDetails } from './orders-client';
import { desc, eq, inArray } from 'drizzle-orm';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ outletId?: string }>;
}) {
  const params = await searchParams;
  let allOutlets: any[] = [];
  let ordersList: OrderWithDetails[] = [];

  try {
    allOutlets = await db.select().from(outlets);

    const baseOrders = await db
      .select({
        order: orders,
        outlet: outlets,
        user: user,
      })
      .from(orders)
      .leftJoin(outlets, eq(orders.outletId, outlets.id))
      .leftJoin(user, eq(orders.kasirId, user.id))
      .orderBy(desc(orders.createdAt))
      .limit(100);

    const orderIds = baseOrders.map((b) => b.order.id);

    let allItems: any[] = [];
    if (orderIds.length > 0) {
      allItems = await db
        .select()
        .from(orderItems)
        .where(inArray(orderItems.orderId, orderIds));
    }

    const itemsByOrder: Record<string, any[]> = {};
    allItems.forEach((item) => {
      if (!itemsByOrder[item.orderId]) {
        itemsByOrder[item.orderId] = [];
      }
      itemsByOrder[item.orderId].push(item);
    });

    ordersList = baseOrders.map((b) => ({
      ...b.order,
      outletName: b.outlet?.name || 'Kopi Seruni',
      outletAddress: b.outlet?.address,
      outletPhone: b.outlet?.phone,
      kasirName: b.user?.name || 'Kasir',
      items: itemsByOrder[b.order.id] || [],
    }));
  } catch (e) {
    console.warn('Error fetching orders:', e);
  }

  return (
    <OrdersClient
      initialOrders={ordersList}
      outlets={allOutlets}
      currentOutletId={params?.outletId}
    />
  );
}
