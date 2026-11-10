// Een liggende scan rechtop zetten, vóór de eigen herkenning. Sommige pdf's hebben een pagina met een scan van twee bladzijden
// naast elkaar die 90 graden gedraaid staat (zoals Masque). Werkwijze: staan er op het blad notenbalken, dan blijft het zoals het
// is. Anders wordt het blad 90 en 270 graden gedraaid en gaat de draaiing met de meeste notenbalken door. Is het gedraaide blad
// meer dan 1,2 keer zo breed als hoog, dan zijn het twee bladzijden: die worden geknipt op de witste kolom in het middelste
// vijfde deel, en alleen de helften met notenbalken blijven over. Vindt geen draaiing notenbalken, dan komt het blad ongewijzigd
// terug. Elk teruggegeven blad ({ breedte, hoogte, pixels }, 0 = zwart) krijgt herkomst: { draai, helft }.
import { zwartWit, papierDrempel } from './beeld.mjs';
import { meetSchaal } from './schaal.mjs';
import { vindBalken } from './raster.mjs';
import { draai } from './bladen.mjs';

// De notenbalken op een grijs blad (ook met een drempel net onder het papier, voor lichtgrijze lijnen).
function balkenVan(grijs) {
  try {
    let zw = zwartWit(grijs);
    let raster = vindBalken(zw, meetSchaal(zw));
    if (!raster.balken.length) {
      zw = zwartWit(grijs, { drempel: papierDrempel(grijs.pixels) });
      raster = vindBalken(zw, meetSchaal(zw));
    }
    return raster.balken;
  } catch {
    return [];
  }
}
// De totale lengte van de notenbalken: een echte balk loopt over het blad, losse treffers in een gedraaid blad zijn kort.
const lengteVan = (balken) => balken.reduce((som, balk) => som + Math.max(0, balk.rechts - balk.links), 0);

// Een stuk van een blad: kolommen van x0 tot x1.
function kolommen(grijs, x0, x1) {
  const breedte = x1 - x0;
  const pixels = new Uint8Array(breedte * grijs.hoogte);
  for (let y = 0; y < grijs.hoogte; y += 1) {
    pixels.set(grijs.pixels.subarray(y * grijs.breedte + x0, y * grijs.breedte + x1), y * breedte);
  }
  return { breedte, hoogte: grijs.hoogte, pixels };
}

// De witste kolom in het middelste vijfde deel (bij gelijke kolommen de middelste ervan).
function knipPlek(grijs) {
  const van = Math.floor(grijs.breedte * 0.4);
  const tot = Math.max(van + 1, Math.ceil(grijs.breedte * 0.6));
  let beste = -1;
  let kandidaten = [];
  for (let x = van; x < tot && x < grijs.breedte; x += 1) {
    let som = 0;
    for (let y = 0; y < grijs.hoogte; y += 1) som += grijs.pixels[y * grijs.breedte + x];
    if (som > beste) {
      beste = som;
      kandidaten = [x];
    } else if (som === beste) {
      kandidaten.push(x);
    }
  }
  return kandidaten[Math.floor(kandidaten.length / 2)];
}

export function zetRechtop(grijs) {
  const onveranderd = (blad) => ({ ...blad, herkomst: { draai: 0, helft: null } });
  // Staat er een notenbalk die minstens half zo breed is als het blad, dan staat het rechtop en proberen we geen draaiingen
  // (dat kost bij elk gewoon blad tijd). Een gedraaid blad geeft hooguit korte losse treffers.
  const eigen = balkenVan(grijs);
  if (eigen.some((balk) => balk.rechts - balk.links >= grijs.breedte * 0.5)) return [onveranderd(grijs)];
  let beste = null;
  // Anders draait alleen een duidelijk betere draaiing het blad om.
  let aantal = lengteVan(eigen) * 1.5;
  for (const graden of [90, 270]) {
    const gedraaid = draai(grijs, graden);
    const balken = balkenVan(gedraaid);
    const n = lengteVan(balken);
    if (n > aantal && balken.length > 0) {
      aantal = n;
      beste = { graden, gedraaid };
    }
  }
  if (!beste) return [onveranderd(grijs)];
  const { graden, gedraaid } = beste;
  if (gedraaid.breedte <= 1.2 * gedraaid.hoogte) return [{ ...gedraaid, herkomst: { draai: graden, helft: null } }];
  const x = knipPlek(gedraaid);
  const helften = [
    ['links', kolommen(gedraaid, 0, x)],
    ['rechts', kolommen(gedraaid, x, gedraaid.breedte)],
  ];
  const uit = helften
    .filter(([, blad]) => blad.breedte > 0 && balkenVan(blad).length > 0)
    .map(([helft, blad]) => ({ ...blad, herkomst: { draai: graden, helft } }));
  return uit.length ? uit : [{ ...gedraaid, herkomst: { draai: graden, helft: null } }];
}
