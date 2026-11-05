import test from 'node:test';
import assert from 'node:assert/strict';
import { INSTRUMENTEN } from '../src/model/instrumenten.mjs';

const programma = (id) => INSTRUMENTEN.find((instrument) => instrument.id === id)?.midiProgramma;

test('elk instrument heeft een geldig General MIDI-programma', () => {
  for (const instrument of INSTRUMENTEN) {
    assert.ok(instrument.midiProgramma >= 0 && instrument.midiProgramma <= 127, instrument.id);
  }
});

test('de saxofoonfamilie heeft vier eigen programma\'s', () => {
  const saxofoons = ['sopraansaxofoon', 'altsaxofoon', 'tenorsaxofoon', 'baritonsaxofoon'];
  assert.deepEqual(saxofoons.map(programma), [64, 65, 66, 67]);
});

test('basinstrumenten en lage koperinstrumenten hebben passende programma\'s', () => {
  assert.deepEqual(['tuba', 'bes-tuba'].map(programma), [58, 58]);
  assert.deepEqual(['trombone', 'bariton'].map(programma), [57, 57]);
});

test('de brassband-set gebruikt minstens vier verschillende programma\'s', () => {
  const brassband = ['es-kornet', 'bugel', 'trompet', 'althoorn', 'bariton', 'trombone', 'tuba'];
  assert.ok(new Set(brassband.map(programma)).size >= 4);
});
