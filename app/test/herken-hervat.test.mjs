import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { hervatArgumenten, vastgelopenBladen } from '../src/server/audiveris.mjs';
import { maakHerken } from '../src/server/herken.mjs';
import { leesZip } from '../src/server/zip.mjs';

const voorbeeld = (naam) => fileURLToPath(new URL(`./voorbeelden/${naam}`, import.meta.url));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const verzoek = (methode, rest = '', body = Buffer.alloc(0), query = {}) => ({ methode, pad: '/api/herken', rest, query, body, koppen: {} });

// Een .omr is een zip; zonder inpakken is er weinig voor nodig.
function maakZip(bestanden) {
  const delen = [];
  const centraal = [];
  let positie = 0;
  for (const [naam, inhoud] of bestanden) {
    const naamDeel = Buffer.from(naam);
    const lokaal = Buffer.alloc(30);
    lokaal.writeUInt32LE(0x04034b50, 0);
    lokaal.writeUInt16LE(naamDeel.length, 26);
    const kop = Buffer.alloc(46);
    kop.writeUInt32LE(0x02014b50, 0);
    kop.writeUInt32LE(inhoud.length, 20);
    kop.writeUInt16LE(naamDeel.length, 28);
    kop.writeUInt32LE(positie, 42);
    delen.push(lokaal, naamDeel, inhoud);
    centraal.push(kop, naamDeel);
    positie += 30 + naamDeel.length + inhoud.length;
  }
  const midden = Buffer.concat(centraal);
  const einde = Buffer.alloc(22);
  einde.writeUInt32LE(0x06054b50, 0);
  einde.writeUInt16LE(bestanden.size, 10);
  einde.writeUInt32LE(positie, 16);
  return Buffer.concat([...delen, midden, einde]);
}

// Het voorbeeldboek, maar dan vastgelopen na GRID, of afgekeurd.
async function boekMet(aanpassen) {
  const bestanden = leesZip(await readFile(voorbeeld('herkenning.omr')));
  bestanden.set('book.xml', Buffer.from(aanpassen(bestanden.get('book.xml').toString('utf8'))));
  return maakZip(bestanden);
}
const vastgelopen = (xml) => xml.replace(/ HEADERS .* PAGE</, '<');
const afgekeurd = (xml) => xml.replace('<sheet number="1"', '<sheet number="1" invalid="true"').replace(/ HEADERS .* PAGE</, '<');

function nepDraaier({ eersteBoek, herstelt = true, houdVast = false }) {
  const draaier = {
    hervat: [],
    gestopt: 0,
    laatLos: () => {},
    transcribeer({ uitmap, opRegel }) {
      const klaar = (async () => {
        opRegel('INFO  []   Book 1929 | Book reaching PAGE on sheets:[#1]');
        await writeFile(join(uitmap, 'invoer.omr'), await boekMet(eersteBoek));
        return { code: 0, log: 'Timeout 240 seconds for step HEADERS' };
      })();
      return { klaar, stop() {} };
    },
    herstel({ omr, uitmap, bladen, opRegel }) {
      draaier.hervat.push({ omr, uitmap, bladen });
      const klaar = (async () => {
        opRegel('INFO  []   Book 1929 | Book reaching PAGE force on sheets:[#1]');
        opRegel('INFO  [invoer#1]   StepMonitoring 98   | HEADS');
        if (houdVast) await new Promise((ok) => { draaier.laatLos = ok; });
        if (herstelt) await copyFile(voorbeeld('herkenning.omr'), omr);
        return { code: 0, log: '' };
      })();
      return { klaar, stop: () => { draaier.gestopt += 1; draaier.laatLos(); } };
    },
    exporteer({ uitmap }) {
      return { klaar: copyFile(voorbeeld('herkenning.xml'), join(uitmap, 'invoer.xml')).then(() => ({ code: 0, log: '' })), stop() {} };
    },
  };
  return draaier;
}

async function opzet(t, draaier) {
  const map = await mkdtemp(join(tmpdir(), 'herken-hervat-'));
  t.after(() => rm(map, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  const api = maakHerken({ map, draaier });
  const { body } = await api(verzoek('POST', '', PNG));
  return { api, id: body.id };
}

async function wachtOp(api, id, ...standen) {
  for (let i = 0; i < 500; i += 1) {
    const { body } = await api(verzoek('GET', id));
    if (standen.includes(body.stand)) return body;
    await new Promise((ok) => setTimeout(ok, 10));
  }
  throw new Error(`stand ${standen} niet bereikt`);
}

test('de herstelronde werkt op het bewaarde boek', () => {
  assert.deepEqual(hervatArgumenten({ omr: 'uit/in.omr', uitmap: 'uit', bladen: [2, 5] }), [
    '-batch', '-transcribe', '-force', '-save', '-sheets', '2', '5',
    '-constant', 'org.audiveris.omr.Main.sheetStepTimeOut=240', '-output', 'uit', '--', 'uit/in.omr',
  ]);
});

test('vastgelopen is begonnen, niet afgekeurd en zonder PAGE', () => {
  assert.deepEqual(vastgelopenBladen(`<book>
    <sheet number="1" invalid="true"><steps>LOAD BINARY</steps></sheet>
    <sheet number="2"><steps>LOAD BINARY SCALE GRID</steps></sheet>
    <sheet number="3"><steps>LOAD BINARY SCALE GRID HEADERS PAGE</steps></sheet>
    <sheet number="4"></sheet>
  </book>`), [2]);
});

test('een vastgelopen pagina krijgt een tweede ronde en doet daarna gewoon mee', async (t) => {
  const draaier = nepDraaier({ eersteBoek: vastgelopen });
  const { api, id } = await opzet(t, draaier);
  const klaar = await wachtOp(api, id, 'klaar', 'fout');
  assert.equal(klaar.stand, 'klaar', klaar.fout);
  assert.equal(draaier.hervat.length, 1);
  assert.deepEqual(draaier.hervat[0].bladen, [1]);
  assert.match(draaier.hervat[0].omr, /invoer\.omr$/);
  assert.deepEqual(klaar.partituur.bron.bladen.map((b) => b.nummer), [1]);
  assert.deepEqual(klaar.meldingen, []);
});

test('tijdens de tweede ronde zegt de stand welke pagina het is', async (t) => {
  const draaier = nepDraaier({ eersteBoek: vastgelopen, houdVast: true });
  const { api, id } = await opzet(t, draaier);
  await wachtOp(api, id, 'bezig');
  for (let i = 0; i < 100 && draaier.hervat.length === 0; i += 1) await new Promise((ok) => setTimeout(ok, 10));
  await new Promise((ok) => setTimeout(ok, 30));
  assert.equal((await api(verzoek('GET', id))).body.tekst, 'Pagina 1 nog een keer: noten zoeken');
  draaier.laatLos();
  assert.equal((await wachtOp(api, id, 'klaar', 'fout')).stand, 'klaar');
});

test('lukt de tweede ronde ook niet, dan blijft de pagina mislukt', async (t) => {
  const draaier = nepDraaier({ eersteBoek: vastgelopen, herstelt: false });
  const { api, id } = await opzet(t, draaier);
  const uit = await wachtOp(api, id, 'klaar', 'fout');
  assert.equal(draaier.hervat.length, 1);
  assert.equal(uit.stand, 'fout');
});

test('een afgekeurde pagina krijgt geen tweede ronde', async (t) => {
  const draaier = nepDraaier({ eersteBoek: afgekeurd });
  const { api, id } = await opzet(t, draaier);
  await wachtOp(api, id, 'klaar', 'fout');
  assert.equal(draaier.hervat.length, 0);
});

test('een goed boek krijgt geen tweede ronde', async (t) => {
  const draaier = nepDraaier({ eersteBoek: (xml) => xml });
  const { api, id } = await opzet(t, draaier);
  assert.equal((await wachtOp(api, id, 'klaar', 'fout')).stand, 'klaar');
  assert.equal(draaier.hervat.length, 0);
});

test('afbreken stopt ook de tweede ronde', async (t) => {
  const draaier = nepDraaier({ eersteBoek: vastgelopen, houdVast: true });
  const { api, id } = await opzet(t, draaier);
  await wachtOp(api, id, 'bezig');
  for (let i = 0; i < 100 && draaier.hervat.length === 0; i += 1) await new Promise((ok) => setTimeout(ok, 10));
  await new Promise((ok) => setTimeout(ok, 30));
  await api(verzoek('DELETE', id));
  assert.equal((await wachtOp(api, id, 'afgebroken')).stand, 'afgebroken');
  assert.equal(draaier.gestopt, 1);
});
