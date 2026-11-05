import test from 'node:test';
import assert from 'node:assert/strict';
import { koppelOmr } from '../src/server/omr.mjs';

test('een woord boven het tweede systeem hoort bij een maat van dat systeem', () => {
  const partituur = {
    partijen: [{
      maten: [
        { index: 0, elementen: [{ soort: 'aanwijzing', type: 'tekst', waarde: 'Marcato', start: 0 }] },
        { index: 1, elementen: [] },
      ],
    }],
  };
  const systeem = (boven, woord = '') => `<system>
    <stack left="100" right="500"/>
    <part><staff id="1"><lines><line><point x="100" y="${boven}"/></line></lines></staff></part>
    <sig><inters>${woord}</inters></sig>
  </system>`;
  const woord = '<word><bounds x="210" y="250" w="70" h="12"/><value>Marcato</value></word>';
  const blad = {
    nummer: 1,
    breedte: 800,
    hoogte: 600,
    xml: `<sheet><page>${systeem(100, woord)}${systeem(300)}</page></sheet>`,
  };

  const uit = koppelOmr(partituur, [blad]).partituur;

  assert.equal(uit.partijen[0].maten[0].elementen.length, 0);
  assert.deepEqual(uit.partijen[0].maten[1].elementen[0], {
    soort: 'aanwijzing',
    type: 'tekst',
    waarde: 'Marcato',
    start: 0,
    plek: { blad: 1, x: 210, y: 250, breedte: 70, hoogte: 12 },
  });
});
