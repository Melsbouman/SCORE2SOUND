// Conceptstand van een gescande partituur. Na een scan (bron.herkenning) is de partituur een concept, tot je hem hebt
// nagekeken en op "Klaar met nakijken" drukt. De vlag staat bovenaan de partituur (nagekeken: true) en niet in bron,
// zodat de editor zijn geschiedenis niet wist.
import { onzekereElementen } from './corrigeren.mjs';

export function isConcept(partituur) {
  return Boolean(partituur?.bron?.herkenning) && partituur.nagekeken !== true;
}

// Hoeveel er nog na te kijken is: onzekere noten en rusten (zekerheid onder 0,8) en meldingen van de scan.
export function nakijkStand(partituur, meldingen) {
  return {
    onzeker: partituur ? onzekereElementen(partituur).length : 0,
    meldingen: (meldingen ?? []).filter((melding) => melding.soort === 'herkenning').length,
  };
}

export function conceptTekst(stand) {
  const noten = `${stand.onzeker} onzekere ${stand.onzeker === 1 ? 'noot' : 'noten'}`;
  const meldingen = `${stand.meldingen} ${stand.meldingen === 1 ? 'melding' : 'meldingen'} van de scan`;
  return `Concept uit een scan. Nog nakijken: ${noten} en ${meldingen}.`;
}

export function conceptTekstKort(stand) {
  if (stand.onzeker === 0 && stand.meldingen === 0) return 'Concept: klaar om af te ronden';
  const noten = `${stand.onzeker} onzekere ${stand.onzeker === 1 ? 'noot' : 'noten'}`;
  const meldingen = `${stand.meldingen} ${stand.meldingen === 1 ? 'melding' : 'meldingen'}`;
  return `Concept: ${noten}, ${meldingen}`;
}

export function markeerNagekeken(partituur) {
  return { ...partituur, nagekeken: true };
}
