import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakHerken } from '../src/server/herken.mjs';

const voorbeeld = (naam) => fileURLToPath(new URL(`./voorbeelden/${naam}`, import.meta.url));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const verzoek = (methode, rest = '', body = Buffer.alloc(0)) => ({ methode, pad: '/api/herken', rest, query: {}, body, koppen: {} });

const nepDraaier = ({ fout = false } = {}) => ({
  transcribeer({ uitmap }) {
    const klaar = (async () => {
      if (fout) return { code: 1, log: 'try 300 DPI' };
      await copyFile(voorbeeld('herkenning.omr'), join(uitmap, 'invoer.omr'));
      return { code: 0, log: '' };
    })();
    return { klaar, stop() {} };
  },
  exporteer({ uitmap }) {
    return { klaar: copyFile(voorbeeld('herkenning.xml'), join(uitmap, 'invoer.xml')).then(() => ({ code: 0, log: '' })), stop() {} };
  },
});

async function draai(t, draaier) {
  const map = await mkdtemp(join(tmpdir(), 'score2sound-herken-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  const afhandelaar = maakHerken({ map, draaier });
  const { body: { id } } = await afhandelaar(verzoek('POST', '', PNG));
  let stand;
  for (let i = 0; i < 500; i += 1) {
    stand = (await afhandelaar(verzoek('GET', id))).body;
    // Opruimen gebeurt net na het klaarmelden; wacht ook daarop.
    const inhoud = await readdir(join(map, id)).catch(() => null);
    if (['klaar', 'fout'].includes(stand.stand) && (inhoud === null || inhoud.every((naam) => naam.endsWith('.png')))) return { stand, inhoud };
    await new Promise((ok) => setTimeout(ok, 10));
  }
  assert.fail(`niet opgeruimd: ${stand.stand}`);
}

test('na een geslaagde herkenning blijven alleen de pagina\'s staan', async (t) => {
  const { stand, inhoud } = await draai(t, nepDraaier());
  assert.equal(stand.stand, 'klaar');
  assert.ok(inhoud.length > 0);
  assert.ok(inhoud.every((naam) => /^blad-\d+\.png$/.test(naam)), inhoud.join());
});

test('een mislukte herkenning laat niets achter', async (t) => {
  const { stand, inhoud } = await draai(t, nepDraaier({ fout: true }));
  assert.equal(stand.stand, 'fout');
  assert.equal(inhoud, null);
});
