// Audiveris laat een meermaatsrust aan het begin van een regel soms weg (Devils Galop 53, 89 en 97). Hij voegt die rust en de maat
// erna dan samen tot één maat met een maatstreep in het midden (mid-barline), en de eerste noot staat ver na de kop (sleutel en
// voortekening). Dit zoekt die plekken en geeft een melding op de maat, met het aantal maten als het cijfer erboven te lezen is.
// Hetzelfde teken (lege ruimte na de kop en een maatstreep in het midden) komt ook voor als Audiveris de eerste noten van een regel
// mist (Suite Gothique, Sand and Stars blad 6); zonder cijfer zegt de melding daarom dat er iets gemist is.
import { leesXmlBoom, kind, kinderen } from '../musicxml/xml.mjs';

const getal = (knoop, naam) => Number(knoop?.attr?.[naam]);
const LEEG = 8; // interlinies tussen het einde van de kop en de eerste noot; normaal is dat 2 tot 3

// Per systeem met zo'n weggelaten rust: { boven, onder (de buitenste notenlijnen), links (einde van de kop), rechts (vóór de eerste
// noot), stackLinks, stackRechts (de randen van de samengevoegde maat) }.
export function verlorenRustenVanBlad(xml) {
  const pagina = kind(leesXmlBoom(xml), 'page');
  const uit = [];
  for (const systeem of kinderen(pagina, 'system')) {
    const stack = kinderen(systeem, 'stack')[0];
    const deel = kinderen(systeem, 'part')[0];
    const balk = deel ? kinderen(deel, 'staff')[0] : null;
    const maat = deel ? kinderen(deel, 'measure')[0] : null;
    const kop = balk ? kind(balk, 'header') : null;
    const slot = stack ? kinderen(stack, 'slot')[0] : null;
    if (!slot || !maat || !kop || !kind(maat, 'mid-barline')) continue;
    const lijnen = kinderen(kind(balk, 'lines'), 'line').map((lijn) => getal(kinderen(lijn, 'point')[0], 'y')).filter(Number.isFinite);
    if (lijnen.length < 2) continue;
    const boven = Math.min(...lijnen);
    const onder = Math.max(...lijnen);
    const interlinie = (onder - boven) / (lijnen.length - 1);
    const eersteNoot = getal(stack, 'left') + getal(slot, 'x-offset');
    const kopEinde = getal(kop, 'stop');
    if (!(eersteNoot - kopEinde > LEEG * interlinie)) continue;
    uit.push({
      boven, onder, links: kopEinde, rechts: eersteNoot - 2 * interlinie, stackLinks: getal(stack, 'left'), stackRechts: getal(stack, 'right'),
    });
  }
  return uit;
}

// Het cijfer (2 tot 99) boven de lege plek: midden tussen links en rechts, de onderkant tussen anderhalve balkhoogte boven de
// balk en net daaronder, minstens een derde balk hoog. Het dichtst bij de balk wint.
function cijferBoven(plek, woorden) {
  const hoogte = plek.onder - plek.boven;
  let beste = null;
  for (const woord of woorden) {
    const tekst = String(woord.tekst ?? '').trim();
    if (!/^\d{1,2}$/.test(tekst) || Number(tekst) < 2) continue;
    const midden = woord.x + woord.breedte / 2;
    const voet = woord.y + woord.hoogte;
    if (midden < plek.links || midden > plek.rechts || woord.hoogte < hoogte / 3) continue;
    if (voet < plek.boven - 1.5 * hoogte || voet > plek.boven + 0.1 * hoogte) continue;
    if (!beste || voet > beste.voet) beste = { aantal: Number(tekst), voet };
  }
  return beste?.aantal ?? null;
}

// Meldingen (soort 'herkenning') voor de eerste partij. bladen: [{ nummer, xml }]; woordenPerBlad: zoals leesBlad of woordenUitPdf.
export function meldVerlorenRusten(partituur, bladen, woordenPerBlad) {
  const partij = partituur?.partijen?.[0];
  if (!partij) return [];
  const meldingen = [];
  for (const blad of bladen ?? []) {
    let plekken = [];
    try {
      plekken = blad.xml ? verlorenRustenVanBlad(blad.xml) : [];
    } catch {
      plekken = [];
    }
    const woorden = (woordenPerBlad ?? []).filter((item) => item?.blad === blad.nummer)
      .flatMap((item) => (item.regels ?? []).flatMap((regel) => regel.woorden ?? []));
    for (const plek of plekken) {
      const maat = partij.maten.find((kandidaat) => kandidaat.vak?.blad === blad.nummer && kandidaat.vak.links === plek.stackLinks
        && kandidaat.vak.rechts === plek.stackRechts && Math.abs(kandidaat.vak.boven - plek.boven) < plek.onder - plek.boven);
      if (!maat) continue;
      // Al aangevuld: vlak ervoor staat een ingevoegde rust zonder plek op het blad (de beginrust van Sand and Stars).
      const ervoor = partij.maten.slice(0, partij.maten.indexOf(maat)).findLast((kandidaat) => !kandidaat.verborgen);
      if (ervoor && !ervoor.vak && ervoor.elementen?.some((element) => element.soort === 'rust')) continue;
      const aantal = cijferBoven(plek, woorden);
      meldingen.push({
        soort: 'herkenning',
        ernst: 'waarschuwing',
        partij: partij.id,
        maat: maat.index,
        tekst: aantal
          ? `Maat ${maat.nummer}: aan het begin van deze regel staat waarschijnlijk een meermaatsrust van ${aantal} maten die niet is herkend. Voeg hem vóór deze maat in en kijk de maatnummers na.`
          : `Maat ${maat.nummer}: aan het begin van deze regel heeft de herkenning iets gemist (een rust of noten). Kijk deze regel op het blad na.`,
      });
    }
  }
  return meldingen;
}
