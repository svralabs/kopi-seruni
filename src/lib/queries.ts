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
  async () => {
    return db.select().from(categories).where(isNull(categories.deletedAt));
  },
  ['master-categories'],
  { tags: ['categories'], revalidate: 3600 }
);

export const getActiveDiscounts = unstable_cache(
  async () => {
    return db
      .select()
      .from(discounts)
      .where(and(eq(discounts.isActive, 1), isNull(discounts.deletedAt)));
  },
  ['master-active-discounts'],
  { tags: ['discounts'], revalidate: 3600 }
);

export const getExpenseCategories = unstable_cache(
  async () => {
    return db.select().from(expenseCategories);
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
