// Meldingen na een bewerking: de controle op maatduur opnieuw, en de meldingen uit de herkenning laten staan.
// Een herkenningsmelding bij een maat verdwijnt pas als die maat is goedgekeurd (alle noten en rusten zekerheid 1).
import { controleerMaatduur, maatsoortVermoedens } from './maatduur.mjs';

function maatGoedgekeurd(partituur, melding) {
  if (melding.partij == null || melding.maat == null) return false;
  const partij = partituur.partijen?.find((p) => p.id === melding.partij);
  const maat = partij?.maten?.find((m) => m.index === melding.maat) ?? partij?.maten?.[melding.maat];
  if (!maat) return false;
  const delen = maat.elementen.filter((e) => e.soort === 'noot' || e.soort === 'rust');
  return delen.length > 0 && delen.every((e) => e.zekerheid === 1);
}

// Een herkenningsmelding hoort bij een maat (index). Voegt een bewerking maten in of haalt ze weg, dan schuift de melding mee: tot
// de eerste maat die anders is blijft hij staan, daarna schuift hij op met het verschil in aantal. Een melding bij een maat die
// is weggehaald verdwijnt. Zonder de vorige partituur blijft de index zoals hij was.
// De plek op het blad (vak) hoort erbij: bij een scan is die per maat anders, ook bij een reeks gelijke rustmaten.
const inhoud = (maat) => JSON.stringify([maat.vak ?? null, maat.elementen, maat.maatsoort, maat.maatrust ?? null, Boolean(maat.verborgen)]);

function verschuif(melding, vorige, partituur) {
  if (!vorige || melding.partij == null || melding.maat == null) return melding;
  const oud = vorige.partijen?.find((p) => p.id === melding.partij)?.maten;
  const nieuw = partituur.partijen?.find((p) => p.id === melding.partij)?.maten;
  if (!oud || !nieuw || oud.length === nieuw.length) return melding;
  let begin = 0;
  while (begin < oud.length && begin < nieuw.length && inhoud(oud[begin]) === inhoud(nieuw[begin])) begin += 1;
  // Ook van achteren gelijk: het veranderde stuk ligt ertussen. In een reeks gelijke maten (zonder plek op het blad) kan het overal
  // zijn; dan het vroegste, zodat de vergelijking van voren niet te ver doorloopt.
  let eind = 0;
  while (eind < oud.length && eind < nieuw.length && inhoud(oud[oud.length - 1 - eind]) === inhoud(nieuw[nieuw.length - 1 - eind])) eind += 1;
  begin = Math.min(begin, oud.length - eind, nieuw.length - eind);
  if (melding.maat < begin) return melding;
  const verschil = nieuw.length - oud.length;
  if (verschil < 0 && melding.maat < begin - verschil) return null;
  return { ...melding, maat: melding.maat + verschil };
}

export function vernieuwMeldingen(oude, partituur, vorige = null) {
  const herkenning = (oude ?? []).filter((m) => m.soort === 'herkenning')
    .map((m) => verschuif(m, vorige, partituur))
    .filter((m) => m && !maatGoedgekeurd(partituur, m));
  return [...herkenning, ...controleerMaatduur(partituur), ...maatsoortVermoedens(partituur)];
}
