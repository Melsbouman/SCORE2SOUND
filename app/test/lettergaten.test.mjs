import test from 'node:test';
import assert from 'node:assert/strict';
import { vulLetterGaten } from '../src/model/lettergaten.mjs';

const letter = (waarde) => ({
  soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1,
});

const maakStuk = (waarden = []) => ({
  versie: 1,
  titel: '',
  componist: '',
  partijen: [{
    id: 'P1',
    naam: 'Partij 1',
    maten: waarden.map((waarde, index) => ({
      nummer: String(index + 1),
      index,
      elementen: waarde === null ? [] : [letter(waarde)],
    })),
  }],
});

const gevondenLetters = (stuk) => stuk.partijen[0].maten.flatMap((maat) =>
  maat.elementen
    .filter((element) => element.soort === 'aanwijzing' && element.type === 'letter')
    .map((element) => ({ waarde: element.waarde, maat: maat.index, zekerheid: element.zekerheid })),
);

test('vult een ontbrekende letter in een beschikbare tussenmaat in', () => {
  const invoer = maakStuk(['A', null, 'B', null, null, null, 'D']);

  const uitvoer = vulLetterGaten(invoer);

  assert.deepEqual(gevondenLetters(uitvoer), [
    { waarde: 'A', maat: 0, zekerheid: 1 },
    { waarde: 'B', maat: 2, zekerheid: 1 },
    { waarde: 'C', maat: 4, zekerheid: 0.3 },
    { waarde: 'D', maat: 6, zekerheid: 1 },
  ]);
  assert.deepEqual(gevondenLetters(invoer), [
    { waarde: 'A', maat: 0, zekerheid: 1 },
    { waarde: 'B', maat: 2, zekerheid: 1 },
    { waarde: 'D', maat: 6, zekerheid: 1 },
  ]);
});

test('laat een stuk zonder partijen leeg', () => {
  const invoer = { versie: 1, titel: '', componist: '', partijen: [] };

  assert.deepEqual(vulLetterGaten(invoer), invoer);
});

test('laat een partij zonder letters ongemoeid', () => {
  const invoer = maakStuk([null, null]);

  assert.deepEqual(vulLetterGaten(invoer), invoer);
});

test('laat een reeks met een repetitiecijfer ongemoeid', () => {
  const invoer = maakStuk(['A', null, null, '22', null, null, 'D']);

  assert.deepEqual(vulLetterGaten(invoer), invoer);
});
