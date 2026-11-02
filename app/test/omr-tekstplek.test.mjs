import test from 'node:test';
import assert from 'node:assert/strict';
import { koppelOmr } from '../src/server/omr.mjs';

function partituur(tekst) {
  return {
    partijen: [{
      maten: [{
        nummer: '1',
        sleutels: [{ notenbalk: 1, teken: 'G', lijn: 2 }],
        elementen: [
          { soort: 'aanwijzing', type: 'tekst', waarde: tekst, start: 0 },
          {
            soort: 'noot',
            start: 0,
            notenbalk: 1,
            toonhoogte: { stap: 'B', octaaf: 4 },
            zekerheid: 1,
          },
        ],
      }],
    }],
  };
}

function blad(word = '<word><bounds x="210" y="40" w="70" h="12"/><value>Andante</value></word>') {
  return {
    nummer: 3,
    breedte: 800,
    hoogte: 600,
    xml: `<sheet><page><system>
      <stack left="100" right="500"/>
      <part><staff id="1"/></part>
      <sig><inters>
        <head staff="1" pitch="0" ctx-grade="0.9"><bounds x="220" y="200" w="12" h="10"/></head>
        ${word}
      </inters></sig>
    </system></page></sheet>`,
  };
}

test('koppelOmr koppelt tekst-aanwijzingen aan het woord op het blad', () => {
  const uit = koppelOmr(partituur('Andante'), [blad()]);
  const [aanwijzing, noot] = uit.partituur.partijen[0].maten[0].elementen;
  assert.deepEqual(aanwijzing.plek, { blad: 3, x: 210, y: 40, breedte: 70, hoogte: 12 });
  assert.deepEqual(noot.plek, { blad: 3, x: 220, y: 200, breedte: 12, hoogte: 10 });
});

test('koppelOmr laat de plek weg als er geen overeenkomend woord is', () => {
  const uit = koppelOmr(partituur('Dolce'), [blad()]);
  const [aanwijzing, noot] = uit.partituur.partijen[0].maten[0].elementen;
  assert.equal('plek' in aanwijzing, false);
  assert.deepEqual(noot.plek, { blad: 3, x: 220, y: 200, breedte: 12, hoogte: 10 });
});
