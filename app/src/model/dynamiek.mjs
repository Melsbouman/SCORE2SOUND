// Dynamiektekens (p, mf, ff, ...). Staat apart van musicxml/aanwijzingen.mjs, want dat bestand
// laadt fast-xml-parser en die bibliotheek bestaat alleen op de server; de browser gebruikt dit ook.
const DYNAMIEKTEKENS = new Set([
  'pppp', 'ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ffff',
  'fp', 'sf', 'sfz', 'sfp', 'rfz',
]);

const SAMENGESTELDE_TEKENS = new Set(['fp', 'sfz', 'sfp', 'mf']);

export const DYNAMIEK_SNELTOETSEN = {
  1: 'pp',
  2: 'p',
  3: 'mp',
  4: 'mf',
  5: 'f',
  6: 'ff',
};

export function dynamiekUitTekst(waarde) {
  const naam = String(waarde).trim().toLowerCase();
  return DYNAMIEKTEKENS.has(naam) ? naam : null;
}

export function combineerDynamiektekens(tekens) {
  if (tekens.length <= 1) return { teken: tekens[0] ?? null, conflict: false };

  const combinatie = tekens.map((teken) => teken.waarde).join('').toLowerCase();
  if (SAMENGESTELDE_TEKENS.has(combinatie)) {
    return {
      teken: {
        ...tekens[0],
        waarde: combinatie,
        zekerheid: Math.max(...tekens.map((teken) => teken.zekerheid ?? 0)),
      },
      conflict: false,
    };
  }

  const teken = tekens.reduce((beste, kandidaat) =>
    (kandidaat.zekerheid ?? 0) > (beste.zekerheid ?? 0) ? kandidaat : beste
  );
  return { teken, conflict: true };
}
