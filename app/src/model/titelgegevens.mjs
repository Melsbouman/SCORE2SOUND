export function zetTitelgegevens(partituur, { titel, componist, arrangeur } = {}) {
  const kopie = structuredClone(partituur);

  if (typeof titel === 'string') kopie.titel = titel.trim();
  if (typeof componist === 'string') kopie.componist = componist.trim();
  if (typeof arrangeur === 'string') {
    const tekst = arrangeur.trim();
    if (tekst) kopie.arrangeur = tekst;
    else delete kopie.arrangeur;
  }

  return kopie;
}
