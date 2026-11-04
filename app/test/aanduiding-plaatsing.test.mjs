import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const noot = (start) => ({
  soort: 'noot', start, duur: 480, stem: 1, notenbalk: 1, toonhoogte: { stap: 'C', alter: 0, octaaf: 5 }, akkoord: false,
  overbinding: { begin: false, eind: false }, articulaties: [], legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
});
const aanwijzing = (type, waarde, start = 0) => ({ soort: 'aanwijzing', start, type, waarde, zekerheid: 1 });
const partituur = () => ({
  versie: 1, titel: 'T', componist: '',
  partijen: [{ id: 'P1', naam: 'A', afkorting: '', instrument: { midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 } },
    maten: [{ nummer: '1', index: 0, opmaat: false, maatsoort: { teller: 4, noemer: 4 }, toonsoort: { kwinten: 0, modus: 'majeur' },
      sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }], tempo: null, herhaling: { begin: false, eind: false, keer: 2 },
      elementen: [
        aanwijzing('tekst', 'dolce'), aanwijzing('tekst', 'Andante con espress.'), aanwijzing('tekst', 'rit.'),
        aanwijzing('tekst', 'cresc.'), aanwijzing('tekst', 'dim.'), aanwijzing('dynamiek', 'mf'), aanwijzing('tekst', 'p'),
        noot(0),
      ] }] }],
});
const xml = naarMusicXML(partituur());
const stuk = (zoek) => xml.split('<direction ').find((deel) => deel.includes(zoek));

test('tempo en expressie staan boven de balk', () => {
  for (const tekst of ['dolce', 'Andante con espress.', 'rit.']) {
    assert.match(stuk(tekst), /placement="above"/, tekst);
  }
});

test('cresc. en dim. staan onder de balk', () => {
  for (const tekst of ['cresc.', 'dim.']) {
    assert.match(stuk(tekst), /placement="below"/, tekst);
  }
});

test('dynamiek staat onder de balk', () => {
  assert.match(stuk('<mf'), /placement="below"/);
  assert.match(stuk('<p/>'), /placement="below"/);
});
