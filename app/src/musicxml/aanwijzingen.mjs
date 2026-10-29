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

function aanwijzing(start, type, waarde) {
  return { soort: 'aanwijzing', start, type, waarde, zekerheid: 1 };
}

export function leesRichting(directionKnoop, start, vorigeWig = 'crescendo') {
  const aanwijzingen = [];
  let tempo = null;
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
    const words = kind(directionType, 'words');
    if (words) aanwijzingen.push(aanwijzing(start, 'tekst', tekst(words)));
    const metronome = kind(directionType, 'metronome');
    if (metronome) {
      const factoren = { half: 2, quarter: 1, eighth: 0.5 };
      const eenheid = tekst(kind(metronome, 'beat-unit'));
      const stip = kind(metronome, 'beat-unit-dot') ? 1.5 : 1;
      tempo = getal(kind(metronome, 'per-minute')) * (factoren[eenheid] ?? 1) * stip;
    }
  }
  const sound = kind(directionKnoop, 'sound');
  if (sound?.attr.tempo !== undefined) tempo = Number(sound.attr.tempo);
  if (tempo !== null) aanwijzingen.push(aanwijzing(start, 'tempo', tempo));
  return { aanwijzingen, tempo };
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

export function leesMaatstreep(barlineKnoop) {
  const repeat = kind(barlineKnoop, 'repeat');
  return {
    begin: repeat?.attr.direction === 'forward',
    eind: repeat?.attr.direction === 'backward',
    keer: repeat?.attr.times === undefined ? 2 : Number(repeat.attr.times),
  };
}
