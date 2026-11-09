import test from 'node:test';
import assert from 'node:assert/strict';
import { woordenNaarMaten } from '../src/model/tekstlezerwoorden.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';
import { maakLeegStuk } from '../src/model/nieuw.mjs';

test('een woord uit de tekstherkenning (Allegro) komt als tekst in de MusicXML, niet als undefined', () => {
  const stuk = maakLeegStuk({ instrumenten: ['trompet'], aantalMaten: 2 });
  stuk.partijen[0].maten[1].elementen[0].plek = { blad: 1, x: 400, y: 500 };
  const ocr = [{ blad: 1, regels: [{ tekst: 'Allegro', woorden: [{ tekst: 'Allegro', x: 380, y: 400, breedte: 80, hoogte: 20 }] }] }];
  const xml = naarMusicXML(woordenNaarMaten(stuk, ocr));
  assert.match(xml, /Allegro/);
  assert.equal(xml.includes('undefined'), false);
});
