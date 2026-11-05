function aantalNotenbalken(partij) {
  const sleutels = partij.maten?.[0]?.sleutels ?? [];
  return Math.max(1, ...sleutels.map((sleutel) => sleutel.notenbalk || 1));
}

export function verdeelPartijenOverBladen(partituur, { maxNotenbalken = 14 } = {}) {
  const totaal = partituur.partijen.reduce((som, partij) => som + aantalNotenbalken(partij), 0);
  if (totaal <= maxNotenbalken) return [partituur];

  const groepen = [];
  let partijen = [];
  let balken = 0;
  for (const partij of partituur.partijen) {
    const aantal = aantalNotenbalken(partij);
    if (partijen.length > 0 && balken + aantal > maxNotenbalken) {
      groepen.push({ ...partituur, partijen });
      partijen = [];
      balken = 0;
    }
    partijen.push(partij);
    balken += aantal;
  }
  if (partijen.length > 0) groepen.push({ ...partituur, partijen });
  return groepen;
}

export function kiesBladindeling(partituur) {
  return verdeelPartijenOverBladen(partituur);
}
