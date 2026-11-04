const COLOFONWOORDEN = [
  'copyright', 'copyr', '©', 'verlag', 'publishing', 'publishers', 'rights',
  'reserved', 'printed', 'edition', 'obrasso', 'wiedlisbach', 'switzerland',
];

function regelTekst(noten) {
  return noten
    .map((noot) => noot.teksten[0].lettergreep)
    .filter((lettergreep) => lettergreep !== '-')
    .join(' ');
}

function vergelijkbareTekst(tekst) {
  return tekst.toLocaleLowerCase().replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
}

function bevatColofonwoord(tekst) {
  const woorden = tekst.toLocaleLowerCase().split(/[^\p{L}\p{N}©]+/u).filter(Boolean);
  return woorden.some((woord) => COLOFONWOORDEN.some((colofonwoord) => woord.startsWith(colofonwoord)));
}

function verzamelRegels(partij) {
  const regels = [];
  let huidigeRegel = [];
  let vorigeStart = null;

  const sluitRegel = () => {
    if (huidigeRegel.length > 0) {
      regels.push({ noten: huidigeRegel, tekst: regelTekst(huidigeRegel) });
      huidigeRegel = [];
    }
  };

  for (const maat of partij.maten) {
    const elementen = [...maat.elementen].sort((a, b) => (a.start ?? 0) - (b.start ?? 0));
    for (const element of elementen) {
      if (element.soort === 'noot' && element.teksten?.length) {
        if (vorigeStart !== null && (element.start ?? 0) < vorigeStart) sluitRegel();
        huidigeRegel.push(element);
        vorigeStart = element.start ?? 0;
      } else if (element.soort === 'noot' || element.soort === 'rust') {
        sluitRegel();
        vorigeStart = null;
      }
    }
  }
  sluitRegel();
  return regels;
}

export function scheidColofon(partituur) {
  const kopie = structuredClone(partituur);
  let colofon = null;

  for (const partij of kopie.partijen) {
    const regels = verzamelRegels(partij);
    const aantallen = new Map();
    for (const regel of regels) {
      const sleutel = vergelijkbareTekst(regel.tekst);
      aantallen.set(sleutel, (aantallen.get(sleutel) ?? 0) + 1);
    }

    const herhaald = (regel) => aantallen.get(vergelijkbareTekst(regel.tekst)) >= 2;
    let colofonRegels = regels.filter((regel) => {
      const aantalLettergrepen = regel.noten.filter((noot) => noot.teksten[0].lettergreep !== '-').length;
      return bevatColofonwoord(regel.tekst) || (aantalLettergrepen >= 3 && herhaald(regel));
    });
    // Een voetregel staat verspreid onder de noten van de laatste regel van de pagina: in een stuk zonder echte zangtekst
    // (minder dan 40% van de noten heeft tekst) hoort alles vanaf de eerste regel met een colofonwoord erbij.
    const noten = partij.maten.flatMap((maat) => maat.elementen).filter((e) => e.soort === 'noot' && !e.overbinding?.eind);
    const metTekst = noten.filter((noot) => noot.teksten?.length).length;
    const eerste = regels.findIndex((regel) => bevatColofonwoord(regel.tekst));
    if (eerste >= 0 && noten.length > 0 && metTekst / noten.length < 0.4) {
      const bekend = new Set([...colofonRegels, ...regels.slice(eerste)]);
      colofonRegels = regels.filter((regel) => bekend.has(regel));
    }

    for (const regel of colofonRegels) {
      for (const noot of regel.noten) delete noot.teksten;
    }
    if (colofon === null && colofonRegels.length > 0) {
      const unieke = [...new Set(colofonRegels.map((regel) => regel.tekst))];
      colofon = colofonRegels.some(herhaald) ? colofonRegels.at(-1).tekst : unieke.join(' ');
    }
  }

  // Een los teken zoals © is geen bruikbaar colofon: wel weghalen, niet bewaren.
  return { partituur: kopie, colofon: colofon && colofon.length >= 6 ? colofon : null };
}
