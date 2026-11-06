// Ontdekken: haalt een stuk uit de catalogus (OpenScore Lieder, CC0) op bij GitHub en geeft het door.
// GET /api/ontdek/<id>. Alleen id's uit app/public/ontdekken/lieder.json; alleen de host raw.githubusercontent.com.
import { readFile } from 'node:fs/promises';

const CATALOGUS = new URL('../../public/ontdekken/lieder.json', import.meta.url);
let onthouden = null;

async function catalogus() {
  onthouden ??= JSON.parse(await readFile(CATALOGUS, 'utf8'));
  return onthouden;
}

export function rawUrl(catalogus, werk) {
  const pad = werk.pad.split('/').map(encodeURIComponent).join('/');
  return `https://raw.githubusercontent.com/${catalogus.repo}/${catalogus.tak}/${pad}`;
}

export async function haalOp(id, { fetch: haal = fetch } = {}) {
  const lijst = await catalogus();
  const werk = lijst.werken.find((item) => item.id === id);
  if (!werk) return { status: 404, body: { fout: 'Onbekend stuk.' } };
  const url = rawUrl(lijst, werk);
  if (new URL(url).hostname !== 'raw.githubusercontent.com') return { status: 502, body: { fout: 'Het stuk kon niet worden opgehaald.' } };
  try {
    const antwoord = await haal(url);
    if (!antwoord.ok) return { status: 502, body: { fout: 'Het stuk kon niet worden opgehaald.' } };
    return { status: 200, body: Buffer.from(await antwoord.arrayBuffer()), soort: 'application/octet-stream' };
  } catch {
    return { status: 502, body: { fout: 'Het stuk kon niet worden opgehaald.' } };
  }
}

export default async function ontdek(verzoek) {
  if (verzoek.methode !== 'GET') return { status: 405, body: { fout: 'Alleen GET.' } };
  const id = String(verzoek.rest ?? '').replace(/^\/+/, '');
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return { status: 404, body: { fout: 'Onbekend stuk.' } };
  return haalOp(id);
}
