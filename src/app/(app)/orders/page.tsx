import { db } from '@/lib/db';
import { orders, outlets, user } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import OrdersClient, { type OrderWithDetails } from './orders-client';
import { desc, asc, eq, sql, and, like, or, gte, lte, inArray } from 'drizzle-orm';
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
  const { role, isOwner, effectiveOutletId, accessibleOutlets, accessibleOutletIds } =
    await requireAuthRole(['owner', 'manager', 'kasir'], params?.outletId);
  const outletId = effectiveOutletId;
  const page = Math.max(1, Number(params?.page || 1));
  const pageSize = 15;
  const offset = (page - 1) * pageSize;

  const { startEpoch, endEpoch } = getDateRangeFromParams(params);

  let allOutlets: any[] = accessibleOutlets;
  let ordersList: OrderWithDetails[] = [];
  let totalItems = 0;
  let totalPages = 1;

  try {
    const conditions = [];
    if (outletId !== 'all') {
      conditions.push(eq(orders.outletId, outletId));
    } else {
      conditions.push(inArray(orders.outletId, accessibleOutletIds));
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

    let orderBy = desc(orders.createdAt);
    if (params?.sort === 'createdAt') orderBy = params.dir === 'asc' ? asc(orders.createdAt) : desc(orders.createdAt);
    else if (params?.sort === 'total') orderBy = params.dir === 'asc' ? asc(orders.total) : desc(orders.total);
    else if (params?.sort === 'status') orderBy = params.dir === 'asc' ? asc(orders.status) : desc(orders.status);
    else if (params?.sort === 'paymentMethod') orderBy = params.dir === 'asc' ? asc(orders.paymentMethod) : desc(orders.paymentMethod);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [countRes, baseOrders] = await Promise.all([
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(orders)
        .where(whereClause),
      db
        .select({
          order: orders,
          outlet: outlets,
          user: user,
        })
        .from(orders)
        .leftJoin(outlets, eq(orders.outletId, outlets.id))
        .leftJoin(user, eq(orders.kasirId, user.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
    ]);

    totalItems = Number(countRes[0]?.count || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    ordersList = baseOrders.map((b) => ({
      ...b.order,
      outletName: b.outlet?.name || 'Kopi Seruni',
      outletAddress: b.outlet?.address,
      outletPhone: b.outlet?.phone,
      kasirName: b.user?.name || 'Kasir',
      items: [],
    }));
  } catch (e) {
    console.warn('Error fetching orders:', e);
  }

  return (
    <OrdersClient
      initialOrders={ordersList}
      outlets={allOutlets}
      currentOutletId={params?.outletId}
      userRole={role}
      pagination={{
        currentPage: page,
        totalPages,
        totalItems,
        pageSize,
      }}
    />
  );
}
