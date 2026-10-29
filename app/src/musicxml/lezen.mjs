// Leest een MusicXML-bestand (score-partwise) en geeft de partituur in de vorm van docs/model.md.
// Alleen op de server: de XML-hulp gebruikt fast-xml-parser.
import { leesXml, kind, kinderen, tekst, getal } from './xml.mjs';
import { leesAttributen, leesRichting, leesNotaties, leesMaatstreep } from './aanwijzingen.mjs';
import { naarTikken, maatLengte } from '../model/duur.mjs';

const LEGE_ATTRIBUTEN = { naam: 'attributes', attr: {}, kinderen: [], tekst: '' };

export function leesMusicXML(xmlTekst) {
  const wortel = leesXml(xmlTekst);
  const delen = kinderen(kind(wortel, 'part-list'), 'score-part');
  if (delen.length === 0) throw new Error('Deze MusicXML heeft geen partijen.');
  const componist = kinderen(kind(wortel, 'identification'), 'creator').find((c) => c.attr.type === 'composer');
  return {
    versie: 1,
    titel: tekst(kind(wortel, 'work'), 'work-title') || tekst(wortel, 'movement-title'),
    componist: componist ? componist.tekst : '',
    partijen: delen.map((deel) => leesPartij(deel, kinderen(wortel, 'part').find((p) => p.attr.id === deel.attr.id))),
  };
}

function leesPartij(deel, part) {
  // De stand (deelwaarden, maatsoort, toonsoort, sleutels, transpositie) loopt door over de maten.
  const voortgang = { stand: null, wig: 'crescendo', transpositie: null };
  const maten = kinderen(part, 'measure').map((maat, index) => leesMaat(maat, index, voortgang));
  return {
    id: deel.attr.id,
    naam: tekst(deel, 'part-name'),
    afkorting: tekst(deel, 'part-abbreviation'),
    instrument: {
      midiProgramma: getal(kind(deel, 'midi-instrument'), 'midi-program', 1) - 1,
      transpositie: voortgang.transpositie ?? { chromatisch: 0, diatonisch: 0 },
    },
    maten,
  };
}

function leesMaat(maat, index, voortgang) {
  const elementen = [];
  const herhaling = { begin: false, eind: false, keer: 2 };
  let tempo = null;
  let cursor = 0; // positie in tikken vanaf het begin van de maat
  let vorigeStart = 0; // start van de vorige noot, voor akkoorden

  voortgang.stand ??= leesAttributen(LEGE_ATTRIBUTEN, null);
  const tikken = (knoop) => naarTikken(getal(knoop, 'duration', 0), voortgang.stand.deelwaarden);

  for (const knoop of maat.kinderen) {
    if (knoop.naam === 'attributes') {
      voortgang.stand = leesAttributen(knoop, voortgang.stand);
      if (!voortgang.transpositie && kind(knoop, 'transpose')) voortgang.transpositie = voortgang.stand.transpositie;
    } else if (knoop.naam === 'backup') {
      cursor -= tikken(knoop).tikken;
    } else if (knoop.naam === 'forward') {
      cursor += tikken(knoop).tikken;
    } else if (knoop.naam === 'barline') {
      const streep = leesMaatstreep(knoop);
      if (streep.begin) herhaling.begin = true;
      if (streep.eind) Object.assign(herhaling, { eind: true, keer: streep.keer });
    } else if (knoop.naam === 'direction') {
      const richting = leesRichting(knoop, cursor, voortgang.wig);
      for (const aanwijzing of richting.aanwijzingen) {
        if (aanwijzing.type === 'crescendo' || aanwijzing.type === 'decrescendo') voortgang.wig = aanwijzing.type;
        elementen.push(aanwijzing);
      }
      if (richting.tempo !== null && tempo === null) tempo = richting.tempo;
    } else if (knoop.naam === 'note' && !kind(knoop, 'grace') && !kind(knoop, 'cue')) {
      const duur = tikken(knoop);
      const akkoord = Boolean(kind(knoop, 'chord'));
      const start = akkoord ? vorigeStart : cursor;
      elementen.push(leesNoot(knoop, start, duur, akkoord, voortgang.stand));
      if (!akkoord) {
        vorigeStart = start;
        cursor = start + duur.tikken;
      }
    }
  }

  // Op start en dan op stem; aanwijzingen hebben geen stem en tellen als stem 0. Sorteren is stabiel.
  elementen.sort((a, b) => a.start - b.start || (a.stem ?? 0) - (b.stem ?? 0));
  const { stand } = voortgang;
  return {
    nummer: maat.attr.number ?? String(index + 1),
    index,
    opmaat: maat.attr.implicit === 'yes',
    maatsoort: { ...stand.maatsoort },
    toonsoort: { ...stand.toonsoort },
    sleutels: structuredClone(stand.sleutels),
    tempo,
    herhaling,
    elementen,
  };
}

function leesNoot(knoop, start, duur, akkoord, stand) {
  const gemeen = {
    start,
    stem: getal(knoop, 'voice', 1),
    notenbalk: getal(knoop, 'staff', 1),
  };
  // Een duur die niet precies in tikken past, is afgerond: dan is het element minder zeker.
  const zekerheid = duur.exact ? 1 : 0.5;
  const rust = kind(knoop, 'rest');
  if (rust) {
    return { soort: 'rust', ...gemeen, duur: duur.tikken || maatLengte(stand.maatsoort), heleMaat: rust.attr.measure === 'yes', zekerheid };
  }
  const toonhoogte = kind(knoop, 'pitch');
  const notaties = leesNotaties(knoop);
  return {
    soort: 'noot',
    start: gemeen.start,
    duur: duur.tikken,
    stem: gemeen.stem,
    notenbalk: gemeen.notenbalk,
    toonhoogte: { stap: tekst(toonhoogte, 'step'), alter: Math.round(getal(toonhoogte, 'alter', 0)), octaaf: getal(toonhoogte, 'octave', 4) },
    akkoord,
    overbinding: notaties.overbinding,
    articulaties: notaties.articulaties,
    legato: notaties.legato,
    versiering: notaties.versiering,
    zekerheid,
  };
}
