// Vergelijkt een herkende partituur met het juiste antwoord, voor de scanmeting.
// Werkt op het muziekmodel (docs/model.md), dus duren in tikken: verschillende divisions maken niet uit.
// Maten worden eerst uitgelijnd, zodat een ontbrekende of extra maat de rest niet laat opschuiven.
import { leesMusicXML } from '../musicxml/lezen.mjs';

const STAPPEN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function toonVan(noot) {
  if (noot.ongestemd || !noot.toonhoogte) return 'X';
  const { stap, alter = 0, octaaf } = noot.toonhoogte;
  const teken = alter > 0 ? '#'.repeat(alter) : alter < 0 ? 'b'.repeat(-alter) : '';
  return `${stap}${teken}${octaaf}`;
}

function toonGetal(noot) {
  if (noot.ongestemd || !noot.toonhoogte) return -1;
  const { stap, alter = 0, octaaf } = noot.toonhoogte;
  return octaaf * 12 + (STAPPEN[stap] ?? 0) + alter;
}

// De noten van een maat als tekens, op volgorde van start en (bij een akkoord) van laag naar hoog. Voorslagen tellen niet mee.
function nootTekens(maat) {
  return (maat?.elementen ?? [])
    .filter((e) => e.soort === 'noot' && !e.voorslag)
    .sort((a, b) => a.start - b.start || toonGetal(a) - toonGetal(b))
    .map((e) => ({ toon: toonVan(e), duur: e.duur }));
}

// Elke maat van een partij als eenheid; een meermaats-rust zonder uitgeschreven maten wordt uitgeschreven.
function eenheden(partij) {
  const maten = partij?.maten ?? [];
  const uit = [];
  for (let i = 0; i < maten.length; i += 1) {
    const maat = maten[i];
    uit.push({ nummer: String(maat.nummer ?? i + 1), noten: nootTekens(maat) });
    if (maat.maatrust > 1 && !maten[i + 1]?.verborgen) {
      for (let k = 1; k < maat.maatrust; k += 1) uit.push({ nummer: `${maat.nummer ?? i + 1}+${k}`, noten: [] });
    }
  }
  return uit;
}

// Lengte van de langste gemeenschappelijke deelrij, met een eigen gelijkheid.
function lcs(a, b, gelijk) {
  if (a.length === 0 || b.length === 0) return 0;
  let vorige = new Array(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    const rij = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j += 1) {
      rij[j] = gelijk(a[i - 1], b[j - 1]) ? vorige[j - 1] + 1 : Math.max(vorige[j], rij[j - 1]);
    }
    vorige = rij;
  }
  return vorige[b.length];
}

const beide = (x, y) => x.toon === y.toon && x.duur === y.duur;
const alleenToon = (x, y) => x.toon === y.toon;
const alleenDuur = (x, y) => x.duur === y.duur;

function gelijkenis(a, b) {
  if (a.noten.length === 0 && b.noten.length === 0) return 1;
  return (2 * lcs(a.noten, b.noten, beide)) / (a.noten.length + b.noten.length);
}

// Lijnt twee rijen maten uit (zoals een spellingscontrole woorden uitlijnt). Geeft paren [i, j]; null is een gat.
function lijnUit(juist, gemeten) {
  const n = juist.length;
  const m = gemeten.length;
  const kosten = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 1; i <= n; i += 1) kosten[i][0] = i;
  for (let j = 1; j <= m; j += 1) kosten[0][j] = j;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      const paar = kosten[i - 1][j - 1] + (1 - gelijkenis(juist[i - 1], gemeten[j - 1]));
      kosten[i][j] = Math.min(paar, kosten[i - 1][j] + 1, kosten[i][j - 1] + 1);
    }
  }
  const paren = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && Math.abs(kosten[i][j] - (kosten[i - 1][j - 1] + (1 - gelijkenis(juist[i - 1], gemeten[j - 1])))) < 1e-9) {
      paren.push([i - 1, j - 1]);
      i -= 1;
      j -= 1;
    } else if (i > 0 && Math.abs(kosten[i][j] - (kosten[i - 1][j] + 1)) < 1e-9) {
      paren.push([i - 1, null]);
      i -= 1;
    } else {
      paren.push([null, j - 1]);
      j -= 1;
    }
  }
  return paren.reverse();
}

const tekstVan = (noten) => noten.map((x) => `${x.toon}:${x.duur}`).join(' ');

// Vergelijkt twee partituren uit het model. De partijen worden op volgorde gekoppeld.
export function vergelijkPartituren(juist, gemeten) {
  const totaal = { noten: 0, juist: 0, toonhoogteJuist: 0, duurJuist: 0, maten: 0, matenJuist: 0, matenOntbrekend: 0, matenExtra: 0 };
  const partijen = [];
  const verschillen = [];
  (juist?.partijen ?? []).forEach((juistePartij, index) => {
    const a = eenheden(juistePartij);
    const b = eenheden(gemeten?.partijen?.[index]);
    const deel = { naam: juistePartij.naam ?? '', noten: 0, juist: 0, maten: a.length, matenJuist: 0 };
    for (const [i, j] of lijnUit(a, b)) {
      if (i === null) {
        totaal.matenExtra += 1;
        verschillen.push({ partij: deel.naam, soort: 'extra', maat: null, gemeten: b[j].nummer, juisteNoten: '', gemetenNoten: tekstVan(b[j].noten) });
        continue;
      }
      deel.noten += a[i].noten.length;
      if (j === null) {
        totaal.matenOntbrekend += 1;
        verschillen.push({ partij: deel.naam, soort: 'ontbreekt', maat: a[i].nummer, gemeten: null, juisteNoten: tekstVan(a[i].noten), gemetenNoten: '' });
        continue;
      }
      const goed = lcs(a[i].noten, b[j].noten, beide);
      deel.juist += goed;
      totaal.toonhoogteJuist += lcs(a[i].noten, b[j].noten, alleenToon);
      totaal.duurJuist += lcs(a[i].noten, b[j].noten, alleenDuur);
      if (goed === a[i].noten.length && goed === b[j].noten.length) {
        deel.matenJuist += 1;
      } else {
        verschillen.push({ partij: deel.naam, soort: 'noten', maat: a[i].nummer, gemeten: b[j].nummer, juisteNoten: tekstVan(a[i].noten), gemetenNoten: tekstVan(b[j].noten) });
      }
    }
    totaal.noten += deel.noten;
    totaal.juist += deel.juist;
    totaal.maten += deel.maten;
    totaal.matenJuist += deel.matenJuist;
    partijen.push(deel);
  });
  return { ...totaal, nauwkeurigheid: totaal.noten > 0 ? totaal.juist / totaal.noten : 0, partijen, verschillen };
}

// Vergelijkt twee MusicXML-teksten: eerst inlezen in het model, dan vergelijkPartituren.
export function vergelijkMusicXML(juistXml, gemetenXml) {
  return vergelijkPartituren(leesMusicXML(juistXml), leesMusicXML(gemetenXml));
}
