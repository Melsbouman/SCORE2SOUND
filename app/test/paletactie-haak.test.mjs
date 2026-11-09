import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTEN } from '../src/model/paletten.mjs';
import { voerPaletActieUit } from '../src/model/paletactie.mjs';

const actie = (id) => PALETTEN.flatMap((sectie) => sectie.items).find((kandidaat) => kandidaat.id === id).actie;
const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, zekerheid: 1,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, articulaties: [], overbinding: { begin: false, eind: false },
});
const maat = (index) => ({
  nummer: String(index + 1), index, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 }, elementen: [noot(0), noot(480), noot(960), noot(1440)],
});
const stuk = () => ({
  partijen: [{ id: 'P1', naam: 'Cornet', instrument: { midiProgramma: 56, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten: [maat(0), maat(1)] }],
});
// De haken als 'maat:start:waarde', in volgorde.
const haken = (partituur, type) => partituur.partijen[0].maten.flatMap((m, index) => m.elementen
  .filter((element) => element.soort === 'aanwijzing' && element.type === type).map((element) => `${index}:${element.start}:${element.waarde}`));

test('haak op een noot: van die noot tot de volgende noot', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('dynamiek-crescendo'), { partijId: 'P1', maatIndex: 0, start: 480, opNoot: true });
  assert.deepEqual(haken(nieuw, 'crescendo'), ['0:480:begin', '0:960:eind']);
});

test('haak op de laatste noot van de maat: tot het eind van de maat', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('dynamiek-decrescendo'), { partijId: 'P1', maatIndex: 1, start: 1440, opNoot: true });
  assert.deepEqual(haken(nieuw, 'decrescendo'), ['1:1440:begin', '1:1920:eind']);
});

test('haak op een maat (zonder noot): de hele maat, en over gekozen maten tot het eind van de laatste', () => {
  assert.deepEqual(haken(voerPaletActieUit(stuk(), actie('dynamiek-crescendo'), { partijId: 'P1', maatIndex: 0 }), 'crescendo'), ['0:0:begin', '0:1920:eind']);
  assert.deepEqual(haken(voerPaletActieUit(stuk(), actie('dynamiek-crescendo'), { partijId: 'P1', maatIndex: 0, totIndex: 1, start: 480, opNoot: true }), 'crescendo'), ['0:480:begin', '1:1920:eind']);
});

test('ff en cresc. op een noot komen op de tel van die noot', () => {
  const ff = voerPaletActieUit(stuk(), actie('dynamiek-ff'), { partijId: 'P1', maatIndex: 0, start: 960, opNoot: true });
  assert.ok(ff.partijen[0].maten[0].elementen.some((element) => element.type === 'dynamiek' && element.waarde === 'ff' && element.start === 960));
  const cresc = voerPaletActieUit(stuk(), actie('dynamiek-cresc'), { partijId: 'P1', maatIndex: 0, start: 1440, opNoot: true });
  assert.ok(cresc.partijen[0].maten[0].elementen.some((element) => element.type === 'tekst' && element.start === 1440));
});
