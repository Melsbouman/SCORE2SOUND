function maakRust(start, duur) {
  return {
    soort: 'rust', start, duur, stem: 1, notenbalk: 1,
    heleMaat: false, zekerheid: 1,
  };
}

export function schrijfNoot(partituur, partijId, maatIndex, start, duur, toonhoogte) {
  const partij = partituur.partijen.find((kandidaat) => kandidaat.id === partijId);
  const maat = partij?.maten[maatIndex];
  if (!maat) return structuredClone(partituur);

  const maatduur = maat.maatsoort.teller * 480 * 4 / maat.maatsoort.noemer;
  const einde = start + duur;
  if (start < 0 || einde > maatduur) throw new Error('De noot past niet in de maat.');

  const nieuw = structuredClone(partituur);
  const nieuweMaat = nieuw.partijen.find((kandidaat) => kandidaat.id === partijId).maten[maatIndex];
  const elementen = [];

  for (const element of nieuweMaat.elementen) {
    const elementEinde = element.start + element.duur;
    const overlapt = element.stem === 1 && element.notenbalk === 1
      && element.start < einde && elementEinde > start;
    if (!overlapt) {
      elementen.push(element);
      continue;
    }
    if ((element.soort === 'noot' || element.soort === 'rust') && element.start < start) {
      elementen.push(maakRust(element.start, start - element.start));
    }
    if ((element.soort === 'noot' || element.soort === 'rust') && elementEinde > einde) {
      elementen.push(maakRust(einde, elementEinde - einde));
    }
  }

  elementen.push({
    soort: 'noot', start, duur, stem: 1, notenbalk: 1,
    toonhoogte, akkoord: false,
    overbinding: { begin: false, eind: false }, articulaties: [],
    legato: { begin: false, eind: false }, versiering: null, zekerheid: 1,
  });
  elementen.sort((a, b) => a.start - b.start);
  nieuweMaat.elementen = elementen;
  delete nieuweMaat.maatrust;
  return nieuw;
}
