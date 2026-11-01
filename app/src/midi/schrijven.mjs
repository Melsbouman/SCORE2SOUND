import { naarMidi } from '../model/toonhoogte.mjs';
import { maatLengte } from '../model/duur.mjs';

const tekstEncoder = new TextEncoder();

function vlq(waarde) {
  const bytes = [waarde & 0x7f];
  let rest = Math.floor(waarde / 128);
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest = Math.floor(rest / 128);
  }
  return bytes;
}

function getal32(waarde) {
  return [(waarde >>> 24) & 0xff, (waarde >>> 16) & 0xff, (waarde >>> 8) & 0xff, waarde & 0xff];
}

function getal16(waarde) {
  return [(waarde >>> 8) & 0xff, waarde & 0xff];
}

function blok(naam, inhoud) {
  return [...tekstEncoder.encode(naam), ...getal32(inhoud.length), ...inhoud];
}

function maakSpoor(events) {
  events.sort((a, b) => a.tik - b.tik || a.volgorde - b.volgorde);
  const inhoud = [];
  let vorigeTik = 0;
  for (const event of events) {
    inhoud.push(...vlq(event.tik - vorigeTik), ...event.bytes);
    vorigeTik = event.tik;
  }
  inhoud.push(0, 0xff, 0x2f, 0);
  return blok('MTrk', inhoud);
}

function maatDuur(maat) {
  if (!maat.opmaat) return maatLengte(maat.maatsoort);
  return maat.elementen
    .filter((element) => element.soort === 'noot' || element.soort === 'rust')
    .reduce((einde, element) => Math.max(einde, element.start + element.duur), 0);
}

function maatBeginnen(partituur) {
  const beginnen = [];
  let tik = 0;
  for (const maat of partituur.partijen[0]?.maten ?? []) {
    beginnen.push(tik);
    tik += maatDuur(maat);
  }
  return beginnen;
}

function dirigentenSpoor(partituur, beginnen) {
  const events = [];
  const maten = partituur.partijen[0]?.maten ?? [];
  const eersteMaat = maten[0];
  const maatsoort = eersteMaat?.maatsoort ?? { teller: 4, noemer: 4 };
  events.push({
    tik: 0,
    volgorde: 0,
    bytes: [0xff, 0x58, 4, maatsoort.teller, Math.log2(maatsoort.noemer), 24, 8],
  });

  if (eersteMaat?.tempo == null) {
    events.push({ tik: 0, volgorde: 1, bytes: [0xff, 0x51, 3, 0x07, 0xa1, 0x20] });
  }
  for (let index = 0; index < maten.length; index += 1) {
    const tempo = maten[index].tempo;
    if (tempo == null) continue;
    const microseconden = Math.round(60000000 / tempo);
    events.push({
      tik: beginnen[index],
      volgorde: 1,
      bytes: [0xff, 0x51, 3, (microseconden >>> 16) & 0xff, (microseconden >>> 8) & 0xff, microseconden & 0xff],
    });
  }
  return maakSpoor(events);
}

function partijSpoor(partij, partijIndex, beginnen, volume) {
  const { poort, kanaal } = kanaalVan(partijIndex);
  const naam = [...tekstEncoder.encode(partij.naam)];
  const events = [
    { tik: 0, volgorde: 0, bytes: [0xff, 0x03, ...vlq(naam.length), ...naam] },
    ...(poort > 0 ? [{ tik: 0, volgorde: 0, bytes: [0xff, 0x21, 1, poort] }] : []),
    { tik: 0, volgorde: 1, bytes: [0xc0 | kanaal, partij.instrument.midiProgramma] },
    { tik: 0, volgorde: 2, bytes: [0xb0 | kanaal, 7, volume[partij.id] ?? 100] },
  ];
  const noten = [];
  let sterkte = 80;
  const overbonden = new Map();

  for (let maatIndex = 0; maatIndex < partij.maten.length; maatIndex += 1) {
    const maat = partij.maten[maatIndex];
    const maatBegin = beginnen[maatIndex];
    const eenmalig = new Map();
    for (const element of maat.elementen) {
      if (element.soort !== 'aanwijzing' || element.type !== 'dynamiek') continue;
      if (element.waarde in EENMALIG) eenmalig.set(element.start, EENMALIG[element.waarde]);
    }
    for (const element of maat.elementen) {
      if (element.soort === 'aanwijzing' && element.type === 'dynamiek' && element.waarde in STERKTE) {
        sterkte = STERKTE[element.waarde];
        continue;
      }
      if (element.soort !== 'noot') continue;
      const toets = naarMidi(element.toonhoogte) + partij.instrument.transpositie.chromatisch;
      const begin = maatBegin + element.start;
      const klinkendeDuur = element.articulaties.includes('staccatissimo')
        ? Math.floor(element.duur / 4)
        : element.articulaties.includes('staccato')
          ? Math.floor(element.duur / 2)
          : element.duur;
      const einde = begin + klinkendeDuur;
      if (element.overbinding.eind && overbonden.has(toets)) {
        const vorige = overbonden.get(toets);
        vorige.einde = Math.max(vorige.einde, einde);
        if (!element.overbinding.begin) overbonden.delete(toets);
        continue;
      }
      let kracht = eenmalig.get(element.start) ?? sterkte;
      if (element.articulaties.includes('accent')) kracht += 15;
      if (element.articulaties.includes('marcato')) kracht += 25;
      kracht = Math.min(kracht, 127);
      const noot = { begin, einde, toets, kracht };
      noten.push(noot);
      if (element.overbinding.begin) overbonden.set(toets, noot);
    }
  }

  for (const noot of noten) {
    events.push({ tik: noot.begin, volgorde: 4, bytes: [0x90 | kanaal, noot.toets, noot.kracht] });
    events.push({ tik: noot.einde, volgorde: 3, bytes: [0x80 | kanaal, noot.toets, 0] });
  }
  return maakSpoor(events);
}

export function schrijfMidi(partituur, { volume = {} } = {}) {
  const beginnen = maatBeginnen(partituur);
  const sporen = [dirigentenSpoor(partituur, beginnen)];
  for (let index = 0; index < partituur.partijen.length; index += 1) {
    sporen.push(partijSpoor(partituur.partijen[index], index, beginnen, volume));
  }
  return Uint8Array.from([
    ...blok('MThd', [...getal16(1), ...getal16(sporen.length), ...getal16(480)]),
    ...sporen.flat(),
  ]);
}
export function kanaalVan(partijIndex) {
  const plek = partijIndex % 15;
  return { poort: Math.floor(partijIndex / 15), kanaal: plek >= 9 ? plek + 1 : plek };
}

const STERKTE = { ppp: 30, pp: 40, p: 55, mp: 68, mf: 80, f: 95, ff: 110, fff: 120 };
const EENMALIG = { sf: 105, sfz: 110, fp: 90 };

