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
        invoegen: { aantal: aantal || null },
      });
    }
  }
  return meldingen;
}

const maatLengte = (maat) => ((maat.maatsoort?.teller ?? 4) * 1920) / (maat.maatsoort?.noemer ?? 4);

// Invoegen als het aantal te lezen is: vóór de samengevoegde maat komt een meermaatsrust (oranje, zekerheid 0,75) met zijn plek op
// het blad (van het einde van de kop tot vóór de eerste noot) en N-1 verborgen maten. De rust neemt het begin van de regel over:
// sleutel, regel- en paginabegin, tempo en de repetitieletter (een kader aan het begin van de regel staat boven de rust). Alle
// ingevoegde maten zijn `ingevoegd` (geen eigen stapel bij Audiveris). Zonder cijfer blijft het bij een melding (meldVerlorenRusten):
// hetzelfde teken komt ook voor als Audiveris noten miste. Draait na de letterstap en vóór herstelHerkenning. De rust krijgt
// verlorenRust: N, zodat meldIngevoegdeRusten aan het eind (als de nummering vaststaat) de meldingen kan maken.
export function voegVerlorenRustenIn(partituur, bladen, woordenPerBlad) {
  const kopie = structuredClone(partituur);
  if (!kopie.partijen?.length) return kopie;
  // Per partij de invoegingen: gesplitste partijen (een boek met partijen na elkaar) lopen niet per maat gelijk, dus elke partij
  // zoekt haar eigen samengevoegde maat op het blad.
  const perPartij = new Map(kopie.partijen.map((partij) => [partij, []]));
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
      const opStapel = (kandidaat) => kandidaat.vak?.blad === blad.nummer && kandidaat.vak.links === plek.stackLinks
        && kandidaat.vak.rechts === plek.stackRechts;
      const gevonden = kopie.partijen.map((partij) => ({
        partij,
        index: partij.maten.findIndex((kandidaat) => opStapel(kandidaat) && Math.abs(kandidaat.vak.boven - plek.boven) < plek.onder - plek.boven),
      }));
      // Een systeem met meer balken (een partituur): de andere partijen hebben een maat op dezelfde stapel maar op een andere balk.
      // Die zijn niet nagekeken, dus niets invoegen (de melding blijft); anders lopen de partijen uit de pas.
      if (gevonden.some(({ partij, index }) => index < 0 && partij.maten.some(opStapel))) continue;
      const aantal = cijferBoven(plek, woorden);
      if (!aantal) continue;
      for (const { partij, index } of gevonden) {
        if (index < 0) continue;
        const ervoor = partij.maten.slice(0, index).findLast((kandidaat) => !kandidaat.verborgen);
        if (ervoor && !ervoor.vak && ervoor.elementen?.some((element) => element.soort === 'rust')) continue;
        perPartij.get(partij).push({ index, aantal, plek, blad: blad.nummer });
      }
    }
  }
  for (const [partij, invoegingen] of perPartij) {
    for (const { index, aantal, plek, blad } of invoegingen.sort((a, b) => b.index - a.index)) {
      const maat = partij.maten[index];
      const nummer = Number(maat.nummer);
      const rust = { soort: 'rust', start: 0, duur: maatLengte(maat), stem: 1, notenbalk: 1, heleMaat: true };
      // Alleen een kader dat boven de lege plek of het begin van de regel staat, hoort bij de rust; een kader boven de inzet erna
      // blijft bij de maat. Zonder plek (een letter van Audiveris) blijft de letter staan.
      const bijRust = (element) => element.soort === 'aanwijzing'
        && ((element.type === 'letter' && Number.isFinite(element.plek?.x) && element.plek.x < plek.rechts)
          || (element.type === 'tempo' && element.start === 0));
      const naarRust = maat.elementen.filter(bijRust);
      const rustMaat = {
        ...structuredClone(maat),
        ...(aantal > 1 ? { maatrust: aantal } : {}),
        ingevoegd: true,
        verlorenRust: aantal,
        // Een herhaalteken of segno aan het begin van de regel staat vóór de rust.
        herhaling: { begin: Boolean(maat.herhaling?.begin), eind: false, keer: maat.herhaling?.keer ?? 2 },
        vak: { blad, links: plek.links, rechts: plek.rechts, boven: maat.vak?.boven ?? plek.boven, onder: maat.vak?.onder ?? plek.onder },
        elementen: [{ ...rust, zekerheid: 0.75 }, ...naarRust],
      };
      for (const veld of ['volta', 'verborgen', 'maatstreep']) delete rustMaat[veld];
      const verborgenMaten = Array.from({ length: aantal - 1 }, (_, plekInRust) => {
        const verborgen = {
          ...structuredClone(rustMaat),
          ...(Number.isInteger(nummer) ? { nummer: String(nummer + plekInRust + 1) } : {}),
          verborgen: true,
          regelbegin: false,
          paginabegin: false,
          tempo: null,
          sleutels: [],
          herhaling: { begin: false, eind: false, keer: 2 },
          elementen: [{ ...rust, zekerheid: 1 }],
        };
        for (const veld of ['maatrust', 'vak', 'verlorenRust', 'sprong']) delete verborgen[veld];
        return verborgen;
      });
      maat.elementen = maat.elementen.filter((element) => !naarRust.includes(element));
      maat.sleutels = [];
      maat.regelbegin = false;
      maat.paginabegin = false;
      maat.tempo = null;
      if (maat.herhaling) maat.herhaling = { ...maat.herhaling, begin: false };
      delete maat.sprong;
      if (maat.vak) maat.vak = { ...maat.vak, links: plek.rechts };
      partij.maten.splice(index, 0, rustMaat, ...verborgenMaten);
      if (Number.isInteger(nummer)) {
        for (const volgende of partij.maten.slice(index + aantal)) {
          const volgendNummer = Number(volgende.nummer);
          if (Number.isInteger(volgendNummer)) volgende.nummer = String(volgendNummer + aantal);
        }
      }
      partij.maten.forEach((huidige, positie) => {
        huidige.index = positie;
      });
    }
  }
  return kopie;
}

// Meldingen voor de ingevoegde rusten (verlorenRust), in de eerste partij, met de nummering zoals die aan het eind van de keten is.
export function meldIngevoegdeRusten(partituur) {
  const partij = partituur?.partijen?.[0];
  return (partij?.maten ?? []).filter((maat) => maat.verlorenRust && !maat.verborgen).map((maat) => ({
    soort: 'herkenning',
    ernst: 'waarschuwing',
    partij: partij.id,
    maat: maat.index,
    tekst: `Maat ${maat.nummer}: aan het begin van deze regel stond een meermaatsrust van ${maat.verlorenRust} maten die Audiveris wegliet; de app heeft hem ingevoegd (oranje). Kijk hem na.`,
  }));
}
