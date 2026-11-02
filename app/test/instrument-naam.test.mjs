import test from 'node:test';
import assert from 'node:assert/strict';
import { instrumentBijNaam } from '../src/model/instrumenten.mjs';

const id = (naam) => instrumentBijNaam(naam)?.id ?? null;

test('instrumentBijNaam herkent partijnamen uit een partituur', () => {
  const gevallen = {
    'Bugel 1': 'bugel', 'Flügelhorn 2': 'bugel', 'Flug. Hn.': 'bugel', 'Fliigelhom 1': 'bugel', 'Trumpet 1': 'trompet', 'Solo Cts.': 'trompet',
    'Horn 2 Eb': 'althoorn', 'Solo Hn.': 'althoorn', Althoorn: 'althoorn', 'Hoorn in F': 'hoorn', Baritone: 'bariton', Euphonium: 'bariton',
    'Trombone 1 C': 'trombone', 'Bass Eb': 'tuba', Tuba: 'tuba', 'Sax Alto 1/2': 'altsaxofoon', 'Sax Tenor': 'tenorsaxofoon', Klarinet: 'klarinet', Fluit: 'dwarsfluit',
  };
  for (const [naam, verwacht] of Object.entries(gevallen)) assert.equal(id(naam), verwacht, naam);
});

test('instrumentBijNaam geeft null als de naam niets zegt', () => {
  assert.equal(id('Voice'), null);
  assert.equal(id(''), null);
  assert.equal(id('Timpani'), null);
});
