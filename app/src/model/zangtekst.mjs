export function ruimZangtekstOp(partituur) {
  const nieuw = structuredClone(partituur);
  for (const partij of nieuw.partijen) {
    const noten = partij.maten.flatMap((maat) => maat.elementen)
      .filter((element) => element.soort === 'noot' && !element.overbinding?.eind);
    if (noten.length === 0) continue;
    const metTekst = noten.filter((noot) => noot.teksten?.length).length;
    if (metTekst / noten.length < 0.4) {
      for (const maat of partij.maten) {
        for (const element of maat.elementen) {
          if (element.soort === 'noot') delete element.teksten;
        }
      }
    }
  }
  return nieuw;
}
