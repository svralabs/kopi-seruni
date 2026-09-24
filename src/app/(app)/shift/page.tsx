import { db } from '@/lib/db';
import { shifts, outlets, user, orders } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import ShiftClient from './shift-client';
import { desc, eq, isNull, and, or, gte, sql } from 'drizzle-orm';

export default async function ShiftPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string; page?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const { effectiveOutletId, accessibleOutlets } = await requireAuthRole(
    ['owner', 'manager', 'kasir'],
    params?.outletId
  );
  const outletId = effectiveOutletId;
  const page = Math.max(1, Number(params?.page || 1));
  const pageSize = 15;
  const offset = (page - 1) * pageSize;

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
    const [activeList, countRes, rawShifts] = await Promise.all([
      db
        .select()
        .from(shifts)
        .where(and(eq(shifts.outletId, outletId), isNull(shifts.closedAt)))
        .limit(1),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(shifts)
        .where(eq(shifts.outletId, outletId)),
      db
        .select({
          shift: shifts,
          kasir: user,
        })
        .from(shifts)
        .leftJoin(user, eq(shifts.kasirId, user.id))
        .where(eq(shifts.outletId, outletId))
        .orderBy(desc(shifts.openedAt))
        .limit(pageSize)
        .offset(offset),
    ]);

    activeShift = activeList[0] || null;
    totalItems = Number(countRes[0]?.count || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    recentShifts = rawShifts.map((r) => ({
      ...r.shift,
      kasirName: r.kasir?.name || 'Kasir',
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
      outletId={outletId}
      allOutlets={allOutlets}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      pageSize={pageSize}
    />
  );
}
