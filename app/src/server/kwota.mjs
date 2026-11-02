import { readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';

export async function gebruikteRuimte(map) {
  let items;

  try {
    items = await readdir(map, { withFileTypes: true });
  } catch (fout) {
    if (fout.code === 'ENOENT') return 0;
    throw fout;
  }

  let gebruikt = 0;

  for (const item of items) {
    const pad = join(map, item.name);

    if (item.isDirectory()) {
      gebruikt += await gebruikteRuimte(pad);
    } else if (item.isFile()) {
      gebruikt += (await stat(pad)).size;
    }
  }

  return gebruikt;
}

export async function magBewaren({ map, nieuweGrootte, max = 500000000 }) {
  const gebruikt = await gebruikteRuimte(map);

  return {
    toegestaan: gebruikt + nieuweGrootte <= max,
    gebruikt,
    max,
  };
}
