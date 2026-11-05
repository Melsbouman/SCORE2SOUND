function maakRust(start, duur) {
  return {
    soort: 'rust', start, duur, stem: 1, notenbalk: 1,
    heleMaat: false, zekerheid: 1,
  };
}

export function herstelMaatrust(partituur, partijId, maatIndex) {
  const nieuw = structuredClone(partituur);
  const maat = nieuw.partijen.find((kandidaat) => kandidaat.id === partijId)?.maten[maatIndex];
  if (!maat || !maat.elementen.every((element) => element.stem === 1 && element.soort === 'rust')) {
    return nieuw;
  }

  const maatduur = maat.maatsoort.teller * 480 * 4 / maat.maatsoort.noemer;
  maat.elementen = [maakRust(0, maatduur)];
  maat.elementen[0].heleMaat = true;
  maat.maatrust = true;
  return nieuw;
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

export function voegAkkoordNootToe(partituur, partijId, maatIndex, start, toonhoogte) {
  const maat = partituur.partijen
    .find((kandidaat) => kandidaat.id === partijId)?.maten[maatIndex];
  const noot = maat?.elementen.find((element) => (
    element.soort === 'noot' && element.stem === 1 && element.start === start
  ));
  if (!noot) throw new Error('Er staat geen noot op deze plek.');

  const bestaatAl = maat.elementen.some((element) => (
    element.soort === 'noot' && element.start === start
    && element.toonhoogte.stap === toonhoogte.stap
    && element.toonhoogte.alter === toonhoogte.alter
    && element.toonhoogte.octaaf === toonhoogte.octaaf
  ));
  if (bestaatAl) throw new Error('Deze toonhoogte staat al in het akkoord.');

  const nieuw = structuredClone(partituur);
  const nieuweMaat = nieuw.partijen
    .find((kandidaat) => kandidaat.id === partijId).maten[maatIndex];
  const nieuweNoot = structuredClone(noot);
  nieuweNoot.toonhoogte = structuredClone(toonhoogte);
  nieuweNoot.akkoord = true;
  nieuweMaat.elementen.push(nieuweNoot);
  nieuweMaat.elementen.sort((a, b) => a.start - b.start);
  return nieuw;
}

export function schrijfNootMetOverbinding(
  partituur, partijId, maatIndex, start, duur, toonhoogte,
) {
  const partij = partituur.partijen.find((kandidaat) => kandidaat.id === partijId);
  if (!partij?.maten[maatIndex]) {
    return schrijfNoot(partituur, partijId, maatIndex, start, duur, toonhoogte);
  }
  const eersteMaat = partij.maten[maatIndex];
  const eersteMaatduur = eersteMaat.maatsoort.teller * 480 * 4 / eersteMaat.maatsoort.noemer;
  if (start + duur <= eersteMaatduur) {
    return schrijfNoot(partituur, partijId, maatIndex, start, duur, toonhoogte);
  }

  let nieuw = partituur;
  let huidigeMaatIndex = maatIndex;
  let huidigeStart = start;
  let resterendeDuur = duur;
  let eersteDeel = true;

  while (resterendeDuur > 0) {
    const maat = partij.maten[huidigeMaatIndex];
    if (!maat) throw new Error('Geen maat meer om in door te schrijven.');
    const maatduur = maat.maatsoort.teller * 480 * 4 / maat.maatsoort.noemer;
    const deelDuur = Math.min(resterendeDuur, maatduur - huidigeStart);
    if (deelDuur <= 0) {
      huidigeMaatIndex += 1;
      huidigeStart = 0;
      continue;
    }
    if (resterendeDuur > deelDuur && !partij.maten[huidigeMaatIndex + 1]) {
      throw new Error('Geen maat meer om in door te schrijven.');
    }

    nieuw = schrijfNoot(
      nieuw, partijId, huidigeMaatIndex, huidigeStart, deelDuur, toonhoogte,
    );
    const nieuweMaat = nieuw.partijen
      .find((kandidaat) => kandidaat.id === partijId).maten[huidigeMaatIndex];
    const nieuweNoot = nieuweMaat.elementen.find((element) => (
      element.soort === 'noot' && element.start === huidigeStart && element.duur === deelDuur
    ));
    nieuweNoot.overbinding = {
      begin: resterendeDuur > deelDuur,
      eind: !eersteDeel,
    };

    resterendeDuur -= deelDuur;
    eersteDeel = false;
    huidigeMaatIndex += 1;
    huidigeStart = 0;
  }

  return nieuw;
}
