// Leest de tekens uit een digitale pdf, zonder beeldherkenning: per pagina het lettertype, de tekencode, de plek en de grootte.
// Bladmuziek uit Finale, Sibelius of Dorico zet nootkoppen, voortekens en sleutels als tekens van een muzieklettertype (zoals
// Maestro of Bravura) op een exacte plek. Draait in de browser en in Node (pdf/lezer.mjs); geen versleutelde pdf's.
import { getallenReeks, naarTekst, openPdf, woordenboekBij } from './lezer.mjs';

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

// ---- inhoudsstroom ----

export function* tokens(data) {
  const s = typeof data === 'string' ? data : naarTekst(data);
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
      const bytes = [];
      for (let k = 0; k + 1 < vol.length; k += 2) bytes.push(parseInt(vol.slice(k, k + 2), 16) || 0);
      yield { soort: 'tekst', bytes };
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

export function tekensOpPagina(data, fonts) {
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
// breedte en hoogte van de pagina (MediaBox) in punten. Async: het uitpakken van stromen gebeurt met DecompressionStream.
export async function leesPdfTekens(bytes) {
  const pdf = await openPdf(bytes);
  const uit = [];
  for (const [index, pagina] of pdf.paginas.entries()) {
    const { maat } = pagina;
    uit.push({
      pagina: index + 1,
      breedte: rond(maat[2] - maat[0]),
      hoogte: rond(maat[3] - maat[1]),
      tekens: tekensOpPagina(await pdf.inhoud(pagina), lettertypen(pagina.woordenboek, pdf.objecten)),
    });
  }
  return uit;
}
