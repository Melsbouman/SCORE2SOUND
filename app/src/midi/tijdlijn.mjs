import { maatLengte } from '../model/duur.mjs';
import { uitgevouwen } from '../model/maten.mjs';
import { schrijfMidi } from './schrijven.mjs';

function maatDuur(maat) {
  if (!maat.opmaat) return maatLengte(maat.maatsoort);
  return maat.elementen
    .filter((element) => element.soort === 'noot' || element.soort === 'rust')
    .reduce((einde, element) => Math.max(einde, element.start + element.duur), 0);
}

function tempoGebeurtenissen(bytes) {
  const leesGetal = (plek, lengte) => {
    let waarde = 0;
    for (let index = 0; index < lengte; index += 1) waarde = (waarde << 8) | bytes[plek + index];
    return waarde >>> 0;
  };
  const kopLengte = leesGetal(4, 4);
  const spoorBegin = 8 + kopLengte;
  const spoorEinde = spoorBegin + 8 + leesGetal(spoorBegin + 4, 4);
  const gebeurtenissen = [];
  let plek = spoorBegin + 8;
  let tik = 0;
  const leesVlq = () => {
    let waarde = 0;
    let byte;
    do {
      byte = bytes[plek++];
      waarde = (waarde << 7) | (byte & 0x7f);
    } while (byte & 0x80);
    return waarde;
  };

  while (plek < spoorEinde) {
    tik += leesVlq();
    const status = bytes[plek++];
    const type = bytes[plek++];
    const lengte = leesVlq();
    if (type === 0x51) {
      gebeurtenissen.push({
        tik,
        microseconden: (bytes[plek] << 16) | (bytes[plek + 1] << 8) | bytes[plek + 2],
      });
    }
    plek += lengte;
    if (status !== 0xff) throw new Error('Onverwacht event in het dirigentenspoor.');
  }
  return gebeurtenissen;
}

function secondenOpTik(tik, gebeurtenissen) {
  let vorigeTik = 0;
  let microseconden = 500000;
  let seconden = 0;
  for (const gebeurtenis of gebeurtenissen) {
    if (gebeurtenis.tik > tik) break;
    seconden += (gebeurtenis.tik - vorigeTik) * microseconden / 480 / 1000000;
    vorigeTik = gebeurtenis.tik;
    microseconden = gebeurtenis.microseconden;
  }
  return seconden + (tik - vorigeTik) * microseconden / 480 / 1000000;
}

export function maatTijden(partituur) {
  const gespeeld = uitgevouwen(partituur);
  const maten = gespeeld.partijen[0]?.maten ?? [];
  const beginnen = [];
  let tik = 0;
  for (const maat of maten) {
    beginnen.push(tik);
    tik += maatDuur(maat);
  }
  const tempi = tempoGebeurtenissen(schrijfMidi(gespeeld));
  return beginnen.map((begin) => secondenOpTik(begin, tempi));
}
