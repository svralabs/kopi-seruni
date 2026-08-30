import { db } from '@/lib/db';
import { outlets } from '@/lib/schema';
import OutletsClient from './outlets-client';

export default async function OutletsPage() {
  let outletList: any[] = [];

  try {
    outletList = await db.select().from(outlets);
  } catch (e) {
    console.warn('Error fetching outlets:', e);
  }

  return <OutletsClient outletList={outletList} />;
}
