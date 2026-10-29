// Instrumenten voor het transponeren: stemming (genoteerd naar klinkend), sleutel, General MIDI-programma en klinkend bereik (MIDI-nummers).
export const INSTRUMENTEN = [
  { id: 'bugel', naam: 'Bugel in Bes', midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 52, hoog: 82 } },
  { id: 'trompet', naam: 'Trompet in Bes', midiProgramma: 56, transpositie: { chromatisch: -2, diatonisch: -1 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 52, hoog: 82 } },
  { id: 'althoorn', naam: 'Althoorn in Es', midiProgramma: 60, transpositie: { chromatisch: -9, diatonisch: -5 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 43, hoog: 75 } },
  { id: 'hoorn', naam: 'Hoorn in F', midiProgramma: 60, transpositie: { chromatisch: -7, diatonisch: -4 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 34, hoog: 77 } },
  { id: 'bariton', naam: 'Bariton in Bes', midiProgramma: 57, transpositie: { chromatisch: -14, diatonisch: -8 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 40, hoog: 70 } },
  { id: 'trombone', naam: 'Trombone', midiProgramma: 57, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 40, hoog: 72 } },
  { id: 'tuba', naam: 'Tuba', midiProgramma: 58, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 28, hoog: 58 } },
  { id: 'bes-tuba', naam: 'Bes-tuba (vioolsleutel)', midiProgramma: 58, transpositie: { chromatisch: -26, diatonisch: -15 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 28, hoog: 58 } },
  { id: 'klarinet', naam: 'Klarinet in Bes', midiProgramma: 71, transpositie: { chromatisch: -2, diatonisch: -1 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 50, hoog: 91 } },
  { id: 'altsaxofoon', naam: 'Altsaxofoon in Es', midiProgramma: 65, transpositie: { chromatisch: -9, diatonisch: -5 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 49, hoog: 81 } },
  { id: 'tenorsaxofoon', naam: 'Tenorsaxofoon in Bes', midiProgramma: 66, transpositie: { chromatisch: -14, diatonisch: -8 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 44, hoog: 76 } },
  { id: 'dwarsfluit', naam: 'Dwarsfluit', midiProgramma: 73, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 60, hoog: 96 } },
  { id: 'hobo', naam: 'Hobo', midiProgramma: 68, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 58, hoog: 91 } },
  { id: 'viool', naam: 'Viool', midiProgramma: 40, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'G', lijn: 2 }, bereik: { laag: 55, hoog: 100 } },
  { id: 'altviool', naam: 'Altviool', midiProgramma: 41, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'C', lijn: 3 }, bereik: { laag: 48, hoog: 88 } },
  { id: 'cello', naam: 'Cello', midiProgramma: 42, transpositie: { chromatisch: 0, diatonisch: 0 }, sleutel: { teken: 'F', lijn: 4 }, bereik: { laag: 36, hoog: 76 } },
];