import { instrumentBijNaam } from './instrumenten.mjs';

export function partijNaamUitKop(regel) {
  let opgeschoond = regel
    .replace(/\s+(?:B♭|Bb|BE|Eb|E♭)[:.]*$/i, '')
    .replace(/^(\d+(?:nd|st|rd))\s+(?:B♭|Bb|BE|Eb|E♭)\s+/i, '$1 ')
    .replace(/\s*[:.\-]+\s*$/, '')
    .trim();

  const zonderRangtelwoorden = opgeschoond.replace(/\b\d+(?:nd|st|rd)\b/gi, '');
  if (/[A-Z]/.test(zonderRangtelwoorden) && zonderRangtelwoorden === zonderRangtelwoorden.toUpperCase()) {
    opgeschoond = opgeschoond
      .toLowerCase()
      .replace(/\b([a-zà-öø-ÿ])([a-zà-öø-ÿ]*)/g, (_, eerste, rest) => eerste.toUpperCase() + rest)
      .replace(/\b(\d+)(Nd|St|Rd)\b/g, (_, getal, achtervoegsel) => getal + achtervoegsel.toLowerCase());
  }

  return partijNaamUitKopBasis(opgeschoond);
}

function partijNaamUitKopBasis(regel) {
  if (typeof regel !== 'string') return null;
  const schoon = regel.trim().replace(/\s+/g, ' ');
  if (!schoon) return null;
  const naam = schoon.replace(/^(?:B♭|Bb|B flat|Eb|E♭|F|C|D|A)\s+/i, '').trim();
  if (!naam || !instrumentBijNaam(naam)) return null;
  return naam;
}
