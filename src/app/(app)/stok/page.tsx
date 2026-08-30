import { db } from '@/lib/db';
import { stock, products, outlets, stockMovements } from '@/lib/schema';
import StockClient from './stock-client';
import { eq, and, isNull, desc } from 'drizzle-orm';

export default async function StockPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'out_default';

  let allOutlets: any[] = [];
  let productStockList: any[] = [];
  let movementList: any[] = [];

  try {
    allOutlets = await db.select().from(outlets);

    productStockList = await db
      .select({
        product: products,
        stock: stock,
      })
      .from(products)
      .leftJoin(stock, and(eq(stock.productId, products.id), eq(stock.outletId, outletId)))
      .where(isNull(products.deletedAt));

    movementList = await db
      .select({
        movement: stockMovements,
        product: products,
      })
      .from(stockMovements)
      .leftJoin(products, eq(stockMovements.productId, products.id))
      .where(eq(stockMovements.outletId, outletId))
      .orderBy(desc(stockMovements.createdAt))
      .limit(50);
  } catch (e) {
    console.warn('Error fetching stock data:', e);
  }

  return (
    <StockClient
      productStockList={productStockList}
      movementList={movementList}
      outlets={allOutlets}
      currentOutletId={outletId}
    />
  );
}
