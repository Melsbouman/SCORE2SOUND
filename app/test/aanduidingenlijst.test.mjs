import test from 'node:test';
import assert from 'node:assert/strict';
import { AANDUIDINGENLIJST, leesAanduidingen } from '../src/model/aanduidingenlijst.mjs';
import { herstelTeksten } from '../src/model/tekstherstel.mjs';

const aanwijzing = (waarde, start = 0, type = 'tekst') => ({ soort: 'aanwijzing', start, type, waarde, zekerheid: 1 });
const noot = () => ({
  soort: 'noot', start: 0, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const stuk = (elementen) => ({
  versie: 1, titel: '', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [], tempo: null, herhaling: { begin: false, eind: false, keer: 2 }, elementen }] }],
});
const elementen = (p) => p.partijen[0].maten[0].elementen;

test('de lijst bevat de aanduidingen van Mels met naam, groep en uitleg', () => {
  const namen = AANDUIDINGENLIJST.map((a) => a.naam);
  for (const verwacht of ['Grave', 'Largo', 'Adagio', 'Andante', 'Moderato', 'Allegro', 'Presto', 'Prestissimo', 'Accelerando', 'Ritardando',
    'Rallentando', 'A tempo', 'Rubato', 'Pianissimo', 'Piano', 'Mezzopiano', 'Mezzoforte', 'Forte', 'Fortissimo', 'Crescendo',
    'Decrescendo', 'Diminuendo', 'Sforzando', 'Legato', 'Staccato', 'Marcato', 'Tenuto', 'Agitato', 'Animato', 'Cantabile', 'Dolce',
    'Espressivo', 'Maestoso', 'Vivace', 'Da Capo', 'Dal Segno', 'Fine', 'Coda', 'Fermata', 'Assai', 'Molto', 'Poco a poco', 'Non troppo']) {
    assert.ok(namen.includes(verwacht), `${verwacht} ontbreekt`);
  }
  assert.ok(AANDUIDINGENLIJST.every((a) => a.groep && a.uitleg));
  assert.equal(AANDUIDINGENLIJST.find((a) => a.naam === 'Marcato').uitleg, 'Elke noot extra benadrukken en aanzetten');
});

test('FL. Mare: de sterkte (ff) en de speelwijze (Marcato) zijn twee losse aanduidingen', () => {
  assert.deepEqual(leesAanduidingen('FL. Mare'), [{ type: 'dynamiek', waarde: 'ff' }, { type: 'tekst', waarde: 'Marcato' }]);
});

test('een sterkte voor een woord wordt altijd een eigen aanduiding', () => {
  assert.deepEqual(leesAanduidingen('mf dolce'), [{ type: 'dynamiek', waarde: 'mf' }, { type: 'tekst', waarde: 'Dolce' }]);
  assert.deepEqual(leesAanduidingen('p Cantabile'), [{ type: 'dynamiek', waarde: 'p' }, { type: 'tekst', waarde: 'Cantabile' }]);
});

test('een los woord dat bijna klopt wordt het dichtstbijzijnde woord uit de lijst, nooit een eigen gok', () => {
  assert.deepEqual(leesAanduidingen('Dolee'), [{ type: 'tekst', waarde: 'Dolce' }]);
  assert.deepEqual(leesAanduidingen('rit.'), [{ type: 'tekst', waarde: 'Ritardando' }]);
  assert.deepEqual(leesAanduidingen('Allegro'), [{ type: 'tekst', waarde: 'Allegro' }]);
  assert.deepEqual(leesAanduidingen('cresc.'), [{ type: 'dynamiek', waarde: 'cresc.' }]);
});

test('een lange zin of tekst met een getal is een gewone tekst en blijft onaangeroerd (null)', () => {
  assert.equal(leesAanduidingen('* Optional cut to bar 65'), null);
  assert.equal(leesAanduidingen('Allegro con fuoco (q = 170)'), null);
});

test('herstelTeksten werkt op de echte maten: een tekstaanwijzing wordt een of twee aanduidingen uit de lijst, onzeker (0,5)', () => {
  const oud = stuk([aanwijzing('FL. Mare', 480), noot(), aanwijzing('Dolce', 960), aanwijzing('A', 0, 'letter')]);
  const kopie = structuredClone(oud);
  const nieuw = herstelTeksten(oud);
  assert.deepEqual(oud, kopie);
  assert.deepEqual(elementen(nieuw).filter((e) => e.soort === 'aanwijzing').map((e) => [e.type, e.waarde, e.start, e.zekerheid]), [
    ['dynamiek', 'ff', 480, 0.5], ['tekst', 'Marcato', 480, 0.5], ['tekst', 'Dolce', 960, 1], ['letter', 'A', 0, 1],
  ]);
  assert.equal(elementen(nieuw).filter((e) => e.soort === 'noot').length, 1);
});
