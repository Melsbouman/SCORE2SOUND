import test from 'node:test';
import assert from 'node:assert/strict';
import { zetHokjes } from '../src/server/omr.mjs';

const maat = (extra = {}) => ({ elementen: [], herhaling: { begin: false, eind: false, keer: 2 }, ...extra });
const stuk = (maten) => ({ partijen: [{ maten }] });
const kaart = (aantal) => Array.from({ length: aantal }, (_, i) => i);

test('een 1. en daarna een 2. geven twee hokjes en sluiten de herhaling af', () => {
  const p = stuk([maat({ herhaling: { begin: true, eind: false, keer: 2 } }), maat(), maat(), maat(), maat(), maat()]);
  zetHokjes(p, [kaart(6)], [{ nummer: 1, stapel: 2 }, { nummer: 2, stapel: 3 }]);
  const m = p.partijen[0].maten;
  assert.deepEqual(m.map((x) => x.volta ?? null), [null, null, { nummers: [1], begin: true, eind: true }, { nummers: [2], begin: true, eind: true }, null, null]);
  assert.equal(m[2].herhaling.eind, true);
  assert.equal(m[3].herhaling.eind, false);
});

test('een eerste hokje van twee maten loopt tot vlak voor het tweede', () => {
  const p = stuk([maat({ herhaling: { begin: true, eind: false, keer: 2 } }), maat(), maat(), maat(), maat()]);
  zetHokjes(p, [kaart(5)], [{ nummer: 1, stapel: 1 }, { nummer: 2, stapel: 3 }]);
  const m = p.partijen[0].maten;
  assert.deepEqual(m.map((x) => x.volta ?? null), [null, { nummers: [1], begin: true, eind: false }, { nummers: [1], begin: false, eind: true }, { nummers: [2], begin: true, eind: true }, null]);
});

test('een herhalingsstreep die er al is blijft staan en een 2. zonder 1. doet niets', () => {
  const p = stuk([maat({ herhaling: { begin: true, eind: false, keer: 2 } }), maat({ herhaling: { begin: false, eind: true, keer: 2 } }), maat(), maat()]);
  zetHokjes(p, [kaart(4)], [{ nummer: 1, stapel: 1 }, { nummer: 2, stapel: 2 }]);
  assert.equal(p.partijen[0].maten[1].herhaling.eind, true);
  const q = stuk([maat(), maat(), maat()]);
  zetHokjes(q, [kaart(3)], [{ nummer: 2, stapel: 1 }]);
  assert.deepEqual(q.partijen[0].maten.map((x) => x.volta ?? null), [null, null, null]);
});

test('een samengestelde rust (stapelkaart) schuift de hokjes naar de goede maat', () => {
  const p = stuk([maat({ herhaling: { begin: true, eind: false, keer: 2 } }), maat({ maatrust: 3 }), maat({ verborgen: true }), maat({ verborgen: true }), maat(), maat(), maat()]);
  zetHokjes(p, [[0, 1, 4, 5, 6]], [{ nummer: 1, stapel: 2 }, { nummer: 2, stapel: 3 }]);
  assert.deepEqual(p.partijen[0].maten.map((x) => x.volta?.nummers?.[0] ?? null), [null, null, null, null, 1, 2, null]);
});

test('bestaande hokjes (door Audiveris gelezen) worden niet overschreven', () => {
  const eigen = { nummers: [1], begin: true, eind: true };
  const p = stuk([maat({ herhaling: { begin: true, eind: false, keer: 2 } }), maat({ volta: eigen }), maat()]);
  zetHokjes(p, [kaart(3)], [{ nummer: 1, stapel: 1 }, { nummer: 2, stapel: 2 }]);
  assert.equal(p.partijen[0].maten[1].volta, eigen);
});
