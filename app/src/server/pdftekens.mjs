// Leest de tekens uit een digitale pdf, zonder beeldherkenning: per pagina het lettertype, de tekencode, de plek en de grootte.
// Bladmuziek uit Finale, Sibelius of Dorico zet nootkoppen, voortekens en sleutels als tekens van een muzieklettertype (zoals
// Maestro of Bravura) op een exacte plek. Alleen Node: zlib voor FlateDecode. Geen bibliotheek, geen versleutelde pdf's.
import { inflateSync } from 'node:zlib';

// ---- objecten ----

function leesStroom(woordenboek, ruw) {
  if (!/\/FlateDecode/.test(woordenboek)) return ruw;
  try {
    return inflateSync(ruw);
  } catch {
    return Buffer.alloc(0);
  }
}

function leesObjecten(buffer) {
  const tekst = buffer.toString('latin1');
  const objecten = new Map();
  const patroon = /(\d+)\s+\d+\s+obj\b/g;
  let gevonden;
  while ((gevonden = patroon.exec(tekst))) {
    const begin = gevonden.index + gevonden[0].length;
    const eind = tekst.indexOf('endobj', begin);
    if (eind < 0) break;
    const inhoud = tekst.slice(begin, eind);
    const stroomBegin = inhoud.search(/stream\r?\n/);
    if (stroomBegin < 0) {
      objecten.set(Number(gevonden[1]), { woordenboek: inhoud, stroom: null });
    } else {
      const woordenboek = inhoud.slice(0, stroomBegin);
      const dataBegin = stroomBegin + inhoud.slice(stroomBegin).match(/stream\r?\n/)[0].length;
      const lengte = woordenboek.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
      const dataEind = lengte ? dataBegin + Number(lengte[1]) : inhoud.lastIndexOf('endstream');
      const ruw = Buffer.from(inhoud.slice(dataBegin, dataEind), 'latin1');
      objecten.set(Number(gevonden[1]), { woordenboek, stroom: leesStroom(woordenboek, ruw) });
    }
    patroon.lastIndex = eind;
  }
  // Objecten in een objectstroom (/Type /ObjStm): eerst N paren "nummer offset", dan de objecten vanaf /First.
  for (const object of [...objecten.values()]) {
    if (!/\/Type\s*\/ObjStm/.test(object.woordenboek) || !object.stroom) continue;
    const n = Number(object.woordenboek.match(/\/N\s+(\d+)/)?.[1] ?? 0);
    const eerste = Number(object.woordenboek.match(/\/First\s+(\d+)/)?.[1] ?? 0);
    const data = object.stroom.toString('latin1');
    const kop = data.slice(0, eerste).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i += 1) {
      const nummer = kop[2 * i];
      const begin = eerste + kop[2 * i + 1];
      const eind = i + 1 < n ? eerste + kop[2 * i + 3] : data.length;
      if (!objecten.has(nummer)) objecten.set(nummer, { woordenboek: data.slice(begin, eind), stroom: null });
    }
  }
  return objecten;
}

const verwijzing = (tekst, sleutel) => {
  const gevonden = tekst.match(new RegExp(`/${sleutel}\\s+(\\d+)\\s+\\d+\\s+R`));
  return gevonden ? Number(gevonden[1]) : null;
};

// De inhoud tussen << en >> na een sleutel (een direct woordenboek), of het woordenboek van het object waarnaar hij verwijst.
function woordenboekBij(tekst, sleutel, objecten) {
  const plek = tekst.search(new RegExp(`/${sleutel}\\s*<<`));
  if (plek >= 0) {
    let diepte = 0;
    let begin = -1;
    for (let i = tekst.indexOf('<<', plek); i < tekst.length - 1; i += 1) {
      if (tekst[i] === '<' && tekst[i + 1] === '<') {
        if (diepte === 0) begin = i + 2;
        diepte += 1;
        i += 1;
      } else if (tekst[i] === '>' && tekst[i + 1] === '>') {
        diepte -= 1;
        if (diepte === 0) return tekst.slice(begin, i);
        i += 1;
      }
    }
    return null;
  }
  const nummer = verwijzing(tekst, sleutel);
  return nummer != null ? objecten.get(nummer)?.woordenboek ?? null : null;
}

function getallenReeks(tekst, sleutel, objecten) {
  const direct = tekst.match(new RegExp(`/${sleutel}\\s*\\[([^\\]]*)\\]`));
  if (direct) return direct[1].trim().split(/\s+/).filter(Boolean).map(Number);
  const nummer = verwijzing(tekst, sleutel);
  const object = nummer != null ? objecten.get(nummer)?.woordenboek : null;
  const inObject = object?.match(/\[([^\]]*)\]/);
  return inObject ? inObject[1].trim().split(/\s+/).filter(Boolean).map(Number) : [];
}

function lettertypen(paginaWoordenboek, objecten) {
  const bronnen = woordenboekBij(paginaWoordenboek, 'Resources', objecten) ?? '';
  const fonts = woordenboekBij(bronnen, 'Font', objecten) ?? '';
  const uit = new Map();
  for (const [, naam, nummer] of fonts.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
    const font = objecten.get(Number(nummer))?.woordenboek ?? '';
    uit.set(naam, {
      naam: font.match(/\/BaseFont\s*\/([^\s/<>[\]()]+)/)?.[1] ?? naam,
      tweeBytes: /\/Subtype\s*\/Type0/.test(font),
      eersteTeken: Number(font.match(/\/FirstChar\s+(\d+)/)?.[1] ?? 0),
      breedtes: getallenReeks(font, 'Widths', objecten),
    });
  }
  return uit;
}

// De pagina's op volgorde via /Root -> /Pages -> /Kids; een pagina erft /Resources van zijn ouder.
function paginas(objecten) {
  const catalogus = [...objecten.values()].find((o) => /\/Type\s*\/Catalog/.test(o.woordenboek));
  const uit = [];
  const bezoek = (nummer, geerfd, geerfdeMaat) => {
    const object = objecten.get(nummer);
    if (!object) return;
    const eigen = woordenboekBij(object.woordenboek, 'Resources', objecten);
    const bronnen = eigen != null ? `/Resources << ${eigen} >>` : geerfd;
    const woordenboek = `${object.woordenboek} ${bronnen}`;
    const maat = object.woordenboek.match(/\/MediaBox\s*\[([^\]]*)\]/)?.[1].trim().split(/\s+/).map(Number) ?? geerfdeMaat;
    if (/\/Type\s*\/Pages/.test(object.woordenboek)) {
      const kinderen = object.woordenboek.match(/\/Kids\s*\[([^\]]*)\]/)?.[1] ?? '';
      for (const [, kind] of kinderen.matchAll(/(\d+)\s+\d+\s+R/g)) bezoek(Number(kind), bronnen, maat);
    } else if (/\/Type\s*\/Page\b/.test(object.woordenboek)) {
      uit.push({ woordenboek, maat: maat ?? [0, 0, 612, 792] });
    }
  };
  const wortel = catalogus ? verwijzing(catalogus.woordenboek, 'Pages') : null;
  if (wortel != null) bezoek(wortel, '', null);
  return uit;
}

function inhoudVan(paginaWoordenboek, objecten) {
  const reeks = paginaWoordenboek.match(/\/Contents\s*\[([^\]]*)\]/);
  const nummers = reeks
    ? [...reeks[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((g) => Number(g[1]))
    : [verwijzing(paginaWoordenboek, 'Contents')].filter((n) => n != null);
  return Buffer.concat(nummers.map((n) => objecten.get(n)?.stroom ?? Buffer.alloc(0)).flatMap((b) => [b, Buffer.from('\n')]));
}

// ---- inhoudsstroom ----

function* tokens(data) {
  const s = data.toString('latin1');
  let i = 0;
  const witruimte = (c) => c === ' ' || c === '\n' || c === '\r' || c === '\t' || c === '\f' || c === '\0';
  const scheiding = (c) => witruimte(c) || '()<>[]{}/%'.includes(c);
  while (i < s.length) {
    const c = s[i];
    if (witruimte(c)) { i += 1; continue; }
    if (c === '%') { while (i < s.length && s[i] !== '\n' && s[i] !== '\r') i += 1; continue; }
    if (c === '(') {
      const bytes = [];
      let diepte = 1;
      i += 1;
      while (i < s.length && diepte > 0) {
        const t = s[i];
        if (t === '\\') {
          const v = s[i + 1];
          const vervang = { n: 10, r: 13, t: 9, b: 8, f: 12, '(': 40, ')': 41, '\\': 92 };
          if (v in vervang) { bytes.push(vervang[v]); i += 2; } else if (/[0-7]/.test(v)) {
            const oct = s.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)[0];
            bytes.push(parseInt(oct, 8) & 255);
            i += 1 + oct.length;
          } else { i += 2; }
          continue;
        }
        if (t === '(') diepte += 1;
        if (t === ')') { diepte -= 1; if (diepte === 0) { i += 1; break; } }
        bytes.push(t.charCodeAt(0) & 255);
        i += 1;
      }
      yield { soort: 'tekst', bytes };
      continue;
    }
    if (c === '<' && s[i + 1] === '<') { yield { soort: 'teken', waarde: '<<' }; i += 2; continue; }
    if (c === '>' && s[i + 1] === '>') { yield { soort: 'teken', waarde: '>>' }; i += 2; continue; }
    if (c === '<') {
      const eind = s.indexOf('>', i);
      const hex = s.slice(i + 1, eind).replace(/\s+/g, '');
      const vol = hex.length % 2 ? `${hex}0` : hex;
      yield { soort: 'tekst', bytes: [...Buffer.from(vol, 'hex')] };
      i = eind + 1;
      continue;
    }
    if (c === '[' || c === ']') { yield { soort: 'teken', waarde: c }; i += 1; continue; }
    if (c === '/') {
      let j = i + 1;
      while (j < s.length && !scheiding(s[j])) j += 1;
      yield { soort: 'naam', waarde: s.slice(i + 1, j) };
      i = j;
      continue;
    }
    let j = i;
    while (j < s.length && !scheiding(s[j])) j += 1;
    if (j === i) { i += 1; continue; }
    const woord = s.slice(i, j);
    i = j;
    if (/^[+-]?(\d+\.?\d*|\.\d+)$/.test(woord)) yield { soort: 'getal', waarde: Number(woord) };
    else yield { soort: 'operator', waarde: woord };
  }
}

const vermenigvuldig = (a, b) => [
  a[0] * b[0] + a[1] * b[2], a[0] * b[1] + a[1] * b[3],
  a[2] * b[0] + a[3] * b[2], a[2] * b[1] + a[3] * b[3],
  a[4] * b[0] + a[5] * b[2] + b[4], a[4] * b[1] + a[5] * b[3] + b[5],
];
const EENHEID = [1, 0, 0, 1, 0, 0];
const rond = (getal) => Math.round(getal * 100) / 100;

function tekensOpPagina(data, fonts) {
  const tekens = [];
  const stapel = [];
  let ctm = EENHEID;
  let tm = EENHEID;
  let tlm = EENHEID;
  let font = null;
  let grootte = 0;
  let regelafstand = 0;
  let tekenruimte = 0;
  let woordruimte = 0;
  let schaal = 1;
  let operanden = [];
  let reeks = null;

  const verschuif = (tx, ty) => {
    tlm = vermenigvuldig([1, 0, 0, 1, tx, ty], tlm);
    tm = tlm;
  };
  const toon = (bytes) => {
    const info = fonts.get(font) ?? { naam: font ?? '', tweeBytes: false, eersteTeken: 0, breedtes: [] };
    const stap = info.tweeBytes ? 2 : 1;
    for (let i = 0; i + stap - 1 < bytes.length; i += stap) {
      const code = stap === 2 ? bytes[i] * 256 + bytes[i + 1] : bytes[i];
      const m = vermenigvuldig(tm, ctm);
      tekens.push({ lettertype: info.naam, code, x: rond(m[4]), y: rond(m[5]), grootte: rond(grootte * Math.hypot(m[2], m[3])) });
      const breedte = (info.breedtes[code - info.eersteTeken] ?? 0) / 1000;
      const tx = (breedte * grootte + tekenruimte + (code === 32 && stap === 1 ? woordruimte : 0)) * schaal;
      tm = vermenigvuldig([1, 0, 0, 1, tx, 0], tm);
    }
  };

  for (const token of tokens(data)) {
    if (token.soort === 'teken' && token.waarde === '[') { reeks = []; continue; }
    if (token.soort === 'teken' && token.waarde === ']') { operanden.push(reeks ?? []); reeks = null; continue; }
    if (reeks) { reeks.push(token); continue; }
    if (token.soort !== 'operator') { operanden.push(token); continue; }
    const g = operanden.map((o) => o?.waarde);
    switch (token.waarde) {
      case 'q': stapel.push(ctm); break;
      case 'Q': ctm = stapel.pop() ?? EENHEID; break;
      case 'cm': if (g.length >= 6) ctm = vermenigvuldig(g.slice(-6), ctm); break;
      case 'BT': tm = EENHEID; tlm = EENHEID; break;
      case 'Tf': font = operanden.at(-2)?.waarde ?? font; grootte = Number(g.at(-1)) || 0; break;
      case 'TL': regelafstand = Number(g.at(-1)) || 0; break;
      case 'Tc': tekenruimte = Number(g.at(-1)) || 0; break;
      case 'Tw': woordruimte = Number(g.at(-1)) || 0; break;
      case 'Tz': schaal = (Number(g.at(-1)) || 100) / 100; break;
      case 'Td': verschuif(Number(g.at(-2)) || 0, Number(g.at(-1)) || 0); break;
      case 'TD': regelafstand = -(Number(g.at(-1)) || 0); verschuif(Number(g.at(-2)) || 0, Number(g.at(-1)) || 0); break;
      case 'Tm': if (g.length >= 6) { tlm = g.slice(-6).map(Number); tm = tlm; } break;
      case 'T*': verschuif(0, -regelafstand); break;
      case 'Tj': if (operanden.at(-1)?.soort === 'tekst') toon(operanden.at(-1).bytes); break;
      case "'": verschuif(0, -regelafstand); if (operanden.at(-1)?.soort === 'tekst') toon(operanden.at(-1).bytes); break;
      case '"':
        woordruimte = Number(g.at(-3)) || 0;
        tekenruimte = Number(g.at(-2)) || 0;
        verschuif(0, -regelafstand);
        if (operanden.at(-1)?.soort === 'tekst') toon(operanden.at(-1).bytes);
        break;
      case 'TJ':
        for (const deel of Array.isArray(operanden.at(-1)) ? operanden.at(-1) : []) {
          if (deel.soort === 'tekst') toon(deel.bytes);
          else if (deel.soort === 'getal') tm = vermenigvuldig([1, 0, 0, 1, (-deel.waarde / 1000) * grootte * schaal, 0], tm);
        }
        break;
      default: break;
    }
    operanden = [];
  }
  return tekens;
}

// [{ pagina: 1, breedte, hoogte, tekens: [{ lettertype, code, x, y, grootte }] }]; x en y in pdf-punten vanaf linksonder,
// breedte en hoogte van de pagina (MediaBox) in punten.
export function leesPdfTekens(buffer) {
  const objecten = leesObjecten(Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));
  return paginas(objecten).map(({ woordenboek, maat }, index) => ({
    pagina: index + 1,
    breedte: rond(maat[2] - maat[0]),
    hoogte: rond(maat[3] - maat[1]),
    tekens: tekensOpPagina(inhoudVan(woordenboek, objecten), lettertypen(woordenboek, objecten)),
  }));
}
