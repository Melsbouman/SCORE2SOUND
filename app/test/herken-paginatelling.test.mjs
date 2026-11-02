import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { maakHerken } from '../src/server/herken.mjs';

const verzoek = (body, query = {}) => ({ methode: 'POST', pad: '/api/herken', rest: '', query, body, koppen: {} });
const pdf = (paginas) => Buffer.from(`%PDF-1.7\n${Array(paginas).fill('/Type /Page').join('\n')}`);

async function opzet(t) {
  const map = await mkdtemp(join(tmpdir(), 'herken-paginatelling-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  const draaier = {
    transcribeer: () => ({ klaar: new Promise(() => {}), stop() {} }),
  };
  return maakHerken({ map, draaier });
}

test("een PDF met meer dan 60 pagina's vraagt om een paginakeuze", async (t) => {
  const api = await opzet(t);
  const antwoord = await api(verzoek(pdf(61)));
  assert.equal(antwoord.status, 400);
  assert.deepEqual(antwoord.body, { fout: "Deze PDF heeft 61 pagina's. Kies hooguit 60 pagina's, bijvoorbeeld 1-10." });
});

test('een paginakeuze omzeilt de limiet voor een PDF', async (t) => {
  const api = await opzet(t);
  assert.equal((await api(verzoek(pdf(61), { paginas: '1-10' }))).status, 202);
});

test("een PDF met hooguit 60 pagina's wordt geaccepteerd", async (t) => {
  const api = await opzet(t);
  assert.equal((await api(verzoek(pdf(3)))).status, 202);
});
