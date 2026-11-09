// Meldingen na een bewerking: de controle op maatduur opnieuw, en de meldingen uit de herkenning laten staan.
// Een herkenningsmelding bij een maat verdwijnt pas als die maat is goedgekeurd (alle noten en rusten zekerheid 1).
import { controleerMaatduur } from './maatduur.mjs';

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
const inhoud = (maat) => JSON.stringify([maat.elementen, maat.maatsoort, maat.maatrust ?? null, Boolean(maat.verborgen)]);

function verschuif(melding, vorige, partituur) {
  if (!vorige || melding.partij == null || melding.maat == null) return melding;
  const oud = vorige.partijen?.find((p) => p.id === melding.partij)?.maten;
  const nieuw = partituur.partijen?.find((p) => p.id === melding.partij)?.maten;
  if (!oud || !nieuw || oud.length === nieuw.length) return melding;
  let begin = 0;
  while (begin < oud.length && begin < nieuw.length && inhoud(oud[begin]) === inhoud(nieuw[begin])) begin += 1;
  if (melding.maat < begin) return melding;
  const verschil = nieuw.length - oud.length;
  if (verschil < 0 && melding.maat < begin - verschil) return null;
  return { ...melding, maat: melding.maat + verschil };
}

export function vernieuwMeldingen(oude, partituur, vorige = null) {
  const herkenning = (oude ?? []).filter((m) => m.soort === 'herkenning')
    .map((m) => verschuif(m, vorige, partituur))
    .filter((m) => m && !maatGoedgekeurd(partituur, m));
  return [...herkenning, ...controleerMaatduur(partituur)];
}
