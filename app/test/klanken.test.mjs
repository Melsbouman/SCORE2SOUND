import test from 'node:test';
import assert from 'node:assert/strict';
import { KLANKEN, zetKlank } from '../src/model/klanken.mjs';

const partij = (id, midiProgramma) => ({
  id,
  naam: id,
  instrument: { midiProgramma, transpositie: { chromatisch: 0, diatonisch: 0 } },
  maten: [],
});

test('alle klanken hebben een uniek en geldig MIDI-programma', () => {
  const programmas = KLANKEN.map(({ programma }) => programma);
  assert.equal(new Set(programmas).size, programmas.length);
  assert.ok(programmas.every((programma) => Number.isInteger(programma) && programma >= 0 && programma <= 127));
});

test('zetKlank verandert alleen de gekozen partij en laat het origineel ongemoeid', () => {
  const origineel = { versie: 1, titel: 'Test', partijen: [partij('P1', 56), partij('P2', 58)] };
  const nieuw = zetKlank(origineel, 'P2', 66);

  assert.equal(nieuw.partijen[1].instrument.midiProgramma, 66);
  assert.equal(nieuw.partijen[0], origineel.partijen[0]);
  assert.notEqual(nieuw.partijen[1], origineel.partijen[1]);
  assert.notEqual(nieuw.partijen[1].instrument, origineel.partijen[1].instrument);
  assert.equal(origineel.partijen[1].instrument.midiProgramma, 58);
});

test('zetKlank geeft een fout voor een onbekende partij', () => {
  const origineel = { versie: 1, titel: 'Test', partijen: [partij('P1', 56)] };
  assert.throws(() => zetKlank(origineel, 'P9', 66), /Onbekende partij/);
});
