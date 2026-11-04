// Begin van een woord telt; korte of gewone woorden (ag, music, rights, edition, printed) alleen als het hele woord.
const COLOFONWOORDEN = ['copyright', 'copyr', '©', 'verlag', 'publishing', 'publishers', 'reserved', 'obrasso', 'switzerland', 'wiedlisbach'];
const COLOFONWOORDEN_EXACT = ['ag', 'music', 'rights', 'edition', 'printed'];

const isColofonwoord = (lettergreep) => {
  const woord = lettergreep.toLowerCase().replace(/[^a-z©]/g, '');
  return COLOFONWOORDEN_EXACT.includes(woord) || COLOFONWOORDEN.some((colofonwoord) => woord.startsWith(colofonwoord));
};

export function ruimZangtekstOp(partituur) {
  const nieuw = structuredClone(partituur);
  for (const partij of nieuw.partijen) {
    const noten = partij.maten.flatMap((maat) => maat.elementen)
      .filter((element) => element.soort === 'noot' && !element.overbinding?.eind);
    if (noten.length === 0) continue;
    const metTekst = noten.filter((noot) => noot.teksten?.length).length;
    for (const noot of noten) {
      if (!noot.teksten) continue;
      noot.teksten = noot.teksten.filter(({ lettergreep }) => !isColofonwoord(lettergreep));
      if (noot.teksten.length === 0) delete noot.teksten;
    }
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
