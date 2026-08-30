import { db } from '@/lib/db';
import { orders, orderItems, outlets, user } from '@/lib/schema';
import OrdersClient, { type OrderWithDetails } from './orders-client';
import { desc, eq, inArray, sql, and } from 'drizzle-orm';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ outletId?: string; page?: string }>;
}) {
  const params = await searchParams;
  const outletId = params?.outletId || 'all';
  const page = Math.max(1, Number(params?.page || 1));
  const pageSize = 15;
  const offset = (page - 1) * pageSize;

  let allOutlets: any[] = [];
  let ordersList: OrderWithDetails[] = [];
  let totalItems = 0;
  let totalPages = 1;

  try {
    allOutlets = await db.select().from(outlets);

    const conditions = [];
    if (outletId !== 'all') {
      conditions.push(eq(orders.outletId, outletId));
    }

    const countQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    totalItems = Number(countQuery[0]?.count || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    const baseOrders = await db
      .select({
        order: orders,
        outlet: outlets,
        user: user,
      })
      .from(orders)
      .leftJoin(outlets, eq(orders.outletId, outlets.id))
      .leftJoin(user, eq(orders.kasirId, user.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(orders.createdAt))
      .limit(pageSize)
      .offset(offset);

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
      pagination={{
        currentPage: page,
        totalPages,
        totalItems,
        pageSize,
      }}
    />
  );
}
