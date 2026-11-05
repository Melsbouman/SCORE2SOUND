import { naarMidi } from '../model/toonhoogte.mjs';
import { maatLengte } from '../model/duur.mjs';
import { uitgevouwen } from '../model/maten.mjs';
import { tempoOverloop } from '../model/tempoverloop.mjs';
import { klikGebeurtenissen } from './klik.mjs';
import { mixVoorPartijen } from './mix.mjs';
import { uitvoeringVanNoot } from './uitvoering.mjs';

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

function maatBeginnenBasis(partituur) {
  const beginnen = [];
  let tik = 0;
  for (const maat of partituur.partijen[0]?.maten ?? []) {
    beginnen.push(tik);
    tik += maatDuur(maat);
  }
  return beginnen;
}

export function maakTijdlijn(partituur) {
  const basisBeginnen = maatBeginnenBasis(partituur);
  const verlengingen = [];
  for (const partij of partituur.partijen) {
    for (let maatIndex = 0; maatIndex < partij.maten.length; maatIndex += 1) {
      const maatBegin = basisBeginnen[maatIndex];
      if (maatBegin === undefined) continue;
      for (const element of partij.maten[maatIndex].elementen) {
        if (!element.fermate || (element.soort !== 'noot' && element.soort !== 'rust')) continue;
        verlengingen.push({
          einde: maatBegin + element.start + element.duur,
          duur: Math.round(element.duur * 0.8),
        });
      }
    }
  }
  verlengingen.sort((a, b) => a.einde - b.einde);
  const verplaats = (tik) => tik + verlengingen
    .filter((verlenging) => tik >= verlenging.einde)
    .reduce((som, verlenging) => som + verlenging.duur, 0);
  return {
    basisBeginnen,
    maatBeginnen: basisBeginnen.map(verplaats),
    verplaats,
  };
}

function dirigentenSpoor(partituur, beginnen, tijdlijn, voorintellerTik = 0) {
  const events = [];
  const maten = partituur.partijen[0]?.maten ?? [];
  const tempoOverlopen = tempoOverloop(partituur);
  const eersteMaat = maten[0];
  const maatsoort = eersteMaat?.maatsoort ?? { teller: 4, noemer: 4 };
  events.push({
    tik: 0,
    volgorde: 0,
    bytes: [0xff, 0x58, 4, maatsoort.teller, Math.log2(maatsoort.noemer), 24, 8],
  });

  if (eersteMaat?.tempo == null) {
    events.push({ tik: 0, volgorde: 1, bytes: [0xff, 0x51, 3, 0x07, 0xa1, 0x20] });
  } else if (voorintellerTik > 0) {
    const microseconden = Math.round(60000000 / eersteMaat.tempo);
    events.push({
      tik: 0,
      volgorde: 1,
      bytes: [0xff, 0x51, 3, (microseconden >>> 16) & 0xff, (microseconden >>> 8) & 0xff, microseconden & 0xff],
    });
  }
  for (let index = 0; index < maten.length; index += 1) {
    const tempo = maten[index].tempo;
    if (tempo != null && !(voorintellerTik > 0 && index === 0)) {
      const microseconden = Math.round(60000000 / tempo);
      events.push({
        tik: beginnen[index],
        volgorde: 1,
        bytes: [0xff, 0x51, 3, (microseconden >>> 16) & 0xff, (microseconden >>> 8) & 0xff, microseconden & 0xff],
      });
    }
    for (const aanwijzing of maten[index].elementen ?? []) {
      if (aanwijzing.soort !== 'aanwijzing' || aanwijzing.type !== 'tempo' || !(aanwijzing.start > 0)) continue;
      const microseconden = Math.round(60000000 / aanwijzing.waarde);
      events.push({
        tik: tijdlijn.verplaats(tijdlijn.basisBeginnen[index] + aanwijzing.start) + voorintellerTik,
        volgorde: 1,
        bytes: [0xff, 0x51, 3, (microseconden >>> 16) & 0xff, (microseconden >>> 8) & 0xff, microseconden & 0xff],
      });
    }
  }
  for (const verloop of tempoOverlopen) {
    let tempoVoor = 120;
    for (let index = 0; index <= verloop.vanMaat; index += 1) {
      if (typeof maten[index]?.tempo === 'number') tempoVoor = maten[index].tempo;
    }

    const aantalMaten = verloop.totMaat - verloop.vanMaat;
    for (let offset = 0; offset < aantalMaten; offset += 1) {
      const factor = aantalMaten === 1
        ? verloop.factorEind
        : 1 + (verloop.factorEind - 1) * offset / (aantalMaten - 1);
      const microseconden = Math.round(60000000 / (tempoVoor * factor));
      const index = verloop.vanMaat + offset;
      events.push({
        tik: beginnen[index],
        volgorde: 2,
        bytes: [0xff, 0x51, 3, (microseconden >>> 16) & 0xff, (microseconden >>> 8) & 0xff, microseconden & 0xff],
      });
    }

    const maatNaVerloop = maten[verloop.totMaat];
    const aTempo = maatNaVerloop?.elementen?.some((element) =>
      element.soort === 'aanwijzing' && element.type === 'tekst' &&
      /^(?:a\s+tempo|tempo\s+primo|tempo\s+i)(?:\b|[.!?])/i.test(String(element.waarde ?? '').trim())
    );
    if (aTempo && typeof maatNaVerloop.tempo !== 'number') {
      events.push({
        tik: beginnen[verloop.totMaat],
        volgorde: 2,
        bytes: [0xff, 0x51, 3, (Math.round(60000000 / tempoVoor) >>> 16) & 0xff, (Math.round(60000000 / tempoVoor) >>> 8) & 0xff, Math.round(60000000 / tempoVoor) & 0xff],
      });
    }
  }
  return maakSpoor(events);
}

function wiggenVoor(partij, tijdlijn, voorintellerTik) {
  const dynamieken = [];
  const wigAanwijzingen = [];
  let volgorde = 0;
  for (let maatIndex = 0; maatIndex < partij.maten.length; maatIndex += 1) {
    for (const element of partij.maten[maatIndex].elementen) {
      const aanwijzing = {
        ...element,
        tik: tijdlijn.verplaats(tijdlijn.basisBeginnen[maatIndex] + element.start) + voorintellerTik,
        volgorde,
      };
      if (element.soort === 'aanwijzing' && element.type === 'dynamiek' && element.waarde in STERKTE) {
        dynamieken.push(aanwijzing);
      }
      if (element.soort === 'aanwijzing' &&
          (element.type === 'crescendo' || element.type === 'decrescendo') &&
          (element.waarde === 'begin' || element.waarde === 'eind')) {
        wigAanwijzingen.push(aanwijzing);
      }
      volgorde += 1;
    }
  }

  const opTik = (a, b) => a.tik - b.tik || a.volgorde - b.volgorde;
  dynamieken.sort(opTik);
  wigAanwijzingen.sort(opTik);
  const openWiggen = new Map();
  const wiggen = [];
  for (const aanwijzing of wigAanwijzingen) {
    if (aanwijzing.waarde === 'begin') {
      const open = openWiggen.get(aanwijzing.type) ?? [];
      open.push(aanwijzing);
      openWiggen.set(aanwijzing.type, open);
      continue;
    }
    const open = openWiggen.get(aanwijzing.type);
    const begin = open?.pop();
    if (!begin || aanwijzing.tik < begin.tik) continue;

    const dynamiekErvoor = dynamieken
      .filter((dynamiek) => dynamiek.tik < begin.tik ||
        (dynamiek.tik === begin.tik && dynamiek.volgorde < begin.volgorde))
      .at(-1);
    const startSterkte = dynamiekErvoor ? STERKTE[dynamiekErvoor.waarde] : 80;
    const dynamiekErna = dynamieken.find((dynamiek) => dynamiek.tik > aanwijzing.tik ||
      (dynamiek.tik === aanwijzing.tik && dynamiek.volgorde > aanwijzing.volgorde));
    const richting = aanwijzing.type === 'crescendo' ? 20 : -20;
    const eindSterkte = dynamiekErna ? STERKTE[dynamiekErna.waarde] : startSterkte + richting;
    wiggen.push({
      begin: begin.tik,
      eind: aanwijzing.tik,
      startSterkte,
      eindSterkte: Math.max(20, Math.min(120, eindSterkte)),
    });
  }
  return wiggen;
}

function partijSpoor(partij, partijIndex, tijdlijn, volume, voorintellerTik, mix) {
  const { poort, kanaal } = kanaalVan(partijIndex);
  const naam = [...tekstEncoder.encode(partij.naam)];
  const ctrl = mix?.[partijIndex];
  const events = [
    { tik: 0, volgorde: 0, bytes: [0xff, 0x03, ...vlq(naam.length), ...naam] },
    ...(poort > 0 ? [{ tik: 0, volgorde: 0, bytes: [0xff, 0x21, 1, poort] }] : []),
    { tik: 0, volgorde: 1, bytes: [0xc0 | kanaal, partij.instrument.midiProgramma] },
    { tik: 0, volgorde: 2, bytes: [0xb0 | kanaal, 0x07, volume[partij.id] ?? ctrl?.volume ?? 100] },
  ];
  if (ctrl) {
    if (ctrl?.pan != null) {
      events.push({ tik: 0, volgorde: 3, bytes: [0xb0 | kanaal, 0x0A, ctrl.pan] });
    }
    if (ctrl?.galm != null) {
      events.push({ tik: 0, volgorde: 4, bytes: [0xb0 | kanaal, 0x5B, ctrl.galm] });
    }
    if (ctrl?.expressie != null) {
      events.push({ tik: 0, volgorde: 5, bytes: [0xb0 | kanaal, 0x0B, ctrl.expressie] });
    }
  }
  const noten = [];
  const wiggen = wiggenVoor(partij, tijdlijn, voorintellerTik);
  let sterkte = 80;
  const overbonden = new Map();

  for (let maatIndex = 0; maatIndex < partij.maten.length; maatIndex += 1) {
    const maat = partij.maten[maatIndex];
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
      if (element.soort !== 'noot' || element.voorslag) continue;
      const toets = naarMidi(element.toonhoogte) + partij.instrument.transpositie.chromatisch + (element.octaafVerschuiving ?? 0) * 12;
      const begin = tijdlijn.verplaats(tijdlijn.basisBeginnen[maatIndex] + element.start) + voorintellerTik;
      let kracht = eenmalig.get(element.start) ?? sterkte;
      const wig = wiggen.find((item) => begin >= item.begin && begin <= item.eind);
      if (wig) {
        const verloop = wig.eind === wig.begin ? 1 : (begin - wig.begin) / (wig.eind - wig.begin);
        kracht = Math.round(wig.startSterkte + (wig.eindSterkte - wig.startSterkte) * verloop);
        kracht = Math.max(20, Math.min(120, kracht));
      }
      const uitvoering = uitvoeringVanNoot(element, { sterkte: kracht, positieInMaat: element.start });
      const bestaandeArticulatie = element.articulaties.some((naam) =>
        ['staccato', 'staccatissimo', 'accent', 'marcato'].includes(naam));
      const nieuweUitvoering = element.articulaties.includes('tenuto') || element.legato?.begin || element.legato?.eind;
      const duurFactor = bestaandeArticulatie
        ? uitvoering.duurFactor
        : nieuweUitvoering ? uitvoering.duurFactor : 1;
      const klinkendeDuur = Math.floor(element.duur * duurFactor);
      const einde = begin + klinkendeDuur * (element.fermate ? 2 : 1);
      if (element.overbinding.eind && overbonden.has(toets)) {
        const vorige = overbonden.get(toets);
        vorige.einde = Math.max(vorige.einde, einde);
        if (!element.overbinding.begin) overbonden.delete(toets);
        continue;
      }
      if (element.articulaties.includes('accent')) kracht += 15;
      else if (element.articulaties.includes('marcato')) kracht += 25;
      else if (nieuweUitvoering) kracht = uitvoering.velocity;
      kracht = Math.max(30, Math.min(kracht, 127));
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

function klikSpoor(partituur, voorinteller, verschuiving, alleenVoorinteller, tijdlijn) {
  const events = [];
  for (const gebeurtenis of klikGebeurtenissen(partituur, { voorinteller })) {
    if (alleenVoorinteller && gebeurtenis.tik >= 0) continue;
    const tik = (gebeurtenis.tik < 0 ? gebeurtenis.tik : tijdlijn.verplaats(gebeurtenis.tik)) + verschuiving;
    const toets = gebeurtenis.kracht === 110 ? 76 : 77;
    events.push({ tik, volgorde: 4, bytes: [0x99, toets, gebeurtenis.kracht] });
    events.push({ tik: tik + 60, volgorde: 3, bytes: [0x89, toets, 0] });
  }
  return maakSpoor(events);
}

export function schrijfMidi(partituur, { volume = {}, klik = false, voorinteller = 0 } = {}) {
  const gespeeld = uitgevouwen(partituur); // herhalingen klinken echt twee keer
  const verschuiving = voorinteller > 0
    ? voorinteller * maatLengte(gespeeld.partijen[0]?.maten[0]?.maatsoort ?? { teller: 4, noemer: 4 })
    : 0;
  const tijdlijn = maakTijdlijn(gespeeld);
  const mix = mixVoorPartijen(gespeeld.partijen);
  const beginnen = tijdlijn.maatBeginnen.map((tik) => tik + verschuiving);
  const sporen = [dirigentenSpoor(gespeeld, beginnen, tijdlijn, verschuiving)];
  for (let index = 0; index < gespeeld.partijen.length; index += 1) {
    sporen.push(partijSpoor(gespeeld.partijen[index], index, tijdlijn, volume, verschuiving, mix));
  }
  if (klik || voorinteller > 0) {
    sporen.push(klikSpoor(partituur, voorinteller, verschuiving, !klik, tijdlijn));
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

const STERKTE = { pppp: 20, ppp: 30, pp: 40, p: 55, mp: 68, mf: 80, f: 95, ff: 110, fff: 120, ffff: 127 };
const EENMALIG = { fp: 90, sf: 105, sfz: 110, sfp: 100, rfz: 110 };
