import test from 'node:test';
import assert from 'node:assert/strict';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { maakLeegStuk } from '../src/model/nieuw.mjs';

test('een nieuw stuk (maatrust: true per maat) schrijft geen meermaatsrust: anders toont de weergave een 0 boven elke maat', () => {
  const xml = naarMusicXML(maakLeegStuk({ instrumenten: ['trompet'], aantalMaten: 4 }));
  assert.equal(xml.includes('<multiple-rest>'), false);
  assert.equal((xml.match(/<rest measure="yes"\s*\/>/g) ?? []).length, 4);
});

test('een meermaatsrust van 3 maten schrijft nog steeds multiple-rest 3', () => {
  const stuk = maakLeegStuk({ instrumenten: ['trompet'], aantalMaten: 4 });
  const maten = stuk.partijen[0].maten;
  maten[0].maatrust = 3;
  maten[1].verborgen = true;
  maten[2].verborgen = true;
  const xml = naarMusicXML(stuk);
  assert.match(xml, /<multiple-rest>3<\/multiple-rest>/);
  assert.equal((xml.match(/<multiple-rest>/g) ?? []).length, 1);
});
