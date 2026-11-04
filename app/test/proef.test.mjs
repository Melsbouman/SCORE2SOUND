import test from 'node:test';
import assert from 'node:assert/strict';
import { maakProef } from '../src/server/proef.mjs';

// Een nep-herken die doet alsof hij een taak start en daarna klaar is.
function nepHerken() {
  const aanroepen = [];
  let volgnummer = 0;
  const klaar = new Set();
  const herken = async (verzoek) => {
    aanroepen.push(verzoek);
    if (verzoek.methode === 'POST') { volgnummer += 1; return { status: 202, body: { id: `t${volgnummer}` } }; }
    return { status: 200, body: { stand: klaar.has(verzoek.rest) ? 'klaar' : 'bezig' } };
  };
  return { herken, aanroepen, klaar };
}
const post = (extra = {}) => ({ methode: 'POST', rest: '', query: { naam: 'a.pdf', paginas: '1-9' }, body: Buffer.from('%PDF-1.4'), koppen: {}, adres: '1.2.3.4', ...extra });
const maak = (opties = {}) => {
  const nep = nepHerken();
  return { nep, proef: maakProef({ herken: nep.herken, aan: () => true, ...opties }) };
};

test('zolang SCORE2SOUND_PROEF niet aan staat bestaat de route niet (404)', async () => {
  const nep = nepHerken();
  const proef = maakProef({ herken: nep.herken, aan: () => false });
  assert.equal((await proef(post())).status, 404);
  assert.equal(nep.aanroepen.length, 0);
});

test('een proef herkent altijd alleen pagina 1, ook als de bezoeker iets anders vraagt', async () => {
  const { nep, proef } = maak();
  const antwoord = await proef(post());
  assert.equal(antwoord.status, 202);
  assert.equal(nep.aanroepen[0].query.paginas, '1');
  assert.equal(nep.aanroepen[0].gebruiker, 'proef');
});

test('een te groot bestand geeft 413 en wordt niet doorgegeven', async () => {
  const { nep, proef } = maak({ maxBytes: 10 });
  assert.equal((await proef(post({ body: Buffer.alloc(11) }))).status, 413);
  assert.equal(nep.aanroepen.length, 0);
});

test('na drie proeven van hetzelfde adres geeft de vierde 429, een ander adres mag wel', async () => {
  const { nep, proef } = maak();
  for (const nummer of [1, 2, 3]) {
    const antwoord = await proef(post());
    assert.equal(antwoord.status, 202, `proef ${nummer}`);
    nep.klaar.add(antwoord.body.id);
    await proef({ methode: 'GET', rest: antwoord.body.id, query: {}, koppen: {}, adres: '1.2.3.4' });
  }
  assert.equal((await proef(post())).status, 429);
  assert.equal((await proef(post({ adres: '5.6.7.8' }))).status, 202);
});

test('er draait maar één proef tegelijk: de tweede krijgt 503 tot de eerste klaar is', async () => {
  const { nep, proef } = maak();
  const eerste = await proef(post({ adres: '1.1.1.1' }));
  assert.equal(eerste.status, 202);
  assert.equal((await proef(post({ adres: '2.2.2.2' }))).status, 503);
  nep.klaar.add(eerste.body.id);
  await proef({ methode: 'GET', rest: eerste.body.id, query: {}, koppen: {}, adres: '1.1.1.1' });
  assert.equal((await proef(post({ adres: '2.2.2.2' }))).status, 202);
});

test('alleen taken die de proef zelf startte zijn op te halen, andere id\'s geven 404', async () => {
  const { proef } = maak();
  assert.equal((await proef({ methode: 'GET', rest: 'iets-anders', query: {}, koppen: {} })).status, 404);
});

test('het adres komt uit x-forwarded-for als dat er is', async () => {
  const { nep, proef } = maak();
  for (const nummer of [1, 2, 3]) {
    const antwoord = await proef(post({ adres: '9.9.9.9', koppen: { 'x-forwarded-for': '8.8.8.8, 10.0.0.1' } }));
    nep.klaar.add(antwoord.body.id);
    await proef({ methode: 'GET', rest: antwoord.body.id, query: {}, koppen: {} });
  }
  assert.equal((await proef(post({ adres: '7.7.7.7', koppen: { 'x-forwarded-for': '8.8.8.8' } }))).status, 429);
});
