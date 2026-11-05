import test from 'node:test';
import assert from 'node:assert/strict';

import { herstelTeksten } from '../src/model/tekstherstel.mjs';

const noot = (teksten) => ({
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 5 },
  teksten: teksten.map((lettergreep, couplet) => ({ couplet: couplet + 1, lettergreep, soort: 'single' })),
});

test('een zangtekst die bijna gelijk is aan een aanwijzing in de naastliggende maat verdwijnt, echte zangtekst blijft', () => {
  const oud = {
    partijen: [{ maten: [
      { elementen: [{ soort: 'aanwijzing', start: 0, type: 'tekst', waarde: '* Optional cut to bar 65', zekerheid: 1 }] },
      { elementen: [noot(['optional cut to bar 53!', 'Zing'])] },
    ] }],
  };
  const kopie = structuredClone(oud);

  const nieuw = herstelTeksten(oud);

  assert.deepEqual(oud, kopie);
  assert.deepEqual(nieuw.partijen[0].maten[1].elementen[0].teksten, [
    { couplet: 1, lettergreep: 'Zing', soort: 'single' },
  ]);
});
