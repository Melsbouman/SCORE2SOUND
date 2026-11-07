// Het keuzescherm voor Nieuwe partituur (zoals MuseScore): families, genres met een partituurvolgorde, zoeken en sorteren.
import { INSTRUMENTEN } from './instrumenten.mjs';

export const FAMILIES_KIEZER = [
  { id: 'houtblazers', naam: 'Houtblazers' },
  { id: 'vrij-riet', naam: 'Vrij riet' },
  { id: 'koper', naam: 'Koper' },
  { id: 'slagwerk-gestemd', naam: 'Slagwerk - gestemd' },
  { id: 'slagwerk-ongestemd', naam: 'Slagwerk - ongestemd' },
  { id: 'zang', naam: 'Zang' },
  { id: 'toetsen', naam: 'Toetsen' },
  { id: 'getokkeld', naam: 'Snaarinstrumenten - getokkeld' },
  { id: 'strijkers', naam: 'Snaarinstrumenten - strijkers' },
];

const FAMILIE_VAN = {
  piccolo: 'houtblazers', dwarsfluit: 'houtblazers', hobo: 'houtblazers', klarinet: 'houtblazers', fagot: 'houtblazers',
  altsaxofoon: 'vrij-riet', tenorsaxofoon: 'vrij-riet', sopraansaxofoon: 'vrij-riet', baritonsaxofoon: 'vrij-riet',
  bugel: 'koper', 'es-kornet': 'koper', trompet: 'koper', althoorn: 'koper', hoorn: 'koper', bariton: 'koper',
  trombone: 'koper', basstrombone: 'koper', tuba: 'koper', 'bes-tuba': 'koper', 'es-bas': 'koper',
  timpani: 'slagwerk-gestemd', xylofoon: 'slagwerk-gestemd', glockenspiel: 'slagwerk-gestemd', marimba: 'slagwerk-gestemd',
  'kleine-trom': 'slagwerk-ongestemd', 'grote-trom': 'slagwerk-ongestemd', bekkens: 'slagwerk-ongestemd', triangel: 'slagwerk-ongestemd',
  sopraan: 'zang', alt: 'zang', tenor: 'zang', bas: 'zang',
  piano: 'toetsen',
  gitaar: 'getokkeld', basgitaar: 'getokkeld', harp: 'getokkeld',
  viool: 'strijkers', altviool: 'strijkers', cello: 'strijkers', contrabas: 'strijkers',
};

// Volgorde van een partituur per genre (alleen bestaande instrument-ids). Instrumenten die er niet in staan komen achteraan.
export const GENRES = [
  { id: 'regulier', naam: 'Regulier', volgorde: ['dwarsfluit', 'hobo', 'klarinet', 'fagot', 'trompet', 'hoorn', 'trombone', 'tuba', 'timpani', 'piano', 'viool', 'altviool', 'cello', 'contrabas'] },
  { id: 'alle', naam: 'Alle instrumenten', volgorde: [] },
  { id: 'pop-rock', naam: 'Pop/Rock', volgorde: ['gitaar', 'basgitaar', 'piano', 'kleine-trom', 'grote-trom', 'bekkens', 'sopraan', 'alt', 'tenor', 'bas'] },
  { id: 'jazz', naam: 'Jazz', volgorde: ['sopraansaxofoon', 'altsaxofoon', 'tenorsaxofoon', 'baritonsaxofoon', 'trompet', 'trombone', 'piano', 'gitaar', 'contrabas', 'kleine-trom'] },
  { id: 'koor', naam: 'Koor', volgorde: ['sopraan', 'alt', 'tenor', 'bas', 'piano'] },
  { id: 'orkest', naam: 'Orkest', volgorde: ['piccolo', 'dwarsfluit', 'hobo', 'klarinet', 'fagot', 'hoorn', 'trompet', 'trombone', 'basstrombone', 'tuba', 'timpani', 'harp', 'viool', 'altviool', 'cello', 'contrabas'] },
  { id: 'symfonieorkest', naam: 'Symfonieorkest', volgorde: ['piccolo', 'dwarsfluit', 'hobo', 'klarinet', 'fagot', 'hoorn', 'trompet', 'trombone', 'basstrombone', 'tuba', 'timpani', 'glockenspiel', 'xylofoon', 'harp', 'piano', 'viool', 'altviool', 'cello', 'contrabas'] },
  { id: 'muziekkorps', naam: 'Muziekkorps', volgorde: ['piccolo', 'dwarsfluit', 'hobo', 'fagot', 'es-kornet', 'klarinet', 'sopraansaxofoon', 'altsaxofoon', 'tenorsaxofoon', 'baritonsaxofoon', 'trompet', 'bugel', 'hoorn', 'althoorn', 'trombone', 'bariton', 'tuba', 'timpani', 'kleine-trom', 'grote-trom', 'bekkens'] },
  { id: 'brassband', naam: 'Brassband', volgorde: ['es-kornet', 'trompet', 'bugel', 'althoorn', 'bariton', 'trombone', 'basstrombone', 'es-bas', 'tuba', 'timpani', 'kleine-trom', 'grote-trom', 'bekkens', 'xylofoon', 'glockenspiel'] },
  { id: 'schoollokaal', naam: 'Schoollokaal', volgorde: ['dwarsfluit', 'klarinet', 'altsaxofoon', 'trompet', 'xylofoon', 'glockenspiel', 'kleine-trom', 'triangel', 'piano', 'gitaar'] },
];

function normaliseer(tekst) {
  return String(tekst ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function instrumentenVoorFamilie(familieId) {
  return INSTRUMENTEN.filter((instrument) => FAMILIE_VAN[instrument.id] === familieId);
}

export function zoekInstrumenten(tekst) {
  const woorden = normaliseer(tekst).split(/\s+/).filter(Boolean);
  if (woorden.length === 0) return [];
  return INSTRUMENTEN.filter((instrument) => {
    const naam = normaliseer(instrument.naam);
    return woorden.every((woord) => naam.includes(woord));
  });
}

export function sorteerPartituur(instrumentIds, genreId) {
  const genre = GENRES.find((item) => item.id === genreId);
  const volgorde = genre?.volgorde ?? [];
  const rang = (id) => {
    const plek = volgorde.indexOf(id);
    return plek === -1 ? volgorde.length : plek;
  };
  return instrumentIds
    .map((id, oorspronkelijk) => ({ id, oorspronkelijk }))
    .sort((a, b) => rang(a.id) - rang(b.id) || a.oorspronkelijk - b.oorspronkelijk)
    .map((item) => item.id);
}
