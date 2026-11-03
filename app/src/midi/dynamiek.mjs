import { maatLengte } from '../model/duur.mjs';

const STERKTE = {
  pppp: 20,
  ppp: 30,
  pp: 40,
  p: 55,
  mp: 68,
  mf: 80,
  f: 95,
  ff: 110,
  fff: 120,
  ffff: 127,
};
const NIVEAUS = Object.keys(STERKTE);
const EENMALIG = { fp: 90, sf: 105, sfz: 110, sfp: 100, rfz: 110 };
const OPLOPENDE_TEKST = new Set(['cresc', 'cresc.', 'crescendo']);
const AFLOPENDE_TEKST = new Set(['dim.', 'dimin.', 'decresc.', 'decrescendo']);
const begrensVolume = (volume) => Math.max(30, Math.min(127, volume));

function maatDuur(maat) {
  if (!maat.opmaat) return maatLengte(maat.maatsoort);
  return maat.elementen
    .filter((element) => element.soort === 'noot' || element.soort === 'rust')
    .reduce((einde, element) => Math.max(einde, element.start + element.duur), 0);
}

function volumeNaam(waarde) {
  const naam = String(waarde).trim().toLowerCase();
  if (Object.hasOwn(STERKTE, naam)) return naam;
  return null;
}

function verloopRichting(waarde) {
  const tekst = String(waarde).trim().toLowerCase();
  if (OPLOPENDE_TEKST.has(tekst)) return 1;
  if (AFLOPENDE_TEKST.has(tekst)) return -1;
  return 0;
}

export function maakVolumeOp(partij) {
  const dynamieken = [];
  const eenmaligeDynamieken = [];
  const markeringen = [];
  let maatBegin = 0;
  let volgorde = 0;

  for (const maat of partij.maten) {
    for (const element of maat.elementen) {
      const gebeurtenis = { tik: maatBegin + element.start, volgorde, element };
      if (element.soort === 'aanwijzing') {
        if (element.type === 'dynamiek' && volumeNaam(element.waarde)) {
          dynamieken.push({ ...gebeurtenis, naam: volumeNaam(element.waarde) });
        } else if (element.type === 'dynamiek' && Object.hasOwn(EENMALIG, element.waarde)) {
          eenmaligeDynamieken.push({ ...gebeurtenis, volume: EENMALIG[element.waarde] });
        } else if (element.type === 'tekst' && verloopRichting(element.waarde)) {
          markeringen.push({ ...gebeurtenis, richting: verloopRichting(element.waarde) });
        } else if ((element.type === 'crescendo' || element.type === 'decrescendo')
          && (element.waarde === 'begin' || element.waarde === 'eind')) {
          markeringen.push({ ...gebeurtenis, richting: element.type === 'crescendo' ? 1 : -1 });
        }
      }
      volgorde += 1;
    }
    maatBegin += maatDuur(maat);
  }

  const opTik = (a, b) => a.tik - b.tik || a.volgorde - b.volgorde;
  dynamieken.sort(opTik);
  markeringen.sort(opTik);

  const eindePartituur = maatBegin;
  const openWiggen = new Map();
  const verlopen = [];
  for (const markering of markeringen) {
    const isWig = markering.element.type === 'crescendo' || markering.element.type === 'decrescendo';
    if (isWig && markering.element.waarde === 'eind') {
      const open = openWiggen.get(markering.richting);
      const begin = open?.pop();
      if (begin && markering.tik >= begin.tik) verlopen.push({ begin, eind: markering.tik });
      continue;
    }
    if (isWig) {
      const open = openWiggen.get(markering.richting) ?? [];
      open.push(markering);
      openWiggen.set(markering.richting, open);
    } else {
      verlopen.push({ begin: markering, eind: null });
    }
  }
  for (const open of openWiggen.values()) {
    for (const begin of open) verlopen.push({ begin, eind: eindePartituur });
  }

  const indexVoor = (gebeurtenis) => NIVEAUS.indexOf(gebeurtenis?.naam ?? 'mf');
  const huidigeDynamiek = (begin) => dynamieken.filter((dynamiek) => opTik(dynamiek, begin) < 0).at(-1);
  return (tik) => {
    const eenmalig = eenmaligeDynamieken.filter((dynamiek) => dynamiek.tik === tik).at(-1);
    if (eenmalig) return begrensVolume(eenmalig.volume);
    const verlopenVoorTik = verlopen
      .filter(({ begin }) => begin.tik <= tik)
      .sort((a, b) => opTik(a.begin, b.begin));
    const actief = verlopenVoorTik.reverse().find(({ begin }) => {
      const volgende = dynamieken.find((dynamiek) => opTik(dynamiek, begin) > 0);
      return !volgende || tik <= volgende.tik;
    });
    if (!actief) {
      const huidig = dynamieken.filter((dynamiek) => dynamiek.tik <= tik).at(-1);
      return begrensVolume(STERKTE[huidig?.naam ?? 'mf']);
    }

    const { begin, eind } = actief;
    const ervoor = huidigeDynamiek(begin);
    const erna = dynamieken.find((dynamiek) => opTik(dynamiek, begin) > 0);
    const startNiveau = indexVoor(ervoor);
    const eindNiveau = erna
      ? indexVoor(erna)
      : Math.max(0, Math.min(NIVEAUS.length - 1, startNiveau + begin.richting * 2));
    const eindTik = Math.min(eind ?? eindePartituur, erna?.tik ?? eindePartituur);
    const fractie = eindTik <= begin.tik ? 1 : Math.max(0, Math.min(1, (tik - begin.tik) / (eindTik - begin.tik)));
    const beginVolume = STERKTE[NIVEAUS[startNiveau]];
    const eindVolume = STERKTE[NIVEAUS[eindNiveau]];
    return begrensVolume(Math.round(beginVolume + (eindVolume - beginVolume) * fractie));
  };
}

export function volumeOp(partij, tik) {
  return maakVolumeOp(partij)(tik);
}
