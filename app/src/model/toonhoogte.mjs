const STAPPEN = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];
const AFSTANDEN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const KRUISEN = [
  ['C', 0], ['C', 1], ['D', 0], ['D', 1], ['E', 0], ['F', 0],
  ['F', 1], ['G', 0], ['G', 1], ['A', 0], ['A', 1], ['B', 0],
];
const MOLLEN = [
  ['C', 0], ['D', -1], ['D', 0], ['E', -1], ['E', 0], ['F', 0],
  ['G', -1], ['G', 0], ['A', -1], ['A', 0], ['B', -1], ['B', 0],
];

function controleer(toonhoogte) {
  if (!Object.hasOwn(AFSTANDEN, toonhoogte.stap)) {
    throw new Error(`Onbekende toonstap: ${toonhoogte.stap}.`);
  }
  if (!Number.isInteger(toonhoogte.alter) || toonhoogte.alter < -2 || toonhoogte.alter > 2) {
    throw new Error(`Het voorteken moet een geheel getal van -2 tot en met 2 zijn: ${toonhoogte.alter}.`);
  }
}

// Zet een toonhoogte om naar een MIDI-nummer.
export function naarMidi(toonhoogte) {
  controleer(toonhoogte);
  return (toonhoogte.octaaf + 1) * 12 + AFSTANDEN[toonhoogte.stap] + toonhoogte.alter;
}

// Zet een MIDI-nummer om naar een toonhoogte met de gekozen spelling.
export function vanMidi(getal, voorkeur = 'kruis') {
  if (!Number.isInteger(getal)) {
    throw new Error(`Het MIDI-nummer moet een geheel getal zijn: ${getal}.`);
  }
  if (voorkeur !== 'kruis' && voorkeur !== 'mol') {
    throw new Error(`Onbekende voorkeur voor voortekens: ${voorkeur}.`);
  }
  const toonklasse = ((getal % 12) + 12) % 12;
  const [stap, alter] = (voorkeur === 'mol' ? MOLLEN : KRUISEN)[toonklasse];
  return { stap, alter, octaaf: Math.floor(getal / 12) - 1 };
}

// Geeft het verschil in halve tonen van de eerste naar de tweede toonhoogte.
export function halveTonen(van, naar) {
  return naarMidi(naar) - naarMidi(van);
}

// Transponeert een toonhoogte diatonisch en chromatisch.
export function transponeer(toonhoogte, { chromatisch, diatonisch }) {
  const midi = naarMidi(toonhoogte) + chromatisch;
  const stapnummer = toonhoogte.octaaf * STAPPEN.length + STAPPEN.indexOf(toonhoogte.stap) + diatonisch;
  const octaaf = Math.floor(stapnummer / STAPPEN.length);
  const stap = STAPPEN[((stapnummer % STAPPEN.length) + STAPPEN.length) % STAPPEN.length];
  const alter = midi - ((octaaf + 1) * 12 + AFSTANDEN[stap]);
  const resultaat = { stap, alter, octaaf };
  controleer(resultaat);
  return resultaat;
}

// Geeft de Nederlandse naam van een toonhoogte met het octaaf.
export function naam(toonhoogte) {
  controleer(toonhoogte);
  let notennaam = toonhoogte.stap;
  if (toonhoogte.alter > 0) {
    notennaam += 'is'.repeat(toonhoogte.alter);
  } else if (toonhoogte.alter < 0) {
    notennaam += toonhoogte.stap === 'E' || toonhoogte.stap === 'A' ? 's' : 'es';
    notennaam += 'es'.repeat(-toonhoogte.alter - 1);
  }
  return `${notennaam}${toonhoogte.octaaf}`;
}
