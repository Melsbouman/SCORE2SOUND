const INSTRUMENTEN = [
  ['flugelhorn', 'Flugelhorn'],
  ['cornet', 'Cornet'],
  ['soprano cornet', 'Soprano Cornet'],
  ['repiano', 'Repiano'],
  ['solo cornet', 'Solo Cornet'],
  ['horn', 'Horn'],
  ['tenor horn', 'Tenor Horn'],
  ['baritone', 'Baritone'],
  ['euphonium', 'Euphonium'],
  ['trombone', 'Trombone'],
  ['bass trombone', 'Bass Trombone'],
  ['tenor trombone', 'Tenor Trombone'],
  ['tuba', 'Tuba'],
  ['eb tuba', 'Tuba'],
  ['bb tuba', 'Tuba'],
  ['bass', 'Bass'],
  ['trumpet', 'Trumpet'],
  ['clarinet', 'Clarinet'],
  ['flute', 'Flute'],
  ['oboe', 'Oboe'],
  ['bassoon', 'Bassoon'],
  ['saxophone', 'Saxophone'],
  ['violin', 'Violin'],
  ['viola', 'Viola'],
  ['cello', 'Cello'],
  ['timpani', 'Timpani'],
  ['percussion', 'Percussion'],
  ['piano', 'Piano'],
  ['bugel', 'Bugel'],
  ['kornet', 'Kornet'],
  ['althoorn', 'Althoorn'],
  ['bariton', 'Bariton'],
  ['basses', 'Bass'],
];

const SLAGWERKNAMEN = [
  'drums',
  'drum',
  'xylophone',
  'snare',
  'cymbal',
  'glockenspiel',
  'tambourine',
  'triangle',
  'timbales',
  'marimba',
  'vibraphone',
  'bell',
  'bells',
  'gong',
];

function normaliseer(tekst) {
  return tekst
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/['’]s\b/g, '')
    .replace(/rn/g, 'm')
    .replace(/[il1]/g, 'i')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function varianten(tekst) {
  const basis = normaliseer(tekst);
  return [...new Set([basis, basis.replace(/ii/g, 'u'), basis.replace(/ii/g, 'n')])];
}

function afstand(a, b) {
  let vorige = Array.from({ length: b.length + 1 }, (_, index) => index);

  for (let rij = 1; rij <= a.length; rij += 1) {
    const huidige = [rij];
    for (let kolom = 1; kolom <= b.length; kolom += 1) {
      huidige[kolom] = Math.min(
        huidige[kolom - 1] + 1,
        vorige[kolom] + 1,
        vorige[kolom - 1] + (a[rij - 1] === b[kolom - 1] ? 0 : 1),
      );
    }
    vorige = huidige;
  }

  return vorige[b.length];
}

function besteInstrument(gelezen) {
  const isSlagwerk = varianten(gelezen).some((gelezenVariant) => {
    const woorden = gelezenVariant.split(' ');
    return SLAGWERKNAMEN.some((slagwerknaam) => varianten(slagwerknaam).some((slagwerkVariant) => (
      gelezenVariant.includes(slagwerkVariant)
      || woorden.some((woord) => afstand(woord, slagwerkVariant) <= 1)
    )));
  });
  if (isSlagwerk) return 'Percussion';

  let beste = null;

  for (const [zoeknaam, schrijfwijze] of INSTRUMENTEN) {
    for (const gelezenVariant of varianten(gelezen)) {
      for (const naamVariant of varianten(zoeknaam)) {
        const score = afstand(gelezenVariant, naamVariant) / naamVariant.length;
        if (!beste || score < beste.score) beste = { schrijfwijze, score };
      }
    }
  }

  return beste.schrijfwijze;
}

function leesStemming(naam) {
  // Normalize flat sign '♭' to 'b' for stem detection
  const nameForMatching = naam.replace(/\u266D/g, 'b');

  const treffer = nameForMatching.match(/(^|[^a-z])(bbb|bb|eb|kb|bh|es|c|f)(?=$|[^a-z])/i);
  if (!treffer) return { stemming: null, vooraan: false, naam };

  const captured = treffer[2]; // original captured case
  const lower = captured.toLowerCase();
  let stemming;
  if (lower === 'bbb') {
    stemming = captured; // preserve original case
  } else if (lower === 'bb' || lower === 'bh') {
    stemming = 'Bb';
  } else if (lower === 'c' || lower === 'f') {
    stemming = lower.toUpperCase();
  } else {
    stemming = 'Eb';
  }

  const vooraan = naam.slice(0, treffer.index + treffer[1].length).trim().length === 0;
  const begin = treffer.index + treffer[1].length;
  const zonderStemming = `${naam.slice(0, begin)} ${naam.slice(begin + captured.length)}`;
  return { stemming, vooraan, naam: zonderStemming };
}

export function herstelInstrumentnamen(namen) {
  const laatsteNummers = new Map();

  return namen.map((gelezenNaam) => {
    const stemmingInfo = leesStemming(String(gelezenNaam));
    const nummerTreffer = stemmingInfo.naam.match(/[1-6]/);
    const gelezenInstrument = stemmingInfo.naam.replace(/[1-6]/g, ' ');
    const hasIn = /\bin\b/gi.test(gelezenInstrument);
    const instrumentForBest = gelezenInstrument.replace(/\bin\b/gi, '').replace(/\s+/g, ' ').trim();
    const instrument = besteInstrument(instrumentForBest);
    const reeks = `${instrument}|${stemmingInfo.stemming ?? ''}`;
    let nummer = nummerTreffer ? Number(nummerTreffer[0]) : null;

    if (nummer === null && laatsteNummers.has(reeks)) {
      nummer = laatsteNummers.get(reeks) + 1;
    }
    if (nummer !== null) laatsteNummers.set(reeks, nummer);

    const nummerTekst = nummer === null ? '' : ` ${nummer}`;
    const stemmingAchter = stemmingInfo.stemming && !stemmingInfo.vooraan
      ? ` ${stemmingInfo.stemming}`
      : '';
    const stemmingVoor = stemmingInfo.stemming && stemmingInfo.vooraan
      ? `${stemmingInfo.stemming} `
      : '';
    return hasIn
      ? `${stemmingVoor}${instrument} in${nummerTekst}${stemmingAchter}`
      : `${stemmingVoor}${instrument}${nummerTekst}${stemmingAchter}`;
  });
}
