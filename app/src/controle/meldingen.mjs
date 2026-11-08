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

export function vernieuwMeldingen(oude, partituur) {
  const herkenning = (oude ?? []).filter((m) => m.soort === 'herkenning' && !maatGoedgekeurd(partituur, m));
  return [...herkenning, ...controleerMaatduur(partituur)];
}
