// Gedrukte maatnummers: aan het begin van een regel staat op het blad vaak het nummer van de eerste maat (klein, links boven de
// balk). Leg dat naast het nummer dat de herkenning die maat gaf. Verandert het verschil ten opzichte van de vorige regel, dan
// ontbreken er ergens maten (meestal een meermaatsrust zonder aantal) of zijn er te veel ingevoegd: daar komt een melding.
// woordenPerBlad: zoals leesBlad of woordenUitPdf ({ blad, regels: [{ woorden: [{ tekst, x, y, breedte, hoogte }] }] }).

// Het getal links boven de eerste maat van een regel: midden tussen vier balkhoogtes links en drie rechts van het begin van de
// maat, met de onderkant tussen anderhalve balkhoogte boven en net onder de bovenste lijn. Bij een meermaatsrust telt het cijfer
// midden boven de rust (het aantal maten) niet.
function nummerBijRegelbegin(vak, woorden, maat = null) {
  const hoogte = vak.onder - vak.boven;
  if (!(hoogte > 0)) return null;
  const kandidaten = woorden.filter((woord) => {
    const tekst = String(woord.tekst ?? '').trim();
    if (!/^\d{1,3}$/.test(tekst) || Number(tekst) < 2) return false;
    const midden = woord.x + woord.breedte / 2;
    const voet = woord.y + woord.hoogte;
    const breedte = vak.rechts - vak.links;
    if (maat?.maatrust > 1 && midden > vak.links + breedte / 4 && midden < vak.rechts - breedte / 4) return false;
    return midden >= vak.links - 4 * hoogte && midden <= vak.links + 3 * hoogte
      && voet >= vak.boven - 1.5 * hoogte && voet <= vak.boven + 0.2 * hoogte;
  });
  kandidaten.sort((a, b) => a.x - b.x);
  return kandidaten.length > 0 ? Number(String(kandidaten[0].tekst).trim()) : null;
}

// Zet bij elke regelbegin in de eerste partij het gedrukte nummer (gedruktNummer) als het er staat. vulOntbrekendeMaten gebruikt het
// als anker, net als een repetitiecijfer dat een maatnummer is. Geeft een nieuwe partituur.
export function zetGedrukteNummers(partituur, woordenPerBlad) {
  const kopie = structuredClone(partituur);
  const partij = kopie?.partijen?.[0];
  if (!partij) return kopie;
  const woordenVan = (blad) => (woordenPerBlad ?? []).filter((item) => item?.blad === blad).flatMap((item) => (item.regels ?? []).flatMap((regel) => regel.woorden ?? []));
  for (const maat of partij.maten ?? []) {
    if (!maat.regelbegin || !maat.vak) continue;
    const gedrukt = nummerBijRegelbegin(maat.vak, woordenVan(maat.vak.blad), maat);
    if (gedrukt != null) maat.gedruktNummer = gedrukt;
  }
  return kopie;
}

// Geeft { gelijk, regels, meldingen }: hoeveel regelbegins een gedrukt nummer hebben dat gelijk is aan dat van de herkenning,
// hoeveel er een gedrukt nummer hebben, en de meldingen (soort 'herkenning') waar het verschil verandert. Alleen de eerste partij.
export function vergelijkGedrukteMaatnummers(partituur, woordenPerBlad) {
  const partij = partituur?.partijen?.[0];
  const uitkomst = { gelijk: 0, regels: 0, meldingen: [] };
  if (!partij) return uitkomst;
  const woordenVan = (blad) => (woordenPerBlad ?? []).filter((item) => item?.blad === blad).flatMap((item) => (item.regels ?? []).flatMap((regel) => regel.woorden ?? []));
  // Bij een scan vanaf een latere pagina is de nummering van het begin onbekend: de eerste regel met een nummer is dan het
  // uitgangspunt, geen melding.
  let vorigVerschil = (partituur?.bron?.bladen?.[0]?.nummer ?? 1) > 1 ? null : 0;
  for (const maat of partij.maten ?? []) {
    if (!maat.regelbegin || !maat.vak || !/^\d+$/.test(String(maat.nummer ?? ''))) continue;
    const gedrukt = nummerBijRegelbegin(maat.vak, woordenVan(maat.vak.blad), maat);
    if (gedrukt == null) continue;
    uitkomst.regels += 1;
    const verschil = gedrukt - Number(maat.nummer);
    if (vorigVerschil === null) vorigVerschil = verschil;
    // Een sprong van meer dan 40 maten ten opzichte van de vorige regel is een verkeerd gelezen getal (864 voor 364).
    if (Math.abs(verschil - vorigVerschil) > 40) continue;
    if (verschil === 0) uitkomst.gelijk += 1;
    if (verschil !== vorigVerschil) {
      const hoeveel = Math.abs(verschil - vorigVerschil);
      uitkomst.meldingen.push({
        soort: 'herkenning',
        ernst: 'waarschuwing',
        partij: partij.id,
        maat: maat.index,
        tekst: verschil > vorigVerschil
          ? `Op het blad begint deze regel bij maat ${gedrukt}, de herkenning nummert hem ${maat.nummer}: er ${hoeveel === 1 ? 'ontbreekt 1 maat' : `ontbreken ${hoeveel} maten`} in de regels ervoor (kijk naar meermaatsrusten).`
          : `Op het blad begint deze regel bij maat ${gedrukt}, de herkenning nummert hem ${maat.nummer}: er ${hoeveel === 1 ? 'staat 1 maat' : `staan ${hoeveel} maten`} te veel in de regels ervoor.`,
      });
      vorigVerschil = verschil;
    }
  }
  return uitkomst;
}
