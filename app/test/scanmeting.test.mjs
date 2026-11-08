import test from 'node:test';
import assert from 'node:assert/strict';
import { meetStuk, vatSamen } from '../src/meting/scanmeting.mjs';

// Een kleine partituur in het model: een partij, per maat een lijst [stap, octaaf] van kwartnoten.
function partituur(maten) {
  return {
    partijen: [{
      id: 'P1',
      naam: 'Cornet',
      maten: maten.map((noten, index) => ({
        nummer: String(index + 1),
        index,
        elementen: noten.map(([stap, octaaf], i) => ({ soort: 'noot', start: i * 480, duur: 480, stem: 1, toonhoogte: { stap, alter: 0, octaaf } })),
      })),
    }],
  };
}

const juist = partituur([[['C', 4], ['D', 4]], [['E', 4], ['F', 4]]]);
const herkend = partituur([[['C', 4], ['D', 4]], [['E', 4], ['G', 4]]]);

test('een stuk met referentie wordt gerenderd, herkend en vergeleken', async () => {
  const gedaan = [];
  const stappen = {
    render: async (referentie, id) => { gedaan.push(['render', referentie, id]); return `uit/${id}.pdf`; },
    herken: async (pdf, paginas) => { gedaan.push(['herken', pdf, paginas]); return { partituur: herkend, seconden: 42 }; },
    lees: async (referentie) => { gedaan.push(['lees', referentie]); return juist; },
  };
  const u = await meetStuk({ id: 'proef', soort: 'synthetisch', referentie: 'ref.musicxml' }, stappen);
  assert.deepEqual(gedaan, [['render', 'ref.musicxml', 'proef'], ['herken', 'uit/proef.pdf', ''], ['lees', 'ref.musicxml']]);
  assert.equal(u.noten, 4);
  assert.equal(u.juist, 3);
  assert.equal(u.maten, 2);
  assert.equal(u.matenJuist, 1);
  assert.equal(u.seconden, 42);
  assert.equal(u.verschillen.length, 1);
});

test('een stuk met eigen pdf wordt niet gerenderd', async () => {
  let gerenderd = false;
  const stappen = {
    render: async () => { gerenderd = true; return 'x.pdf'; },
    herken: async (pdf) => ({ partituur: pdf === 'eigen.pdf' ? juist : null, seconden: 1 }),
    lees: async () => juist,
  };
  const u = await meetStuk({ id: 'eigen', pdf: 'eigen.pdf', referentie: 'ref.musicxml', paginas: '1' }, stappen);
  assert.equal(gerenderd, false);
  assert.equal(u.nauwkeurigheid, 1);
});

test('een stuk zonder referentie wordt overgeslagen', async () => {
  const u = await meetStuk({ id: 'galop', soort: 'scan', referentie: null }, {});
  assert.equal(u.overgeslagen, 'geen referentie');
});

test('het overzicht heeft een regel per stuk en een totaal', () => {
  const md = vatSamen([
    { id: 'a', soort: 'synthetisch', seconden: 10, noten: 4, juist: 3, toonhoogteJuist: 4, duurJuist: 3, maten: 2, matenJuist: 1, matenOntbrekend: 0, matenExtra: 1 },
    { id: 'b', soort: 'scan', overgeslagen: 'geen referentie' },
    { id: 'c', soort: 'synthetisch', seconden: 20, noten: 6, juist: 6, toonhoogteJuist: 6, duurJuist: 6, maten: 3, matenJuist: 3, matenOntbrekend: 0, matenExtra: 0 },
  ], '2026-11-08');
  assert.match(md, /^# Scanmeting 2026-11-08/);
  assert.match(md, /\| a \| synthetisch \| 75% \(3 van 4\) \| 100% \| 75% \| 50% \(1 van 2\) \| 0 \| 1 \| 10 s \|/);
  assert.match(md, /\| b \| scan \| overgeslagen: geen referentie/);
  assert.match(md, /\| \*\*Totaal\*\* \| \| 90% \(9 van 10\) \| 100% \| 90% \| 80% \(4 van 5\) \| 0 \| 1 \| 30 s \|/);
});
