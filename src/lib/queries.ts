import { unstable_cache } from 'next/cache';
import { db } from './db';
import {
  outlets,
  categories,
  discounts,
  expenseCategories,
  profitSharingRules,
} from './schema';
import { isNull, and, eq } from 'drizzle-orm';

export const getOutlets = unstable_cache(
  async () => {
    return db.select().from(outlets);
  },
  ['master-outlets'],
  { tags: ['outlets'], revalidate: 3600 }
);

export const getCategories = unstable_cache(
  async (outletId?: string) => {
    const conditions = [isNull(categories.deletedAt)];
    if (outletId && outletId !== 'all') {
      conditions.push(eq(categories.outletId, outletId));
    }
    return db
      .select()
      .from(categories)
      .where(and(...conditions))
      .orderBy(categories.sortOrder, categories.name);
  },
  ['master-categories'],
  { tags: ['categories'], revalidate: 3600 }
);

export const getActiveDiscounts = unstable_cache(
  async (outletId?: string) => {
    const conditions = [eq(discounts.isActive, 1), isNull(discounts.deletedAt)];
    if (outletId && outletId !== 'all') {
      conditions.push(eq(discounts.outletId, outletId));
    }
    return db
      .select()
      .from(discounts)
      .where(and(...conditions));
  },
  ['master-active-discounts'],
  { tags: ['discounts'], revalidate: 3600 }
);

export const getExpenseCategories = unstable_cache(
  async (outletId?: string) => {
    if (outletId && outletId !== 'all') {
      return db
        .select()
        .from(expenseCategories)
        .where(eq(expenseCategories.outletId, outletId))
        .orderBy(expenseCategories.name);
    }
    return db.select().from(expenseCategories).orderBy(expenseCategories.name);
  },
  ['master-expense-categories'],
  { tags: ['expense_categories'], revalidate: 3600 }
);

export const getProfitSharingRules = unstable_cache(
  async (outletId: string) => {
    return db
      .select()
      .from(profitSharingRules)
      .where(eq(profitSharingRules.outletId, outletId));
  },
  ['master-profit-sharing-rules'],
  { tags: ['profit_sharing_rules'], revalidate: 3600 }
);
