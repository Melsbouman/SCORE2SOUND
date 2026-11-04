const COLOFONWOORDEN = ['copyright', 'copyr', '©', 'verlag', 'publishing', 'publishers', 'rights', 'reserved', 'music',
  'obrasso', 'switzerland', 'wiedlisbach', 'printed', 'edition', 'ag'];

const isColofonwoord = (lettergreep) => {
  const woord = lettergreep.toLowerCase().replace(/[^a-z©]/g, '');
  return COLOFONWOORDEN.some((colofonwoord) => woord.startsWith(colofonwoord));
};

export function ruimZangtekstOp(project) {
  const resultaat = structuredClone(project);
  for (const partij of resultaat.partijen) {
    const noten = partij.maten.flatMap((maat) => maat.elementen).filter((element) => element.soort === 'noot');
    const aantalNotenMetTekst = noten.filter((noot) => noot.teksten?.length).length;
    for (const noot of noten) {
      if (!noot.teksten) continue;
      noot.teksten = noot.teksten.filter(({ lettergreep }) => !isColofonwoord(lettergreep));
      if (noot.teksten.length === 0) delete noot.teksten;
    }
    if (aantalNotenMetTekst / noten.length < 0.4) {
      for (const noot of noten) delete noot.teksten;
    }
  }
  return resultaat;
}
