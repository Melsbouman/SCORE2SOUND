import { instrumentBijNaam } from './instrumenten.mjs';

const INSTRUMENTVOLGORDE = [
  'Fluit',
  'Hobo',
  'Klarinet',
  'Fagot',
  'Sax Soprano',
  'Sopraansaxofoon',
  'Sax Alto',
  'Altsaxofoon',
  'Sax Tenor',
  'Tenorsaxofoon',
  'Sax Baritone',
  'Baritonsaxofoon',
  'Cornet',
  'Kornet',
  'Bugel',
  'Trompet',
  'Hoorn in Es',
  'Hoorn in F',
  'Tenorhoorn',
  'Baritonhoorn',
  'Euphonium',
  'Trombone',
  'Tenortrombone',
  'Bastrombone',
  'Tuba in Es',
  'Tuba in Bes',
  'Tuba',
  'Slagwerk',
  'Piano',
  'Viool',
  'Altviool',
  'Cello',
  'Contrabas',
]
  .map(instrumentBijNaam)
  .filter((instrument, index, instrumenten) =>
    instrument && instrumenten.indexOf(instrument) === index
  );

export function sorteerPartijen(partituur) {
  const partijen = partituur.partijen.map((partij, index) => ({
    partij,
    index,
    rang: INSTRUMENTVOLGORDE.indexOf(instrumentBijNaam(partij.naam)),
  }));

  partijen.sort((a, b) => {
    const rangA = a.rang === -1 ? INSTRUMENTVOLGORDE.length : a.rang;
    const rangB = b.rang === -1 ? INSTRUMENTVOLGORDE.length : b.rang;
    return rangA - rangB || a.index - b.index;
  });

  return {
    ...partituur,
    partijen: partijen.map(({ partij }) => partij),
  };
}
