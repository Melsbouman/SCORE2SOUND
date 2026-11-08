// Digitale tweede mening. In een pdf uit Finale, Sibelius of Dorico staan de nootkoppen als tekens van een muzieklettertype op
// een exacte plek (server/pdftekens.mjs). Per maat tellen we de zwarte nootkoppen (kwartnoten en korter) en leggen dat naast de
// herkende noten. Wijkt het af, dan komt er een melding, zodat je die maat nakijkt. Bij een gescande pdf (geen tekens) gebeurt niets.

const MIN_KOPPEN = 20;
// Een gescande pdf heeft soms een onzichtbare tekstlaag (Helvetica, Times, ...). Spaties, letters en tekstlettertypen zijn nooit
// een nootkop; anders zou de tweede mening tekst als noten tellen.
const TEKSTLETTERTYPE = /helvetica|arial|times|courier|glyphless|calibri|verdana|georgia|tahoma/i;
const isTekst = (teken) => TEKSTLETTERTYPE.test(teken.lettertype) || teken.code === 32
  || (teken.code >= 65 && teken.code <= 90) || (teken.code >= 97 && teken.code <= 122);

// De zwarte nootkop: het teken dat het vaakst voorkomt in de pdf (lettertype en code). Te weinig tekens: geen digitale pdf.
export function nootkopTeken(paginas) {
  const telling = new Map();
  for (const pagina of paginas ?? []) {
    for (const teken of pagina.tekens ?? []) {
      if (isTekst(teken)) continue;
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

// De tekst uit een digitale pdf in de vorm van de tekstherkenning (zoals leesBlad): per blad regels met woorden en hun vak in
// pixels van het blad. Zo kan de meermaatsrust-stap het cijfer boven een rustbalk uit de pdf lezen, ook als het klein gedrukt is.
// Tekens met dezelfde basislijn en grootte vormen een regel; een gat van meer dan een derde letter begint een nieuw woord.
// Het muzieklettertype (de nootkoppen) doet niet mee. Breedte van een teken: ongeveer een halve letter; hoogte: 0,7 letter.
export function woordenUitPdf(paginas, bladen) {
  const kop = nootkopTeken(paginas);
  return (paginas ?? []).map((pagina) => {
    const blad = (bladen ?? []).find((item) => item.nummer === pagina.pagina);
    if (!blad || !(pagina.breedte > 0) || !(pagina.hoogte > 0)) return { blad: pagina.pagina, regels: [] };
    const sx = blad.breedte / pagina.breedte;
    const sy = blad.hoogte / pagina.hoogte;
    const tekens = pagina.tekens
      .filter((teken) => !(kop && teken.lettertype === kop.lettertype) && teken.code > 32 && teken.code < 127)
      .sort((a, b) => b.y - a.y || a.x - b.x);
    const regels = [];
    for (const teken of tekens) {
      const regel = regels.find((r) => Math.abs(r.y - teken.y) < 0.3 * teken.grootte && Math.abs(r.grootte - teken.grootte) < 0.5);
      if (regel) regel.tekens.push(teken);
      else regels.push({ y: teken.y, grootte: teken.grootte, tekens: [teken] });
    }
    return {
      blad: pagina.pagina,
      regels: regels.map((regel) => {
        const woorden = [];
        for (const teken of regel.tekens.sort((a, b) => a.x - b.x)) {
          const laatste = woorden.at(-1);
          if (laatste && teken.x - laatste.eind <= regel.grootte / 3) {
            laatste.tekst += String.fromCharCode(teken.code);
            laatste.eind = teken.x + regel.grootte / 2;
          } else {
            woorden.push({ tekst: String.fromCharCode(teken.code), begin: teken.x, eind: teken.x + regel.grootte / 2 });
          }
        }
        const hoogte = 0.7 * regel.grootte * sy;
        const basis = (pagina.hoogte - regel.y) * sy;
        const vakken = woorden.map((woord) => ({
          tekst: woord.tekst,
          x: Math.round(woord.begin * sx),
          y: Math.round(basis - hoogte),
          breedte: Math.round((woord.eind - woord.begin) * sx),
          hoogte: Math.round(hoogte),
        }));
        return { tekst: vakken.map((woord) => woord.tekst).join(' '), woorden: vakken };
      }),
    };
  });
}
