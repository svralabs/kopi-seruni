import { db } from '@/lib/db';
import { products, outlets } from '@/lib/schema';
import { getOutlets, getCategories } from '@/lib/queries';
import ProductsClient from './products-client';
import { isNull, desc, sql, eq, and } from 'drizzle-orm';

export default async function ProductsPage({
  searchParams,
}: {
  searchParams?: Promise<{ page?: string; outletId?: string }>;
}) {
  const params = searchParams ? await searchParams : {};
  const outletId = params.outletId || 'all';
  const page = Math.max(1, Number(params.page || 1));
  const pageSize = 15;
  const offset = (page - 1) * pageSize;

  let allOutlets: any[] = [];
  let productList: any[] = [];
  let categoriesList: any[] = [];
  let categoryMap: Record<string, string> = {};
  let totalItems = 0;
  let totalPages = 1;

  try {
    const conditions = [isNull(products.deletedAt)];
    if (outletId !== 'all') {
      conditions.push(eq(products.outletId, outletId));
    }
    const whereClause = and(...conditions);

    const [outletsRes, countRes, rawProducts, categoriesRes] = await Promise.all([
      getOutlets(),
      db
        .select({ count: sql<number>`COUNT(*)` })
        .from(products)
        .where(whereClause),
      db
        .select({
          product: products,
          outlet: outlets,
        })
        .from(products)
        .leftJoin(outlets, eq(products.outletId, outlets.id))
        .where(whereClause)
        .orderBy(desc(products.createdAt))
        .limit(pageSize)
        .offset(offset),
      getCategories(outletId),
    ]);

    allOutlets = outletsRes;
    totalItems = Number(countRes[0]?.count || 0);
    totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    productList = rawProducts.map((r) => ({
      ...r.product,
      outletName: r.outlet?.name || 'Pusat',
    }));
    categoriesList = categoriesRes;

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
      outlets={allOutlets}
      currentOutletId={outletId}
      totalItems={totalItems}
      totalPages={totalPages}
      currentPage={page}
      pageSize={pageSize}
    />
  );
}
