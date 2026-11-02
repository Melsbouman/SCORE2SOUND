import test from 'node:test';
import assert from 'node:assert/strict';
import { hernoemPartij } from '../src/model/partijen.mjs';

const partij = (id, naam) => ({ id, naam, afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten: [] });
const voorbeeld = () => ({ versie: 1, titel: '', componist: '', partijen: [partij('P1', 'Hnm2 Eb'), partij('P2', 'Bas')] });

test('hernoemPartij verandert alleen de naam van die partij en laat het origineel staan', () => {
  const oud = voorbeeld();
  const nieuw = hernoemPartij(oud, 'P1', '  Althoorn 2 ');
  assert.equal(nieuw.partijen[0].naam, 'Althoorn 2');
  assert.equal(nieuw.partijen[1].naam, 'Bas');
  assert.equal(oud.partijen[0].naam, 'Hnm2 Eb');
});

test('hernoemPartij neemt de stemming over als de naam een bekend instrument is', () => {
  const nieuw = hernoemPartij(voorbeeld(), 'P1', 'Althoorn 2');
  assert.deepEqual(nieuw.partijen[0].instrument.transpositie, { chromatisch: -9, diatonisch: -5 });
  assert.equal(nieuw.partijen[0].instrument.midiProgramma, 60);
});

test('hernoemPartij houdt de stemming als de naam niets zegt', () => {
  const nieuw = hernoemPartij(voorbeeld(), 'P2', 'Partij twee');
  assert.deepEqual(nieuw.partijen[1].instrument.transpositie, { chromatisch: 0, diatonisch: 0 });
});

test('een lege naam of onbekende partij geeft een fout', () => {
  assert.throws(() => hernoemPartij(voorbeeld(), 'P1', '   '), /Geef de partij een naam/);
  assert.throws(() => hernoemPartij(voorbeeld(), 'P9', 'A'), /Onbekende partij/);
});
