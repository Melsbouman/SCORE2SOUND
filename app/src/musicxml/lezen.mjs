// Leest een MusicXML-bestand (score-partwise) en geeft de partituur in de vorm van docs/model.md.
// Alleen op de server: de XML-hulp gebruikt fast-xml-parser.
import { leesXml, kind, kinderen, tekst, getal } from './xml.mjs';
import { leesAttributen, leesMaatrust, leesRichting, leesAkkoord, leesNotaties, leesDetails, leesMaatstreep } from './aanwijzingen.mjs';
import { naarTikken, maatLengte } from '../model/duur.mjs';

const LEGE_ATTRIBUTEN = { naam: 'attributes', attr: {}, kinderen: [], tekst: '' };

function leesMusicXMLZonderArrangeur(xmlTekst) {
  const wortel = leesXml(xmlTekst);
  const delen = kinderen(kind(wortel, 'part-list'), 'score-part');
  if (delen.length === 0) throw new Error('Deze MusicXML heeft geen partijen.');
  const identification = kind(wortel, 'identification');
  const componist = kinderen(identification, 'creator').find((c) => c.attr.type === 'composer');
  const colofon = tekst(identification, 'rights');
  return {
    versie: 1,
    titel: tekst(kind(wortel, 'work'), 'work-title') || tekst(wortel, 'movement-title'),
    componist: componist ? componist.tekst : '',
    ...(colofon ? { colofon } : {}),
    partijen: delen.map((deel) => leesPartij(deel, kinderen(wortel, 'part').find((p) => p.attr.id === deel.attr.id))),
  };
}

export function leesMusicXML(xmlTekst) {
  const partituur = leesMusicXMLZonderArrangeur(xmlTekst);
  const gevonden = xmlTekst.match(/<creator\b[^>]*\btype=["']arranger["'][^>]*>([\s\S]*?)<\/creator>/i);
  if (!gevonden) return partituur;

  const arrangeur = gevonden[1]
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .trim();
  if (arrangeur) partituur.arrangeur = arrangeur;
  return partituur;
}

function leesPartij(deel, part) {
  // De stand (deelwaarden, maatsoort, toonsoort, sleutels, transpositie) loopt door over de maten.
  const voortgang = { stand: null, wig: 'crescendo', transpositie: null };
  const maten = kinderen(part, 'measure').map((maat, index) => leesMaat(maat, index, voortgang));
  pasOctaafVerschuivingenToe(maten);
  for (let index = 0; index < maten.length; index += 1) {
    const maat = maten[index];
    if (!(maat.maatrust > 1)) continue;
    const einde = Math.min(maten.length, index + maat.maatrust);
    const reeks = maten.slice(index, einde);
    if (reeks.some((deel) => deel.elementen.some((element) => element.soort === 'noot'))) {
      for (const deel of reeks) {
        delete deel.maatrust;
        delete deel.verborgen;
      }
      continue;
    }
    for (const deel of maten.slice(index + 1, einde)) deel.verborgen = true;
  }
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

function pasOctaafVerschuivingenToe(maten) {
  const actief = new Map();
  for (const maat of maten) {
    for (const element of maat.elementen) {
      if (element.soort === 'aanwijzing' && element.type === 'octaafteken') {
        const nummer = element.nummer ?? 1;
        if (element.waarde === 'eind') {
          actief.delete(nummer);
        } else {
          const richting = element.waarde === 'begin-omhoog' ? 1 : -1;
          actief.set(nummer, richting * (element.grootte === 15 ? 2 : 1));
        }
      } else if (element.soort === 'noot' && actief.size) {
        const verschuiving = [...actief.values()].reduce((som, waarde) => som + waarde, 0);
        if (verschuiving) element.octaafVerschuiving = verschuiving;
      }
    }
  }
}

function leesMaat(maat, index, voortgang) {
  const elementen = [];
  const herhaling = { begin: false, eind: false, keer: 2 };
  let volta = null;
  let tempo = null;
  let maatrust = null;
  let regelbegin = false;
  let paginabegin = false;
  const sprong = {};
  let cursor = 0; // positie in tikken vanaf het begin van de maat
  let vorigeStart = 0; // start van de vorige noot, voor akkoorden

  voortgang.stand ??= leesAttributen(LEGE_ATTRIBUTEN, null);
  const tikken = (knoop) => naarTikken(getal(knoop, 'duration', 0), voortgang.stand.deelwaarden);

  for (const knoop of maat.kinderen) {
    if (knoop.naam === 'attributes') {
      voortgang.stand = leesAttributen(knoop, voortgang.stand);
      maatrust = leesMaatrust(knoop) ?? maatrust;
      if (!voortgang.transpositie && kind(knoop, 'transpose')) voortgang.transpositie = voortgang.stand.transpositie;
    } else if (knoop.naam === 'print') {
      if (knoop.attr['new-system'] === 'yes') regelbegin = true;
      if (knoop.attr['new-page'] === 'yes') paginabegin = true;
    } else if (knoop.naam === 'backup') {
      cursor -= tikken(knoop).tikken;
    } else if (knoop.naam === 'forward') {
      cursor += tikken(knoop).tikken;
    } else if (knoop.naam === 'barline') {
      const streep = leesMaatstreep(knoop);
      if (streep.begin) herhaling.begin = true;
      if (streep.eind) Object.assign(herhaling, { eind: true, keer: streep.keer });
      if (streep.sprong) Object.assign(sprong, streep.sprong);
      if (streep.volta) {
        volta = {
          nummers: [...new Set([...(volta?.nummers ?? []), ...streep.volta.nummers])],
          begin: Boolean(volta?.begin || streep.volta.begin),
          eind: Boolean(volta?.eind || streep.volta.eind),
        };
      }
    } else if (knoop.naam === 'direction') {
      const offset = kind(knoop, 'offset');
      const start = cursor + (offset ? naarTikken(getal(knoop, 'offset'), voortgang.stand.deelwaarden).tikken : 0);
      const richting = leesRichting(knoop, start, voortgang.wig);
      if (richting.sprong) Object.assign(sprong, richting.sprong);
      for (const aanwijzing of richting.aanwijzingen) {
        if (aanwijzing.type === 'crescendo' || aanwijzing.type === 'decrescendo') voortgang.wig = aanwijzing.type;
        elementen.push(aanwijzing);
      }
      if (richting.tempo !== null && tempo === null) tempo = richting.tempo;
    } else if (knoop.naam === 'harmony') {
      const offset = kind(knoop, 'offset');
      const start = cursor + (offset ? naarTikken(getal(knoop, 'offset'), voortgang.stand.deelwaarden).tikken : 0);
      const akkoord = leesAkkoord(knoop, start);
      if (akkoord) elementen.push(akkoord);
    } else if (knoop.naam === 'note' && !kind(knoop, 'cue')) {
      const grace = kind(knoop, 'grace');
      const duur = grace ? { tikken: 0, exact: true } : tikken(knoop);
      const akkoord = Boolean(kind(knoop, 'chord'));
      const start = grace ? cursor : akkoord ? vorigeStart : cursor;
      elementen.push(leesNoot(knoop, start, duur, akkoord, voortgang.stand, grace ? grace.attr.slash === 'yes' : null));
      if (!akkoord && !grace) {
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
    ...(regelbegin ? { regelbegin: true } : {}),
    ...(paginabegin ? { paginabegin: true } : {}),
    tempo,
    herhaling,
    ...(Object.keys(sprong).length ? { sprong } : {}),
    ...(volta ? { volta } : {}),
    elementen,
    ...(maatrust !== null ? { maatrust } : {}),
  };
}

function leesNoot(knoop, start, duur, akkoord, stand, schuinVoorslag = null) {
  const gemeen = {
    start,
    stem: getal(knoop, 'voice', 1),
    notenbalk: getal(knoop, 'staff', 1),
  };
  // Een duur die niet precies in tikken past, is afgerond: dan is het element minder zeker.
  const zekerheid = duur.exact ? 1 : 0.5;
  const rust = kind(knoop, 'rest');
  const { balk, ...details } = leesDetails(knoop);
  if (rust) {
    return { soort: 'rust', ...gemeen, duur: duur.tikken || maatLengte(stand.maatsoort), heleMaat: rust.attr.measure === 'yes', zekerheid, ...details };
  }
  const ongestemd = kind(knoop, 'unpitched');
  const toonhoogte = ongestemd ?? kind(knoop, 'pitch');
  const notaties = leesNotaties(knoop);
  const teksten = kinderen(knoop, 'lyric').map((lyric) => ({
    couplet: Number(lyric.attr.number) || 1,
    lettergreep: tekst(lyric, 'text'),
    soort: { single: 'single', begin: 'begin', middle: 'midden', end: 'eind' }[tekst(lyric, 'syllabic', 'single')] ?? 'single',
  }));
  return {
    soort: 'noot',
    start: gemeen.start,
    duur: duur.tikken,
    stem: gemeen.stem,
    notenbalk: gemeen.notenbalk,
    toonhoogte: ongestemd
      ? { stap: tekst(toonhoogte, 'display-step'), alter: 0, octaaf: getal(toonhoogte, 'display-octave', 4) }
      : { stap: tekst(toonhoogte, 'step'), alter: Math.round(getal(toonhoogte, 'alter', 0)), octaaf: getal(toonhoogte, 'octave', 4) },
    ...(ongestemd ? { ongestemd: true } : {}),
    akkoord,
    overbinding: notaties.overbinding,
    articulaties: notaties.articulaties,
    legato: notaties.legato,
    versiering: notaties.versiering,
    ...(schuinVoorslag !== null ? { voorslag: { schuin: schuinVoorslag } } : {}),
    zekerheid,
    ...(balk ? { balk } : {}),
    ...details,
    ...(teksten.length ? { teksten } : {}),
  };
}
