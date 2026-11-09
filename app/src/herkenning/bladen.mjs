// Grijze bladzijden voor de herkenning uit een pdf (de gescande beelden erin) of uit een losse foto of afbeelding. Werkt in de
// browser en in Node: een JPEG of PNG ontcijferen doet de aanroeper (`ontcijfer(bytes, type, { foto })` geeft { breedte,
// hoogte, pixels } in grijs); in de browser met createImageBitmap en een OffscreenCanvas.
// Een digitale pdf (getekend met lijnen en lettertekens, zonder gescand beeld) kan de herkenning nog niet lezen: dan geeft het
// een fout met `code: 'geen-beelden'`, zodat de app kan terugvallen op de server.
import { openPdf } from '../pdf/lezer.mjs';
import { beeldenOpPagina } from '../pdf/beelden.mjs';

// Breder dan dit (pixels) verkleint de herkenning eerst: sneller, en de stappen werken vanaf ongeveer 8 pixels per lijnafstand.
export const MAX_BREEDTE = 2600;
// Net als de server: hooguit 40 bladzijden per keer.
export const MAX_BLADEN = 40;

export function isPdf(bytes) {
  return bytes.length >= 5 && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46 && bytes[4] === 0x2d;
}

function fout(tekst, code) {
  const uit = new Error(tekst);
  uit.code = code;
  return uit;
}

// Een reeks bladzijden uit tekst als "1-3, 5", "1-4 7" of "3-1" (leeg is alles), voor `van` bladzijden. Bladzijden die er niet
// zijn vallen weg; staat er wel iets maar bestaat niets ervan, dan is de lijst leeg.
export function leesBladReeks(tekst, van) {
  const gekozen = new Set();
  const delen = String(tekst ?? '').split(/[\s,;]+/).filter(Boolean);
  for (const deel of delen) {
    let [begin, eind] = deel.split('-').map((getal) => Number.parseInt(getal, 10));
    if (!Number.isFinite(begin)) continue;
    if (!Number.isFinite(eind)) eind = begin;
    if (eind < begin) [begin, eind] = [eind, begin];
    for (let nummer = Math.max(1, begin); nummer <= Math.min(van, eind); nummer += 1) gekozen.add(nummer);
  }
  if (!delen.length) return Array.from({ length: van }, (_, i) => i + 1);
  return [...gekozen].sort((a, b) => a - b);
}

// Verkleinen met een geheel getal (het gemiddelde van elk blok), tot hooguit maxBreedte breed.
export function verklein(grijs, maxBreedte = MAX_BREEDTE) {
  const factor = Math.ceil(grijs.breedte / maxBreedte);
  if (factor <= 1) return grijs;
  const breedte = Math.floor(grijs.breedte / factor);
  const hoogte = Math.floor(grijs.hoogte / factor);
  const pixels = new Uint8Array(breedte * hoogte);
  for (let y = 0; y < hoogte; y += 1) {
    for (let x = 0; x < breedte; x += 1) {
      let som = 0;
      for (let dy = 0; dy < factor; dy += 1) {
        const rij = (y * factor + dy) * grijs.breedte + x * factor;
        for (let dx = 0; dx < factor; dx += 1) som += grijs.pixels[rij + dx];
      }
      pixels[y * breedte + x] = Math.round(som / (factor * factor));
    }
  }
  return { breedte, hoogte, pixels };
}

// Een bladzijde een kwart, half of driekwart slag met de klok mee draaien (de /Rotate van een pdf-bladzijde).
export function draai(grijs, graden) {
  const slag = ((Math.round(graden / 90) % 4) + 4) % 4;
  if (!slag) return grijs;
  const { breedte, hoogte, pixels } = grijs;
  const nieuwBreedte = slag === 2 ? breedte : hoogte;
  const nieuwHoogte = slag === 2 ? hoogte : breedte;
  const uit = new Uint8Array(breedte * hoogte);
  for (let y = 0; y < hoogte; y += 1) {
    for (let x = 0; x < breedte; x += 1) {
      let nx;
      let ny;
      if (slag === 1) { nx = hoogte - 1 - y; ny = x; } else if (slag === 2) { nx = breedte - 1 - x; ny = hoogte - 1 - y; } else { nx = y; ny = breedte - 1 - x; }
      uit[ny * nieuwBreedte + nx] = pixels[y * breedte + x];
    }
  }
  return { breedte: nieuwBreedte, hoogte: nieuwHoogte, pixels: uit };
}

// Alle beelden van een bladzijde samen op hun plek (een scan zit soms in stroken, of in lagen: een achtergrond en een masker
// met de inkt). De plaatsing komt uit de pdf (matrix [a b c d e f]: het eenheidsvierkant van het beeld naar de bladzijde). De
// resolutie is die van het scherpste beeld, hooguit maxBreedte breed. Per pixel het gemiddelde van de beeldpixels eronder (dunne
// lijnen blijven zo zichtbaar bij verkleinen); waar beelden over elkaar vallen, wint de donkerste.
export function plaatsBeelden(maat, beelden, maxBreedte = MAX_BREEDTE) {
  const [x0, y0, x1, y1] = maat;
  const paginaBreedte = Math.abs(x1 - x0) || 612;
  const paginaHoogte = Math.abs(y1 - y0) || 792;
  const zichtbaar = beelden.filter((b) => b.pixels && b.matrix && b.breedte > 0 && b.hoogte > 0);
  let schaal = Math.max(...zichtbaar.map((b) => b.breedte / (Math.hypot(b.matrix[0], b.matrix[1]) || 1)), 1);
  schaal = Math.min(schaal, maxBreedte / paginaBreedte);
  const breedte = Math.max(1, Math.round(paginaBreedte * schaal));
  const hoogte = Math.max(1, Math.round(paginaHoogte * schaal));
  const pixels = new Uint8Array(breedte * hoogte).fill(255);
  for (const beeld of zichtbaar) {
    const [a, b, c, d, e, f] = beeld.matrix;
    const det = a * d - b * c;
    if (!det) continue;
    // Het kader van het beeld op de bladzijde (pixels van de samengestelde bladzijde, y van boven).
    const hoeken = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([u, v]) => [a * u + c * v + e, b * u + d * v + f]);
    const naarX = (px) => (px - x0) * schaal;
    const naarY = (py) => (y1 - py) * schaal;
    const links = Math.max(0, Math.floor(Math.min(...hoeken.map(([px]) => naarX(px)))));
    const rechts = Math.min(breedte - 1, Math.ceil(Math.max(...hoeken.map(([px]) => naarX(px)))));
    const boven = Math.max(0, Math.floor(Math.min(...hoeken.map(([, py]) => naarY(py)))));
    const onder = Math.min(hoogte - 1, Math.ceil(Math.max(...hoeken.map(([, py]) => naarY(py)))));
    // Hoeveel beeldpixels er per pixel van de bladzijde vallen (voor het gemiddelde); een afrondingsfout bij precies 1:1 telt niet.
    const stappen = Math.min(4, Math.max(1, Math.ceil(beeld.breedte / (Math.hypot(a, b) * schaal) - 1e-6)));
    for (let y = boven; y <= onder; y += 1) {
      for (let x = links; x <= rechts; x += 1) {
        let som = 0;
        let aantal = 0;
        for (let sy = 0; sy < stappen; sy += 1) {
          for (let sx = 0; sx < stappen; sx += 1) {
            // Terug van de bladzijde naar het eenheidsvierkant van het beeld (u naar rechts, v naar boven).
            const px = x0 + (x + (sx + 0.5) / stappen) / schaal - e;
            const py = y1 - (y + (sy + 0.5) / stappen) / schaal - f;
            const u = (d * px - c * py) / det;
            const v = (a * py - b * px) / det;
            if (u < 0 || u >= 1 || v < 0 || v >= 1) continue;
            const rij = Math.min(beeld.hoogte - 1, Math.floor((1 - v) * beeld.hoogte));
            const kolom = Math.min(beeld.breedte - 1, Math.floor(u * beeld.breedte));
            som += beeld.pixels[rij * beeld.breedte + kolom];
            aantal += 1;
          }
        }
        if (aantal) {
          const waarde = Math.round(som / aantal);
          const i = y * breedte + x;
          if (waarde < pixels[i]) pixels[i] = waarde;
        }
      }
    }
  }
  return { breedte, hoogte, pixels };
}

// De grijze bladzijden van een bestand, één voor één (zodat er niet alles tegelijk in het geheugen staat). opties: { bladen:
// '1-3' (leeg is alles), ontcijfer(bytes, type, { foto }), voortgang(plek, aantal, blad), overslaan(blad, reden) }.
// Geeft per bladzijde { blad, breedte, hoogte, pixels }.
export async function* bladenStroom(bytes, { bladen = '', ontcijfer, voortgang = () => {}, overslaan = () => {} } = {}) {
  if (!isPdf(bytes)) {
    const type = bytes[0] === 0x89 && bytes[1] === 0x50 ? 'image/png' : 'image/jpeg';
    let grijs;
    try {
      grijs = await ontcijfer(bytes, type, { foto: true });
    } catch {
      throw fout('Dit bestand kan de herkenning in de browser niet lezen.', 'onleesbaar');
    }
    yield { blad: 1, ...verklein(grijs) };
    return;
  }
  let pdf;
  try {
    pdf = await openPdf(bytes);
  } catch {
    throw fout('Dit bestand kan de herkenning in de browser niet lezen.', 'onleesbaar');
  }
  const nummers = leesBladReeks(bladen, pdf.paginas.length);
  if (!nummers.length) throw fout(`Die bladzijden bestaan niet: deze pdf heeft er ${pdf.paginas.length}.`, 'reeks');
  if (nummers.length > MAX_BLADEN) throw fout(`Kies hooguit ${MAX_BLADEN} bladzijden per keer, bijvoorbeeld 1-10.`, 'te-veel');
  let gegeven = 0;
  for (const [plek, nummer] of nummers.entries()) {
    voortgang(plek + 1, nummers.length, nummer);
    const pagina = pdf.paginas[nummer - 1];
    const beelden = (await beeldenOpPagina(pdf, pagina)).filter((b) => b.soort === 'grijs' || b.soort === 'jpeg');
    if (!beelden.length) {
      overslaan(nummer, 'geen beeld');
      continue;
    }
    const grijs = [];
    for (const beeld of beelden) {
      try {
        const ontcijferd = beeld.soort === 'jpeg' ? await ontcijfer(beeld.bytes, 'image/jpeg', { foto: false }) : beeld;
        grijs.push({ ...beeld, breedte: ontcijferd.breedte, hoogte: ontcijferd.hoogte, pixels: ontcijferd.pixels });
      } catch {
        // Een beeld dat niet te ontcijferen is, telt niet mee.
      }
    }
    if (!grijs.length) {
      overslaan(nummer, 'onleesbaar beeld');
      continue;
    }
    const draaiing = Number(pagina.woordenboek.match(/\/Rotate\s+(-?\d+)/)?.[1] ?? 0);
    gegeven += 1;
    yield { blad: nummer, ...draai(plaatsBeelden(pagina.maat, grijs), draaiing) };
  }
  if (!gegeven) throw fout('Deze pdf heeft geen gescande bladzijden. Een digitale pdf kan de herkenning in de browser nog niet lezen.', 'geen-beelden');
}

// Alle grijze bladzijden van een bestand in een lijst (voor tests en kleine bestanden).
export async function grijzeBladen(bytes, opties = {}) {
  const uit = [];
  for await (const blad of bladenStroom(bytes, opties)) uit.push(blad);
  return uit;
}
