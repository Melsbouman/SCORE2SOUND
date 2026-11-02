import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakHerken } from '../src/server/herken.mjs';

const voorbeeld = (naam) => fileURLToPath(new URL(`./voorbeelden/${naam}`, import.meta.url));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const verzoek = (methode, rest = '', body = Buffer.alloc(0)) => ({ methode, pad: '/api/herken', rest, query: {}, body, koppen: {} });

function nepDraaier(creditWoorden) {
  return {
    transcribeer({ uitmap, opRegel }) {
      const klaar = (async () => {
        opRegel('INFO  []   Book 1929 | Book reaching PAGE on sheets:[#1]');
        await copyFile(voorbeeld('herkenning.omr'), join(uitmap, 'invoer.omr'));
        return { code: 0, log: '', gestopt: false, stil: false };
      })();
      return { klaar, stop() {} };
    },
    exporteer({ uitmap }) {
      const klaar = (async () => {
        const xml = await readFile(voorbeeld('herkenning.xml'), 'utf8');
        const metCredit = xml.replace(/(<score-partwise[^>]*>)/, `$1\n  <credit page="1"><credit-words>${creditWoorden}</credit-words></credit>`);
        await writeFile(join(uitmap, 'invoer.xml'), metCredit);
        return { code: 0, log: '' };
      })();
      return { klaar, stop() {} };
    },
  };
}

async function herken(t, creditWoorden) {
  const map = await mkdtemp(join(tmpdir(), 'herken-instrument-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  const api = maakHerken({ map, draaier: nepDraaier(creditWoorden) });
  const start = await api(verzoek('POST', '', PNG));
  for (let i = 0; i < 500; i++) {
    const { body } = await api(verzoek('GET', start.body.id));
    if (body.stand === 'klaar' || body.stand === 'fout') return body;
    await new Promise((ok) => setTimeout(ok, 10));
  }
  throw new Error('herkenning niet klaar');
}

test('een instrumentnaam in credit-words geeft de partij een naam en instrument', async (t) => {
  const klaar = await herken(t, 'Flugelhorn 3');
  assert.equal(klaar.stand, 'klaar');
  assert.equal(klaar.partituur.partijen[0].naam, 'Flugelhorn 3');
  assert.equal(klaar.partituur.partijen[0].instrument.midiProgramma, 56);
});

test('OCR-hoofdletters in de instrumentnaam worden als kleine l gelezen', async (t) => {
  const klaar = await herken(t, 'FIugeIhorn 3');
  assert.equal(klaar.stand, 'klaar');
  assert.equal(klaar.partituur.partijen[0].naam, 'Flugelhorn 3');
  assert.equal(klaar.partituur.partijen[0].instrument.midiProgramma, 56);
});

test('een OCR-fout in Flugelhorn wordt herkend als bugel', async (t) => {
  const klaar = await herken(t, 'Flugcl 1');
  assert.equal(klaar.stand, 'klaar');
  assert.equal(klaar.partituur.partijen[0].naam, 'Flugcl 1');
  assert.equal(klaar.partituur.partijen[0].instrument.midiProgramma, 56);
});

test('een OCR-fout aan het einde van Flugelhorn wordt herkend als bugel', async (t) => {
  const klaar = await herken(t, 'Fluget 1');
  assert.equal(klaar.stand, 'klaar');
  assert.equal(klaar.partituur.partijen[0].naam, 'Fluget 1');
  assert.equal(klaar.partituur.partijen[0].instrument.midiProgramma, 56);
});

test('een OCR-fout in Flugelhorn wordt ook in langere woorden herkend', async (t) => {
  const klaar = await herken(t, 'Fiugelhorn 1');
  assert.equal(klaar.stand, 'klaar');
  assert.equal(klaar.partituur.partijen[0].naam, 'Fiugelhorn 1');
  assert.equal(klaar.partituur.partijen[0].instrument.midiProgramma, 56);
});

test('titels en arrangementsregels worden niet als instrument herkend', async (t) => {
  for (const credit of ['Meditation—The Light of the World', 'Arr. Danny Oosterman']) {
    const klaar = await herken(t, credit);
    assert.equal(klaar.stand, 'klaar');
    assert.equal(klaar.partituur.partijen[0].naam, 'Partij 1');
  }
});
