const COMPONIST_CORRECTIES = new Map([
  ['Shoshtakowich', 'Shostakovich'],
  ['Shostakowich', 'Shostakovich'],
]);

export function herstelComponist(naam) {
  return naam.replace(/\b(?:Shoshtakowich|Shostakowich)\b/g, (waarde) => COMPONIST_CORRECTIES.get(waarde));
}

export function zetTitelgegevens(partituur, { titel, componist, arrangeur } = {}) {
  const kopie = structuredClone(partituur);

  if (typeof titel === 'string') kopie.titel = titel.trim();
  if (typeof componist === 'string') {
    const regels = componist.trim().split(/\r?\n/);
    const arrangeurregel = regels.find((regel) => /^arr\.\s+\S/i.test(regel.trim()));
    const componistregels = regels.filter((regel) => !/^arr\.\s+\S/i.test(regel.trim()));
    kopie.componist = herstelComponist(componistregels.join('\n').trim());
    if (arrangeurregel && arrangeur === undefined) kopie.arrangeur = arrangeurregel.trim().replace(/^arr\.\s+/i, '').trim();
  }
  if (typeof arrangeur === 'string') {
    const tekst = arrangeur.trim();
    if (tekst) kopie.arrangeur = tekst;
    else delete kopie.arrangeur;
  }

  return kopie;
}
