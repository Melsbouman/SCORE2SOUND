import test from 'node:test';
import assert from 'node:assert/strict';
import { PALETTEN } from '../src/model/paletten.mjs';
import { doelVan, voerPaletActieUit } from '../src/model/paletactie.mjs';

const item = (id) => PALETTEN.flatMap((sectie) => sectie.items).find((kandidaat) => kandidaat.id === id);
const actie = (id) => item(id).actie;
const noot = (start, extra = {}) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, zekerheid: 1,
  toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, articulaties: [], overbinding: { begin: false, eind: false }, ...extra,
});
const maat = (index, extra = {}) => ({
  nummer: String(index + 1), index, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null,
  herhaling: { begin: false, eind: false, keer: 2 },
  elementen: [noot(0), noot(480), noot(960), noot(1440)], ...extra,
});
const rustmaat = (index) => maat(index, { elementen: [{ soort: 'rust', start: 0, duur: 1920, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1 }] });
const stuk = () => ({
  partijen: [
    { id: 'P1', naam: 'Cornet', instrument: { midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 } }, maten: [maat(0), maat(1), rustmaat(2), maat(3)] },
    { id: 'P2', naam: 'Trombone', instrument: { midiProgramma: 57, transpositie: { chromatisch: 0, diatonisch: 0 } }, maten: [maat(0), maat(1), rustmaat(2), maat(3)] },
  ],
});

test('elk hokje heeft een icoon (teken, woord of een getekende notenbalk/lijn) en een unieke id', () => {
  const getekend = ['sleutel', 'toonsoort', 'maatsoort', 'haak', 'volta', 'overbinding'];
  const alle = PALETTEN.flatMap((sectie) => sectie.items);
  for (const hokje of alle) {
    assert.ok(hokje.teken || hokje.woord || getekend.includes(hokje.actie.soort), `${hokje.id} heeft geen icoon`);
  }
  assert.equal(new Set(alle.map((hokje) => hokje.id)).size, alle.length);
});

test('articulaties en voortekens horen op een noot, de rest op een maat', () => {
  assert.equal(doelVan(actie('articulatie-staccato')), 'noot');
  assert.equal(doelVan(actie('voorteken-kruis')), 'noot');
  assert.equal(doelVan(actie('dynamiek-mf')), 'maat');
  assert.equal(doelVan(actie('maatsoort-3-4')), 'maat');
});

test('dynamiek komt op de partij en de tel waar het hokje viel; het origineel blijft gelijk', () => {
  const origineel = stuk();
  const nieuw = voerPaletActieUit(origineel, actie('dynamiek-mf'), { partijId: 'P2', maatIndex: 1, start: 480 });
  const aanwijzing = nieuw.partijen[1].maten[1].elementen.find((element) => element.soort === 'aanwijzing');
  assert.deepEqual([aanwijzing.type, aanwijzing.waarde, aanwijzing.start], ['dynamiek', 'mf', 480]);
  assert.equal(nieuw.partijen[0].maten[1].elementen.some((element) => element.soort === 'aanwijzing'), false);
  assert.equal(origineel.partijen[1].maten[1].elementen.length, 4);
});

test('een maatsoort geldt tot de volgende wissel; noten blijven staan, een rust over de hele maat past zich aan', () => {
  const origineel = stuk();
  origineel.partijen.forEach((partij) => { partij.maten[3].maatsoort = { teller: 2, noemer: 4 }; });
  const nieuw = voerPaletActieUit(origineel, actie('maatsoort-3-4'), { partijId: 'P1', maatIndex: 1 });
  for (const partij of nieuw.partijen) {
    assert.deepEqual(partij.maten.map((m) => `${m.maatsoort.teller}/${m.maatsoort.noemer}`), ['4/4', '3/4', '3/4', '2/4']);
    assert.equal(partij.maten[1].elementen.length, 4);
    assert.equal(partij.maten[2].elementen[0].duur, 1440);
  }
});

test('alla breve bewaart het teken', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('maatsoort-cut'), { partijId: 'P1', maatIndex: 0 });
  assert.deepEqual(nieuw.partijen[0].maten[0].maatsoort, { teller: 2, noemer: 2, symbool: 'cut' });
});

test('een toonsoort op de cornet (B♭) geeft de trombone (in C) dezelfde klinkende toonsoort', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('toonsoort-1-kruisen'), { partijId: 'P1', maatIndex: 2 });
  assert.deepEqual(nieuw.partijen[0].maten.map((m) => m.toonsoort.kwinten), [0, 0, 1, 1]);
  assert.deepEqual(nieuw.partijen[1].maten.map((m) => m.toonsoort.kwinten), [0, 0, -1, -1]);
});

test('een sleutel geldt alleen voor de partij waarop hij viel, tot de volgende sleutelwissel', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('sleutel-bas'), { partijId: 'P2', maatIndex: 1 });
  assert.deepEqual(nieuw.partijen[1].maten.map((m) => m.sleutels[0].teken), ['G', 'F', 'F', 'F']);
  assert.deepEqual(nieuw.partijen[0].maten.map((m) => m.sleutels[0].teken), ['G', 'G', 'G', 'G']);
});

test('staccato op een noot gaat aan en bij nog een keer weer uit', () => {
  const plek = { partijId: 'P1', maatIndex: 0, elementId: 'n-P1-0-1' };
  const aan = voerPaletActieUit(stuk(), actie('articulatie-staccato'), plek);
  assert.deepEqual(aan.partijen[0].maten[0].elementen[1].articulaties, ['staccato']);
  assert.deepEqual(aan.partijen[0].maten[0].elementen[0].articulaties, []);
  const uit = voerPaletActieUit(aan, actie('articulatie-staccato'), plek);
  assert.deepEqual(uit.partijen[0].maten[0].elementen[1].articulaties, []);
});

test('een accent op een gekozen maat komt op alle noten van die maat, in alle partijen', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('articulatie-accent'), { partijId: null, maatIndex: 1, totIndex: 1 });
  for (const partij of nieuw.partijen) {
    assert.ok(partij.maten[1].elementen.every((element) => element.articulaties.includes('accent')));
    assert.ok(partij.maten[0].elementen.every((element) => element.articulaties.length === 0));
  }
});

test('een kruis op een noot zet de verhoging', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('voorteken-kruis'), { partijId: 'P1', maatIndex: 3, elementId: 'n-P1-3-2' });
  assert.equal(nieuw.partijen[0].maten[3].elementen[2].toonhoogte.alter, 1);
});

test('repetitieletters lopen door: na A komt B; op een maat met een letter gaat hij weer weg', () => {
  const metA = voerPaletActieUit(stuk(), actie('tekst-letter'), { partijId: 'P1', maatIndex: 0 });
  const metB = voerPaletActieUit(metA, actie('tekst-letter'), { partijId: 'P1', maatIndex: 2 });
  const letters = (partituur, partij) => partituur.partijen[partij].maten
    .map((m) => m.elementen.find((element) => element.type === 'letter')?.waarde ?? '-').join('');
  assert.equal(letters(metB, 0), 'A-B-');
  assert.equal(letters(metB, 1), 'A-B-');
  assert.equal(metB.partijen[0].maten[2].elementen[0].kader, true);
  const weg = voerPaletActieUit(metB, actie('tekst-letter'), { partijId: 'P1', maatIndex: 2 });
  assert.equal(letters(weg, 0), 'A---');
});

test('hokje 1 over twee gekozen maten: begin op de eerste, eind op de laatste', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('volta-1'), { partijId: null, maatIndex: 1, totIndex: 2 });
  assert.deepEqual(nieuw.partijen[0].maten[1].volta, { nummers: [1], begin: true, eind: false });
  assert.deepEqual(nieuw.partijen[0].maten[2].volta, { nummers: [1], begin: false, eind: true });
  assert.equal(nieuw.partijen[0].maten[0].volta, undefined);
});

test('herhaling, sprong en maatstreep gaan aan en weer uit', () => {
  const plek = { partijId: 'P1', maatIndex: 3 };
  const met = voerPaletActieUit(voerPaletActieUit(voerPaletActieUit(stuk(), actie('herhaling-eind'), plek),
    actie('sprong-dc'), plek), actie('maatstreep-dubbel'), plek);
  const laatste = met.partijen[1].maten[3];
  assert.equal(laatste.herhaling.eind, true);
  assert.deepEqual(laatste.sprong, { daCapo: true });
  assert.equal(laatste.maatstreep, 'dubbel');
  const zonder = voerPaletActieUit(voerPaletActieUit(voerPaletActieUit(met, actie('herhaling-eind'), plek),
    actie('sprong-dc'), plek), actie('maatstreep-enkel'), plek);
  const weer = zonder.partijen[1].maten[3];
  assert.equal(weer.herhaling.eind, false);
  assert.equal('sprong' in weer, false);
  assert.equal('maatstreep' in weer, false);
});

test('een tempoterm zet het tempo en het woord in alle partijen', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('tempo-allegro'), { partijId: 'P1', maatIndex: 0 });
  for (const partij of nieuw.partijen) {
    assert.equal(partij.maten[0].tempo, 120);
    assert.ok(partij.maten[0].elementen.some((element) => element.type === 'tekst' && element.waarde === 'Allegro'));
  }
});

test('een crescendo-haak loopt over de gekozen maten', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('dynamiek-crescendo'), { partijId: 'P1', maatIndex: 0, totIndex: 1 });
  const haken = nieuw.partijen[0].maten.flatMap((m, index) => m.elementen
    .filter((element) => element.type === 'crescendo').map((element) => `${index}:${element.waarde}`));
  assert.deepEqual(haken, ['0:begin', '1:eind']);
});

test('een hokje op een onbekende maat verandert niets', () => {
  const origineel = stuk();
  assert.equal(voerPaletActieUit(origineel, actie('dynamiek-p'), { partijId: 'P1', maatIndex: 9 }), origineel);
});

test('een hokje half over een bestaand hokje haalt het oude hokje helemaal weg (geen open hokje)', () => {
  const met = voerPaletActieUit(stuk(), actie('volta-1'), { partijId: null, maatIndex: 1, totIndex: 2 });
  const nieuw = voerPaletActieUit(met, actie('volta-1'), { partijId: null, maatIndex: 2, totIndex: 2 });
  assert.equal(nieuw.partijen[0].maten[1].volta, undefined);
  assert.deepEqual(nieuw.partijen[0].maten[2].volta, { nummers: [1], begin: true, eind: true });
  const anderNummer = voerPaletActieUit(met, actie('volta-2'), { partijId: null, maatIndex: 2, totIndex: 2 });
  assert.equal(anderNummer.partijen[0].maten[1].volta, undefined);
  assert.deepEqual(anderNummer.partijen[0].maten[2].volta, { nummers: [2], begin: true, eind: true });
});

test('een hokje naast een ander hokje laat dat andere staan', () => {
  const een = voerPaletActieUit(stuk(), actie('volta-1'), { partijId: null, maatIndex: 1, totIndex: 2 });
  const twee = voerPaletActieUit(een, actie('volta-2'), { partijId: null, maatIndex: 3, totIndex: 3 });
  assert.deepEqual(twee.partijen[0].maten.map((m) => m.volta?.nummers?.[0] ?? '-').join(''), '-112');
});

test('een articulatie op meerdere gekozen noten komt op al die noten', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('articulatie-tenuto'), { partijId: 'P1', maatIndex: 0, elementIds: ['n-P1-0-0', 'n-P1-0-2'] });
  assert.deepEqual(nieuw.partijen[0].maten[0].elementen.map((element) => element.articulaties.length), [1, 0, 1, 0]);
});

test('metronoomhokjes tonen de juiste noot; een kwartnoothokje haalt een oude getoonde noot weg', () => {
  const halve = voerPaletActieUit(stuk(), actie('tempo-halve noot-80'), { partijId: 'P1', maatIndex: 0 });
  const tempo = halve.partijen[0].maten[0].elementen.find((element) => element.type === 'tempo');
  assert.equal(tempo.waarde, 160);
  assert.deepEqual(tempo.getoond, { eenheid: 'half', punt: false, getal: 80 });
  const kwart = voerPaletActieUit(halve, actie('tempo-♩-80'), { partijId: 'P1', maatIndex: 0 });
  const nieuw = kwart.partijen[0].maten[0].elementen.find((element) => element.type === 'tempo');
  assert.equal(nieuw.waarde, 80);
  assert.equal('getoond' in nieuw, false);
  const gepunt = voerPaletActieUit(stuk(), actie('tempo-♩punt-60'), { partijId: 'P1', maatIndex: 0 });
  assert.deepEqual(gepunt.partijen[0].maten[0].elementen.find((element) => element.type === 'tempo').getoond, { eenheid: 'quarter', punt: true, getal: 60 });
});

test('een sleutel loopt door maten zonder sleutels heen (verborgen maten) en geldt voor de notenbalk waarop hij viel', () => {
  const origineel = stuk();
  origineel.partijen[1].maten[2].sleutels = [];
  const nieuw = voerPaletActieUit(origineel, actie('sleutel-bas'), { partijId: 'P2', maatIndex: 0 });
  assert.deepEqual(nieuw.partijen[1].maten.map((m) => m.sleutels[0]?.teken ?? '-').join(''), 'FF-F');
  const tweeBalken = stuk();
  tweeBalken.partijen[0].maten.forEach((m) => { m.sleutels = [m.sleutels[0], { teken: 'G', lijn: 2, notenbalk: 2, octaafVerschuiving: 0 }]; });
  const balk2 = voerPaletActieUit(tweeBalken, actie('sleutel-bas'), { partijId: 'P1', maatIndex: 0, notenbalk: 2 });
  assert.deepEqual(balk2.partijen[0].maten[0].sleutels.map((sleutel) => `${sleutel.notenbalk}${sleutel.teken}`), ['1G', '2F']);
});

test('een fermate mag op een rust', () => {
  const nieuw = voerPaletActieUit(stuk(), actie('articulatie-fermate'), { partijId: 'P1', maatIndex: 2, elementId: 'n-P1-2-0' });
  assert.equal(nieuw.partijen[0].maten[2].elementen[0].fermate, true);
});
