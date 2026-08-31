import { cache } from 'react';
import { db } from './db';
import { outlets } from './schema';

export const getOutlets = cache(async () => {
  return db.select().from(outlets);
});
