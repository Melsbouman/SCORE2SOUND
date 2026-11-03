// Dynamiektekens (p, mf, ff, ...). Staat apart van musicxml/aanwijzingen.mjs, want dat bestand
// laadt fast-xml-parser en die bibliotheek bestaat alleen op de server; de browser gebruikt dit ook.
const DYNAMIEKTEKENS = new Set([
  'pppp', 'ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ffff',
  'fp', 'sf', 'sfz', 'sfp', 'rfz',
]);

export function dynamiekUitTekst(waarde) {
  const naam = String(waarde).trim().toLowerCase();
  return DYNAMIEKTEKENS.has(naam) ? naam : null;
}
