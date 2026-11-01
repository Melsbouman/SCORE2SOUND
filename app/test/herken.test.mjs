import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakHerken } from '../src/server/herken.mjs';

const voorbeeld = (naam) => fileURLToPath(new URL(`./voorbeelden/${naam}`, import.meta.url));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const PDF = Buffer.from('%PDF-1.7 test');
const verzoek = (methode, rest = '', body = Buffer.alloc(0), query = {}) => ({ methode, pad: '/api/herken', rest, query, body, koppen: {} });

// Een nep-Audiveris: schrijft de uitvoer van het echte voorbeeld in de uitmap.
function nepDraaier({ fout = false, houdVast = false } = {}) {
  const gestopt = [];
  let laatLos = () => {};
  const draaier = {
    argumenten: [],
    transcribeer({ uitmap, paginas, opRegel }) {
      draaier.argumenten.push({ paginas });
      const klaar = (async () => {
        opRegel('INFO  []   Book 1929 | Book reaching PAGE on sheets:[#1]');
        opRegel('INFO  [herkenning#1]   StepMonitoring 98   | HEADS');
        if (houdVast) await new Promise((ok) => { laatLos = ok; });
        if (fout) return { code: 1, log: 'try 300 DPI', gestopt: gestopt.length > 0, stil: false };
        await copyFile(voorbeeld('herkenning.omr'), join(uitmap, 'invoer.omr'));
        return { code: 0, log: '', gestopt: gestopt.length > 0, stil: false };
      })();
      return { klaar, stop: () => { gestopt.push(true); laatLos(); } };
    },
    exporteer({ uitmap, bladen }) {
      draaier.argumenten.push({ bladen });
      return { klaar: copyFile(voorbeeld('herkenning.xml'), join(uitmap, 'invoer.xml')).then(() => ({ code: 0, log: '' })), stop() {} };
    },
  };
  return { draaier, gestopt, laatLos: () => laatLos() };
}

async function opzet(t, opties) {
  const map = await mkdtemp(join(tmpdir(), 'herken-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  const nep = nepDraaier(opties);
  return { ...nep, api: maakHerken({ map, draaier: nep.draaier }), map };
}

async function wachtOp(api, id, ...standen) {
  for (let i = 0; i < 500; i++) {
    const { body } = await api(verzoek('GET', id));
    if (standen.includes(body.stand)) return body;
    await new Promise((ok) => setTimeout(ok, 10));
  }
  throw new Error(`stand ${standen} niet bereikt`);
}

test('een afbeelding herkennen geeft een partituur met zekerheid, plek en bron', async (t) => {
  const { api } = await opzet(t);
  const start = await api(verzoek('POST', '', PNG, { naam: 'Mijn mars.png' }));
  assert.equal(start.status, 202);
  assert.match(start.body.id, /^[a-f0-9]{12}$/);
  const klaar = await wachtOp(api, start.body.id, 'klaar', 'fout');
  assert.equal(klaar.stand, 'klaar');
  const { partituur } = klaar;
  assert.equal(partituur.titel, 'Mijn mars');
  assert.deepEqual(partituur.partijen.map((p) => p.naam), ['Partij 1', 'Partij 2']);
  assert.equal(partituur.bron.herkenning, start.body.id);
  assert.deepEqual(partituur.bron.bladen, [{ nummer: 1, breedte: 2100, hoogte: 900 }]);
  const noot = partituur.partijen[0].maten[0].elementen.find((e) => e.soort === 'noot');
  assert.equal(noot.plek.blad, 1);
  assert.ok(noot.zekerheid < 1);
  assert.deepEqual(klaar.meldingen, []);
});

test('de pagina-afbeelding komt uit de .omr; alleen een geldig nummer', async (t) => {
  const { api } = await opzet(t);
  const { body } = await api(verzoek('POST', '', PNG));
  await wachtOp(api, body.id, 'klaar');
  const blad = await api(verzoek('GET', `${body.id}/blad/1`));
  assert.equal(blad.status, 200);
  assert.equal(blad.soort, 'image/png');
  assert.equal(blad.body[1], 0x50);
  assert.equal((await api(verzoek('GET', `${body.id}/blad/9`))).status, 404);
  assert.equal((await api(verzoek('GET', `${body.id}/blad/..%2f..`))).status, 404);
  assert.equal((await api(verzoek('GET', '../../geheim'))).status, 404);
});

test('tijdens het werk geeft de stand een tekst en een percentage', async (t) => {
  const { api, laatLos } = await opzet(t, { houdVast: true });
  const { body } = await api(verzoek('POST', '', PNG));
  await wachtOp(api, body.id, 'bezig');
  await new Promise((ok) => setTimeout(ok, 30));
  const stand = (await api(verzoek('GET', body.id))).body;
  assert.equal(stand.tekst, 'Pagina 1 van 1: noten zoeken');
  assert.equal(stand.procent, 40);
  laatLos();
  await wachtOp(api, body.id, 'klaar');
});

test('de paginakeuze gaat door en wordt gecontroleerd', async (t) => {
  const { api, draaier } = await opzet(t);
  const { body } = await api(verzoek('POST', '', PDF, { paginas: '1-4 7' }));
  await wachtOp(api, body.id, 'klaar');
  assert.deepEqual(draaier.argumenten, [{ paginas: '1-4 7' }, { bladen: [1] }]);
  assert.equal((await api(verzoek('POST', '', PDF, { paginas: 'a; rm' }))).status, 400);
});

test('een onbekende of lege upload krijgt een nette fout', async (t) => {
  const { api } = await opzet(t);
  assert.equal((await api(verzoek('POST', '', Buffer.alloc(0)))).status, 400);
  const onbekend = await api(verzoek('POST', '', Buffer.from('hallo')));
  assert.equal(onbekend.status, 415);
  assert.match(onbekend.body.fout, /PDF, PNG of JPG/);
});

test('mislukt de herkenning, dan zegt de stand waarom', async (t) => {
  const { api } = await opzet(t, { fout: true });
  const { body } = await api(verzoek('POST', '', PNG));
  const uit = await wachtOp(api, body.id, 'fout', 'klaar');
  assert.equal(uit.stand, 'fout');
  assert.match(uit.fout, /300 dpi/);
});

test('er draait één herkenning tegelijk, en afbreken stopt hem', async (t) => {
  const { api, gestopt } = await opzet(t, { houdVast: true });
  const eerste = (await api(verzoek('POST', '', PNG))).body.id;
  const tweede = (await api(verzoek('POST', '', PNG))).body.id;
  await wachtOp(api, eerste, 'bezig');
  assert.equal((await api(verzoek('GET', tweede))).body.stand, 'wacht');
  assert.equal((await api(verzoek('DELETE', tweede))).status, 200);
  assert.equal((await wachtOp(api, tweede, 'afgebroken')).stand, 'afgebroken');
  await api(verzoek('DELETE', eerste));
  assert.equal((await wachtOp(api, eerste, 'afgebroken')).stand, 'afgebroken');
  assert.equal(gestopt.length, 1);
});

test('een onbekend id geeft 404', async (t) => {
  const { api } = await opzet(t);
  assert.equal((await api(verzoek('GET', 'aaaaaaaaaaaa'))).status, 404);
  assert.equal((await api(verzoek('DELETE', 'aaaaaaaaaaaa'))).status, 404);
});
