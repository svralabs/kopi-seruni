import { getOutlets } from '@/lib/queries';
import { requireAuthRole } from '@/lib/auth-helpers';
import OutletsClient from './outlets-client';

export default async function OutletsPage() {
  const { accessibleOutlets } = await requireAuthRole(['owner']);
  return <OutletsClient outletList={accessibleOutlets} />;
}
