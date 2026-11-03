const STEMMINGEN = {
  '-2': 'B♭',
  '-3': 'A',
  '-5': 'G',
  '-7': 'F',
  '-9': 'E♭',
  '-14': 'B♭',
  '-21': 'E♭',
};

export function stemmingNaam(transpositie) {
  return STEMMINGEN[String(transpositie?.chromatisch)] ?? null;
}

export function partijTitel(partij) {
  if (!partij.naam?.trim()) return '';

  const stemming = stemmingNaam(partij.instrument?.transpositie);
  return stemming ? `${partij.naam} in ${stemming}` : partij.naam;
}
