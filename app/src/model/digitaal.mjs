// Digitale tweede mening. In een pdf uit Finale, Sibelius of Dorico staan de nootkoppen als tekens van een muzieklettertype op
// een exacte plek (server/pdftekens.mjs). Per maat tellen we de zwarte nootkoppen (kwartnoten en korter) en leggen dat naast de
// herkende noten. Wijkt het af, dan komt er een melding, zodat je die maat nakijkt. Bij een gescande pdf (geen tekens) gebeurt niets.

const MIN_KOPPEN = 20;

// De zwarte nootkop: het teken dat het vaakst voorkomt in de pdf (lettertype en code). Te weinig tekens: geen digitale pdf.
export function nootkopTeken(paginas) {
  const telling = new Map();
  for (const pagina of paginas ?? []) {
    for (const teken of pagina.tekens ?? []) {
      const sleutel = `${teken.lettertype}\^@${teken.code}`;
      telling.set(sleutel, (telling.get(sleutel) ?? 0) + 1);
    }
  }
  const [beste] = [...telling].sort((a, b) => b[1] - a[1]);
  if (!beste || beste[1] < MIN_KOPPEN) return null;
  const [lettertype, code] = beste[0].split('\^@');
  return { lettertype, code: Number(code) };
}

// Het aantal zwarte nootkoppen in het vak van een maat. Pdf-punten (linksonder) worden pixels van het blad (linksboven).
// Hulplijnen: tot anderhalve balkhoogte boven en onder de balk.
function koppenInVak(vak, pagina, blad, kop) {
  const sx = blad.breedte / pagina.breedte;
  const sy = blad.hoogte / pagina.hoogte;
  const hoogte = vak.onder - vak.boven;
  return pagina.tekens.filter((teken) => {
    if (teken.lettertype !== kop.lettertype || teken.code !== kop.code) return false;
    const x = teken.x * sx;
    const y = (pagina.hoogte - teken.y) * sy;
    return x >= vak.links && x < vak.rechts && y >= vak.boven - 1.5 * hoogte && y <= vak.onder + 1.5 * hoogte;
  }).length;
}

const zwarteNoten = (maat) => maat.elementen.filter((element) => element.soort === 'noot' && !element.voorslag && element.duur < 960).length;

// Geeft meldingen (soort 'herkenning') voor de maten waar de pdf een ander aantal zwarte nootkoppen heeft dan de herkenning.
// paginas: uitvoer van leesPdfTekens; de partituur moet bron.bladen (pixelmaten) en maat.vak hebben.
export function tweedeMening(partituur, paginas) {
  const kop = nootkopTeken(paginas);
  if (!kop) return [];
  const bladen = partituur?.bron?.bladen ?? [];
  const meldingen = [];
  for (const partij of partituur?.partijen ?? []) {
    for (const maat of partij.maten ?? []) {
      if (!maat.vak) continue;
      const pagina = paginas[maat.vak.blad - 1];
      const blad = bladen.find((item) => item.nummer === maat.vak.blad);
      if (!pagina || !blad || !(pagina.breedte > 0) || !(pagina.hoogte > 0)) continue;
      const koppen = koppenInVak(maat.vak, pagina, blad, kop);
      const noten = zwarteNoten(maat);
      if (koppen === noten) continue;
      meldingen.push({
        soort: 'herkenning',
        ernst: 'waarschuwing',
        partij: partij.id,
        maat: maat.index,
        tekst: `Maat ${maat.nummer}: de pdf heeft ${koppen} zwarte ${koppen === 1 ? 'nootkop' : 'nootkoppen'}, de herkenning ${noten}. Kijk deze maat na.`,
      });
    }
  }
  return meldingen;
}
