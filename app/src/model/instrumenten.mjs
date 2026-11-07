// Instrumenten voor het transponeren: stemming (genoteerd naar klinkend), sleutel, General MIDI-programma en klinkend bereik (MIDI-nummers).
export const INSTRUMENTEN = [
  { id: 'piano', naam: 'Piano', midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, sleutels: [{ teken: 'G', lijn: 2 }, { teken: 'F', lijn: 4 }] },
  { id: 'bugel', naam: 'Bugel in Bes', midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 52, hoog: 82 } },
  { id: 'trompet', naam: 'Trompet in Bes', midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 52, hoog: 82 } },
  { id: 'althoorn', naam: 'Althoorn in Es', midiProgramma: 60, transpositie: { chromatisch: -9, diatonisch: -5 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 43, hoog: 75 } },
  { id: 'hoorn', naam: 'Hoorn in F', midiProgramma: 60, transpositie: { chromatisch: -7, diatonisch: -4 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 34, hoog: 77 } },
  { id: 'bariton', naam: 'Bariton in Bes', midiProgramma: 57, transpositie: { chromatisch: -14, diatonisch: -8 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 40, hoog: 70 } },
  { id: 'trombone', naam: 'Trombone', midiProgramma: 57, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 40, hoog: 72 } },
  { id: 'tuba', naam: 'Tuba', midiProgramma: 58, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 28, hoog: 58 } },
  { id: 'bes-tuba', naam: 'Bes-tuba (vioolsleutel)', midiProgramma: 58, transpositie: { chromatisch: -26, diatonisch: -15 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 28, hoog: 58 } },
  { id: 'klarinet', naam: 'Klarinet in Bes', midiProgramma: 71, transpositie: { chromatisch: -2, diatonisch: -1 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 50, hoog: 91 } },
  { id: 'piccolo', naam: 'Piccolo', midiProgramma: 72, transpositie: { chromatisch: 12, diatonisch: 7 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 72, hoog: 108 } },
  { id: 'altsaxofoon', naam: 'Altsaxofoon in Es', midiProgramma: 65, transpositie: { chromatisch: -9, diatonisch: -5 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 49, hoog: 81 } },
  { id: 'tenorsaxofoon', naam: 'Tenorsaxofoon in Bes', midiProgramma: 66, transpositie: { chromatisch: -14, diatonisch: -8 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 44, hoog: 76 } },
  { id: 'sopraansaxofoon', naam: 'Sopraansaxofoon in Bes', midiProgramma: 64, transpositie: { chromatisch: -2, diatonisch: -1 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 56, hoog: 87 } },
  { id: 'baritonsaxofoon', naam: 'Baritonsaxofoon in Es', midiProgramma: 67, transpositie: { chromatisch: -21, diatonisch: -12 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 36, hoog: 69 } },
  { id: 'es-kornet', naam: 'Es-kornet', midiProgramma: 56, transpositie: { chromatisch: 3, diatonisch: 2 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 58, hoog: 89 } },
  { id: 'dwarsfluit', naam: 'Dwarsfluit', midiProgramma: 73, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 60, hoog: 96 } },
  { id: 'hobo', naam: 'Hobo', midiProgramma: 68, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 58, hoog: 91 } },
  { id: 'fagot', naam: 'Fagot', midiProgramma: 70, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 34, hoog: 75 } },
  { id: 'timpani', naam: 'Timpani', midiProgramma: 47, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 38, hoog: 81 } },
  { id: 'viool', naam: 'Viool', midiProgramma: 40, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 55, hoog: 100 } },
  { id: 'altviool', naam: 'Altviool', midiProgramma: 41, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'C', lijn: 3 }, bereik: { laag: 48, hoog: 88 } },
  { id: 'cello', naam: 'Cello', midiProgramma: 42, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 36, hoog: 76 } },
  { id: 'basstrombone', naam: 'Basstrombone', midiProgramma: 57, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 34, hoog: 67 } },
  { id: 'es-bas', naam: 'Es-bas', midiProgramma: 58, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 28, hoog: 65 } },
  { id: 'kleine-trom', naam: 'Kleine trom', midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 35, hoog: 81 } },
  { id: 'grote-trom', naam: 'Grote trom', midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 35, hoog: 81 } },
  { id: 'bekkens', naam: 'Bekkens', midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 35, hoog: 81 } },
  { id: 'triangel', naam: 'Triangel', midiProgramma: 0, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 35, hoog: 81 } },
  { id: 'xylofoon', naam: 'Xylofoon', midiProgramma: 13, transpositie: { chromatisch: 12, diatonisch: 7 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 65, hoog: 108 } },
  { id: 'glockenspiel', naam: 'Glockenspiel', midiProgramma: 9, transpositie: { chromatisch: 24, diatonisch: 14 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 79, hoog: 108 } },
  { id: 'marimba', naam: 'Marimba', midiProgramma: 12, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 45, hoog: 96 } },
  { id: 'contrabas', naam: 'Contrabas', midiProgramma: 43, transpositie: { chromatisch: -12, diatonisch: -7 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 28, hoog: 67 } },
  { id: 'harp', naam: 'Harp', midiProgramma: 46, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 24, hoog: 103 } },
  { id: 'gitaar', naam: 'Gitaar', midiProgramma: 24, transpositie: { chromatisch: -12, diatonisch: -7 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 40, hoog: 88 } },
  { id: 'basgitaar', naam: 'Basgitaar', midiProgramma: 33, transpositie: { chromatisch: -12, diatonisch: -7 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 28, hoog: 67 } },
  { id: 'sopraan', naam: 'Zang: sopraan', midiProgramma: 52, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 60, hoog: 81 } },
  { id: 'alt', naam: 'Zang: alt', midiProgramma: 52, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 55, hoog: 77 } },
  { id: 'tenor', naam: 'Zang: tenor', midiProgramma: 52, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 48, hoog: 69 } },
  { id: 'bas', naam: 'Zang: bas', midiProgramma: 52, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 40, hoog: 64 } },
];

// Herkent een instrument aan een partijnaam uit een partituur. De volgorde telt: de eerste die past, wint.
const NAMEN = [
  [/sax.*sop|sop.*sax/, 'sopraansaxofoon'],
  [/sax.*bar|bar.*sax/, 'baritonsaxofoon'],
  [/\beb\b.*(cornet|comet|kornet)|\bes\b.*(cornet|comet|kornet)|\beb\b.*soprano|\bes\b.*sopraan/, 'es-kornet'],
  [/bugel|flugelhorn|flugel|fliigel|iigelho|flug\.\s*hn/, 'bugel'],
  [/sax.*alt|alt.*sax/, 'altsaxofoon'],
  [/sax.*ten|ten.*sax/, 'tenorsaxofoon'],
  [/bass\s+trombone|trombone/, 'trombone'],
  [/solo\s+cts?\.?|trompet|trumpet|cornet|kornet/, 'trompet'],
  [/althoorn|alto horn|tenor horn|solo horn|solo hn\.?|1st horn/, 'althoorn'],
  [/hoorn in f|horn in f/, 'hoorn'],
  [/\bhorn\b|\bhom\b|\bhoorn\b/, 'althoorn'],
  [/baritonhoorn|bariton|baritone|euphonium|euph/, 'bariton'],
  [/tuba|\bbass\b|\bbas\b|\bbasses\b/, 'tuba'],
  [/klarinet|clarinet/, 'klarinet'],
  [/fluit|flute/, 'dwarsfluit'],
  [/piccolo/, 'piccolo'],
  [/slagwerk|percussion/, 'timpani'],
  [/fagot|bassoon/, 'fagot'],
  [/hobo|oboe/, 'hobo'],
  [/altviool|viola/, 'altviool'],
  [/viool|violin/, 'viool'],
  [/cello/, 'cello'],
];

export function instrumentBijNaam(naam) {
  const schoon = naam.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const afkorting = schoon.replace(/\d/g, '').replace(/[^a-z]/g, '');
  const AFKORTINGEN = [
    ['cnt', 'trompet'], ['cts', 'trompet'], ['Flgh', 'bugel'], ['hn', 'althoorn'],
    ['bar', 'bariton'], ['euph', 'bariton'], ['tbn', 'trombone'], ['trb', 'trombone'],
    ['tba', 'tuba'], ['perc', 'timpani'], ['cl', 'klarinet'], ['fl', 'dwarsfluit'],
    ['hb', 'hobo'], ['fg', 'fagot'], ['trp', 'trompet'],
  ].find(([naam]) => naam.toLowerCase() === afkorting);
  if (AFKORTINGEN) return INSTRUMENTEN.find((instrument) => instrument.id === AFKORTINGEN[1]) ?? null;
  const regel = NAMEN.find(([patroon]) => patroon.test(schoon));
  return INSTRUMENTEN.find((instrument) => instrument.id === regel?.[1]) ?? null;
}
