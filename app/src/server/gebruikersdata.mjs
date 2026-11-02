import { rm } from 'node:fs/promises';
import { join } from 'node:path';

export async function wisGebruikersdata({ gebruikerId, mappen }) {
  if (!/^[a-f0-9]{12}$/.test(gebruikerId)) {
    throw new Error('Ongeldige gebruiker.');
  }

  await Promise.all(
    mappen.map((map) => rm(join(map, gebruikerId), { recursive: true, force: true })),
  );

  return mappen.length;
}
