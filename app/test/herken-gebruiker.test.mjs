import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, copyFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { maakHerken } from '../src/server/herken.mjs';

const voorbeeld = (naam) => fileURLToPath(new URL(`./voorbeelden/${naam}`, import.meta.url));
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const verzoek = (methode, rest = '', body = Buffer.alloc(0), query = {}, gebruiker) => ({
  methode, pad: '/api/herken', rest, query, body, koppen: {}, gebruiker,
});

function nepDraaier({ houdVast = false } = {}) {
  let laatLos = () => {};
  const draaier = {
    transcribeer({ uitmap, opRegel }) {
      const vasthouden = houdVast;
      houdVast = false;
      const klaar = (async () => {
        opRegel('INFO  []   Book 1929 | Book reaching PAGE on sheets:[#1]');
        opRegel('INFO  [herkenning#1]   StepMonitoring 98   | HEADS');
        if (vasthouden) await new Promise((ok) => { laatLos = ok; });
        await copyFile(voorbeeld('herkenning.omr'), join(uitmap, 'invoer.omr'));
        return { code: 0, log: '', gestopt: false, stil: false };
      })();
      return { klaar, stop: () => laatLos() };
    },
    exporteer({ uitmap }) {
      return { klaar: copyFile(voorbeeld('herkenning.xml'), join(uitmap, 'invoer.xml')).then(() => ({ code: 0, log: '' })), stop() {} };
    },
  };
  return { draaier, laatLos: () => laatLos() };
}

async function opzet(t, opties) {
  const map = await mkdtemp(join(tmpdir(), 'herken-gebruiker-'));
  t.after(() => rm(map, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 }));
  const nep = nepDraaier(opties);
  return { ...nep, api: maakHerken({ map, draaier: nep.draaier }) };
}

async function wachtOp(api, id, gebruiker, ...standen) {
  for (let i = 0; i < 500; i++) {
    const { body } = await api(verzoek('GET', id, Buffer.alloc(0), {}, gebruiker));
    if (standen.includes(body.stand)) return body;
    await new Promise((ok) => setTimeout(ok, 10));
  }
  throw new Error(`stand ${standen} niet bereikt`);
}

test('alleen de eigenaar ziet de herkenningsstand en de pagina', async (t) => {
  const { api } = await opzet(t);
  const start = await api(verzoek('POST', '', PNG, {}, 'gebruiker-a'));
  const klaar = await wachtOp(api, start.body.id, 'gebruiker-a', 'klaar', 'fout');
  assert.equal(klaar.stand, 'klaar');
  assert.equal((await api(verzoek('GET', start.body.id, Buffer.alloc(0), {}, 'gebruiker-a'))).status, 200);
  assert.equal((await api(verzoek('GET', `${start.body.id}/blad/1`, Buffer.alloc(0), {}, 'gebruiker-a'))).status, 200);

  for (const response of [
    await api(verzoek('GET', start.body.id, Buffer.alloc(0), {}, 'gebruiker-b')),
    await api(verzoek('GET', `${start.body.id}/blad/1`, Buffer.alloc(0), {}, 'gebruiker-b')),
    await api(verzoek('DELETE', start.body.id, Buffer.alloc(0), {}, 'gebruiker-b')),
  ]) {
    assert.equal(response.status, 404);
    assert.equal(response.body.fout, 'Onbekende herkenning.');
  }
});

test('een gebruiker heeft hooguit één herkenning in de rij of bezig', async (t) => {
  const { api, laatLos } = await opzet(t, { houdVast: true });
  const eerste = await api(verzoek('POST', '', PNG, {}, 'gebruiker-a'));
  await wachtOp(api, eerste.body.id, 'gebruiker-a', 'bezig');
  const tweede = await api(verzoek('POST', '', PNG, {}, 'gebruiker-a'));
  assert.equal(tweede.status, 429);
  assert.equal(tweede.body.fout, 'Er loopt al een herkenning van jou. Wacht tot die klaar is.');

  const andere = await api(verzoek('POST', '', PNG, {}, 'gebruiker-b'));
  assert.equal(andere.status, 202);
  await api(verzoek('DELETE', eerste.body.id, Buffer.alloc(0), {}, 'gebruiker-a'));
  await wachtOp(api, andere.body.id, 'gebruiker-b', 'klaar', 'fout');
});

test('een paginakeuze van meer dan 40 pagina\'s wordt geweigerd', async (t) => {
  const { api } = await opzet(t);
  const antwoord = await api(verzoek('POST', '', PNG, { paginas: '1-41' }, 'gebruiker-a'));
  assert.equal(antwoord.status, 400);
  assert.equal(antwoord.body.fout, 'Kies hooguit 40 pagina\'s per keer.');
});

test('zonder gebruiker werkt herkenning zoals voorheen', async (t) => {
  const { api } = await opzet(t);
  const start = await api(verzoek('POST', '', PNG));
  const klaar = await wachtOp(api, start.body.id, undefined, 'klaar', 'fout');
  assert.equal(klaar.stand, 'klaar');
  assert.equal((await api(verzoek('GET', `${start.body.id}/blad/1`))).status, 200);
});
