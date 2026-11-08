import test from 'node:test';
import assert from 'node:assert/strict';
import { copyFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakHerken } from '../src/server/herken.mjs';
import { leesZip } from '../src/server/zip.mjs';

const voorbeeld = (naam) => fileURLToPath(new URL(`./voorbeelden/${naam}`, import.meta.url));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const verzoek = (methode, rest = '', body = Buffer.alloc(0)) => ({ methode, pad: '/api/herken', rest, body, koppen: {}, query: {} });

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

async function boekMet(aanpassen) {
  const bestanden = leesZip(await readFile(voorbeeld('herkenning.omr')));
  const boek = aanpassen(bestanden.get('book.xml').toString('utf8'));
  bestanden.set('book.xml', Buffer.from(boek));
  for (const [naam, inhoud] of [...bestanden]) {
    if (!naam.startsWith('sheet#1/')) continue;
    for (const nummer of [2, 3]) {
      const nieuweNaam = naam.replace(/sheet#1/g, `sheet#${nummer}`);
      const kopie = naam.endsWith('.xml')
        ? Buffer.from(inhoud.toString('utf8').replace(/sheet#1/g, `sheet#${nummer}`))
        : inhoud;
      bestanden.set(nieuweNaam, kopie);
    }
  }
  return maakZip(bestanden);
}

function drieBladen(xml) {
  const blad = xml.match(/<sheet number="1"[^>]*>[\s\S]*?<\/sheet>/)?.[0];
  if (!blad) throw new Error('Het voorbeeldboek bevat geen blad 1.');
  const metNummer = (nummer, extra = '') => blad.replace('<sheet number="1"', `<sheet number="${nummer}"${extra}`);
  return xml.replace(blad, [
    metNummer(1),
    metNummer(2),
    metNummer(3, ' invalid="true"'),
  ].join(''));
}

function nepDraaier() {
  const draaier = {
    herstelBladen: [],
    exportBladen: [],
    transcribeer({ uitmap }) {
      const klaar = (async () => {
        await writeFile(join(uitmap, 'invoer.omr'), await boekMet(drieBladen));
        return { code: 0, log: '' };
      })();
      return { klaar, stop() {} };
    },
    herstel({ bladen }) {
      draaier.herstelBladen.push(bladen);
      return { klaar: Promise.resolve(), stop() {} };
    },
    exporteer({ uitmap, bladen }) {
      draaier.exportBladen = bladen;
      return {
        klaar: copyFile(voorbeeld('herkenning.xml'), join(uitmap, 'invoer.xml')).then(() => ({ code: 0, log: '' })),
        stop() {},
      };
    },
  };
  return draaier;
}

async function wachtOp(api, id, ...standen) {
  for (let i = 0; i < 500; i += 1) {
    const { body } = await api(verzoek('GET', id));
    if (standen.includes(body.stand)) return body;
    await new Promise((ok) => setTimeout(ok, 10));
  }
  throw new Error(`stand ${standen} niet bereikt`);
}

test('twee herkende pagina’s en een afgekeurde pagina leveren een melding op', async (t) => {
  const map = await mkdtemp(join(tmpdir(), 'herken-paginas-'));
  t.after(() => rm(map, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  const draaier = nepDraaier();
  const api = maakHerken({ map, draaier });
  const start = await api(verzoek('POST', '', PNG));
  const klaar = await wachtOp(api, start.body.id, 'klaar', 'fout');

  assert.equal(klaar.stand, 'klaar', klaar.fout);
  assert.ok(klaar.meldingen.some((melding) => melding.tekst === 'Pagina 3 is overgeslagen: daar kon de app geen muziek lezen.'));
  assert.deepEqual(draaier.herstelBladen, []);
  assert.deepEqual(draaier.exportBladen, [1, 2]);
  assert.deepEqual(klaar.partituur.bron.bladen.map((blad) => blad.nummer), [1, 2, 3]);
});
