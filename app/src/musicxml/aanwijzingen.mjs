import { kind, kinderen, tekst, getal } from './xml.mjs';

const STANDAARD = {
  deelwaarden: 1,
  maatsoort: { teller: 4, noemer: 4 },
  toonsoort: { kwinten: 0, modus: 'majeur' },
  sleutels: [{ teken: 'G', lijn: 2, notenbalk: 1, octaafVerschuiving: 0 }],
  transpositie: { chromatisch: 0, diatonisch: 0 },
};

export function leesAttributen(attributesKnoop, huidig) {
  const stand = structuredClone(huidig ?? STANDAARD);
  const divisions = kind(attributesKnoop, 'divisions');
  if (divisions) stand.deelwaarden = getal(divisions);

  const time = kind(attributesKnoop, 'time');
  if (time) {
    const teller = tekst(kind(time, 'beats')).split('+').reduce((som, deel) => som + Number(deel), 0);
    stand.maatsoort = { teller, noemer: getal(kind(time, 'beat-type')) };
  }

  const key = kind(attributesKnoop, 'key');
  if (key) {
    const mode = kind(key, 'mode');
    stand.toonsoort = {
      kwinten: getal(kind(key, 'fifths')),
      modus: mode && tekst(mode) === 'minor' ? 'mineur' : 'majeur',
    };
  }

  const clefs = kinderen(attributesKnoop, 'clef');
  for (const clef of clefs) {
    const notenbalk = Number(clef.attr.number ?? 1);
    const octave = kind(clef, 'clef-octave-change');
    const nieuw = {
      teken: tekst(kind(clef, 'sign')),
      lijn: getal(kind(clef, 'line')),
      notenbalk,
      octaafVerschuiving: octave ? getal(octave) : 0,
    };
    stand.sleutels = stand.sleutels.filter((sleutel) => sleutel.notenbalk !== notenbalk);
    stand.sleutels.push(nieuw);
  }
  stand.sleutels.sort((a, b) => a.notenbalk - b.notenbalk);

  const transpose = kind(attributesKnoop, 'transpose');
  if (transpose) {
    const chromatic = kind(transpose, 'chromatic');
    const diatonic = kind(transpose, 'diatonic');
    stand.transpositie = {
      chromatisch: chromatic ? getal(chromatic) : 0,
      diatonisch: diatonic ? getal(diatonic) : 0,
    };
  }
  return stand;
}

export function leesMaatrust(attributesKnoop) {
  for (const stijl of kinderen(attributesKnoop, 'measure-style')) {
    const aantal = getal(kind(stijl, 'multiple-rest'));
    if (aantal !== null) return aantal;
  }
  return null;
}

function aanwijzing(start, type, waarde, getoond) {
  return {
    soort: 'aanwijzing',
    start,
    type,
    waarde,
    ...(getoond ? { getoond } : {}),
    zekerheid: 1,
  };
}

export function leesRichting(directionKnoop, start, vorigeWig = 'crescendo') {
  const aanwijzingen = [];
  const sprong = {};
  let tempo = null;
  let metronoomTempo = null;
  let getoond = null;
  for (const directionType of kinderen(directionKnoop, 'direction-type')) {
    const dynamics = kind(directionType, 'dynamics');
    if (dynamics) {
      const dynamiek = kinderen(dynamics)[0];
      if (dynamiek) aanwijzingen.push(aanwijzing(start, 'dynamiek', dynamiek.naam));
    }
    const wedge = kind(directionType, 'wedge');
    if (wedge) {
      const type = wedge.attr.type;
      if (type === 'stop') aanwijzingen.push(aanwijzing(start, vorigeWig, 'eind'));
      if (type === 'crescendo') aanwijzingen.push(aanwijzing(start, 'crescendo', 'begin'));
      if (type === 'diminuendo') aanwijzingen.push(aanwijzing(start, 'decrescendo', 'begin'));
    }
    const octaveShift = kind(directionType, 'octave-shift');
    if (octaveShift && ['up', 'down', 'stop'].includes(octaveShift.attr.type)) {
      const waarde = { up: 'begin-omlaag', down: 'begin-omhoog', stop: 'eind' }[octaveShift.attr.type];
      aanwijzingen.push({
        ...aanwijzing(start, 'octaafteken', waarde),
        grootte: Number(octaveShift.attr.size) === 15 ? 15 : 8,
        nummer: Number(octaveShift.attr.number ?? 1),
      });
    }
    const words = kind(directionType, 'words');
    if (words) {
      const waarde = tekst(words);
      const compact = waarde.toLowerCase().replace(/[\s.]/g, '');
      const sprongTekst = /^dc(?:alfine)?$/.test(compact)
        || /^ds(?:alfine)?$/.test(compact) || compact === 'tocoda' || compact === 'fine';
      if (/^dc(?:alfine)?$/.test(compact)) sprong.daCapo = true;
      if (/^ds(?:alfine)?$/.test(compact)) sprong.dalSegno = 'segno';
      if (compact === 'tocoda') sprong.naarCoda = 'coda';
      if (compact === 'fine') sprong.fine = true;
      if (!sprongTekst) aanwijzingen.push(aanwijzing(start, 'tekst', waarde));
    }
    const segno = kind(directionType, 'segno');
    if (segno) sprong.segno = tekst(segno) || 'waar';
    const coda = kind(directionType, 'coda');
    if (coda) sprong.coda = tekst(coda) || 'waar';
    const letter = kind(directionType, 'rehearsal');
    if (letter && tekst(letter)) aanwijzingen.push(aanwijzing(start, 'letter', tekst(letter)));
    const metronome = kind(directionType, 'metronome');
    if (metronome) {
      const factoren = { whole: 4, half: 2, quarter: 1, eighth: 0.5, '16th': 0.25 };
      const eenheid = tekst(kind(metronome, 'beat-unit'));
      const punt = Boolean(kind(metronome, 'beat-unit-dot'));
      const getalTempo = getal(kind(metronome, 'per-minute'));
      getoond = { eenheid, punt, getal: getalTempo };
      metronoomTempo = getalTempo * (factoren[eenheid] ?? 1) * (punt ? 1.5 : 1);
      tempo = metronoomTempo;
    }
  }
  const sound = kind(directionKnoop, 'sound');
  if (sound) {
    if (sound.attr.segno !== undefined) sprong.segno = sound.attr.segno === 'yes' ? 'waar' : sound.attr.segno;
    if (sound.attr.coda !== undefined) sprong.coda = sound.attr.coda === 'yes' ? 'waar' : sound.attr.coda;
    if (sound.attr.dacapo === 'yes') sprong.daCapo = true;
    if (sound.attr.dalsegno) sprong.dalSegno = sound.attr.dalsegno;
    if (sound.attr.tocoda) sprong.naarCoda = sound.attr.tocoda;
    if (sound.attr.fine === 'yes') sprong.fine = true;
  }
  if (sound?.attr.tempo !== undefined) {
    tempo = Number(sound.attr.tempo);
    if (metronoomTempo !== null && tempo !== metronoomTempo) getoond = null;
  }
  if (tempo !== null) aanwijzingen.push(aanwijzing(start, 'tempo', tempo, getoond));
  return { aanwijzingen, tempo, ...(Object.keys(sprong).length ? { sprong } : {}) };
}

export function leesNotaties(noteKnoop) {
  const resultaat = {
    articulaties: [],
    legato: { begin: false, eind: false },
    versiering: null,
    overbinding: { begin: false, eind: false },
  };
  const notationsKnopen = kinderen(noteKnoop, 'notations');
  for (const notations of notationsKnopen) {
    const articulations = kind(notations, 'articulations');
    if (articulations) {
      const toegestaan = ['staccato', 'accent', 'tenuto', 'staccatissimo'];
      for (const articulatie of kinderen(articulations)) {
        if (toegestaan.includes(articulatie.naam)) resultaat.articulaties.push(articulatie.naam);
        if (articulatie.naam === 'strong-accent') resultaat.articulaties.push('marcato');
      }
    }
    for (const slur of kinderen(notations, 'slur')) {
      if (slur.attr.type === 'start') resultaat.legato.begin = true;
      if (slur.attr.type === 'stop') resultaat.legato.eind = true;
    }
    const ornaments = kind(notations, 'ornaments');
    if (ornaments) {
      const ornament = kinderen(ornaments)[0]?.naam;
      if (ornament === 'trill-mark') resultaat.versiering = 'triller';
      if (ornament === 'mordent' || ornament === 'inverted-mordent') resultaat.versiering = 'mordent';
      if (ornament === 'turn') resultaat.versiering = 'dubbelslag';
    }
  }
  const bindingen = [
    ...kinderen(noteKnoop, 'tie'),
    ...notationsKnopen.flatMap((notations) => kinderen(notations, 'tied')),
  ];
  for (const binding of bindingen) {
    if (binding.attr.type === 'start') resultaat.overbinding.begin = true;
    if (binding.attr.type === 'stop') resultaat.overbinding.eind = true;
  }
  return resultaat;
}

// Wat een noot of rust nog meer heeft: waardestreep (balk), triool en fermate. Alleen de velden die er zijn.
export function leesDetails(noteKnoop) {
  const uit = {};
  const balk = kinderen(noteKnoop, 'beam').find((beam) => (beam.attr.number ?? '1') === '1');
  const naam = { begin: 'begin', continue: 'midden', end: 'eind' }[tekst(balk ?? { tekst: '' })];
  if (naam) uit.balk = naam;
  const modificatie = kind(noteKnoop, 'time-modification');
  if (modificatie) {
    const tuplets = kinderen(noteKnoop, 'notations').flatMap((notations) => kinderen(notations, 'tuplet'));
    uit.tuplet = {
      aantal: getal(modificatie, 'actual-notes', 3),
      normaal: getal(modificatie, 'normal-notes', 2),
      begin: tuplets.some((t) => t.attr.type === 'start'),
      eind: tuplets.some((t) => t.attr.type === 'stop'),
    };
  }
  if (kinderen(noteKnoop, 'notations').some((notations) => kind(notations, 'fermata'))) uit.fermate = true;
  return uit;
}

export function leesMaatstreep(barlineKnoop) {
  const repeat = kind(barlineKnoop, 'repeat');
  const ending = kind(barlineKnoop, 'ending');
  const sound = kind(barlineKnoop, 'sound');
  const nummers = ending?.attr.number?.split(',').map((nummer) => Number(nummer.trim()))
    .filter((nummer) => Number.isInteger(nummer) && nummer > 0) ?? [];
  const sprong = {};
  if (sound) {
    if (sound.attr.segno !== undefined) sprong.segno = sound.attr.segno === 'yes' ? 'waar' : sound.attr.segno;
    if (sound.attr.coda !== undefined) sprong.coda = sound.attr.coda === 'yes' ? 'waar' : sound.attr.coda;
    if (sound.attr.dacapo === 'yes') sprong.daCapo = true;
    if (sound.attr.dalsegno) sprong.dalSegno = sound.attr.dalsegno;
    if (sound.attr.tocoda) sprong.naarCoda = sound.attr.tocoda;
    if (sound.attr.fine === 'yes') sprong.fine = true;
  }
  return {
    begin: repeat?.attr.direction === 'forward',
    eind: repeat?.attr.direction === 'backward',
    keer: repeat?.attr.times === undefined ? 2 : Number(repeat.attr.times),
    ...(Object.keys(sprong).length ? { sprong } : {}),
    ...(ending ? {
      volta: {
        nummers,
        begin: ending.attr.type === 'start',
        eind: ending.attr.type === 'stop' || ending.attr.type === 'discontinue',
      },
    } : {}),
  };
}
