import test from 'node:test';
import assert from 'node:assert/strict';
import { instrumentBijNaam } from '../src/model/instrumenten.mjs';

const midiProgramma = (naam) => instrumentBijNaam(naam)?.midiProgramma ?? null;
const id = (naam) => instrumentBijNaam(naam)?.id ?? null;

test('instrumentBijNaam herkent gangbare Nederlandse en Engelse partijnamen', () => {
  const gevallen = {
    'flugelhorn': 56, flugel: 56, 'flügelhorn': 56, bugel: 56,
    'solo cornet': 56, 'repiano cornet': 56, 'soprano cornet': 56, 'Eb soprano': 56, kornet: 56,
    'tenor horn': 60, althoorn: 60, 'solo horn': 60, '1st horn': 60,
    baritone: 57, bariton: 57, baritonhoorn: 57, euphonium: 57,
    'Bb bass': 58, 'Eb bass': 58, tuba: 58,
    trombone: 57, 'bass trombone': 57,
    percussion: 47, slagwerk: 47,
    'sax alto': 65, 'alt saxofoon': 65, 'tenor sax': 66, 'bariton sax': 67, 'sopraan sax': 64,
    clarinet: 71, klarinet: 71,
    flute: 73, fluit: 73, piccolo: 72,
    oboe: 68, bassoon: 70, fagot: 70, trumpet: 56, trompet: 56,
  };
  for (const [naam, verwacht] of Object.entries(gevallen)) assert.equal(midiProgramma(naam), verwacht, naam);
});

test('instrumentBijNaam herkent afkortingen alleen als volledige naam', () => {
  const gevallen = {
    'Cnt. 1': 56, 'Flgh. 2': 56, 'Hn.': 60, 'Bar.': 57, 'Euph.': 57,
    'Tbn.': 57, 'Tba.': 58, 'Perc.': 47, 'Cl.': 71, 'Fl.': 73,
    'Hb.': 68, 'Fg.': 70, 'Trp.': 56,
    Cnt: 56, Flgh: 56, Hn: 60, Bar: 57, Euph: 57, Tbn: 57, Tba: 58,
    Perc: 47, Cl: 71, Fl: 73, Hb: 68, Fg: 70, Trp: 56,
  };
  for (const [naam, verwacht] of Object.entries(gevallen)) assert.equal(midiProgramma(naam), verwacht, naam);
  assert.equal(midiProgramma('flute'), 73);
  assert.equal(midiProgramma('reflector'), null);
});

test('instrumentBijNaam negeert volgnummers en behoudt bestaande uitkomsten', () => {
  assert.equal(id('Cnt. 1'), id('cornet 2'));
  const bestaande = {
    'Bugel 1': 56, 'Flügelhorn 2': 56, 'Flug. Hn.': 56, 'Fliigelhom 1': 56,
    'Trumpet 1': 56, 'Solo Cts.': 56, 'Horn 2 Eb': 60, 'Solo Hn.': 60,
    Althoorn: 60, 'Hoorn in F': 60, Baritone: 57, Euphonium: 57,
    'Trombone 1 C': 57, 'Bass Eb': 58, Tuba: 58,
    'Sax Alto 1/2': 65, 'Sax Tenor': 66, Klarinet: 71, Fluit: 73,
  };
  for (const [naam, verwacht] of Object.entries(bestaande)) assert.equal(midiProgramma(naam), verwacht, naam);
});

test('instrumentBijNaam herkent algemene partijnamen niet als instrument', () => {
  for (const naam of ['Voice', 'Partij 1', 'Title']) assert.equal(midiProgramma(naam), null, naam);
});
