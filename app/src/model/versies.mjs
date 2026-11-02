// Vergelijkt twee versies van een partituur, per partij en per maat.
// Zekerheid en plek komen uit de herkenning en zeggen niets over de muziek; die tellen niet mee.
const alleenMuziek = (sleutel, waarde) => (sleutel === 'zekerheid' || sleutel === 'plek' ? undefined : waarde);
const tekst = (waarde) => JSON.stringify(waarde ?? null, alleenMuziek);

export function verschillen(oud, nieuw) {
  const partijen = [];
  for (const partij of nieuw.partijen) {
    const { id, naam } = partij;
    const eerder = oud.partijen.find((p) => p.id === id);
    if (!eerder) {
      partijen.push({ id, naam, soort: 'nieuw', maten: [] });
      continue;
    }
    const maten = [];
    for (let index = 0; index < Math.max(eerder.maten.length, partij.maten.length); index += 1) {
      if (tekst(eerder.maten[index]) !== tekst(partij.maten[index])) maten.push(index);
    }
    if (maten.length > 0 || tekst(eerder.instrument) !== tekst(partij.instrument)) partijen.push({ id, naam, soort: 'gewijzigd', maten });
  }
  for (const { id, naam } of oud.partijen) {
    if (!nieuw.partijen.some((p) => p.id === id)) partijen.push({ id, naam, soort: 'weg', maten: [] });
  }
  return { partijen, maten: [...new Set(partijen.flatMap((p) => p.maten))].sort((a, b) => a - b) };
}

// De maatnummers als korte tekst: '12, 15-16'. Een index zonder maat valt weg.
export function maatReeks(indexen, maten) {
  const reeksen = [];
  for (const index of indexen) {
    const nummer = maten[index]?.nummer;
    if (nummer === undefined) continue;
    const laatste = reeksen.at(-1);
    if (laatste?.tot === index - 1) Object.assign(laatste, { tot: index, eind: nummer });
    else reeksen.push({ tot: index, begin: nummer, eind: nummer });
  }
  return reeksen.map(({ begin, eind }) => (begin === eind ? begin : `${begin}-${eind}`)).join(', ');
}
