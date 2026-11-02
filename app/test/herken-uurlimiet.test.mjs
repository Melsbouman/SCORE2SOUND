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

function nepDraaier() {
  const draaier = {
    transcribeer({ uitmap, opRegel }) {
      const klaar = (async () => {
        opRegel('INFO  []   Book 1929 | Book reaching PAGE on sheets:[#1]');
        opRegel('INFO  [herkenning#1]   StepMonitoring 98   | HEADS');
        await copyFile(voorbeeld('herkenning.omr'), join(uitmap, 'invoer.omr'));
        return { code: 0, log: '', gestopt: false, stil: false };
      })();
      return { klaar, stop() {} };
    },
    exporteer({ uitmap }) {
      return { klaar: copyFile(voorbeeld('herkenning.xml'), join(uitmap, 'invoer.xml')).then(() => ({ code: 0, log: '' })), stop() {} };
    },
  };
  return draaier;
}

async function opzet(t) {
  const map = await mkdtemp(join(tmpdir(), 'herken-uurlimiet-'));
  t.after(() => rm(map, { recursive: true, force: true }));
  const vorigeLimiet = process.env.SCORE2SOUND_HERKENNINGEN_PER_UUR;
  process.env.SCORE2SOUND_HERKENNINGEN_PER_UUR = '2';
  try {
    return maakHerken({ map, draaier: nepDraaier() });
  } finally {
    if (vorigeLimiet === undefined) delete process.env.SCORE2SOUND_HERKENNINGEN_PER_UUR;
    else process.env.SCORE2SOUND_HERKENNINGEN_PER_UUR = vorigeLimiet;
  }
}

async function wachtOp(api, id, gebruiker) {
  for (let i = 0; i < 500; i++) {
    const { body } = await api(verzoek('GET', id, Buffer.alloc(0), {}, gebruiker));
    if (body.stand === 'klaar' || body.stand === 'fout') return body;
    await new Promise((ok) => setTimeout(ok, 10));
  }
  throw new Error('De herkenning is niet klaar geworden');
}

test('een gebruiker kan hooguit twee herkenningen per uur starten bij ingestelde limiet', async (t) => {
  const api = await opzet(t);
  for (let i = 0; i < 2; i++) {
    const start = await api(verzoek('POST', '', PNG, {}, 'gebruiker-a'));
    assert.equal(start.status, 202);
    assert.equal((await wachtOp(api, start.body.id, 'gebruiker-a')).stand, 'klaar');
  }

  const derde = await api(verzoek('POST', '', PNG, {}, 'gebruiker-a'));
  assert.equal(derde.status, 429);
  assert.equal(derde.body.fout, 'Je hebt dit uur al 10 herkenningen gestart. Probeer het later opnieuw.');

  const andereGebruiker = await api(verzoek('POST', '', PNG, {}, 'gebruiker-b'));
  assert.equal(andereGebruiker.status, 202);
  assert.equal((await wachtOp(api, andereGebruiker.body.id, 'gebruiker-b')).stand, 'klaar');

  for (let i = 0; i < 3; i++) {
    const zonderGebruiker = await api(verzoek('POST', '', PNG));
    assert.equal(zonderGebruiker.status, 202);
    assert.equal((await wachtOp(api, zonderGebruiker.body.id, undefined)).stand, 'klaar');
  }
});
