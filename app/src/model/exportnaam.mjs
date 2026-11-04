// Bestandsnaam voor elke export: "S2S - Titel - Componist (arr. Arrangeur) - Partij", zonder tekens die Windows niet toestaat.
// Zo staan de bestanden bij elkaar in een map en zie je meteen wat het is.
import { partijTitel } from './stemming.mjs';

const VERBODEN = /[\u0000-\u001f\u007f:?*"<>|\/\\]/g;

function schoon(tekst) {
  return String(tekst ?? '').replace(/♭/g, 'b').replace(/♯/g, '#').replace(VERBODEN, '-').replace(/\s+/g, ' ').trim();
}

// GALOP wordt Galop; tekst met kleine letters blijft zoals hij is.
function mooieHoofdletters(tekst) {
  const letters = tekst.replace(/[^\p{L}]/gu, '');
  if (!letters || letters !== letters.toUpperCase() || letters.length < 3) return tekst;
  return tekst.toLowerCase().replace(/(^|[\s(-])(\p{L})/gu, (_, voor, letter) => voor + letter.toUpperCase());
}

export function exportNaam(partituur, { extensie = '' } = {}) {
  const titel = mooieHoofdletters(schoon(partituur?.titel)) || 'partituur';
  const componist = schoon(partituur?.componist);
  const arrangeur = schoon(partituur?.arrangeur);
  const maker = [componist, arrangeur ? `(arr. ${arrangeur})` : ''].filter(Boolean).join(' ');
  const eenPartij = partituur?.partijen?.length === 1 ? schoon(partijTitel(partituur.partijen[0])) : '';
  const delen = ['S2S', titel, maker, eenPartij].filter(Boolean);
  let naam = delen.join(' - ');
  if (naam.length > 100) naam = delen.filter((deel, index) => index !== 2).join(' - ');
  naam = naam.slice(0, 100).replace(/[ .-]+$/g, '');
  return extensie ? `${naam}.${extensie}` : naam;
}
