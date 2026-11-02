export function controleerMaatnummers(partituur) {
  const meldingen = [];

  for (const partij of partituur.partijen ?? []) {
    let vorigNummer = null;
    let verwachteStap = 1;

    for (const maat of partij.maten ?? []) {
      if (maat.verborgen) continue;

      const nummerTekst = String(maat.nummer ?? "");
      if (!/^\d+$/.test(nummerTekst)) continue;

      const nummer = Number(nummerTekst);
      if (vorigNummer !== null && nummer !== vorigNummer + verwachteStap) {
        meldingen.push({
          soort: "maatnummer",
          ernst: "waarschuwing",
          partij: partij.id,
          maat: maat.nummer,
          tekst: `Maat ${maat.nummer} volgt niet op maat ${vorigNummer}.`,
        });
      }

      vorigNummer = nummer;
      const maatrust = Number(maat.maatrust);
      verwachteStap = Number.isInteger(maatrust) && maatrust > 0 ? maatrust : 1;
    }
  }

  return meldingen;
}
