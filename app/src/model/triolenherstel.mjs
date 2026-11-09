// Een triool die Audiveris niet goed las. Drie achtsten onder één balk met een 3 erboven zijn samen één tel (480 tikken). Audiveris
// mist soms de 3 (drie gewone achtsten, Devils Galop maat 14) of leest de noten als kwarten in een triool (drie keer 320, maat 78
// tot 84). De maat is dan te lang. Is een maat precies zoveel te lang als één zo'n reeks van drie te veel heeft, dan wordt die reeks
// een triool van achtsten (160 tikken per noot), oranje (zekerheid 0,75), met een melding om na te kijken. Alleen bij één stem op
// één balk, en alleen in een maat in x/4 of x/2 met de triool op het begin van een tel: in 6/8 zijn drie achtsten gewoon één tel.
// Geeft { partituur, meldingen }.

const TRIOOL_ACHTSTE = 160;
const ZEKERHEID = 0.75;

const maatLengte = (maat) => ((maat.maatsoort?.teller ?? 4) * 1920) / (maat.maatsoort?.noemer ?? 4);

// Hoeveel tikken de reeks van drie (vanaf index) te veel heeft, of null als het geen mislezen triool is.
function teVeel(delen, index) {
  const drie = delen.slice(index, index + 3);
  if (drie.length < 3 || drie.some((deel) => deel.soort !== 'noot' || deel.duur !== drie[0].duur)) return null;
  if (drie.some((deel, plek) => plek > 0 && deel.start !== drie[plek - 1].start + drie[plek - 1].duur)) return null;
  if (drie[0].start % 480 !== 0) return null;
  // Kwarten in een triool (3 tegen 2): 960 tikken waar één tel hoort.
  if (drie[0].duur === 320 && drie.every((deel) => deel.tuplet?.aantal === 3 && deel.tuplet?.normaal === 2)) return 3 * 320 - 480;
  // Drie gewone achtsten onder één balk, zonder triool: 720 tikken waar één tel hoort.
  if (drie[0].duur === 240 && drie.every((deel) => !deel.tuplet) && drie.map((deel) => deel.balk).join() === 'begin,midden,eind') return 3 * 240 - 480;
  return null;
}

export function herstelTriolen(partituur) {
  const kopie = structuredClone(partituur);
  const meldingen = [];
  for (const partij of kopie.partijen ?? []) {
    for (const maat of partij.maten ?? []) {
      if (maat.verborgen || maat.maatrust > 1 || ![2, 4].includes(maat.maatsoort?.noemer ?? 4)) continue;
      const delen = maat.elementen.filter((element) => element.soort === 'noot' || element.soort === 'rust').sort((a, b) => a.start - b.start);
      if (delen.length < 3 || delen.some((deel) => (deel.stem ?? 1) !== 1 || (deel.notenbalk ?? 1) !== 1 || deel.akkoord)) continue;
      const laatste = delen.at(-1);
      const teLang = laatste.start + laatste.duur - maatLengte(maat);
      if (!(teLang > 0)) continue;
      const kandidaten = delen.map((_, index) => index).filter((index) => teVeel(delen, index) === teLang);
      if (kandidaten.length !== 1) continue;
      const drie = delen.slice(kandidaten[0], kandidaten[0] + 3);
      const begin = drie[0].start;
      const oudEinde = begin + 3 * drie[0].duur;
      for (const element of maat.elementen) if (element.start >= oudEinde) element.start -= teLang;
      drie.forEach((noot, plek) => {
        noot.start = begin + plek * TRIOOL_ACHTSTE;
        noot.duur = TRIOOL_ACHTSTE;
        noot.tuplet = { aantal: 3, normaal: 2, begin: plek === 0, eind: plek === 2 };
        noot.zekerheid = Math.min(noot.zekerheid ?? 1, ZEKERHEID);
      });
      meldingen.push({
        soort: 'herkenning',
        ernst: 'waarschuwing',
        partij: partij.id,
        maat: maat.index,
        tekst: `Maat ${maat.nummer}: de maat was te lang; drie noten zijn nu een triool van achtsten (oranje). Kijk na of dat klopt.`,
      });
    }
  }
  return { partituur: kopie, meldingen };
}
