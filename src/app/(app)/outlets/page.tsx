import { getOutlets } from '@/lib/queries';
import OutletsClient from './outlets-client';

export default async function OutletsPage() {
  let outletList: any[] = [];

  try {
    outletList = await getOutlets();
  } catch (e) {
    console.warn('Error fetching outlets:', e);
  }

  return <OutletsClient outletList={outletList} />;
}
