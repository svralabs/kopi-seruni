import { db } from '@/lib/db';
import { outlets, settings } from '@/lib/schema';
import { getOutlets } from '@/lib/queries';
import SettingsClient from './settings-client';
import { eq } from 'drizzle-orm';

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<{ outletId?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : {};
  const outletId = resolvedParams.outletId || 'out_default';

  let allOutlets: any[] = [];
  let currentOutlet: any = null;
  const settingsMap: Record<string, string> = {};

  try {
    allOutlets = await getOutlets();
    currentOutlet = allOutlets.find((o) => o.id === outletId) || allOutlets[0] || {
      id: 'out_default',
      name: 'Kopi Seruni - Pusat',
    };

    const savedSettings = await db
      .select()
      .from(settings)
      .where(eq(settings.outletId, currentOutlet.id));

    savedSettings.forEach((s) => {
      settingsMap[s.key] = s.value;
    });
  } catch (e) {
    console.warn('Error fetching settings:', e);
  }

  return (
    <SettingsClient
      outlets={allOutlets}
      currentOutlet={currentOutlet}
      currentSettings={settingsMap}
    />
  );
}
