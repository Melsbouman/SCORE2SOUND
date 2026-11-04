export function zetTitelgegevens(partituur, { titel, componist, arrangeur } = {}) {
  const kopie = structuredClone(partituur);

  if (typeof titel === 'string') kopie.titel = titel.trim();
  if (typeof componist === 'string') {
    const regels = componist.trim().split(/\r?\n/);
    const arrangeurregel = regels.find((regel) => /^arr\.\s+\S/i.test(regel.trim()));
    const componistregels = regels.filter((regel) => !/^arr\.\s+\S/i.test(regel.trim()));
    const correcties = new Map([['Shoshtakowich', 'Shostakovich']]);
    kopie.componist = componistregels.join('\n').trim().replace(/\bShoshtakowich\b/g, (naam) => correcties.get(naam));
    if (arrangeurregel && arrangeur === undefined) kopie.arrangeur = arrangeurregel.trim().replace(/^arr\.\s+/i, '').trim();
  }
  if (typeof arrangeur === 'string') {
    const tekst = arrangeur.trim();
    if (tekst) kopie.arrangeur = tekst;
    else delete kopie.arrangeur;
  }

  return kopie;
}
