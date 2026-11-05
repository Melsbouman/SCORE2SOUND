import { instrumentBijNaam } from './instrumenten.mjs';

export function partijNaamUitKop(regel) {
  let opgeschoond = regel
    .replace(/\s+(?:B♭|Bb|BE|Eb|E♭)[:.]*$/i, '')
    .replace(/^(\d+(?:nd|st|rd))\s+(?:B♭|Bb|BE|Eb|E♭)\s+/i, '$1 ')
    .replace(/\s*[:.\-]+\s*$/, '')
    .trim();

  const zonderRangtelwoorden = opgeschoond.replace(/\b\d+(?:nd|st|rd)\b/gi, '');
  if (/[A-Z]/.test(zonderRangtelwoorden) && zonderRangtelwoorden === zonderRangtelwoorden.toUpperCase()) {
    opgeschoond = opgeschoond
      .toLowerCase()
      .replace(/\b([a-zà-öø-ÿ])([a-zà-öø-ÿ]*)/g, (_, eerste, rest) => eerste.toUpperCase() + rest)
      .replace(/\b(\d+)(Nd|St|Rd)\b/g, (_, getal, achtervoegsel) => getal + achtervoegsel.toLowerCase());
  }

  return partijNaamUitKopBasis(opgeschoond);
}

export function splitsPartijenOpKoppen(partituur, paginaNamen) {
  const gebruikteIds = new Set(partituur.partijen.map(({ id }) => id));
  const partijen = partituur.partijen.flatMap((partij) => {
    const delen = [];
    let huidig = { ...partij, maten: [] };
    let pagina = 0;
    let vorigeNaam = paginaNamen[0] ?? partij.naam;

    for (const [plek, maat] of partij.maten.entries()) {
      if (plek > 0 && maat.paginabegin) pagina += 1;
      const paginaNaam = paginaNamen[pagina] ?? null;
      if (huidig.maten.length > 0 && paginaNaam && vorigeNaam && paginaNaam !== vorigeNaam) {
        delen.push(huidig);
        let id = partij.id;
        let volgnummer = 2;
        while (gebruikteIds.has(id)) {
          id = `${partij.id}-${volgnummer}`;
          volgnummer += 1;
        }
        gebruikteIds.add(id);
        huidig = { ...partij, id, naam: paginaNaam, maten: [] };
      }
      if (paginaNaam) vorigeNaam = paginaNaam;
      huidig.maten.push({ ...maat, index: huidig.maten.length, nummer: String(huidig.maten.length + 1) });
    }
    delen.push(huidig);
    return delen;
  });

  return { ...partituur, partijen };
}

function partijNaamUitKopBasis(regel) {
  if (typeof regel !== 'string') return null;
  const schoon = regel.trim().replace(/\s+/g, ' ');
  if (!schoon) return null;
  const naam = schoon.replace(/^(?:B♭|Bb|B flat|Eb|E♭|F|C|D|A)\s+/i, '').trim();
  if (!naam || !instrumentBijNaam(naam)) return null;
  return naam;
}
