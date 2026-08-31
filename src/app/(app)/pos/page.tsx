import { db } from '@/lib/db';
import { products, shifts, outlets, productRecipes, rawMaterials, rawMaterialStock } from '@/lib/schema';
import { getOutlets, getCategories, getActiveDiscounts } from '@/lib/queries';
import { getSession, requireAuthRole } from '@/lib/auth-helpers';
import POSClient from './pos-client';
import { eq, and, isNull } from 'drizzle-orm';

export default async function POSPage({
  searchParams,
}: {
  searchParams: Promise<{ outletId?: string }>;
}) {
  const { session } = await requireAuthRole(['owner', 'manager', 'kasir']);
  const kasirName = session?.user?.name || 'Kasir Seruni';

  const params = await searchParams;
  let allOutlets: any[] = [];
  let currentOutlet: any = null;
  let productList: any[] = [];
  let categoryList: any[] = [];
  let discountList: any[] = [];
  let activeShift: any = null;
  let estimatedStockMap: Record<string, number> = {};

  try {
    const targetOutletId = params?.outletId || 'out_default';

    const [outletsRes, productsRes, categoriesRes, discountsRes, activeShiftsRes, recipesRes] =
      await Promise.all([
        getOutlets(),
        db
          .select()
          .from(products)
          .where(
            and(
              eq(products.outletId, targetOutletId),
              eq(products.isActive, 1),
              isNull(products.deletedAt)
            )
          ),
        getCategories(targetOutletId),
        getActiveDiscounts(targetOutletId),
        db
          .select()
          .from(shifts)
          .where(and(eq(shifts.outletId, targetOutletId), isNull(shifts.closedAt)))
          .limit(1),
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
              eq(rawMaterialStock.outletId, targetOutletId)
            )
          )
          .where(eq(rawMaterials.outletId, targetOutletId)),
      ]);

    allOutlets = outletsRes;
    productList = productsRes;
    categoryList = categoriesRes;
    discountList = discountsRes;
    activeShift = activeShiftsRes[0] || null;

    // Group recipes by productId
    const recipeMap = new Map<string, Array<{ recipe: any; material: any; stock: any }>>();
    for (const r of recipesRes) {
      if (!recipeMap.has(r.recipe.productId)) {
        recipeMap.set(r.recipe.productId, []);
      }
      recipeMap.get(r.recipe.productId)!.push(r);
    }

    for (const p of productsRes) {
      const ings = recipeMap.get(p.id) || [];
      if (ings.length === 0) {
        estimatedStockMap[p.id] = 999;
      } else {
        let minPortions = Infinity;
        for (const ing of ings) {
          const stockQty = ing.stock?.quantityOnHand ?? 0;
          const portions = Math.floor(stockQty / ing.recipe.quantityUsed);
          if (portions < minPortions) {
            minPortions = portions;
          }
        }
        estimatedStockMap[p.id] = minPortions === Infinity ? 0 : minPortions;
      }
    }

    currentOutlet =
      allOutlets.find((o) => o.id === targetOutletId) ||
      allOutlets[0] || {
        id: 'out_default',
        name: 'Kopi Seruni - Pusat',
        address: 'Jl. Dipati Ukur No. 42, Bandung',
        phone: '0812-3456-7890',
      };
  } catch (e) {
    console.warn('DB query in POS failed:', e);
  }

  return (
    <div className="h-full">
      <POSClient
        initialProducts={productList}
        categories={categoryList}
        discounts={discountList}
        allOutlets={allOutlets}
        currentOutlet={currentOutlet}
        shiftId={activeShift?.id}
        kasirName={kasirName}
        estimatedStockMap={estimatedStockMap}
      />
    </div>
  );
}
