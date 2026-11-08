import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakHerken } from '../src/server/herken.mjs';

const voorbeeld = (naam) => fileURLToPath(new URL(`./voorbeelden/${naam}`, import.meta.url));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const verzoek = (methode, rest = '', body = Buffer.alloc(0), gebruiker = null) => ({
  methode, pad: '/api/herken', rest, query: {}, body, koppen: {}, gebruiker,
});

function nepDraaier() {
  return {
    transcribeer({ uitmap, opRegel }) {
      opRegel('INFO  []   Book 1929 | Book reaching PAGE on sheets:[#1]');
      return {
        klaar: copyFile(voorbeeld('herkenning.omr'), join(uitmap, 'invoer.omr'))
          .then(() => ({ code: 0, log: '' })),
        stop() {},
      };
    },
    exporteer({ uitmap }) {
      return {
        klaar: copyFile(voorbeeld('herkenning.xml'), join(uitmap, 'invoer.xml'))
          .then(() => ({ code: 0, log: '' })),
        stop() {},
      };
    },
  };
}

async function wachtOp(api, id, gebruiker) {
  for (let i = 0; i < 500; i++) {
    const antwoord = await api(verzoek('GET', id, Buffer.alloc(0), gebruiker));
    if (antwoord.body.stand === 'klaar' || antwoord.body.stand === 'fout') return antwoord.body;
    await new Promise((ok) => setTimeout(ok, 10));
  }
  throw new Error('Herkenning niet op tijd klaar');
}

test('een afgeronde herkenning blijft na een serverherstart beschikbaar', async (t) => {
  const map = await mkdtemp(join(tmpdir(), 'herken-bewaard-'));
  t.after(() => rm(map, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  const eigenaar = 'gebruiker-1';
  const api = maakHerken({ map, draaier: nepDraaier() });
  const gestart = await api(verzoek('POST', '', PNG, eigenaar));
  assert.equal(gestart.status, 202);
  const klaar = await wachtOp(api, gestart.body.id, eigenaar);
  assert.equal(klaar.stand, 'klaar');
  assert.ok(klaar.partituur);

  const herstart = maakHerken({ map, draaier: nepDraaier() });
  const bewaard = await herstart(verzoek('GET', gestart.body.id, Buffer.alloc(0), eigenaar));
  assert.equal(bewaard.status, 200);
  assert.equal(bewaard.body.stand, 'klaar');
  assert.equal(bewaard.body.tekst, 'Klaar');
  assert.equal(bewaard.body.procent, 100);
  assert.deepEqual(bewaard.body.partituur, klaar.partituur);

  assert.equal((await herstart(verzoek('GET', gestart.body.id, Buffer.alloc(0), 'andere-gebruiker'))).status, 404);
  const blad = await herstart(verzoek('GET', `${gestart.body.id}/blad/1`, Buffer.alloc(0), eigenaar));
  assert.equal(blad.status, 200);
  assert.equal(blad.soort, 'image/png');
  assert.equal(blad.body[1], 0x50);
});
