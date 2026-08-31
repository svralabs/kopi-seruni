import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import OutletsClient from './outlets-client';

export default async function OutletsPage() {
  await requireAuthRole(['owner']);
  let outletList: any[] = [];

  try {
    outletList = await getOutlets();
  } catch (e) {
    console.warn('Error fetching outlets:', e);
  }

  return <OutletsClient outletList={outletList} />;
}
