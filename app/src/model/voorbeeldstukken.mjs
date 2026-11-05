import { schrijfNoot } from './invoeren.mjs';
import { maakLeegStuk, maakVoorbeeldStuk } from './nieuw.mjs';

const KWART = 480;
const ACHTSTE = 240;
const GEPUNTEERDE_KWART = 720;
const HALF = 960;
const HEEL = 1920;

function maakStuk(titel, componist, melodie) {
  let stuk = maakLeegStuk({
    titel,
    componist,
    instrumenten: ['trompet'],
    maatsoort: { teller: 4, noemer: 4 },
    kwinten: 0,
    aantalMaten: melodie.length,
  });

  for (const [maatIndex, noten] of melodie.entries()) {
    let start = 0;
    for (const [stap, octaaf, duur] of noten) {
      stuk = schrijfNoot(stuk, 'P1', maatIndex, start, duur, {
        stap, alter: 0, octaaf,
      });
      start += duur;
    }
  }
  return stuk;
}

export function voorbeeldStukken() {
  const frereJacques = maakVoorbeeldStuk();
  frereJacques.componist = 'Traditioneel';

  return [
    {
      id: 'frere-jacques',
      titel: 'Frère Jacques',
      componist: 'Traditioneel',
      stuk: frereJacques,
    },
    {
      id: 'ode-an-die-freude',
      titel: 'Ode an die Freude',
      componist: 'Ludwig van Beethoven',
      stuk: maakStuk('Ode an die Freude', 'Ludwig van Beethoven', [
        [['E', 4, KWART], ['E', 4, KWART], ['F', 4, KWART], ['G', 4, KWART]],
        [['G', 4, KWART], ['F', 4, KWART], ['E', 4, KWART], ['D', 4, KWART]],
        [['C', 4, KWART], ['C', 4, KWART], ['D', 4, KWART], ['E', 4, KWART]],
        [['E', 4, GEPUNTEERDE_KWART], ['D', 4, ACHTSTE], ['D', 4, HALF]],
        [['E', 4, KWART], ['E', 4, KWART], ['F', 4, KWART], ['G', 4, KWART]],
        [['G', 4, KWART], ['F', 4, KWART], ['E', 4, KWART], ['D', 4, KWART]],
        [['C', 4, KWART], ['C', 4, KWART], ['D', 4, KWART], ['E', 4, KWART]],
        [['D', 4, GEPUNTEERDE_KWART], ['C', 4, ACHTSTE], ['C', 4, HALF]],
      ]),
    },
    {
      id: 'twinkle-twinkle-little-star',
      titel: 'Twinkle Twinkle Little Star',
      componist: 'Traditioneel',
      stuk: maakStuk('Twinkle Twinkle Little Star', 'Traditioneel', [
        [['C', 4, KWART], ['C', 4, KWART], ['G', 4, KWART], ['G', 4, KWART]],
        [['A', 4, KWART], ['A', 4, KWART], ['G', 4, HALF]],
        [['F', 4, KWART], ['F', 4, KWART], ['E', 4, KWART], ['E', 4, KWART]],
        [['D', 4, KWART], ['D', 4, KWART], ['C', 4, HALF]],
        [['G', 4, KWART], ['G', 4, KWART], ['F', 4, KWART], ['F', 4, KWART]],
        [['E', 4, KWART], ['E', 4, KWART], ['D', 4, HALF]],
        [['G', 4, KWART], ['G', 4, KWART], ['F', 4, KWART], ['F', 4, KWART]],
        [['E', 4, KWART], ['E', 4, KWART], ['D', 4, HALF]],
        [['C', 4, KWART], ['C', 4, KWART], ['G', 4, KWART], ['G', 4, KWART]],
        [['A', 4, KWART], ['A', 4, KWART], ['G', 4, HALF]],
        [['F', 4, KWART], ['F', 4, KWART], ['E', 4, KWART], ['E', 4, KWART]],
        [['D', 4, KWART], ['D', 4, KWART], ['C', 4, HALF]],
      ]),
    },
    {
      id: 'jingle-bells',
      titel: 'Jingle Bells',
      componist: 'James Lord Pierpont',
      stuk: maakStuk('Jingle Bells', 'James Lord Pierpont', [
        [['E', 4, KWART], ['E', 4, KWART], ['E', 4, HALF]],
        [['E', 4, KWART], ['E', 4, KWART], ['E', 4, HALF]],
        [['E', 4, KWART], ['G', 4, KWART], ['C', 4, GEPUNTEERDE_KWART], ['D', 4, ACHTSTE]],
        [['E', 4, HEEL]],
        [['F', 4, KWART], ['F', 4, KWART], ['F', 4, GEPUNTEERDE_KWART], ['F', 4, ACHTSTE]],
        [['F', 4, KWART], ['E', 4, KWART], ['E', 4, KWART], ['E', 4, ACHTSTE], ['E', 4, ACHTSTE]],
        [['E', 4, KWART], ['D', 4, KWART], ['D', 4, KWART], ['E', 4, KWART]],
        [['D', 4, HALF], ['G', 4, HALF]],
      ]),
    },
  ];
}
