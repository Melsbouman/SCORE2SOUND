export const KLANKEN = [
  { id: 'trompet', naam: 'Trompet', programma: 56 },
  { id: 'gedempte-trompet', naam: 'Gedempte trompet', programma: 59 },
  { id: 'hoorn', naam: 'Hoorn', programma: 60 },
  { id: 'trombone', naam: 'Trombone', programma: 57 },
  { id: 'tuba', naam: 'Tuba', programma: 58 },
  { id: 'koperensemble', naam: 'Koperensemble', programma: 61 },
  { id: 'sopraansaxofoon', naam: 'Sopraansaxofoon', programma: 64 },
  { id: 'altsaxofoon', naam: 'Altsaxofoon', programma: 65 },
  { id: 'tenorsaxofoon', naam: 'Tenorsaxofoon', programma: 66 },
  { id: 'baritonsaxofoon', naam: 'Baritonsaxofoon', programma: 67 },
  { id: 'hobo', naam: 'Hobo', programma: 68 },
  { id: 'engelse-hoorn', naam: 'Engelse hoorn', programma: 69 },
  { id: 'fagot', naam: 'Fagot', programma: 70 },
  { id: 'klarinet', naam: 'Klarinet', programma: 71 },
  { id: 'piccolo', naam: 'Piccolo', programma: 72 },
  { id: 'dwarsfluit', naam: 'Dwarsfluit', programma: 73 },
  { id: 'viool', naam: 'Viool', programma: 40 },
  { id: 'altviool', naam: 'Altviool', programma: 41 },
  { id: 'cello', naam: 'Cello', programma: 42 },
  { id: 'contrabas', naam: 'Contrabas', programma: 43 },
  { id: 'strijkensemble', naam: 'Strijkensemble', programma: 48 },
  { id: 'harp', naam: 'Harp', programma: 46 },
  { id: 'pauken', naam: 'Pauken', programma: 47 },
  { id: 'piano', naam: 'Piano', programma: 0 },
  { id: 'orgel', naam: 'Orgel', programma: 19 },
  { id: 'marimba', naam: 'Marimba', programma: 12 },
];

export function zetKlank(partituur, partijId, programma) {
  if (!Number.isInteger(programma) || programma < 0 || programma > 127) throw new Error('Ongeldig MIDI-programma');
  if (!partituur.partijen.some(({ id }) => id === partijId)) throw new Error(`Onbekende partij: ${partijId}`);
  return {
    ...partituur,
    partijen: partituur.partijen.map((partij) => partij.id === partijId
      ? { ...partij, instrument: { ...partij.instrument, midiProgramma: programma } }
      : partij),
  };
}
