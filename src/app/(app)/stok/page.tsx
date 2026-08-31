import { db } from '@/lib/db';
import { products, rawMaterials, rawMaterialStock, rawMaterialMovements, productRecipes } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import StockClient from './stock-client';
import { eq, and, isNull, desc } from 'drizzle-orm';

export default async function StockPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string; tab?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const { effectiveOutletId, accessibleOutlets } = await requireAuthRole(
    ['owner', 'manager'],
    resolvedParams.outletId
  );
  const outletId = effectiveOutletId;
  const tab = resolvedParams.tab || 'bahan-baku';

  let allOutlets: any[] = accessibleOutlets;
  let productEstimations: any[] = [];
  let rawMaterialList: any[] = [];
  let rawMaterialMovementList: any[] = [];

  try {
    const [
      rawMaterialRes,
      rawMaterialMovementRes,
      productsRes,
      recipesRes,
    ] = await Promise.all([
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
      db
        .select()
        .from(products)
        .where(and(isNull(products.deletedAt), eq(products.outletId, outletId)))
        .orderBy(products.name),
      db
        .select({
          recipe: productRecipes,
          material: rawMaterials,
          stock: rawMaterialStock,
        })
        .from(productRecipes)
        .innerJoin(rawMaterials, eq(rawMaterials.id, productRecipes.rawMaterialId))
        .leftJoin(
          rawMaterialStock,
          and(
            eq(rawMaterialStock.rawMaterialId, rawMaterials.id),
            eq(rawMaterialStock.outletId, outletId),
          ),
        )
        .where(eq(rawMaterials.outletId, outletId)),
    ]);

    rawMaterialList = rawMaterialRes;
    rawMaterialMovementList = rawMaterialMovementRes;

    // Group recipes by productId
    const recipeMap = new Map<string, Array<{ recipe: any; material: any; stock: any }>>();
    for (const r of recipesRes) {
      if (!recipeMap.has(r.recipe.productId)) {
        recipeMap.set(r.recipe.productId, []);
      }
      recipeMap.get(r.recipe.productId)!.push(r);
    }

    productEstimations = productsRes.map((p) => {
      const ings = recipeMap.get(p.id) || [];
      if (ings.length === 0) {
        return {
          product: p,
          estimatedPortions: null,
          bottleneck: 'Belum ada resep',
          ingredients: [],
        };
      }

      let minPortions = Infinity;
      let bottleneck = '';
      for (const ing of ings) {
        const stockQty = ing.stock?.quantityOnHand ?? 0;
        const portions = Math.floor(stockQty / ing.recipe.quantityUsed);
        if (portions < minPortions) {
          minPortions = portions;
          bottleneck = `${ing.material.name} (sisa ${stockQty.toLocaleString('id-ID')} ${ing.material.unit})`;
        }
      }

      return {
        product: p,
        estimatedPortions: minPortions === Infinity ? 0 : minPortions,
        bottleneck,
        ingredients: ings.map((i) => ({
          name: i.material.name,
          quantityUsed: i.recipe.quantityUsed,
          unit: i.material.unit,
        })),
      };
    });
  } catch (e) {
    console.warn('Error fetching stock data:', e);
  }

  return (
    <StockClient
      rawMaterialList={rawMaterialList}
      rawMaterialMovementList={rawMaterialMovementList}
      productEstimations={productEstimations}
      outlets={allOutlets}
      currentOutletId={outletId}
      initialTab={tab}
    />
  );
}
