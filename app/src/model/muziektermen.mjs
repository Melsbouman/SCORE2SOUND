const muziektermen = [
  'rall.', 'rit.', 'ritard.', 'accel.', 'a tempo', 'tempo primo', 'tempo I',
  'poco a poco', 'poco', 'molto', 'meno mosso', 'piu mosso', 'cresc.',
  'decresc.', 'dim.', 'dolce', 'espress.', 'espressivo', 'con espress.',
  'legato', 'staccato', 'marcato', 'tenuto', 'sostenuto', 'sempre', 'subito',
  'simile', 'tutti', 'soli', 'solo', 'unis.', 'div.', 'arco', 'pizz.',
  'con sord.', 'senza sord.', 'open', 'muted', 'morendo', 'perdendosi',
  'smorzando', 'calando', 'animando', 'agitato', 'appassionato', 'cantabile',
  'maestoso', 'grandioso', 'giocoso', 'scherzando', 'pesante', 'lento',
  'adagio', 'andante', 'moderato', 'allegro', 'vivace', 'presto', 'larghetto',
  'tranquillo', 'semplice', 'deliberamente', 'fieramente', 'minaccioso',
  'tenerezza', 'teneramente', 'colla parte', 'ritenuto', 'stringendo',
  'allargando', 'rubato', 'grazioso', 'brillante', 'energico', 'con moto',
];

const woorden = new Map();
for (const term of muziektermen) {
  for (const woord of term.split(' ')) {
    const sleutel = normaliseer(woord);
    if (!woorden.has(sleutel)) woorden.set(sleutel, woord);
  }
}

function normaliseer(woord) {
  return woord.toLowerCase().replaceAll('0', 'o').replaceAll('1', 'l');
}

function afstand(a, b) {
  const vorige = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i += 1) {
    const huidige = [i];
    for (let j = 1; j <= b.length; j += 1) {
      huidige[j] = Math.min(
        huidige[j - 1] + 1,
        vorige[j] + 1,
        vorige[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    vorige.splice(0, vorige.length, ...huidige);
  }
  return vorige[b.length];
}

function behoudHoofdletter(bron, vervanging) {
  return /^\p{Lu}/u.test(bron)
    ? vervanging[0].toUpperCase() + vervanging.slice(1)
    : vervanging;
}

function verbeterWoord(woord) {
  const delen = woord.match(/^(\P{L}*)([\p{L}\d]+)(\P{L}*)$/u);
  if (!delen) return woord;

  const [, voor, kern, na] = delen;
  if (/^\d+$/.test(kern) || (/^\p{Lu}/u.test(kern) && !/^[A-Z]/.test(kern))) return woord;

  const genormaliseerd = normaliseer(kern);
  if (genormaliseerd === 'tempol') return `${voor}${behoudHoofdletter(kern, 'tempo I')}${na}`;
  if (woorden.has(genormaliseerd)) {
    if (genormaliseerd === kern.toLowerCase()) return woord;
    return voor + behoudHoofdletter(kern, woorden.get(genormaliseerd)) + na;
  }

  const maximum = genormaliseerd.length <= 6 ? 1 : 2;
  let beste;
  let besteAfstand = maximum + 1;
  for (const [sleutel, term] of woorden) {
    const verschil = afstand(genormaliseerd, sleutel);
    if (verschil < besteAfstand) {
      beste = term;
      besteAfstand = verschil;
    } else if (verschil === besteAfstand) {
      beste = undefined;
    }
  }

  if (!beste || besteAfstand > maximum) return woord;
  return voor + behoudHoofdletter(kern, beste) + na;
}

export function verbeterTekst(tekst) {
  if (typeof tekst !== 'string' || /^\s*\d+(?:[.,]\d+)?\s*$/.test(tekst)) return tekst;
  return tekst.split(/(\s+)/).map((deel) => /^\s+$/.test(deel) ? deel : verbeterWoord(deel)).join('');
}
