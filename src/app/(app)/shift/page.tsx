import { db } from '@/lib/db';
import { shifts, outlets, user, orders } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import ShiftClient from './shift-client';
import { desc, asc, eq, isNull, isNotNull, and, or, gte, lte, sql, inArray, like } from 'drizzle-orm';
import { getDateRangeFromParams } from '@/lib/utils';

export default async function ShiftPage({
  searchParams,
}: {
  searchParams?: Promise<{ 
    outletId?: string; 
    page?: string;
    sort?: string;
    dir?: string;
    period?: string;
    from?: string;
    to?: string;
    status?: string;
    q?: string;
  }>;
}) {
  const params = searchParams ? await searchParams : {};
  const { effectiveOutletId, accessibleOutlets, accessibleOutletIds } = await requireAuthRole(
    ['owner', 'manager', 'kasir'],
    params?.outletId
  );
  const outletId = effectiveOutletId;
  const page = Math.max(1, Number(params?.page || 1));
  const pageSize = 15;
  const offset = (page - 1) * pageSize;

  const { startEpoch, endEpoch, label } = getDateRangeFromParams(params);

  let activeShift: any = null;
  let recentShifts: any[] = [];
  let allOutlets: any[] = accessibleOutlets;
  let totalItems = 0;
  let totalPages = 1;

  let activeShiftSales = {
    totalSales: 0,
    cashTotal: 0,
    qrisTotal: 0,
    edcTotal: 0,
    transferTotal: 0,
    debitTotal: 0,
    shopeeFoodTotal: 0,
    goFoodTotal: 0,
    orderCount: 0,
    expectedCash: 0,
  };

  try {
    const conditions = [];

    // Outlet condition
    if (params?.outletId === 'all') {
      conditions.push(inArray(shifts.outletId, accessibleOutletIds));
    } else {
      conditions.push(eq(shifts.outletId, outletId));
    }

    // Date range filter
    if (startEpoch > 0) conditions.push(gte(shifts.openedAt, startEpoch));
    if (endEpoch > 0) conditions.push(lte(shifts.openedAt, endEpoch));

    // Status filter
    if (params?.status === 'active') {
      conditions.push(isNull(shifts.closedAt));
    } else if (params?.status === 'closed') {
      conditions.push(isNotNull(shifts.closedAt));
    }

    // Search query (cashier name or shift notes)
    if (params?.q && params.q.trim()) {
      const term = `%${params.q.trim()}%`;
      conditions.push(or(like(shifts.notes, term), like(user.name, term)));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Sorting
    const sort = params?.sort || 'openedAt';
    const dir = params?.dir === 'asc' ? 'asc' : 'desc';
    let orderBy = dir === 'asc' ? asc(shifts.openedAt) : desc(shifts.openedAt);

    if (sort === 'closedAt') orderBy = dir === 'asc' ? asc(shifts.closedAt) : desc(shifts.closedAt);
    else if (sort === 'openingCash') orderBy = dir === 'asc' ? asc(shifts.openingCash) : desc(shifts.openingCash);
    else if (sort === 'expectedCash') orderBy = dir === 'asc' ? asc(shifts.expectedCash) : desc(shifts.expectedCash);
    else if (sort === 'closingCash') orderBy = dir === 'asc' ? asc(shifts.closingCash) : desc(shifts.closingCash);
    else if (sort === 'kasir') orderBy = dir === 'asc' ? asc(user.name) : desc(user.name);
    else if (sort === 'diff' || sort === 'selisih') {
      orderBy = dir === 'asc'
        ? sql`(${shifts.closingCash} - ${shifts.expectedCash}) ASC`
        : sql`(${shifts.closingCash} - ${shifts.expectedCash}) DESC`;
    }

    const [activeList, countRes, rawShifts] = await Promise.all([
      db
        .select()
        .from(shifts)
        .where(and(eq(shifts.outletId, outletId), isNull(shifts.closedAt)))
        .limit(1),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(shifts)
        .leftJoin(user, eq(shifts.kasirId, user.id))
        .where(whereClause),
      db
        .select({
          shift: shifts,
          kasir: user,
          outlet: outlets,
        })
        .from(shifts)
        .leftJoin(user, eq(shifts.kasirId, user.id))
        .leftJoin(outlets, eq(shifts.outletId, outlets.id))
        .where(whereClause)
        .orderBy(orderBy)
        .limit(pageSize)
        .offset(offset),
    ]);

    activeShift = activeList[0] || null;
    totalItems = Number(countRes[0]?.count || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    recentShifts = rawShifts.map((r) => ({
      ...r.shift,
      kasirName: r.kasir?.name || 'Kasir',
      outletName: r.outlet?.name || 'Kopi Seruni',
    }));

    if (activeShift) {
      const shiftOrders = await db
        .select({
          paymentMethod: orders.paymentMethod,
          total: orders.total,
        })
        .from(orders)
        .where(
          and(
            eq(orders.status, 'completed'),
            or(
              eq(orders.shiftId, activeShift.id),
              and(
                eq(orders.outletId, outletId),
                isNull(orders.shiftId),
                gte(orders.createdAt, activeShift.openedAt)
              )
            )
          )
        );

      for (const o of shiftOrders) {
        const pm = (o.paymentMethod || 'cash').toLowerCase();
        activeShiftSales.totalSales += o.total;
        activeShiftSales.orderCount += 1;
        if (pm === 'cash') activeShiftSales.cashTotal += o.total;
        else if (pm === 'qris') activeShiftSales.qrisTotal += o.total;
        else if (pm === 'edc') activeShiftSales.edcTotal += o.total;
        else if (pm === 'debit') activeShiftSales.debitTotal += o.total;
        else if (pm === 'transfer') activeShiftSales.transferTotal += o.total;
        else if (pm === 'shopeefood') activeShiftSales.shopeeFoodTotal += o.total;
        else if (pm === 'gofood') activeShiftSales.goFoodTotal += o.total;
      }

      activeShiftSales.expectedCash = (activeShift.openingCash || 0) + activeShiftSales.cashTotal;
    }
  } catch (e) {
    console.warn('Error fetching shifts:', e);
  }

  return (
    <ShiftClient
      activeShift={activeShift}
      activeShiftSales={activeShiftSales}
      recentShifts={recentShifts}
      outletId={params?.outletId || outletId}
      allOutlets={allOutlets}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      pageSize={pageSize}
      periodLabel={label}
    />
  );
}
