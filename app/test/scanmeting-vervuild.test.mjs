import test from 'node:test';
import assert from 'node:assert/strict';
import { meetStuk } from '../src/meting/scanmeting.mjs';

const partituur = {
  partijen: [{ id: 'P1', naam: 'Cornet', maten: [{ nummer: '1', index: 0, elementen: [{ soort: 'noot', start: 0, duur: 1920, stem: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 } }] }] }],
};

test('een vervuild stuk wordt na het renderen vervuild en dan herkend', async () => {
  const gedaan = [];
  const stappen = {
    render: async (referentie, id) => { gedaan.push(['render', id]); return `${id}.pdf`; },
    vervuil: async (pdf, id) => { gedaan.push(['vervuil', pdf, id]); return `${id}-vervuild.pdf`; },
    herken: async (pdf) => { gedaan.push(['herken', pdf]); return { partituur, seconden: 3 }; },
    lees: async () => partituur,
  };
  const u = await meetStuk({ id: 'proef', soort: 'synthetisch-vervuild', vervuild: true, referentie: 'ref.musicxml' }, stappen);
  assert.deepEqual(gedaan, [['render', 'proef'], ['vervuil', 'proef.pdf', 'proef'], ['herken', 'proef-vervuild.pdf']]);
  assert.equal(u.nauwkeurigheid, 1);
});

test('een stuk zonder vervuild wordt niet vervuild', async () => {
  let vervuild = false;
  const stappen = {
    render: async () => 'schoon.pdf',
    vervuil: async () => { vervuild = true; return 'x.pdf'; },
    herken: async () => ({ partituur, seconden: 1 }),
    lees: async () => partituur,
  };
  await meetStuk({ id: 'schoon', referentie: 'ref.musicxml' }, stappen);
  assert.equal(vervuild, false);
});
