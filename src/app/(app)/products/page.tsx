import { db } from '@/lib/db';
import { products, categories } from '@/lib/schema';
import ProductsClient from './products-client';
import { isNull, desc, sql } from 'drizzle-orm';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const page = Math.max(1, Number(params.page || 1));
  const pageSize = 15;
  const offset = (page - 1) * pageSize;

  let productList: any[] = [];
  let categoriesList: any[] = [];
  let categoryMap: Record<string, string> = {};
  let totalItems = 0;
  let totalPages = 1;

  try {
    const countQuery = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(products)
      .where(isNull(products.deletedAt));

    totalItems = Number(countQuery[0]?.count || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    productList = await db
      .select()
      .from(products)
      .where(isNull(products.deletedAt))
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset(offset);

    categoriesList = await db.select().from(categories);
    categoriesList.forEach((c) => {
      categoryMap[c.id] = c.name;
    });
  } catch (e) {
    console.warn('Error fetching products:', e);
  }

  return (
    <ProductsClient
      productList={productList}
      categoriesList={categoriesList}
      categoryMap={categoryMap}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      pageSize={pageSize}
    />
  );
}
