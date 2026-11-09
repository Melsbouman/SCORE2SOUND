// Een kleine pdf-lezer die in de browser en in Node draait (geen Buffer, geen zlib, geen bibliotheek).
// Gecomprimeerde stromen (FlateDecode) pakt de ingebouwde DecompressionStream uit; daarom is openen async.
// Wat hij kan: objecten (ook in objectstromen), de pagina's op volgorde met hun MediaBox en overgeërfde /Resources,
// en de inhoud van een stroom. Wat niet: versleutelde pdf's en kapotte xref-tabellen (we zoeken objecten in de tekst).

// Bytes naar een tekst met één teken per byte (latin1), zodat een positie in de tekst gelijk is aan een positie in de bytes.
export function naarTekst(bytes) {
  let uit = '';
  for (let i = 0; i < bytes.length; i += 8192) uit += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
  return uit;
}

// FlateDecode (zlib) uitpakken; een kapotte stroom geeft lege bytes in plaats van een fout.
export async function inflate(ruw) {
  try {
    const stroom = new Blob([ruw]).stream().pipeThrough(new DecompressionStream('deflate'));
    return new Uint8Array(await new Response(stroom).arrayBuffer());
  } catch {
    return new Uint8Array(0);
  }
}

const verwijzingIn = (tekst, sleutel) => {
  const gevonden = tekst.match(new RegExp(`/${sleutel}\\s+(\\d+)\\s+\\d+\\s+R`));
  return gevonden ? Number(gevonden[1]) : null;
};

// De filters van een stroom, in volgorde (/Filter /FlateDecode of /Filter [/FlateDecode /DCTDecode]).
export function filtersVan(woordenboek) {
  const reeks = woordenboek.match(/\/Filter\s*\[([^\]]*)\]/);
  if (reeks) return [...reeks[1].matchAll(/\/([A-Za-z0-9]+)/g)].map((g) => g[1]);
  const enkel = woordenboek.match(/\/Filter\s*\/([A-Za-z0-9]+)/);
  return enkel ? [enkel[1]] : [];
}

function zoekObjecten(bytes, tekst) {
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
      objecten.set(Number(gevonden[1]), { woordenboek: inhoud, ruw: null });
    } else {
      const woordenboek = inhoud.slice(0, stroomBegin);
      const dataBegin = stroomBegin + inhoud.slice(stroomBegin).match(/stream\r?\n/)[0].length;
      const lengte = woordenboek.match(/\/Length\s+(\d+)(?!\s+\d+\s+R)/);
      const dataEind = lengte ? dataBegin + Number(lengte[1]) : inhoud.lastIndexOf('endstream');
      objecten.set(Number(gevonden[1]), { woordenboek, ruw: bytes.subarray(begin + dataBegin, begin + Math.max(dataBegin, dataEind)) });
    }
    patroon.lastIndex = eind;
  }
  return objecten;
}

// De inhoud tussen << en >> na een sleutel (een direct woordenboek), of het woordenboek van het object waarnaar hij verwijst.
export function woordenboekBij(tekst, sleutel, objecten) {
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
  const nummer = verwijzingIn(tekst, sleutel);
  return nummer != null ? objecten.get(nummer)?.woordenboek ?? null : null;
}

export function getallenReeks(tekst, sleutel, objecten) {
  const direct = tekst.match(new RegExp(`/${sleutel}\\s*\\[([^\\]]*)\\]`));
  if (direct) return direct[1].trim().split(/\s+/).filter(Boolean).map(Number);
  const nummer = verwijzingIn(tekst, sleutel);
  const object = nummer != null ? objecten.get(nummer)?.woordenboek : null;
  const inObject = object?.match(/\[([^\]]*)\]/);
  return inObject ? inObject[1].trim().split(/\s+/).filter(Boolean).map(Number) : [];
}

// De pagina's op volgorde via /Root -> /Pages -> /Kids; een pagina erft /Resources en /MediaBox van zijn ouder.
function zoekPaginas(objecten) {
  const catalogus = [...objecten.values()].find((object) => /\/Type\s*\/Catalog/.test(object.woordenboek));
  const uit = [];
  const bezocht = new Set();
  const bezoek = (nummer, geerfd, geerfdeMaat) => {
    const object = objecten.get(nummer);
    if (!object || bezocht.has(nummer)) return;
    bezocht.add(nummer);
    const eigen = woordenboekBij(object.woordenboek, 'Resources', objecten);
    const bronnen = eigen != null ? `/Resources << ${eigen} >>` : geerfd;
    const woordenboek = `${object.woordenboek} ${bronnen}`;
    const maat = object.woordenboek.match(/\/MediaBox\s*\[([^\]]*)\]/)?.[1].trim().split(/\s+/).map(Number) ?? geerfdeMaat;
    if (/\/Type\s*\/Pages/.test(object.woordenboek)) {
      const kinderen = object.woordenboek.match(/\/Kids\s*\[([^\]]*)\]/)?.[1] ?? '';
      for (const [, kind] of kinderen.matchAll(/(\d+)\s+\d+\s+R/g)) bezoek(Number(kind), bronnen, maat);
    } else if (/\/Type\s*\/Page\b/.test(object.woordenboek)) {
      uit.push({ nummer, woordenboek, maat: maat ?? [0, 0, 612, 792] });
    }
  };
  const wortel = catalogus ? verwijzingIn(catalogus.woordenboek, 'Pages') : null;
  if (wortel != null) bezoek(wortel, '', null);
  return uit;
}

// Opent een pdf. Geeft { objecten, paginas, stroom(nummer), inhoud(pagina) }:
// - objecten: Map van nummer naar { woordenboek (tekst), ruw (Uint8Array of null) };
// - paginas: [{ nummer, woordenboek (met overgeërfde /Resources), maat: [x0, y0, x1, y1] }];
// - stroom(nummer): de bytes van een stroom met FlateDecode uitgepakt (andere filters, zoals DCTDecode, blijven zoals ze zijn);
// - inhoud(pagina): alle inhoudsstromen van een pagina achter elkaar.
export async function openPdf(invoer) {
  const bytes = invoer instanceof Uint8Array ? invoer : new Uint8Array(invoer);
  const objecten = zoekObjecten(bytes, naarTekst(bytes));
  const uitgepakt = new Map();
  const stroom = async (nummer) => {
    if (uitgepakt.has(nummer)) return uitgepakt.get(nummer);
    const object = objecten.get(nummer);
    let data = object?.ruw ?? new Uint8Array(0);
    if (object?.ruw && filtersVan(object.woordenboek)[0] === 'FlateDecode') data = await inflate(object.ruw);
    uitgepakt.set(nummer, data);
    return data;
  };
  // Objecten in een objectstroom (/Type /ObjStm): eerst N paren "nummer offset", dan de objecten vanaf /First.
  for (const [nummer, object] of [...objecten]) {
    if (!/\/Type\s*\/ObjStm/.test(object.woordenboek) || !object.ruw) continue;
    const n = Number(object.woordenboek.match(/\/N\s+(\d+)/)?.[1] ?? 0);
    const eerste = Number(object.woordenboek.match(/\/First\s+(\d+)/)?.[1] ?? 0);
    const data = naarTekst(await stroom(nummer));
    const kop = data.slice(0, eerste).trim().split(/\s+/).map(Number);
    for (let i = 0; i < n; i += 1) {
      const binnen = kop[2 * i];
      const begin = eerste + kop[2 * i + 1];
      const eind = i + 1 < n ? eerste + kop[2 * i + 3] : data.length;
      if (!objecten.has(binnen)) objecten.set(binnen, { woordenboek: data.slice(begin, eind), ruw: null });
    }
  }
  const paginas = zoekPaginas(objecten);
  const inhoud = async (pagina) => {
    const reeks = pagina.woordenboek.match(/\/Contents\s*\[([^\]]*)\]/);
    const nummers = reeks
      ? [...reeks[1].matchAll(/(\d+)\s+\d+\s+R/g)].map((g) => Number(g[1]))
      : [verwijzingIn(pagina.woordenboek, 'Contents')].filter((n) => n != null);
    const delen = await Promise.all(nummers.map(stroom));
    const totaal = delen.reduce((som, deel) => som + deel.length + 1, 0);
    const uit = new Uint8Array(totaal);
    let plek = 0;
    for (const deel of delen) {
      uit.set(deel, plek);
      uit[plek + deel.length] = 10;
      plek += deel.length + 1;
    }
    return uit;
  };
  return { objecten, paginas, stroom, inhoud };
}

export { verwijzingIn as verwijzing };
