export function vulBeginRust(partituur) {
  const nieuw = structuredClone(partituur);
  const eersteMaat = nieuw.partijen?.[0]?.maten?.[0];
  const aanwijzing = eersteMaat?.elementen.find((element) =>
    element.soort === 'aanwijzing'
    && element.type === 'letter'
    && /^\d+$/.test(String(element.waarde).trim()));
  const aantal = aanwijzing ? Number(String(aanwijzing.waarde).trim()) : 0;

  if (aantal < 2 || aantal > 200) return nieuw;

  const verschuiving = aantal - 1;

  for (const partij of nieuw.partijen) {
    const oorspronkelijk = partij.maten[0];
    const teller = oorspronkelijk.maatsoort.teller;
    const noemer = oorspronkelijk.maatsoort.noemer;
    const ingevoegd = Array.from({ length: verschuiving }, (_, index) => ({
      ...structuredClone(oorspronkelijk),
      nummer: String(index + 1),
      index,
      opmaat: false,
      sleutels: index === 0 ? structuredClone(oorspronkelijk.sleutels) : [],
      toonsoort: structuredClone(oorspronkelijk.toonsoort),
      tempo: index === 0 ? oorspronkelijk.tempo : null,
      herhaling: { ...oorspronkelijk.herhaling, begin: false, eind: false },
      elementen: [{
        soort: 'rust', start: 0, duur: Math.round(teller * 1920 / noemer), stem: 1,
        notenbalk: 1, heleMaat: true, zekerheid: 1,
      }],
    }));
    for (const maat of ingevoegd.slice(1)) delete maat.toonsoort;

    for (const maat of partij.maten) {
      maat.index += verschuiving;
      if (/^-?\d+$/.test(String(maat.nummer))) {
        maat.nummer = String(Number(maat.nummer) + verschuiving);
      }
    }
    partij.maten.unshift(...ingevoegd);
  }

  return nieuw;
}
