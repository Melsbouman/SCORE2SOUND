import test from 'node:test';
import assert from 'node:assert/strict';
import { herstelTriolen } from '../src/model/triolenherstel.mjs';

// Een maat met per element [soort, start, duur, extra].
function stuk(elementen, maatsoort = { teller: 4, noemer: 4 }) {
  return {
    partijen: [{
      id: 'P1',
      maten: [{
        nummer: '14', index: 0, maatsoort,
        elementen: elementen.map(([soort, start, duur, extra = {}]) => ({ soort, start, duur, stem: 1, notenbalk: 1, zekerheid: 0.9, ...extra })),
      }],
    }],
  };
}
const vorm = (uit) => uit.partituur.partijen[0].maten[0].elementen.map((e) => `${e.soort[0]}${e.start}/${e.duur}${e.tuplet ? 't' : ''}`).join(' ');
const tuplet = (begin, eind) => ({ tuplet: { aantal: 3, normaal: 2, begin, eind } });

test('drie achtsten onder één balk zonder 3 maken de maat te lang: het wordt een triool (Devils Galop maat 14)', () => {
  const uit = herstelTriolen(stuk([
    ['rust', 0, 480], ['noot', 480, 240, { balk: 'begin' }], ['noot', 720, 240, { balk: 'midden' }], ['noot', 960, 240, { balk: 'eind' }], ['noot', 1200, 960],
  ]));
  assert.equal(vorm(uit), 'r0/480 n480/160t n640/160t n800/160t n960/960');
  assert.equal(uit.partituur.partijen[0].maten[0].elementen[1].zekerheid, 0.75);
  assert.match(uit.meldingen[0].tekst, /^Maat 14: de maat was te lang; drie noten zijn nu een triool van achtsten/);
});

test('drie triool-kwarten waar een tel hoort worden triool-achtsten (Devils Galop maat 78)', () => {
  const uit = herstelTriolen(stuk([
    ['rust', 0, 480], ['noot', 480, 320, tuplet(true, false)], ['noot', 800, 320, tuplet(false, false)], ['noot', 1120, 320, tuplet(false, true)], ['noot', 1440, 960],
  ]));
  assert.equal(vorm(uit), 'r0/480 n480/160t n640/160t n800/160t n960/960');
});

test('een maat die past, een 6/8-maat of een reeks die niet op de tel begint blijft zoals hij is', () => {
  const past = stuk([['rust', 0, 480], ['noot', 480, 160, tuplet(true, false)], ['noot', 640, 160, tuplet(false, false)], ['noot', 800, 160, tuplet(false, true)], ['noot', 960, 960]]);
  assert.equal(herstelTriolen(past).meldingen.length, 0);
  const zesAcht = stuk([
    ['rust', 0, 360], ['noot', 360, 120], ['noot', 480, 240, { balk: 'begin' }], ['noot', 720, 240, { balk: 'midden' }], ['noot', 960, 240, { balk: 'eind' }], ['noot', 1200, 480],
  ], { teller: 6, noemer: 8 });
  assert.equal(herstelTriolen(zesAcht).meldingen.length, 0);
  const naastDeTel = stuk([
    ['rust', 0, 240], ['noot', 240, 240, { balk: 'begin' }], ['noot', 480, 240, { balk: 'midden' }], ['noot', 720, 240, { balk: 'eind' }], ['noot', 960, 1200],
  ]);
  assert.equal(herstelTriolen(naastDeTel).meldingen.length, 0);
});
