export const AANDUIDINGEN = {
  tempo: ['Largo', 'Adagio', 'Andante', 'Moderato', 'Allegretto', 'Allegro', 'Vivace', 'Presto', 'rit.', 'rall.', 'accel.', 'a tempo', 'Tempo I'],
  expressie: ['dolce', 'cantabile', 'espress.', 'con brio', 'maestoso', 'legato', 'marcato', 'sostenuto', 'tranquillo', 'agitato'],
  spelwijze: ['pizz.', 'arco', 'con sord.', 'senza sord.', 'open', 'muted', 'solo', 'tutti'],
  dynamiek: ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp', 'cresc.', 'dim.'],
};

export function plaatsingVan(tekst) {
  const aanduiding = tekst.trim().toLowerCase();
  const dynamiek = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ppp', 'ffff', 'pppp', 'sf', 'sfz', 'sfp', 'fp', 'rfz'];

  return dynamiek.includes(aanduiding) || aanduiding.includes('cresc') || aanduiding.includes('dim')
    ? 'below'
    : 'above';
}
