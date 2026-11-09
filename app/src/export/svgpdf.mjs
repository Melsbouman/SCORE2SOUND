// SVG (van Verovio) naar pdf-tekenopdrachten en een pdf-bestand, zonder bibliotheken.
// Werkt in de browser en in Node (geen node:-modules, geen Buffer, geen DOMParser).
//
// Ondersteund deel van SVG (wat Verovio maakt):
//  - elementen g, svg (ook genest, met x, y, width, height, viewBox), use (naar een
//    element met id, met x, y en transform), path, polygon, polyline, rect, text, tspan;
//  - transform: translate, scale en matrix;
//  - pad-opdrachten M m L l H h V v C c S s Q q T t Z z (A wordt een rechte lijn
//    en gemeld als 'path-boog');
//  - stijl via attributen (geërfd): fill, stroke, stroke-width, font-size,
//    font-style, font-weight en text-anchor. Kleur is altijd zwart.
//  - defs, desc, style, title, metadata en symbol worden niet zelf getekend.
// Andere elementen worden overgeslagen en met hun naam gemeld in 'onbekend'.

// ---- kleine XML-lezer voor goedgevormde SVG ----

function ontsluit(tekst) {
  return tekst.replace(/&(#x[0-9a-fA-F]+|#\d+|amp|lt|gt|quot|apos);/g, (m, naam) => {
    if (naam === 'amp') return '&';
    if (naam === 'lt') return '<';
    if (naam === 'gt') return '>';
    if (naam === 'quot') return '"';
    if (naam === 'apos') return "'";
    const code = naam[1] === 'x' ? parseInt(naam.slice(2), 16) : parseInt(naam.slice(1), 10);
    return Number.isFinite(code) ? String.fromCodePoint(code) : m;
  });
}

function leesXml(s) {
  const wortel = { naam: '#root', attr: {}, kinderen: [] };
  const stapel = [wortel];
  let i = 0;
  while (i < s.length) {
    const huidig = stapel[stapel.length - 1];
    if (s[i] !== '<') {
      let j = s.indexOf('<', i);
      if (j < 0) j = s.length;
      huidig.kinderen.push({ tekst: ontsluit(s.slice(i, j)) });
      i = j;
    } else if (s.startsWith('<!--', i)) {
      const e = s.indexOf('-->', i + 4);
      i = e < 0 ? s.length : e + 3;
    } else if (s.startsWith('<?', i) || s.startsWith('<!', i)) {
      const e = s.indexOf('>', i + 2);
      i = e < 0 ? s.length : e + 1;
    } else if (s.startsWith('</', i)) {
      const e = s.indexOf('>', i + 2);
      if (stapel.length > 1) stapel.pop();
      i = e < 0 ? s.length : e + 1;
    } else {
      // begintag: zoek het einde, let op aanhalingstekens in attribuutwaarden
      let j = i + 1;
      let aanhaling = '';
      while (j < s.length) {
        const c = s[j];
        if (aanhaling) { if (c === aanhaling) aanhaling = ''; } else if (c === '"' || c === "'") aanhaling = c; else if (c === '>') break;
        j++;
      }
      let binnen = s.slice(i + 1, j);
      const leeg = binnen.endsWith('/');
      if (leeg) binnen = binnen.slice(0, -1);
      const naam = /^[^\s/>]+/.exec(binnen)?.[0] ?? '';
      const attr = {};
      const re = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      const rest = binnen.slice(naam.length);
      let m;
      while ((m = re.exec(rest))) attr[m[1]] = ontsluit(m[2] ?? m[3] ?? '');
      const el = { naam, attr, kinderen: [] };
      huidig.kinderen.push(el);
      if (!leeg) stapel.push(el);
      i = j + 1;
    }
  }
  return wortel;
}

// ---- getallen en matrices ----

function fmt(n, dec = 3) {
  if (!Number.isFinite(n)) return '0';
  let r = Number(n.toFixed(dec));
  if (Object.is(r, -0)) r = 0;
  return String(r);
}

const ID = [1, 0, 0, 1, 0, 0];
const isId = (m) => m.every((v, i) => v === ID[i]);

function maal(m, n) {
  return [
    m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function getallen(tekst) {
  return (String(tekst ?? '').match(/[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? []).map(Number);
}

function leesTransform(tekst) {
  let m = ID;
  if (!tekst) return m;
  const re = /([A-Za-z]+)\s*\(([^)]*)\)/g;
  let t;
  while ((t = re.exec(tekst))) {
    const a = getallen(t[2]);
    let n = null;
    if (t[1] === 'translate') n = [1, 0, 0, 1, a[0] ?? 0, a[1] ?? 0];
    else if (t[1] === 'scale') n = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
    else if (t[1] === 'matrix' && a.length >= 6) n = a.slice(0, 6);
    if (n) m = maal(m, n);
  }
  return m;
}

function lengte(waarde, ref) {
  if (waarde === undefined) return ref;
  const v = parseFloat(waarde);
  if (!Number.isFinite(v)) return ref;
  return String(waarde).trim().endsWith('%') ? (v / 100) * ref : v;
}

// Matrix voor een viewport (x, y, b, h) met optionele viewBox.
function viewportMatrix(x, y, b, h, viewBox) {
  const vb = getallen(viewBox);
  if (vb.length === 4 && vb[2] > 0 && vb[3] > 0) {
    const s = Math.min(b / vb[2], h / vb[3]);
    const tx = x + (b - vb[2] * s) / 2 - vb[0] * s;
    const ty = y + (h - vb[3] * s) / 2 - vb[1] * s;
    return { m: [s, 0, 0, s, tx, ty], vw: vb[2], vh: vb[3] };
  }
  return { m: [1, 0, 0, 1, x, y], vw: b, vh: h };
}

// ---- Times-Roman breedtes (AFM) voor de tekens 32 tot 126 ----

const BREEDTE = [
  250, 333, 408, 500, 500, 833, 778, 333, 333, 333, 500, 564, 250, 333, 250, 278,
  500, 500, 500, 500, 500, 500, 500, 500, 500, 500,
  278, 278, 564, 564, 564, 444, 921,
  722, 667, 667, 722, 611, 556, 722, 722, 333, 389, 722, 611, 889, 722, 722, 556, 722, 667, 556, 611, 722, 722, 944, 722, 722, 611,
  333, 278, 333, 469, 500, 333,
  444, 500, 444, 500, 444, 333, 500, 500, 278, 278, 500, 278, 778, 500, 500, 500, 500, 333, 389, 278, 500, 500, 722, 500, 500, 444,
  480, 200, 480, 541,
];

const WINANSI = new Map([
  [0x20AC, 0x80], [0x201A, 0x82], [0x192, 0x83], [0x201E, 0x84], [0x2026, 0x85], [0x2020, 0x86],
  [0x2021, 0x87], [0x2C6, 0x88], [0x2030, 0x89], [0x160, 0x8A], [0x2039, 0x8B], [0x152, 0x8C],
  [0x17D, 0x8E], [0x2018, 0x91], [0x2019, 0x92], [0x201C, 0x93], [0x201D, 0x94], [0x2022, 0x95],
  [0x2013, 0x96], [0x2014, 0x97], [0x2DC, 0x98], [0x2122, 0x99], [0x161, 0x9A], [0x203A, 0x9B],
  [0x153, 0x9C], [0x17E, 0x9E], [0x178, 0x9F],
]);

// Zet tekst om naar een pdf-string (zonder haakjes eromheen) en de breedte per 1000 eenheden.
function codeerTekst(tekst) {
  let uit = '';
  let breedte = 0;
  for (const teken of tekst) {
    const cp = teken.codePointAt(0);
    let code = null;
    if ((cp >= 32 && cp <= 126) || (cp >= 160 && cp <= 255)) code = cp;
    else if (WINANSI.has(cp)) code = WINANSI.get(cp);
    if (code === null) continue;
    breedte += code >= 32 && code <= 126 ? BREEDTE[code - 32] : 500;
    if (code === 40 || code === 41 || code === 92) uit += '\\' + String.fromCharCode(code);
    else if (code >= 127) uit += '\\' + code.toString(8).padStart(3, '0');
    else uit += String.fromCharCode(code);
  }
  return { pdf: uit, breedte };
}

// ---- SVG naar pdf-opdrachten ----

const NIET_TEKENEN = new Set(['defs', 'desc', 'style', 'title', 'metadata', 'symbol']);
const AANTAL = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7 };

function pt(x, y) {
  return `${fmt(x)} ${fmt(y)}`;
}

function padOpdrachten(d, uit, onbekend) {
  const tok = String(d ?? '').match(/[A-Za-z]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g) ?? [];
  let i = 0;
  let cmd = '';
  let x = 0;
  let y = 0;
  let sx = 0;
  let sy = 0;
  let vc = null;
  let vq = null;
  while (i < tok.length) {
    if (/^[A-Za-z]$/.test(tok[i])) {
      cmd = tok[i++];
      if (cmd === 'Z' || cmd === 'z') {
        uit.push('h');
        x = sx;
        y = sy;
        vc = vq = null;
        continue;
      }
    }
    if (!cmd) break;
    const soort = cmd.toUpperCase();
    const k = AANTAL[soort];
    if (!k) { i++; continue; }
    const a = tok.slice(i, i + k).map(Number);
    if (a.length < k || a.some((v) => Number.isNaN(v))) break;
    i += k;
    const rel = cmd !== soort;
    const ox = rel ? x : 0;
    const oy = rel ? y : 0;
    let nvc = null;
    let nvq = null;
    if (soort === 'M') {
      x = a[0] + ox; y = a[1] + oy; sx = x; sy = y;
      uit.push(`${pt(x, y)} m`);
      cmd = rel ? 'l' : 'L';
    } else if (soort === 'L') {
      x = a[0] + ox; y = a[1] + oy;
      uit.push(`${pt(x, y)} l`);
    } else if (soort === 'H' || soort === 'V') {
      if (soort === 'H') x = a[0] + ox; else y = a[0] + oy;
      uit.push(`${pt(x, y)} l`);
    } else if (soort === 'C' || soort === 'S') {
      const s = soort === 'S';
      const [x1, y1] = s ? [vc ? 2 * x - vc[0] : x, vc ? 2 * y - vc[1] : y] : [a[0] + ox, a[1] + oy];
      const b = s ? 0 : 2;
      const [x2, y2, ex, ey] = [a[b] + ox, a[b + 1] + oy, a[b + 2] + ox, a[b + 3] + oy];
      uit.push(`${pt(x1, y1)} ${pt(x2, y2)} ${pt(ex, ey)} c`);
      nvc = [x2, y2];
      x = ex; y = ey;
    } else if (soort === 'Q' || soort === 'T') {
      const t = soort === 'T';
      const [qx, qy] = t ? [vq ? 2 * x - vq[0] : x, vq ? 2 * y - vq[1] : y] : [a[0] + ox, a[1] + oy];
      const ex = a[t ? 0 : 2] + ox;
      const ey = a[t ? 1 : 3] + oy;
      const f = 2 / 3;
      uit.push(`${pt(x + f * (qx - x), y + f * (qy - y))} ${pt(ex + f * (qx - ex), ey + f * (qy - ey))} ${pt(ex, ey)} c`);
      nvq = [qx, qy];
      x = ex; y = ey;
    } else if (soort === 'A') {
      onbekend.add('path-boog');
      x = a[5] + ox; y = a[6] + oy;
      uit.push(`${pt(x, y)} l`);
    }
    vc = nvc;
    vq = nvq;
  }
}

function leesStijl(ctx, attr) {
  const c = { ...ctx };
  const sw = parseFloat(attr['stroke-width']);
  if (Number.isFinite(sw)) c.sw = sw;
  // Een eigen lijndikte op het element zelf (niet geërfd): bij Verovio zijn dat de notenbalklijnen, stokken, maatstrepen en
  // hulplijnen. Verovio geeft alle vormen in zijn CSS 'stroke: currentColor'; die CSS lezen we niet, dus een eigen
  // stroke-width betekent hier: ook een lijn tekenen.
  c.eigenLijn = Number.isFinite(sw) && sw > 0;
  const size = parseFloat(attr['font-size']);
  if (Number.isFinite(size)) c.size = size;
  if (attr.fill !== undefined) c.fill = attr.fill.trim();
  // Een onzichtbaar vlak (fill-opacity 0, zoals de kaders die Verovio om sommige tekens legt) tekenen we niet.
  if (attr['fill-opacity'] !== undefined && parseFloat(attr['fill-opacity']) === 0) c.fill = 'none';
  if (attr.stroke !== undefined) c.stroke = attr.stroke.trim();
  if (attr['text-anchor'] !== undefined) c.anchor = attr['text-anchor'].trim();
  if (attr['font-style'] !== undefined) c.italic = attr['font-style'].trim() === 'italic';
  if (attr['font-weight'] !== undefined) {
    const w = attr['font-weight'].trim();
    c.bold = w === 'bold' || w === 'bolder' || Number(w) >= 600;
  }
  return c;
}

function maakOmzetter() {
  const uit = [];
  const onbekend = new Set();
  const ids = new Map();

  function verzamel(el) {
    if (el.attr?.id !== undefined) ids.set(el.attr.id, el);
    for (const k of el.kinderen ?? []) if (k.naam) verzamel(k);
  }

  function omhul(m, f) {
    if (isId(m)) { f(); return; }
    uit.push('q');
    uit.push(`${m.map((v) => fmt(v, 6)).join(' ')} cm`);
    f();
    uit.push('Q');
  }

  function verf(ctx, alleenLijn) {
    const vul = !alleenLijn && ctx.fill !== 'none';
    const lijn = alleenLijn || (ctx.sw > 0 && ctx.stroke !== 'none' && (!vul || ctx.stroke !== undefined || ctx.eigenLijn));
    return { vul, lijn };
  }

  function sluit(ctx, alleenLijn) {
    const { vul, lijn } = verf(ctx, alleenLijn);
    uit.push(vul && lijn ? 'B' : vul ? 'f' : lijn ? 'S' : 'n');
  }

  function lijnDikte(ctx, alleenLijn) {
    if (verf(ctx, alleenLijn).lijn) uit.push(`${fmt(ctx.sw > 0 ? ctx.sw : 1)} w`);
  }

  function kinderen(el, ctx, diepte) {
    for (const k of el.kinderen) if (k.naam) verwerk(k, ctx, diepte);
  }

  function tekst(el, ctx) {
    const regels = [];
    let huidig = null;
    const nieuw = (x, y) => { huidig = { x, y, runs: [] }; regels.push(huidig); };
    nieuw(parseFloat(el.attr.x) || 0, parseFloat(el.attr.y) || 0);
    const loop = (knoop, c) => {
      for (const k of knoop.kinderen) {
        if (k.tekst !== undefined) {
          const t = k.tekst.replace(/\s+/g, ' ');
          if (t !== '') huidig.runs.push({ tekst: t, size: c.size, italic: c.italic, bold: c.bold });
        } else if (k.naam === 'tspan') {
          const c2 = leesStijl(c, k.attr);
          const x = parseFloat(k.attr.x);
          const y = parseFloat(k.attr.y);
          if (Number.isFinite(x) || Number.isFinite(y)) {
            if (huidig.runs.length) nieuw(huidig.x, huidig.y);
            if (Number.isFinite(x)) huidig.x = x;
            if (Number.isFinite(y)) huidig.y = y;
          }
          loop(k, c2);
        } else if (k.naam) {
          onbekend.add(k.naam);
        }
      }
    };
    loop(el, ctx);
    for (const regel of regels) {
      if (!regel.runs.length) continue;
      regel.runs[0].tekst = regel.runs[0].tekst.replace(/^ +/, '');
      const laatste = regel.runs[regel.runs.length - 1];
      laatste.tekst = laatste.tekst.replace(/ +$/, '');
      const runs = regel.runs
        .filter((r) => r.size > 0)
        .map((r) => ({ ...r, ...codeerTekst(r.tekst) }))
        .filter((r) => r.pdf !== '');
      const totaal = runs.reduce((som, r) => som + (r.breedte * r.size) / 1000, 0);
      let x = regel.x;
      if (ctx.anchor === 'middle') x -= totaal / 2;
      else if (ctx.anchor === 'end') x -= totaal;
      for (const r of runs) {
        const font = r.bold ? 'F3' : r.italic ? 'F2' : 'F1';
        uit.push(`BT /${font} ${fmt(r.size)} Tf 1 0 0 -1 ${pt(x, regel.y)} Tm (${r.pdf}) Tj ET`);
        x += (r.breedte * r.size) / 1000;
      }
    }
  }

  function getekend(el, ctx, diepte) {
    const a = el.attr;
    switch (el.naam) {
      case 'g':
        kinderen(el, ctx, diepte);
        break;
      case 'svg': {
        const x = parseFloat(a.x) || 0;
        const y = parseFloat(a.y) || 0;
        const b = lengte(a.width, ctx.vw);
        const h = lengte(a.height, ctx.vh);
        const vp = viewportMatrix(x, y, b, h, a.viewBox);
        omhul(vp.m, () => kinderen(el, { ...ctx, vw: vp.vw, vh: vp.vh }, diepte));
        break;
      }
      case 'use': {
        const href = (a['xlink:href'] ?? a.href ?? '').replace(/^#/, '');
        const doel = ids.get(href);
        if (!doel || diepte > 20) break;
        const x = parseFloat(a.x) || 0;
        const y = parseFloat(a.y) || 0;
        omhul([1, 0, 0, 1, x, y], () => verwerk(doel, ctx, diepte + 1));
        break;
      }
      case 'path': {
        lijnDikte(ctx, false);
        padOpdrachten(a.d, uit, onbekend);
        sluit(ctx, false);
        break;
      }
      case 'polygon':
      case 'polyline': {
        const n = getallen(a.points);
        if (n.length < 4) break;
        const alleenLijn = el.naam === 'polyline';
        lijnDikte(ctx, alleenLijn);
        uit.push(`${pt(n[0], n[1])} m`);
        for (let i = 2; i + 1 < n.length; i += 2) uit.push(`${pt(n[i], n[i + 1])} l`);
        if (!alleenLijn) uit.push('h');
        sluit(ctx, alleenLijn);
        break;
      }
      case 'rect': {
        lijnDikte(ctx, false);
        const r = [parseFloat(a.x) || 0, parseFloat(a.y) || 0, parseFloat(a.width) || 0, parseFloat(a.height) || 0];
        uit.push(`${r.map((v) => fmt(v)).join(' ')} re`);
        sluit(ctx, false);
        break;
      }
      case 'text':
        tekst(el, ctx);
        break;
      default:
        onbekend.add(el.naam);
    }
  }

  function verwerk(el, ctx, diepte = 0) {
    if (NIET_TEKENEN.has(el.naam)) return;
    const c = leesStijl(ctx, el.attr);
    // een svg regelt zijn eigen transformatie via x, y en viewBox
    const m = el.naam === 'svg' ? ID : leesTransform(el.attr.transform);
    omhul(m, () => getekend(el, c, diepte));
  }

  return { uit, onbekend, omhul, verzamel, verwerk };
}

export function svgNaarPdf(svgTekst, { breedte, hoogte }) {
  const doc = leesXml(String(svgTekst ?? ''));
  const wortel = doc.kinderen.find((k) => k.naam === 'svg');
  if (!wortel) return { opdrachten: 'q\nQ\n', onbekend: [] };
  const o = maakOmzetter();
  o.verzamel(wortel);
  let w = parseFloat(wortel.attr.width);
  let h = parseFloat(wortel.attr.height);
  const vb = getallen(wortel.attr.viewBox);
  if (!(w > 0)) w = vb.length === 4 ? vb[2] : breedte;
  if (!(h > 0)) h = vb.length === 4 ? vb[3] : hoogte;
  const s = breedte / w;
  o.uit.push('q');
  o.uit.push(`${fmt(s, 6)} 0 0 ${fmt(-s, 6)} 0 ${fmt(hoogte)} cm`);
  const vp = viewportMatrix(0, 0, w, h, wortel.attr.viewBox);
  const ctx = { vw: vp.vw, vh: vp.vh, fill: undefined, stroke: undefined, sw: undefined, size: 16, anchor: 'start', italic: false, bold: false };
  const c = leesStijl(ctx, wortel.attr);
  o.omhul(vp.m, () => {
    for (const k of wortel.kinderen) if (k.naam) o.verwerk(k, c);
  });
  o.uit.push('Q');
  return { opdrachten: o.uit.join('\n') + '\n', onbekend: [...o.onbekend].sort() };
}

// ---- pdf-bestand ----

function naarBytes(tekst) {
  const b = new Uint8Array(tekst.length);
  for (let i = 0; i < tekst.length; i++) b[i] = tekst.charCodeAt(i) & 255;
  return b;
}

async function deflate(bytes) {
  const cs = new CompressionStream('deflate');
  const schrijver = cs.writable.getWriter();
  schrijver.write(bytes);
  schrijver.close();
  return new Uint8Array(await new Response(cs.readable).arrayBuffer());
}

export async function maakPdfBestand(paginas, { breedte, hoogte }) {
  const stukken = [];
  let lengteTotaal = 0;
  const posities = [];
  const voeg = (data) => {
    const b = typeof data === 'string' ? naarBytes(data) : data;
    stukken.push(b);
    lengteTotaal += b.length;
  };
  const object = (nummer, kop, stroom) => {
    posities[nummer] = lengteTotaal;
    if (stroom) {
      voeg(`${nummer} 0 obj\n<< ${kop} /Length ${stroom.length} >>\nstream\n`);
      voeg(stroom);
      voeg('\nendstream\nendobj\n');
    } else {
      voeg(`${nummer} 0 obj\n${kop}\nendobj\n`);
    }
  };

  voeg('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  const n = paginas.length;
  const kinderen = paginas.map((_, i) => `${6 + 2 * i} 0 R`).join(' ');
  object(1, '<< /Type /Catalog /Pages 2 0 R >>');
  object(2, `<< /Type /Pages /Kids [${kinderen}] /Count ${n} >>`);
  const lettertypen = ['Times-Roman', 'Times-Italic', 'Times-Bold'];
  lettertypen.forEach((naam, i) => {
    object(3 + i, `<< /Type /Font /Subtype /Type1 /BaseFont /${naam} /Encoding /WinAnsiEncoding >>`);
  });
  const mediaBox = `[0 0 ${fmt(breedte, 2)} ${fmt(hoogte, 2)}]`;
  for (let i = 0; i < n; i++) {
    object(
      6 + 2 * i,
      `<< /Type /Page /Parent 2 0 R /MediaBox ${mediaBox} /Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R >> >> /Contents ${7 + 2 * i} 0 R >>`,
    );
    const kaal = naarBytes(paginas[i]);
    const gepakt = typeof CompressionStream === 'undefined' ? null : await deflate(kaal).catch(() => null);
    object(7 + 2 * i, gepakt ? '/Filter /FlateDecode' : '', gepakt ?? kaal);
  }

  const totaal = 6 + 2 * n;
  const xref = lengteTotaal;
  let tabel = `xref\n0 ${totaal}\n0000000000 65535 f \n`;
  for (let i = 1; i < totaal; i++) tabel += `${String(posities[i]).padStart(10, '0')} 00000 n \n`;
  voeg(tabel);
  voeg(`trailer\n<< /Size ${totaal} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  const uit = new Uint8Array(lengteTotaal);
  let pos = 0;
  for (const s of stukken) {
    uit.set(s, pos);
    pos += s.length;
  }
  return uit;
}
