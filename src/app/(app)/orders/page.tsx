import { db } from '@/lib/db';
import { orders, orderItems, outlets, user } from '@/lib/schema';
import OrdersClient, { type OrderWithDetails } from './orders-client';
import { desc, asc, eq, inArray, sql, and, like, or, gte, lte } from 'drizzle-orm';
import { getDateRangeFromParams } from '@/lib/utils';

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    outletId?: string; 
    page?: string;
    sort?: string;
    dir?: string;
    q?: string;
    status?: string;
    payment?: string;
    period?: string;
    from?: string;
    to?: string;
  }>;
}) {
  const params = await searchParams;
  const outletId = params?.outletId || 'all';
  const page = Math.max(1, Number(params?.page || 1));
  const pageSize = 15;
  const offset = (page - 1) * pageSize;

  const { startEpoch, endEpoch } = getDateRangeFromParams(params);

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
    
    if (startEpoch > 0) {
      conditions.push(gte(orders.createdAt, startEpoch));
    }
    if (endEpoch > 0) {
      conditions.push(lte(orders.createdAt, endEpoch));
    }

    if (params?.status && params.status !== 'all') {
      conditions.push(eq(orders.status, params.status as 'pending' | 'completed' | 'voided'));
    }
    
    if (params?.payment && params.payment !== 'all') {
      conditions.push(eq(orders.paymentMethod, params.payment as 'cash' | 'qris' | 'transfer' | 'debit'));
    }
    
    if (params?.q) {
      const query = `%${params.q}%`;
      conditions.push(
        or(
          like(orders.id, query),
          like(orders.customerName, query)
        )
      );
    }

    const countQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(orders)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    totalItems = Number(countQuery[0]?.count || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    
    let orderBy = desc(orders.createdAt);
    if (params?.sort === 'createdAt') orderBy = params.dir === 'asc' ? asc(orders.createdAt) : desc(orders.createdAt);
    else if (params?.sort === 'total') orderBy = params.dir === 'asc' ? asc(orders.total) : desc(orders.total);
    else if (params?.sort === 'status') orderBy = params.dir === 'asc' ? asc(orders.status) : desc(orders.status);
    else if (params?.sort === 'paymentMethod') orderBy = params.dir === 'asc' ? asc(orders.paymentMethod) : desc(orders.paymentMethod);

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
      .orderBy(orderBy)
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
