import test from 'node:test';
import assert from 'node:assert/strict';
import { transponeerPartij } from '../src/model/transponeren.mjs';

const noot = (start, duur, stap, alter, octaaf) => ({
  soort: 'noot', start, duur, stem: 1, notenbalk: 1, toonhoogte: { stap, alter, octaaf }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: ['staccato'], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const maat = (index, elementen, kwinten = 0) => ({
  nummer: String(index + 1), index, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen,
});
const althoorn = {
  id: 'P1', naam: 'Althoorn', afkorting: '', instrument: { midiProgramma: 60, transpositie: { chromatisch: -9, diatonisch: -5 } },
  maten: [
    maat(0, [noot(0, 960, 'C', 0, 5), noot(960, 960, 'E', 0, 5)]),
    maat(1, [noot(0, 1920, 'G', 0, 5), { soort: 'rust', start: 0, duur: 1920, stem: 2, notenbalk: 1, heleMaat: true, zekerheid: 1 }], 2),
  ],
};
const bugel = { id: 'bugel', naam: 'Bugel', midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 52, hoog: 82 } };
const trombone = { id: 'trombone', naam: 'Trombone', midiProgramma: 57, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 40, hoog: 68 } };
const naam = (n) => `${n.toonhoogte.stap}${n.toonhoogte.alter}${n.toonhoogte.octaaf}`;

test('van althoorn in Es naar bugel in Bes: dezelfde klank, andere notatie', () => {
  const { partij, meldingen } = transponeerPartij(althoorn, bugel);
  assert.equal(partij.id, 'P1-bugel');
  assert.equal(partij.naam, 'Bugel');
  assert.deepEqual(partij.instrument, { midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 } });
  // Genoteerd C5 voor althoorn klinkt als Es4; voor bugel noteer je dat als F4.
  assert.deepEqual(partij.maten[0].elementen.map(naam), ['F04', 'A04']);
  assert.deepEqual(partij.maten[1].elementen.filter((e) => e.soort === 'noot').map(naam), ['C05']);
  // C-groot voor althoorn wordt F-groot voor bugel (een mol erbij); D-groot wordt G-groot.
  assert.deepEqual(partij.maten.map((m) => m.toonsoort.kwinten), [-1, 1]);
  assert.deepEqual(meldingen, []);
});

test('ritme, articulaties en rusten blijven gelijk, en het origineel verandert niet', () => {
  const kopie = structuredClone(althoorn);
  const { partij } = transponeerPartij(althoorn, bugel);
  assert.deepEqual(althoorn, kopie, 'het origineel is niet aangepast');
  const [eerste] = partij.maten[0].elementen;
  assert.deepEqual([eerste.start, eerste.duur, eerste.articulaties], [0, 960, ['staccato']]);
  assert.deepEqual(partij.maten[1].elementen[1], althoorn.maten[1].elementen[1], 'een rust blijft dezelfde rust');
});

test('de sleutel wordt die van het nieuwe instrument', () => {
  const { partij } = transponeerPartij(althoorn, trombone);
  for (const m of partij.maten) assert.deepEqual(m.sleutels, [{ teken: 'F', lijn: 4, notenbalk: 1, octaafVerschuiving: 0 }]);
  // Trombone in C noteert klinkend: Es4, G4 en B4 (D-groot voor althoorn klinkt als F-groot).
  assert.deepEqual(partij.maten[0].elementen.map(naam), ['E-14', 'G04']);
  assert.deepEqual(partij.maten[1].elementen.filter((e) => e.soort === 'noot').map(naam), ['B-14']);
  assert.deepEqual(partij.maten.map((m) => m.toonsoort.kwinten), [-3, -1]);
});

test('noten buiten het bereik van het nieuwe instrument geven een melding', () => {
  // Klinkend Bes4 (70) is hoger dan de 68 van deze trombone.
  const { meldingen } = transponeerPartij(althoorn, trombone);
  assert.deepEqual(meldingen, [
    { soort: 'bereik', ernst: 'waarschuwing', partij: 'P1-trombone', maat: 1, tekst: 'Maat 2: Bes4 is te hoog voor Trombone.' },
  ]);
  const laag = { ...trombone, id: 'laag', naam: 'Contrabas', bereik: { laag: 64, hoog: 90 } };
  assert.deepEqual(transponeerPartij(althoorn, laag).meldingen.map((m) => m.tekst), ['Maat 1: Es4 is te laag voor Contrabas.']);
});
