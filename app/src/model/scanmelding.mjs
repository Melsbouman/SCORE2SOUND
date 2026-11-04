const MELDING =
  'Een kwart of meer van de noten is onzeker. Een scherpere scan (300 dpi, recht gehouden) geeft een beter resultaat.';

export function scanMelding(partituur) {
  let aantalNoten = 0;
  let aantalOnzekereNoten = 0;

  function telNoten(waarde) {
    if (Array.isArray(waarde)) {
      for (const onderdeel of waarde) telNoten(onderdeel);
      return;
    }

    if (waarde === null || typeof waarde !== 'object') return;

    if (waarde.soort === 'noot') {
      aantalNoten += 1;
      if (waarde.zekerheid < 0.8) aantalOnzekereNoten += 1;
    }

    for (const onderdeel of Object.values(waarde)) telNoten(onderdeel);
  }

  telNoten(partituur);

  if (aantalNoten >= 20 && aantalOnzekereNoten / aantalNoten > 0.25) {
    return MELDING;
  }

  return null;
}
