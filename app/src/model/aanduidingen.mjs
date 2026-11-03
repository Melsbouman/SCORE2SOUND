export const AANDUIDINGEN = {
  tempo: ['Largo', 'Adagio', 'Andante', 'Moderato', 'Allegretto', 'Allegro', 'Vivace', 'Presto', 'rit.', 'rall.', 'accel.', 'a tempo', 'Tempo I', 'Grave', 'Lento', 'Larghetto', 'Andantino', 'Allegro moderato', 'Molto allegro', 'Prestissimo', 'molto rit.', 'poco rit.', 'Tempo primo', 'accelerando', 'ritardando', 'stringendo', 'meno mosso', 'più mosso', 'fermata'],
  expressie: ['dolce', 'cantabile', 'espress.', 'con brio', 'maestoso', 'legato', 'marcato', 'sostenuto', 'tranquillo', 'agitato', 'espressivo', 'con espressione', 'con fuoco', 'leggiero', 'grazioso', 'giocoso', 'pesante', 'risoluto', 'misterioso', 'poco a poco', 'sempre', 'molto', 'subito'],
  spelwijze: ['pizz.', 'arco', 'con sord.', 'senza sord.', 'open', 'muted', 'solo', 'tutti', 'staccato', 'tenuto', 'portato', 'legato', 'sul ponticello', 'sul tasto', 'col legno', 'con sordino', 'senza sordino', 'flutter', 'gestopt', 'half open', 'D.C. al Fine', 'D.S. al Coda', 'Fine', 'Coda', 'Segno', 'tacet'],
  dynamiek: ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp', 'cresc.', 'dim.', 'ppp', 'pppp', 'ffff', 'sffz', 'rfz', 'sfp', 'decresc.', 'poco cresc.', 'poco dim.'],
};

export function plaatsingVan(tekst) {
  const aanduiding = tekst.trim().toLowerCase();
  const dynamiek = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'ppp', 'ffff', 'pppp', 'sf', 'sfz', 'sfp', 'fp', 'rfz', 'sffz'];

  return dynamiek.includes(aanduiding) || aanduiding.includes('cresc') || aanduiding.includes('dim')
    ? 'below'
    : 'above';
}
