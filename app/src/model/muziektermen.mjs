export const MUZIEKTERMEN = [
  'rall.',
  'rit.',
  'accel.',
  'dolce',
  'poco a poco',
  'a tempo',
  'poco',
  'molto',
  'meno',
  'piu',
  'cresc.',
  'decresc.',
  'dim.',
  'morendo',
  'perdendo',
  'agitato',
  'poco agitato',
  'espressivo',
  'legato',
  'staccato',
  'tenuto',
  'con moto',
  'tranquillo',
  'sostenuto',
  'ritardando',
  'accelerando',
  'mezzo',
  'forte',
  'piano',
  'pizz.',
  'arco',
  'teneramente',
  'andante',
  'allegro',
  'adagio',
  'largo',
  'presto',
  'vivace',
  'moderato',
  'cantabile',
  'maestoso',
  'grazioso',
  'marcato',
  'sempre',
  'subito',
  'rubato',
  'animato',
  'appassionato',
  'delicato',
  'leggiero',
  'smorzando',
  'perdendosi',
  'calando',
  'stringendo',
  'fortissimo',
  'pianissimo',
  'marc.',
  'portato',
  'non legato',
  'simile',
  'con sord.',
  'senza sord.',
  'sul ponticello',
  'col legno',
  'tutti',
  'solo',
  'soli',
  'open',
  'st. mute',
  'straight mute',
  'cup mute',
  'harmon mute',
  'div.',
  'unis.',
  'ad lib.',
  'a piacere',
  'con brio',
  'con fuoco',
  'con anima',
  'energico',
  'giocoso',
  'lento',
  'sfz',
  'fp',
  '1.',
  '2.',
  'D.C.',
  'D.S.',
  'al fine',
  'coda',
  'fermata',
  'optional cut',
  'cut to bar',
  'meno mosso',
  'più mosso',
  'poco rit.',
  'poco rall.',
  'molto cresc.',
  'dolcissimo',
  'sempre staccato',
  'secco',
  'sonore',
  'pesante',
];

function normaliseer(tekst) {
  return tekst
    .toLowerCase()
    .replaceAll('0', 'o')
    .replaceAll('1', 'l')
    .replaceAll('5', 's')
    .replaceAll('rn', 'm')
    .replace(/^[.\-]+|[.\-]+$/g, '');
}

function levenshtein(a, b) {
  let vorigeRij = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let i = 1; i <= a.length; i += 1) {
    const huidigeRij = [i];
    for (let j = 1; j <= b.length; j += 1) {
      huidigeRij[j] = Math.min(
        huidigeRij[j - 1] + 1,
        vorigeRij[j] + 1,
        vorigeRij[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    vorigeRij = huidigeRij;
  }

  return vorigeRij[b.length];
}

export function herstelMuziekterm(tekst) {
  if ((/\d/.test(tekst) && /\s/.test(tekst)) || tekst.length > 25) return tekst;
  const genormaliseerd = normaliseer(tekst);
  const aaneengeschreven = genormaliseerd.replaceAll(' ', '');
  let besteTerm = null;
  let kleinsteAfstand = Infinity;
  let aantalBeste = 0;

  for (const term of MUZIEKTERMEN) {
    if (tekst.trim().toLowerCase() === term.toLowerCase()) return tekst;
    const afstand = levenshtein(aaneengeschreven, normaliseer(term).replaceAll(' ', ''));
    if (afstand < kleinsteAfstand) {
      besteTerm = term;
      kleinsteAfstand = afstand;
      aantalBeste = 1;
    } else if (afstand === kleinsteAfstand) {
      aantalBeste += 1;
    }
  }

  if (aantalBeste === 1 && kleinsteAfstand < aaneengeschreven.length * 0.4) {
    return besteTerm;
  }

  return tekst;
}

const woorden = new Map();
for (const term of MUZIEKTERMEN) {
  for (const woord of term.split(' ')) {
    const sleutel = normaliseer(woord);
    if (!woorden.has(sleutel)) woorden.set(sleutel, woord);
  }
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
    const verschil = levenshtein(genormaliseerd, sleutel);
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
