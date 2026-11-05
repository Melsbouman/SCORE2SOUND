import { TIKKEN_PER_KWART } from './duur.mjs';
import { INSTRUMENTEN } from './instrumenten.mjs';

function zoekInstrument(id) {
  const instrument = INSTRUMENTEN.find((item) => item.id === id);
  if (!instrument) throw new Error(`Onbekend instrument: ${id}.`);
  return instrument;
}

function maakMaat(index, maatsoort, kwinten, tempo, sleutel) {
  const duur = maatsoort.teller * TIKKEN_PER_KWART * 4 / maatsoort.noemer;
  return {
    nummer: String(index + 1),
    index,
    opmaat: false,
    regelbegin: false,
    paginabegin: false,
    maatsoort: { ...maatsoort },
    toonsoort: { kwinten, modus: 'majeur' },
    sleutels: [{ ...sleutel, notenbalk: 1, octaafVerschuiving: 0 }],
    tempo: index === 0 ? tempo : null,
    herhaling: { begin: false, eind: false, keer: 2 },
    maatrust: true,
    elementen: [{
      soort: 'rust', start: 0, duur, stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 1,
    }],
  };
}

function maakPartij(id, instrument, maten) {
  return {
    id,
    naam: instrument.naam,
    afkorting: '',
    instrument: {
      midiProgramma: instrument.midiProgramma,
      transpositie: { ...instrument.transpositie },
    },
    maten: maten.map((maat, index) => maakMaat(
      index,
      maat.maatsoort,
      maat.toonsoort.kwinten,
      maat.tempo,
      instrument.sleutel,
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
    partijen: instrumenten.map((instrument, index) => maakPartij(`P${index + 1}`, instrument, voorbeeldMaten)),
  };
}

export function voegPartijToe(partituur, instrumentId) {
  const instrument = zoekInstrument(instrumentId);
  const nummers = partituur.partijen
    .map((partij) => /^P(\d+)$/.exec(partij.id)?.[1])
    .filter(Boolean)
    .map(Number);
  const nummer = Math.max(0, ...nummers) + 1;
  const maten = partituur.partijen[0]?.maten ?? [];
  return {
    ...partituur,
    partijen: [...partituur.partijen, maakPartij(`P${nummer}`, instrument, maten)],
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
