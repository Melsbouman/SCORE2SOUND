// Haalt de beelden uit een gescande pdf-pagina, als invoer voor de eigen herkenning. Draait in de browser en in Node.
// Per beeld (in de volgorde van de Do's in de inhoudsstroom): naam, afmetingen, soort, de matrix op de pagina en de gegevens.
// Soorten: 'grijs' (pixels: Uint8Array, 0 = zwart, 255 = wit), 'jpeg' (bytes: de ruwe JPEG) en 'onbekend' (filter dat we niet lezen).
import { filtersVan, woordenboekBij } from './lezer.mjs';
import { tokens } from './tekens.mjs';
import { decodeerG4 } from './ccitt.mjs';

const vermenigvuldig = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
];
const EENHEID = [1, 0, 0, 1, 0, 0];

const getalIn = (tekst, sleutel, standaard) => {
  const gevonden = (tekst ?? '').match(new RegExp(`/${sleutel}\\s+(-?\\d+)`));
  return gevonden ? Number(gevonden[1]) : standaard;
};

// De PNG-voorspellers (filters 0 tot 4) per rij ongedaan maken.
function ongedaanVoorspeller(data, kleuren, bits, kolommen) {
  const rij = Math.ceil((kleuren * bits * kolommen) / 8);
  const stap = Math.max(1, Math.ceil((kleuren * bits) / 8));
  const rijen = Math.floor(data.length / (rij + 1));
  const uit = new Uint8Array(rijen * rij);
  for (let y = 0; y < rijen; y += 1) {
    const filter = data[y * (rij + 1)];
    const van = y * (rij + 1) + 1;
    const naar = y * rij;
    for (let x = 0; x < rij; x += 1) {
      const links = x >= stap ? uit[naar + x - stap] : 0;
      const boven = y > 0 ? uit[naar - rij + x] : 0;
      const linksBoven = y > 0 && x >= stap ? uit[naar - rij + x - stap] : 0;
      let voorspeld = 0;
      if (filter === 1) voorspeld = links;
      else if (filter === 2) voorspeld = boven;
      else if (filter === 3) voorspeld = (links + boven) >> 1;
      else if (filter === 4) {
        const p = links + boven - linksBoven;
        const pa = Math.abs(p - links);
        const pb = Math.abs(p - boven);
        const pc = Math.abs(p - linksBoven);
        voorspeld = pa <= pb && pa <= pc ? links : pb <= pc ? boven : linksBoven;
      }
      uit[naar + x] = (data[van + x] + voorspeld) & 255;
    }
  }
  return uit;
}

async function leesBeeld(pdf, nummer, naam, matrix) {
  const object = pdf.objecten.get(nummer);
  const woordenboek = object.woordenboek;
  const breedte = getalIn(woordenboek, 'Width', 0);
  const hoogte = getalIn(woordenboek, 'Height', 0);
  const filters = filtersVan(woordenboek);
  const uit = { naam, breedte, hoogte, soort: 'onbekend', matrix, filters };
  try {
    const parms = woordenboekBij(woordenboek, 'DecodeParms', pdf.objecten) ?? '';
    let rest = filters;
    let data;
    if (filters[0] === 'FlateDecode') {
      data = await pdf.stroom(nummer);
      rest = filters.slice(1);
    } else {
      data = object.ruw ?? new Uint8Array(0);
    }
    if (rest.length === 1 && rest[0] === 'DCTDecode') {
      return { ...uit, soort: 'jpeg', bytes: data };
    }
    if (rest.length === 1 && rest[0] === 'CCITTFaxDecode') {
      if (getalIn(parms, 'K', 0) >= 0) return uit;
      const kolommen = getalIn(parms, 'Columns', breedte) || breedte;
      const rijen = getalIn(parms, 'Rows', hoogte) || hoogte;
      const bron = decodeerG4(data, kolommen, rijen);
      const zwartIs1 = /\/BlackIs1\s+true/.test(parms);
      const pixels = new Uint8Array(breedte * hoogte);
      for (let y = 0; y < hoogte && y < rijen; y += 1) {
        for (let x = 0; x < breedte && x < kolommen; x += 1) {
          const zwart = bron[y * kolommen + x] === 1;
          pixels[y * breedte + x] = zwart === zwartIs1 ? 255 : 0;
        }
      }
      return { ...uit, soort: 'grijs', pixels };
    }
    if (rest.length > 0) return uit;

    const ruimte = woordenboek.match(/\/ColorSpace\s*\/(\w+)/)?.[1];
    const bits = getalIn(woordenboek, 'BitsPerComponent', 8);
    const kleuren = ruimte === 'DeviceRGB' ? 3 : 1;
    if (bits !== 1 && !(bits === 8 && (ruimte === 'DeviceGray' || ruimte === 'DeviceRGB'))) return uit;
    const voorspeller = getalIn(parms, 'Predictor', 1);
    if (voorspeller >= 10) {
      data = ongedaanVoorspeller(data, getalIn(parms, 'Colors', 1), getalIn(parms, 'BitsPerComponent', 8), getalIn(parms, 'Columns', 1));
    }
    const pixels = new Uint8Array(breedte * hoogte);
    if (bits === 1) {
      const rij = Math.ceil(breedte / 8);
      for (let y = 0; y < hoogte; y += 1) {
        for (let x = 0; x < breedte; x += 1) {
          pixels[y * breedte + x] = ((data[y * rij + (x >> 3)] ?? 0) >> (7 - (x & 7))) & 1 ? 255 : 0;
        }
      }
    } else if (kleuren === 1) {
      for (let i = 0; i < pixels.length; i += 1) pixels[i] = data[i] ?? 0;
    } else {
      for (let i = 0; i < pixels.length; i += 1) {
        pixels[i] = Math.round(0.299 * (data[3 * i] ?? 0) + 0.587 * (data[3 * i + 1] ?? 0) + 0.114 * (data[3 * i + 2] ?? 0));
      }
    }
    return { ...uit, soort: 'grijs', pixels };
  } catch {
    return uit;
  }
}

// De beelden van een pagina, in de volgorde waarin de inhoudsstroom ze tekent.
export async function beeldenOpPagina(pdf, pagina) {
  const bronnen = woordenboekBij(pagina.woordenboek, 'Resources', pdf.objecten) ?? '';
  const xobjecten = woordenboekBij(bronnen, 'XObject', pdf.objecten) ?? '';
  const beeldNummers = new Map();
  for (const [, naam, nummer] of xobjecten.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
    if (/\/Subtype\s*\/Image/.test(pdf.objecten.get(Number(nummer))?.woordenboek ?? '')) beeldNummers.set(naam, Number(nummer));
  }
  const uit = [];
  const stapel = [];
  let ctm = EENHEID;
  let operanden = [];
  for (const token of tokens(await pdf.inhoud(pagina))) {
    if (token.soort !== 'operator') { operanden.push(token); continue; }
    const g = operanden.map((o) => o?.waarde);
    if (token.waarde === 'q') stapel.push(ctm);
    else if (token.waarde === 'Q') ctm = stapel.pop() ?? EENHEID;
    else if (token.waarde === 'cm') { if (g.length >= 6) ctm = vermenigvuldig(g.slice(-6), ctm); }
    else if (token.waarde === 'Do') {
      const naam = operanden.at(-1)?.soort === 'naam' ? operanden.at(-1).waarde : null;
      if (naam != null && beeldNummers.has(naam)) uit.push(await leesBeeld(pdf, beeldNummers.get(naam), naam, [...ctm]));
    }
    operanden = [];
  }
  return uit;
}
