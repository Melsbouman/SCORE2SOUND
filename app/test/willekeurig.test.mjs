import test from 'node:test';
import assert from 'node:assert/strict';

import { leesMusicXML } from '../src/musicxml/lezen.mjs';
import { naarMusicXML } from '../src/musicxml/schrijven.mjs';

// Bekende verschillen:
// - Geen.

const TIKKEN_PER_MAAT = 1920;
const DUREN = [120, 240, 480, 960, 1920];
const STAPPEN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

function mulberry32(seed) {
  return function willekeurig() {
    let waarde = seed += 0x6d2b79f5;
    waarde = Math.imul(waarde ^ waarde >>> 15, waarde | 1);
    waarde ^= waarde + Math.imul(waarde ^ waarde >>> 7, waarde | 61);
    return ((waarde ^ waarde >>> 14) >>> 0) / 4294967296;
  };
}

function kies(willekeurig, waarden) {
  return waarden[Math.floor(willekeurig() * waarden.length)];
}

function maakNoot(willekeurig, start, duur) {
  return {
    soort: 'noot',
    start,
    duur,
    stem: 1,
    notenbalk: 1,
    toonhoogte: {
      stap: kies(willekeurig, STAPPEN),
      alter: kies(willekeurig, [-1, 0, 1]),
      octaaf: kies(willekeurig, [3, 4, 5, 6]),
    },
    akkoord: false,
    overbinding: { begin: false, eind: false },
    articulaties: [],
    legato: { begin: false, eind: false },
    versiering: null,
    zekerheid: 1,
  };
}

function maakRust(start, duur) {
  return {
    soort: 'rust',
    start,
    duur,
    stem: 1,
    notenbalk: 1,
    heleMaat: false,
    zekerheid: 1,
  };
}

function vulMaat(willekeurig, beginElementen = []) {
  const elementen = [...beginElementen];
  let start = beginElementen.reduce((totaal, element) =>
    Math.max(totaal, element.start + (element.duur ?? 0)), 0);

  while (start < TIKKEN_PER_MAAT) {
    const resterend = TIKKEN_PER_MAAT - start;
    const duur = kies(willekeurig, DUREN.filter((waarde) => waarde <= resterend));
    elementen.push(willekeurig() < 0.75
      ? maakNoot(willekeurig, start, duur)
      : maakRust(start, duur));
    start += duur;
  }

  return elementen;
}

function maakMaat(willekeurig, index, elementen = null) {
  return {
    nummer: String(index + 1),
    index,
    opmaat: false,
    maatsoort: { teller: 4, noemer: 4 },
    toonsoort: { kwinten: 0, modus: 'majeur' },
    sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
    tempo: null,
    herhaling: null,
    elementen: elementen ?? vulMaat(willekeurig),
  };
}

function maakPartituur(seed, metTekens = false) {
  const willekeurig = mulberry32(seed);
  const aantalMaten = 1 + Math.floor(willekeurig() * 6);
  const maten = [];

  for (let index = 0; index < aantalMaten; index += 1) {
    if (!metTekens) {
      maten.push(maakMaat(willekeurig, index));
      continue;
    }

    const eerste = maakNoot(willekeurig, 0, 240);
    eerste.balk = 'begin';
    if (willekeurig() < 0.5) eerste.fermate = true;
    const tweede = maakNoot(willekeurig, 240, 240);
    tweede.balk = 'eind';
    const elementen = vulMaat(willekeurig, [eerste, tweede]);
    if (index === 0) {
      elementen.unshift({
        soort: 'aanwijzing',
        start: 0,
        type: 'letter',
        waarde: 'A',
        zekerheid: 1,
      });
    }
    maten.push(maakMaat(willekeurig, index, elementen));
  }

  return {
    versie: 1,
    titel: 'Test',
    componist: '',
    partijen: [{
      id: 'P1',
      naam: 'Bugel',
      afkorting: '',
      instrument: {
        midiProgramma: 56,
        transpositie: { chromatisch: 0, diatonisch: 0 },
      },
      maten,
    }],
  };
}

function kernVan(element) {
  return {
    soort: element.soort,
    start: element.start,
    duur: element.duur,
    toonhoogte: element.toonhoogte,
  };
}

test('100 willekeurige partituren blijven gelijk na schrijven en lezen', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const verwacht = maakPartituur(seed);
    const gelezen = leesMusicXML(naarMusicXML(verwacht));
    const verwachteMaten = verwacht.partijen[0].maten;
    const gelezenMaten = gelezen.partijen[0].maten;

    assert.equal(gelezenMaten.length, verwachteMaten.length, `seed ${seed}: aantal maten`);
    for (let index = 0; index < verwachteMaten.length; index += 1) {
      assert.deepEqual(
        gelezenMaten[index].elementen
          .filter((element) => element.soort === 'noot' || element.soort === 'rust')
          .map(kernVan),
        verwachteMaten[index].elementen.map(kernVan),
        `seed ${seed}, maat ${index + 1}: noten en rusten`,
      );
    }
  }
});

test('fermates, balken en letters blijven gelijk na schrijven en lezen', () => {
  for (let seed = 1; seed <= 100; seed += 1) {
    const verwacht = maakPartituur(seed, true);
    const gelezen = leesMusicXML(naarMusicXML(verwacht));

    for (let index = 0; index < verwacht.partijen[0].maten.length; index += 1) {
      const verwachteElementen = verwacht.partijen[0].maten[index].elementen;
      const gelezenElementen = gelezen.partijen[0].maten[index].elementen;
      const verwachteNoten = verwachteElementen.filter((element) => element.soort === 'noot');
      const gelezenNoten = gelezenElementen.filter((element) => element.soort === 'noot');

      assert.deepEqual(
        gelezenNoten.map(({ fermate, balk }) => ({ fermate, balk })),
        verwachteNoten.map(({ fermate, balk }) => ({ fermate, balk })),
        `seed ${seed}, maat ${index + 1}: fermates en balken`,
      );

      if (index === 0) {
        const neemAanwijzing = ({ soort, start, type, waarde, zekerheid }) =>
          ({ soort, start, type, waarde, zekerheid });
        assert.deepEqual(
          gelezenElementen.filter((element) => element.soort === 'aanwijzing').map(neemAanwijzing),
          verwachteElementen.filter((element) => element.soort === 'aanwijzing').map(neemAanwijzing),
          `seed ${seed}: letter`,
        );
      }
    }
  }
});
