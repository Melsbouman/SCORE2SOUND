// Wat een palet-hokje doet als je het op een maat of op een noot zet (slepen of klikken).
// Pure functies: partituur erin, nieuwe partituur eruit; het origineel blijft gelijk.
// plek: { partijId, maatIndex, totIndex, start, elementId }
//  - partijId: de partij waarop het hokje viel (null bij een gekozen maat zonder partij: dan alle partijen of de eerste);
//  - maatIndex en totIndex: de maat (of de reeks gekozen maten);
//  - start: de tik in de maat (bij een aanwijzing op een noot), anders 0;
//  - elementId: de noot ('n-<partij>-<maat>-<element>') bij een hokje voor een noot.
import { maatLengte } from './duur.mjs';
import { leesId, voegAanwijzingToe, voegHaakToe, zetAlter, verschuifHalvetoon } from './corrigeren.mjs';
import { verschuifOctaaf, zetArticulatie, zetFermate, zetOverbinding } from './noten-bewerken.mjs';
import { zetHerhaling } from './maten-bewerken.mjs';
import { zetTempo } from './tempo.mjs';

const OP_EEN_NOOT = new Set(['voorteken', 'articulatie', 'fermate', 'overbinding', 'octaaf', 'halvetoon']);

// 'noot' als het hokje op een noot hoort (articulatie, voorteken), anders 'maat'.
export function doelVan(actie) {
  return OP_EEN_NOOT.has(actie?.soort) ? 'noot' : 'maat';
}

export function voerPaletActieUit(partituur, actie, plek) {
  if (!partituur?.partijen?.length || !actie || !plek) return partituur;
  if (doelVan(actie) === 'noot') return opNoten(partituur, actie, notenVoor(partituur, actie, plek));

  const partij = partituur.partijen.find((kandidaat) => kandidaat.id === plek.partijId) ?? partituur.partijen[0];
  const van = partij.maten.findIndex((maat) => maat.index === plek.maatIndex);
  if (van === -1) return partituur;
  const tot = Math.max(van, partij.maten.findIndex((maat) => maat.index === (plek.totIndex ?? plek.maatIndex)));
  const start = Number.isFinite(plek.start) ? plek.start : 0;
  const waarde = actie.waarde;

  switch (actie.soort) {
    case 'sleutel': return zetSleutelVanaf(partituur, partij.id, van, waarde);
    case 'toonsoort': return zetToonsoortVanaf(partituur, partij.id, van, waarde.kwinten);
    case 'maatsoort': return zetMaatsoortVanaf(partituur, van, waarde);
    case 'tempo': {
      const nieuw = zetTempo(partituur, van, waarde);
      return actie.tekst ? inAllePartijen(nieuw, van, 0, 'tekst', actie.tekst) : nieuw;
    }
    case 'tempotekst': return inAllePartijen(partituur, van, start, 'tekst', waarde);
    case 'dynamiek': return voegAanwijzingToe(partituur, partij.id, van, start, 'dynamiek', waarde);
    case 'tekst': return voegAanwijzingToe(partituur, partij.id, van, start, 'tekst', waarde);
    case 'letter': return zetLetter(partituur, van);
    case 'haak': return voegHaakToe(partituur, partij.id, van, start, tot, maatLengte(partij.maten[tot].maatsoort), waarde);
    case 'herhaling': {
      const plekMaat = waarde === 'eind' ? tot : van;
      const aan = !partij.maten[plekMaat].herhaling?.[waarde];
      return zetHerhaling(partituur, partij.maten[plekMaat].index, waarde, aan);
    }
    case 'volta': return zetVolta(partituur, van, tot, waarde);
    case 'sprong': return zetSprong(partituur, waarde.veld === 'daCapo' || waarde.veld === 'dalSegno' || waarde.veld === 'naarCoda' ? tot : van, waarde);
    case 'maatstreep': return zetMaatstreep(partituur, tot, waarde);
    default: return partituur;
  }
}

// De noten waarop een hokje werkt: de noot zelf, of alle noten in de gekozen maten (van één partij of van alle).
function notenVoor(partituur, actie, plek) {
  const soorten = actie.soort === 'fermate' ? ['noot', 'rust'] : ['noot'];
  if (plek.elementId) return leesId(plek.elementId) ? [plek.elementId] : [];
  const ids = [];
  for (const partij of partituur.partijen) {
    if (plek.partijId && partij.id !== plek.partijId) continue;
    const van = partij.maten.findIndex((maat) => maat.index === plek.maatIndex);
    if (van === -1) continue;
    const tot = Math.max(van, partij.maten.findIndex((maat) => maat.index === (plek.totIndex ?? plek.maatIndex)));
    for (let positie = van; positie <= tot; positie += 1) {
      partij.maten[positie].elementen.forEach((element, index) => {
        if (soorten.includes(element.soort)) ids.push(`n-${partij.id}-${positie}-${index}`);
      });
    }
  }
  return ids;
}

function elementBij(partituur, id) {
  const plaats = leesId(id);
  return partituur.partijen.find((partij) => partij.id === plaats?.partijId)?.maten[plaats.maatIndex]?.elementen[plaats.elementIndex] ?? null;
}

function opNoten(partituur, actie, ids) {
  if (ids.length === 0) return partituur;
  const waarde = actie.waarde;
  // Aan/uit-tekens: hebben alle noten het al, dan gaat het eraf; anders komt het op de noten die het nog niet hebben.
  const heeft = (element) => {
    if (actie.soort === 'articulatie') return element.articulaties?.includes(waarde);
    if (actie.soort === 'fermate') return Boolean(element.fermate);
    if (actie.soort === 'overbinding') return Boolean(element.overbinding?.begin);
    return false;
  };
  const alleAan = ids.every((id) => heeft(elementBij(partituur, id) ?? {}));
  let nieuw = partituur;
  for (const id of ids) {
    const element = elementBij(nieuw, id);
    if (!element) continue;
    if (actie.soort === 'voorteken') nieuw = zetAlter(nieuw, id, waarde);
    else if (actie.soort === 'octaaf') nieuw = verschuifOctaaf(nieuw, id, waarde);
    else if (actie.soort === 'halvetoon') nieuw = verschuifHalvetoon(nieuw, id, waarde);
    else if (heeft(element) === alleAan) {
      if (actie.soort === 'articulatie') nieuw = zetArticulatie(nieuw, id, waarde);
      else if (actie.soort === 'fermate') nieuw = zetFermate(nieuw, id, !alleAan);
      else if (actie.soort === 'overbinding') {
        try {
          nieuw = zetOverbinding(nieuw, id, !alleAan);
        } catch {
          // Geen volgende noot met dezelfde toonhoogte: geen overbinding.
        }
      }
    }
  }
  return nieuw;
}

// Vanaf de maat tot de volgende wissel (zoals een sleutel of maatsoort op papier werkt).
function totDeVolgendeWissel(maten, van, veld) {
  const oud = JSON.stringify(maten[van]?.[veld] ?? null);
  let tot = van;
  while (tot + 1 < maten.length && JSON.stringify(maten[tot + 1][veld] ?? null) === oud) tot += 1;
  return tot;
}

function zetSleutelVanaf(partituur, partijId, van, { teken, lijn, octaafVerschuiving = 0 }) {
  const kopie = structuredClone(partituur);
  const maten = kopie.partijen.find((partij) => partij.id === partijId).maten;
  const tot = totDeVolgendeWissel(maten, van, 'sleutels');
  for (let positie = van; positie <= tot; positie += 1) {
    maten[positie].sleutels ??= [];
    maten[positie].sleutels[0] = { teken, lijn, notenbalk: 1, octaafVerschuiving };
  }
  return kopie;
}

// Hoeveel kwinten de genoteerde toonsoort van een partij verschilt van de klinkende (B♭-instrument: +2, E♭: +3).
function kwintVerschil(partij) {
  const chromatisch = partij.instrument?.transpositie?.chromatisch ?? 0;
  const verschil = (((-chromatisch * 7) % 12) + 12) % 12;
  return verschil > 6 ? verschil - 12 : verschil;
}

// De toonsoort op de partij waarop het hokje viel; de andere partijen krijgen dezelfde klinkende toonsoort.
function zetToonsoortVanaf(partituur, partijId, van, kwinten) {
  const kopie = structuredClone(partituur);
  const doel = kopie.partijen.find((partij) => partij.id === partijId);
  for (const partij of kopie.partijen) {
    let eigen = kwinten + kwintVerschil(partij) - kwintVerschil(doel);
    while (eigen > 7) eigen -= 12;
    while (eigen < -7) eigen += 12;
    if (!partij.maten[van]) continue;
    const tot = totDeVolgendeWissel(partij.maten, van, 'toonsoort');
    for (let positie = van; positie <= tot; positie += 1) {
      partij.maten[positie].toonsoort = { kwinten: eigen, modus: partij.maten[positie].toonsoort?.modus ?? 'majeur' };
    }
  }
  return kopie;
}

// De maatsoort tot de volgende wissel, in alle partijen. Noten blijven staan (de maatduurcontrole meldt wat niet past);
// alleen een rust over de hele maat krijgt de nieuwe lengte.
function zetMaatsoortVanaf(partituur, van, { teller, noemer, symbool }) {
  if (!Number.isInteger(teller) || !Number.isInteger(noemer) || teller <= 0 || noemer <= 0) return partituur;
  const kopie = structuredClone(partituur);
  const maatsoort = { teller, noemer, ...(symbool ? { symbool } : {}) };
  for (const partij of kopie.partijen) {
    if (!partij.maten[van]) continue;
    const tot = totDeVolgendeWissel(partij.maten, van, 'maatsoort');
    for (let positie = van; positie <= tot; positie += 1) {
      const maat = partij.maten[positie];
      maat.maatsoort = { ...maatsoort };
      const delen = maat.elementen.filter((element) => element.soort === 'noot' || element.soort === 'rust');
      for (const stem of new Set(delen.map((element) => element.stem ?? 1))) {
        const inStem = delen.filter((element) => (element.stem ?? 1) === stem);
        if (inStem.length === 1 && inStem[0].soort === 'rust' && inStem[0].heleMaat) inStem[0].duur = maatLengte(maatsoort);
      }
    }
  }
  return kopie;
}

function inAllePartijen(partituur, positie, start, type, waarde) {
  return partituur.partijen.reduce((nieuw, partij) => (partij.maten[positie]
    ? voegAanwijzingToe(nieuw, partij.id, positie, start, type, waarde)
    : nieuw), partituur);
}

const isLetter = (element) => element.soort === 'aanwijzing' && element.type === 'letter';

// De volgende repetitieletter na de laatste letter vóór deze maat (A als er nog geen is), in alle partijen.
// Staat er al een letter op de maat, dan gaat die weg.
function zetLetter(partituur, positie) {
  const kopie = structuredClone(partituur);
  const eerste = kopie.partijen[0].maten;
  const heeftAl = eerste[positie]?.elementen.some(isLetter);
  let waarde = 'A';
  const vorige = eerste.slice(0, positie).flatMap((maat) => maat.elementen.filter(isLetter)).at(-1)?.waarde;
  if (/^[A-Y]$/.test(String(vorige ?? ''))) waarde = String.fromCharCode(String(vorige).charCodeAt(0) + 1);
  else if (vorige !== undefined) waarde = eerste[positie].nummer;
  for (const partij of kopie.partijen) {
    const maat = partij.maten[positie];
    if (!maat) continue;
    if (heeftAl) maat.elementen = maat.elementen.filter((element) => !isLetter(element));
    else maat.elementen.unshift({ soort: 'aanwijzing', start: 0, type: 'letter', waarde, zekerheid: 1, kader: true });
  }
  return kopie;
}

// Hokje 1 of 2 over de gekozen maten (begin op de eerste, eind op de laatste). Staat het er al precies zo, dan gaat het weg.
function zetVolta(partituur, van, tot, nummer) {
  const kopie = structuredClone(partituur);
  for (const partij of kopie.partijen) {
    const maten = partij.maten.slice(van, tot + 1);
    if (maten.length === 0) continue;
    const alGezet = maten.every((maat) => maat.volta?.nummers?.length === 1 && maat.volta.nummers[0] === nummer);
    maten.forEach((maat, plek) => {
      if (alGezet) delete maat.volta;
      else maat.volta = { nummers: [nummer], begin: plek === 0, eind: plek === maten.length - 1 };
    });
  }
  return kopie;
}

function zetSprong(partituur, positie, { veld, waarde }) {
  const kopie = structuredClone(partituur);
  for (const partij of kopie.partijen) {
    const maat = partij.maten[positie];
    if (!maat) continue;
    const sprong = { ...(maat.sprong ?? {}) };
    if (sprong[veld] === waarde) delete sprong[veld];
    else sprong[veld] = waarde;
    if (Object.keys(sprong).length) maat.sprong = sprong;
    else delete maat.sprong;
  }
  return kopie;
}

// De maatstreep aan het eind van de maat: 'dubbel' of 'eind'; 'enkel' (of nogmaals hetzelfde) maakt hem weer gewoon.
function zetMaatstreep(partituur, positie, stijl) {
  const kopie = structuredClone(partituur);
  for (const partij of kopie.partijen) {
    const maat = partij.maten[positie];
    if (!maat) continue;
    if (stijl === 'enkel' || maat.maatstreep === stijl) delete maat.maatstreep;
    else maat.maatstreep = stijl;
  }
  return kopie;
}
