import { leesId, zoekElement, maakNoot } from './corrigeren.mjs';

const articulatiesToegestaan = ['staccato', 'accent', 'tenuto', 'marcato', 'staccatissimo'];

function kopieMetElement(partituur, id) {
  const kopie = structuredClone(partituur);
  const gelezen = leesId(id);
  if (!gelezen) {
    return { kopie, element: null, maat: null, partij: null, maatIndex: -1, elementIndex: -1 };
  }
  const partij = kopie.partijen.find((kandidaat) => kandidaat.id === gelezen.partijId);
  const maat = partij?.maten[gelezen.maatIndex];
  const element = zoekElement(kopie, id);
  return {
    kopie, element, maat, partij, maatIndex: gelezen.maatIndex, elementIndex: gelezen.elementIndex,
  };
}

function gelijkeToonhoogte(eerste, tweede) {
  return eerste.stap === tweede.stap
    && eerste.alter === tweede.alter
    && eerste.octaaf === tweede.octaaf;
}

function volgendeGelijkeNoot(partij, maatIndex, elementIndex, noot) {
  for (let index = elementIndex + 1; index < partij.maten[maatIndex].elementen.length; index += 1) {
    const kandidaat = partij.maten[maatIndex].elementen[index];
    if (kandidaat.soort === 'noot' && kandidaat.stem === noot.stem
      && gelijkeToonhoogte(kandidaat.toonhoogte, noot.toonhoogte)) return kandidaat;
  }
  const volgendeMaat = partij.maten[maatIndex + 1];
  if (!volgendeMaat) return null;
  return volgendeMaat.elementen.find((kandidaat) => (
    kandidaat.soort === 'noot' && kandidaat.stem === noot.stem
    && gelijkeToonhoogte(kandidaat.toonhoogte, noot.toonhoogte)
  )) ?? null;
}

export function zetFermate(partituur, id, aan) {
  const { kopie, element } = kopieMetElement(partituur, id);
  if (element?.soort !== 'noot' && element?.soort !== 'rust') return kopie;
  element.fermate = Boolean(aan);
  element.zekerheid = 1;
  return kopie;
}

export function zetArticulatie(partituur, id, naam) {
  if (!articulatiesToegestaan.includes(naam)) throw new Error('Onbekende articulatie.');
  const { kopie, element } = kopieMetElement(partituur, id);
  if (element?.soort !== 'noot') return kopie;
  const index = element.articulaties.indexOf(naam);
  if (index === -1) element.articulaties.push(naam);
  else element.articulaties.splice(index, 1);
  element.zekerheid = 1;
  return kopie;
}

export function zetOverbinding(partituur, id, aan) {
  const { kopie, element, partij, maatIndex, elementIndex } = kopieMetElement(partituur, id);
  if (element?.soort !== 'noot') return kopie;
  const volgende = volgendeGelijkeNoot(partij, maatIndex, elementIndex, element);
  if (aan && !volgende) {
    throw new Error('Er is geen noot met dezelfde toonhoogte om mee te verbinden.');
  }
  element.overbinding.begin = Boolean(aan);
  element.zekerheid = 1;
  if (volgende) {
    volgende.overbinding.eind = Boolean(aan);
    volgende.zekerheid = 1;
  }
  return kopie;
}

export function voegNootToe(partituur, id, toonhoogte) {
  return maakNoot(partituur, id, toonhoogte);
}

export function verwijderElement(partituur, id) {
  const { kopie, element, maat, elementIndex } = kopieMetElement(partituur, id);
  if (element?.soort !== 'noot') return kopie;
  maat.elementen[elementIndex] = {
    soort: 'rust',
    start: element.start,
    duur: element.duur,
    stem: element.stem,
    notenbalk: element.notenbalk,
    heleMaat: false,
    zekerheid: 1,
    ...(element.plek ? { plek: element.plek } : {}),
  };
  return kopie;
}
