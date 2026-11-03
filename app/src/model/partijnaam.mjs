import { instrumentBijNaam } from './instrumenten.mjs';

export function partijNaamUitKop(regel) {
  if (typeof regel !== 'string') return null;
  const schoon = regel.trim().replace(/\s+/g, ' ');
  if (!schoon) return null;
  const naam = schoon.replace(/^(?:B♭|Bb|B flat|Eb|E♭|F|C|D|A)\s+/i, '').trim();
  if (!naam || !instrumentBijNaam(naam)) return null;
  return naam;
}
