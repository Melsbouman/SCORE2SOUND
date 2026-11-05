import { TIKKEN_PER_KWART } from './duur.mjs';
import { INSTRUMENTEN } from './instrumenten.mjs';
import { schrijfNoot } from './invoeren.mjs';

export const SJABLONEN = [
  {
    id: 'brassband',
    naam: 'Brassband',
    instrumenten: ['es-kornet', 'bugel', 'trompet', 'hoorn', 'bariton', 'trombone', 'tuba'],
  },
  {
    id: 'strijkkwartet',
    naam: 'Strijkkwartet',
    instrumenten: ['viool', 'viool', 'altviool', 'cello'],
  },
  {
    id: 'houtblazers',
    naam: 'Houtblazers',
    instrumenten: ['dwarsfluit', 'hobo', 'klarinet', 'fagot'],
  },
  { id: 'leeg', naam: 'Leeg', instrumenten: ['trompet'] },
];

function zoekInstrument(id) {
  const instrument = INSTRUMENTEN.find((item) => item.id === id);
  if (!instrument) throw new Error(`Onbekend instrument: ${id}.`);
  return instrument;
}

const AFKORTINGEN = {
  bugel: 'Bgl.',
  trompet: 'Tr.',
  althoorn: 'A.h.',
  hoorn: 'Hn.',
  bariton: 'Bar.',
  trombone: 'Trb.',
  tuba: 'Tba.',
  'bes-tuba': 'B.tba.',
  klarinet: 'Kl.',
  piccolo: 'Picc.',
  altsaxofoon: 'A.s.',
  tenorsaxofoon: 'T.s.',
  sopraansaxofoon: 'S.s.',
  baritonsaxofoon: 'B.s.',
  'es-kornet': 'E.k.',
  dwarsfluit: 'Fl.',
  hobo: 'Hob.',
  fagot: 'Fg.',
  timpani: 'Tmp.',
  viool: 'Vl.',
  altviool: 'Vla.',
  cello: 'Vc.',
};

function maakMaat(index, maatsoort, kwinten, tempo, sleutels) {
  const duur = maatsoort.teller * TIKKEN_PER_KWART * 4 / maatsoort.noemer;
  return {
    nummer: String(index + 1),
    index,
    opmaat: false,
    regelbegin: false,
    paginabegin: false,
    maatsoort: { ...maatsoort },
    toonsoort: { kwinten, modus: 'majeur' },
    sleutels: sleutels.map((sleutel, sleutelIndex) => ({
      ...sleutel, notenbalk: sleutelIndex + 1, octaafVerschuiving: 0,
    })),
    tempo: index === 0 ? tempo : null,
    herhaling: { begin: false, eind: false, keer: 2 },
    maatrust: true,
    elementen: sleutels.map((_, sleutelIndex) => ({
      soort: 'rust', start: 0, duur, stem: sleutelIndex + 1, notenbalk: sleutelIndex + 1, heleMaat: true, zekerheid: 1,
    })),
  };
}

function maakPartij(id, instrument, maten, nummer = null) {
  return {
    id,
    naam: nummer === null ? instrument.naam : `${instrument.naam} ${nummer}`,
    afkorting: nummer === null ? '' : `${AFKORTINGEN[instrument.id]} ${nummer}`,
    instrument: {
      midiProgramma: instrument.midiProgramma,
      transpositie: { ...instrument.transpositie },
    },
    maten: maten.map((maat, index) => maakMaat(
      index,
      maat.maatsoort,
      maat.toonsoort.kwinten,
      maat.tempo,
      instrument.sleutels ?? [instrument.sleutel],
    )),
  };
}

export function maakLeegStuk(opties = {}) {
  const maatsoort = opties.maatsoort ?? { teller: 4, noemer: 4 };
  const kwinten = opties.kwinten ?? 0;
  const tempo = opties.tempo ?? 100;
  const aantalMaten = opties.aantalMaten ?? 8;
  const instrumentIds = opties.instrumenten ?? ['trompet'];

  if (!Number.isInteger(aantalMaten) || aantalMaten < 1) {
    throw new Error('Het aantal maten moet minstens 1 zijn.');
  }
  if (aantalMaten > 400) throw new Error('Het aantal maten mag niet meer dan 400 zijn.');
  if (!Number.isFinite(tempo) || tempo < 30 || tempo > 300) {
    throw new Error('Kies een tempo tussen 30 en 300.');
  }
  if (instrumentIds.length < 1) throw new Error('Kies minstens één instrument.');

  const instrumenten = instrumentIds.map(zoekInstrument);
  const voorbeeldMaten = Array.from({ length: aantalMaten }, (_, index) => ({
    maatsoort,
    toonsoort: { kwinten },
    tempo: index === 0 ? tempo : null,
  }));

  return {
    versie: 1,
    titel: opties.titel ?? '',
    componist: opties.componist ?? '',
    arrangeur: opties.arrangeur ?? '',
    partijen: instrumenten.map((instrument, index) => {
      const aantal = instrumenten.filter((item) => item.id === instrument.id).length;
      const nummer = aantal > 1
        ? instrumenten.slice(0, index + 1).filter((item) => item.id === instrument.id).length
        : null;
      return maakPartij(`P${index + 1}`, instrument, voorbeeldMaten, nummer);
    }),
  };
}

export function maakVoorbeeldStuk() {
  let stuk = maakLeegStuk({
    titel: 'Frère Jacques',
    instrumenten: ['trompet'],
    maatsoort: { teller: 4, noemer: 4 },
    kwinten: 0,
    aantalMaten: 8,
  });
  const melodie = [
    [['C', 480], ['D', 480], ['E', 480], ['C', 480]],
    [['C', 480], ['D', 480], ['E', 480], ['C', 480]],
    [['E', 480], ['F', 480], ['G', 960]],
    [['E', 480], ['F', 480], ['G', 960]],
    [['G', 240], ['A', 240], ['G', 240], ['F', 240], ['E', 480], ['C', 480]],
    [['G', 240], ['A', 240], ['G', 240], ['F', 240], ['E', 480], ['C', 480]],
    [['C', 480], ['G', 480], ['C', 960]],
    [['C', 480], ['G', 480], ['C', 960]],
  ];

  for (const [maatIndex, noten] of melodie.entries()) {
    let start = 0;
    for (const [stap, duur] of noten) {
      stuk = schrijfNoot(stuk, 'P1', maatIndex, start, duur, { stap, alter: 0, octaaf: 5 });
      start += duur;
    }
  }
  return stuk;
}

export function voegPartijToe(partituur, instrumentId) {
  const instrument = zoekInstrument(instrumentId);
  const nummers = partituur.partijen
    .map((partij) => /^P(\d+)$/.exec(partij.id)?.[1])
    .filter(Boolean)
    .map(Number);
  const nummer = Math.max(0, ...nummers) + 1;
  const maten = partituur.partijen[0]?.maten ?? [];
  const naamPatroon = new RegExp(`^${instrument.naam.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?: (\\d+))?$`);
  const gelijkePartijen = partituur.partijen.filter((partij) => naamPatroon.test(partij.naam));
  const bestaandeNummers = gelijkePartijen
    .map((partij) => Number(naamPatroon.exec(partij.naam)?.[1] ?? 0));
  const instrumentNummer = gelijkePartijen.length === 0
    ? null
    : Math.max(gelijkePartijen.length, ...bestaandeNummers) + 1;
  const partijen = partituur.partijen.map((partij) => {
    if (gelijkePartijen.length !== 1 || naamPatroon.exec(partij.naam)?.[1]) return partij;
    return { ...partij, naam: `${instrument.naam} 1`, afkorting: `${AFKORTINGEN[instrument.id]} 1` };
  });
  return {
    ...partituur,
    partijen: [...partijen, maakPartij(`P${nummer}`, instrument, maten, instrumentNummer)],
  };
}

export function verwijderPartij(partituur, partijId) {
  if (partituur.partijen.length === 1 && partituur.partijen[0].id === partijId) {
    throw new Error('Je kunt de laatste partij niet verwijderen.');
  }
  return {
    ...partituur,
    partijen: partituur.partijen.filter((partij) => partij.id !== partijId),
  };
}
