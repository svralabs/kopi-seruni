import { db } from '@/lib/db';
import { expenses, expenseCategories, outlets } from '@/lib/schema';
import { getOutlets, getExpenseCategories } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import ExpensesClient from './expenses-client';
import { getDateRangeFromParams } from '@/lib/utils';
import { desc, eq, sql, and, gte, lte } from 'drizzle-orm';

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams?: Promise<{ 
    outletId?: string; 
    page?: string;
    period?: string;
    from?: string;
    to?: string;
  }>;
}) {
  await requireAuthRole(['owner', 'manager']);
  const params = await searchParams;
  const outletId = params?.outletId || 'all';
  const page = Math.max(1, Number(params?.page || 1));
  const pageSize = 15;
  const offset = (page - 1) * pageSize;

  const { startEpoch, endEpoch } = getDateRangeFromParams(params);

  let allOutlets: any[] = [];
  let categoryList: any[] = [];
  let expensesList: any[] = [];
  let totalItems = 0;
  let totalPages = 1;
  let totalAmount = 0;

  try {
    const conditions: any[] = [];
    if (outletId !== 'all') {
      conditions.push(eq(expenses.outletId, outletId));
    }
    if (startEpoch > 0) conditions.push(gte(expenses.expenseDate, startEpoch));
    if (endEpoch > 0) conditions.push(lte(expenses.expenseDate, endEpoch));

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [outletsRes, categoryRes, countAndSumRes, rawExpenses] = await Promise.all([
      getOutlets(),
      getExpenseCategories(outletId),
      db
        .select({
          count: sql<number>`COUNT(*)`,
          sum: sql<number>`COALESCE(SUM(${expenses.amount}), 0)`,
        })
        .from(expenses)
        .where(whereClause),
      db
        .select({
          expense: expenses,
          category: expenseCategories,
          outlet: outlets,
        })
        .from(expenses)
        .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
        .leftJoin(outlets, eq(expenses.outletId, outlets.id))
        .where(whereClause)
        .orderBy(desc(expenses.expenseDate))
        .limit(pageSize)
        .offset(offset),
    ]);

    allOutlets = outletsRes;
    categoryList = categoryRes;
    totalItems = Number(countAndSumRes[0]?.count || 0);
    totalAmount = Number(countAndSumRes[0]?.sum || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    expensesList = rawExpenses.map((r) => ({
      ...r.expense,
      categoryName: r.category?.name || 'Umum',
      outletName: r.outlet?.name || 'Outlet Utama',
    }));
  } catch (e) {
    console.warn('Error fetching expenses:', e);
  }

  return (
    <ExpensesClient
      expensesList={expensesList}
      categories={categoryList}
      outlets={allOutlets}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      pageSize={pageSize}
      totalAmount={totalAmount}
    />
  );
}
