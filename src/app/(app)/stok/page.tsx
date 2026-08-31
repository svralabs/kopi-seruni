import { db } from '@/lib/db';
import { stock, products, outlets, stockMovements, rawMaterials, rawMaterialStock, rawMaterialMovements } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import StockClient from './stock-client';
import { eq, and, isNull, desc } from 'drizzle-orm';

export default async function StockPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string; tab?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'out_default';
  const tab = resolvedParams.tab || 'produk';

  let allOutlets: any[] = [];
  let productStockList: any[] = [];
  let movementList: any[] = [];
  let rawMaterialList: any[] = [];
  let rawMaterialMovementList: any[] = [];

  try {
    const [
      outletsRes,
      productStockRes,
      movementRes,
      rawMaterialRes,
      rawMaterialMovementRes,
    ] = await Promise.all([
      getOutlets(),
      db
        .select({ product: products, stock: stock })
        .from(products)
        .leftJoin(stock, and(eq(stock.productId, products.id), eq(stock.outletId, outletId)))
        .where(and(isNull(products.deletedAt), eq(products.outletId, outletId))),
      db
        .select({ movement: stockMovements, product: products })
        .from(stockMovements)
        .leftJoin(products, eq(stockMovements.productId, products.id))
        .where(eq(stockMovements.outletId, outletId))
        .orderBy(desc(stockMovements.createdAt))
        .limit(50),
      db
        .select({ material: rawMaterials, stock: rawMaterialStock })
        .from(rawMaterials)
        .leftJoin(
          rawMaterialStock,
          and(
            eq(rawMaterialStock.rawMaterialId, rawMaterials.id),
            eq(rawMaterialStock.outletId, outletId),
          ),
        )
        .where(and(isNull(rawMaterials.deletedAt), eq(rawMaterials.outletId, outletId)))
        .orderBy(rawMaterials.name),
      db
        .select({ movement: rawMaterialMovements, material: rawMaterials })
        .from(rawMaterialMovements)
        .leftJoin(rawMaterials, eq(rawMaterialMovements.rawMaterialId, rawMaterials.id))
        .where(eq(rawMaterialMovements.outletId, outletId))
        .orderBy(desc(rawMaterialMovements.createdAt))
        .limit(50),
    ]);

    allOutlets = outletsRes;
    productStockList = productStockRes;
    movementList = movementRes;
    rawMaterialList = rawMaterialRes;
    rawMaterialMovementList = rawMaterialMovementRes;
  } catch (e) {
    console.warn('Error fetching stock data:', e);
  }

  return (
    <StockClient
      productStockList={productStockList}
      movementList={movementList}
      outlets={allOutlets}
      currentOutletId={outletId}
      rawMaterialList={rawMaterialList}
      rawMaterialMovementList={rawMaterialMovementList}
      initialTab={tab}
    />
  );
}
