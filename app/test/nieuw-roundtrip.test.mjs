import test from 'node:test';
import assert from 'node:assert/strict';
import { maakLeegStuk } from '../src/model/nieuw.mjs';
import { schrijfNoot } from '../src/model/invoeren.mjs';
import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

const nootgegevens = (partij) => partij.maten.map((maat) => maat.elementen
  .filter((element) => element.soort === 'noot')
  .map((noot) => ({
    stap: noot.toonhoogte.stap,
    octaaf: noot.toonhoogte.octaaf,
    duur: noot.duur,
    start: noot.start,
  })));

const maatgegevens = (partij) => partij.maten.map((maat) => ({
  maatsoort: maat.maatsoort,
  toonsoort: maat.toonsoort,
}));

test('een nieuw geschreven stuk blijft gelijk na schrijven en weer lezen', () => {
  let stuk = maakLeegStuk({ instrumenten: ['trompet', 'tuba'], aantalMaten: 3 });
  stuk = schrijfNoot(stuk, 'P1', 0, 0, 480, { stap: 'C', alter: 0, octaaf: 5 });
  stuk = schrijfNoot(stuk, 'P1', 0, 480, 240, { stap: 'D', alter: 0, octaaf: 5 });
  stuk = schrijfNoot(stuk, 'P1', 0, 720, 960, { stap: 'E', alter: 0, octaaf: 5 });

  const opnieuw = leesMusicXML(naarMusicXML(stuk));

  assert.deepEqual(opnieuw.partijen.map((partij) => partij.maten.length), [3, 3]);
  assert.deepEqual(opnieuw.partijen.map(nootgegevens), stuk.partijen.map(nootgegevens));
  assert.deepEqual(opnieuw.partijen.map(maatgegevens), stuk.partijen.map(maatgegevens));
});
