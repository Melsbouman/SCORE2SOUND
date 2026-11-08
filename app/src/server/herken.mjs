// API voor de herkenning: neemt een PDF of afbeelding aan en laat Audiveris op de achtergrond werken.
// POST /api/herken?naam=&paginas= geeft { id }; GET /api/herken/<id> geeft de stand en bij 'klaar' de partituur;
// GET /api/herken/<id>/blad/<nummer> geeft de pagina als PNG; DELETE /api/herken/<id> breekt af.
import { randomBytes } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  audiverisPad, draai, exporteerArgumenten, hervatArgumenten, leesBladen, leesFoutmelding, leesVoortgang, stapTekst, transcribeerArgumenten, vastgelopenBladen, voortgangProcent,
} from './audiveris.mjs';
import { leesZip } from './zip.mjs';
import { telPdfPaginas } from './pdfpaginas.mjs';
import { bladenUitOmr, koppelOmr, voegPaginasSamen } from './omr.mjs';
import { leesMusicXML } from '../musicxml/lezen.mjs';
import { herstelMaatsoorten as herstelMaatsoortenZonderBeginrust } from '../model/maatsoorten.mjs';
import { vulBeginRust as vulOorspronkelijkeBeginRust } from '../model/beginrust.mjs';
import { creditBeginRust } from '../model/creditrusten.mjs';
import { vulOntbrekendeMaten } from '../model/ontbrekend.mjs';
import { markeerVerdachteNoten } from '../model/verdacht.mjs';

const vulBeginRust = (partituur) => vulOntbrekendeMaten(vulOorspronkelijkeBeginRust(partituur));

const herstelMaatsoorten = (partituur) => vulBeginRust(herstelMaatsoortenZonderBeginrust(partituur));
import { kinderen, leesXml, tekst } from '../musicxml/xml.mjs';
import { controleerMaatduur } from '../controle/maatduur.mjs';
import { vulLegeMaten, markeerFouteMaten } from '../controle/nabewerken.mjs';
import { INSTRUMENTEN, instrumentBijNaam } from '../model/instrumenten.mjs';
import { herstelInstrumentnamen } from '../model/instrumentnamen.mjs';
import { partijNaamUitKop, splitsPartijenOpKoppen } from '../model/partijnaam.mjs';
import { herstelComponist } from '../model/titelgegevens.mjs';
import { creditTempos } from '../model/credittempo.mjs';
import { zetTempo } from '../model/tempo.mjs';
import { tempoVoorWoord } from '../model/tempotekst.mjs';
import { kopUitOcr } from '../model/tekstlezerkop.mjs';
import { woordenNaarMaten } from '../model/tekstlezerwoorden.mjs';
import { meermaatsRustenUitCijfers } from '../model/meermaatsrust.mjs';
import { maakLimiet } from './limiet.mjs';
import { leesBlad } from './tekstlezer.mjs';

const GELDIG_ID = /^[a-f0-9]{12}$/;
const PAGINAS = /^\d+(-\d+)?( \d+(-\d+)?)*$/;

function meerDanVeertigPaginas(paginas) {
  const bereiken = paginas.split(' ').map((deel) => {
    const [eerste, laatste = eerste] = deel.split('-').map(BigInt);
    return eerste <= laatste ? [eerste, laatste] : [laatste, eerste];
  }).sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
  let totaal = 0n;
  let [begin, einde] = bereiken[0];
  for (const [volgendBegin, volgendEinde] of bereiken.slice(1)) {
    if (volgendBegin <= einde + 1n) {
      if (volgendEinde > einde) einde = volgendEinde;
      continue;
    }
    totaal += einde - begin + 1n;
    if (totaal > 40n) return true;
    [begin, einde] = [volgendBegin, volgendEinde];
  }
  return totaal + einde - begin + 1n > 40n;
}

export const echteDraaier = {
  transcribeer: ({ invoer, uitmap, paginas, opRegel }) => draai({ exe: audiverisPad(), argumenten: transcribeerArgumenten({ invoer, uitmap, paginas, limiet: 120 }), opRegel }),
  herstel: ({ omr, uitmap, bladen, opRegel }) => draai({ exe: audiverisPad(), argumenten: hervatArgumenten({ omr, uitmap, bladen }), opRegel }),
  exporteer: ({ omr, uitmap, bladen }) => draai({ exe: audiverisPad(), argumenten: exporteerArgumenten({ omr, uitmap, bladen }) }),
};

function soortVan(body) {
  if (body.subarray(0, 4).toString('latin1') === '%PDF') return 'pdf';
  if (body.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47]))) return 'png';
  if (body.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))) return 'jpg';
  return null;
}

function creditsUitWortel(wortel) {
  return kinderen(wortel, 'credit').map((credit) => {
    const woorden = kinderen(credit, 'credit-words');
    const x = Number(woorden[0]?.attr['default-x']);
    const y = Number(woorden[0]?.attr['default-y']);
    return {
      tekst: woorden.map((woord) => tekst(woord)).join(' '),
      type: tekst(kinderen(credit, 'credit-type')[0]),
      pagina: Math.max(0, Number(credit.attr.page ?? 1) - 1),
      x: Number.isFinite(x) ? x : null,
      y: Number.isFinite(y) ? y : null,
    };
  });
}

export function leesCredits(xml) {
  return creditsUitWortel(leesXml(xml));
}

// Audiveris schrijft bij een partituur met meer delen een bestand per deel: invoer.mvt1.xml, invoer.mvt2.xml.
async function leesUitvoer(uitmap) {
  const namen = (await readdir(uitmap)).filter((naam) => /^invoer(\.mvt(?:\d+|null))?\.xml$/.test(naam)).sort();
  if (namen.length === 0) return null;
  const xmlTeksten = await Promise.all(namen.map((naam) => readFile(join(uitmap, naam), 'utf8')));
  const delen = xmlTeksten.map((xml) => herstelMaatsoorten(leesMusicXML(xml)));
  const paginaKopregels = [];
  const creditGegevens = [];
  for (const xml of xmlTeksten) {
    const wortel = leesXml(xml);
    const perPagina = [];
    for (const credit of kinderen(wortel, 'credit')) {
      const pagina = Math.max(0, Number(credit.attr.page ?? 1) - 1);
      perPagina[pagina] ??= [];
      const woorden = kinderen(credit, 'credit-words');
      perPagina[pagina].push(...woorden.map((woord) => tekst(woord)));
    }
    creditGegevens.push(...creditsUitWortel(wortel));
    paginaKopregels.push(...Array.from({ length: perPagina.length }, (_, pagina) => perPagina[pagina] ?? []));
  }
  const creditWoorden = paginaKopregels.flatMap((regels) => regels ?? []);
  const [partituur, ...rest] = delen;
  for (const deel of rest.filter((d) => d.partijen.length === partituur.partijen.length)) {
    deel.partijen.forEach((partij, index) => {
      const maten = partituur.partijen[index].maten;
      for (const maat of partij.maten) maten.push({ ...maat, index: maten.length });
    });
  }
  return { partituur, creditWoorden, creditGegevens, paginaKopregels };
}

function herstelOcr(waarde) {
  return waarde.replace(/[\p{L}\d]+/gu, (woord) => /\p{L}/u.test(woord) ? woord.replace(/[I1]/g, 'l') : woord);
}

const INSTRUMENT_ALIASEN = [
  'soprano sax', 'sax soprano', 'sax sop', 'sop sax', 'soprano saxophone', 'saxophone soprano',
  'baritone sax', 'sax baritone', 'sax bar', 'bar sax', 'baritone saxophone', 'saxophone baritone',
  'eb cornet', 'es cornet', 'eb comet', 'es comet', 'eb kornet', 'es kornet',
  'bugel', 'flugel', 'fliigel', 'iigelho', 'flug.', 'flugelhorn',
  'alto sax', 'sax alto', 'sax alt', 'tenor sax', 'sax tenor', 'sax ten',
  'alto saxophone', 'saxophone alto', 'tenor saxophone', 'saxophone tenor',
  'trb', 'tbn', 'trumpet', 'cornet', 'comet', 'kornet', 'cts', 'ct',
  'alto horn', 'tenor horn', 'horn in f', 'hoorn in f', 'horn', 'hom', 'hn',
  'euph', 'bass', 'bas', 'basses', 'clarinet', 'flute', 'oboe', 'viola', 'violin',
];

const instrumentTermen = [...INSTRUMENTEN.map(({ naam }) => naam), ...INSTRUMENT_ALIASEN]
  .flatMap((naam) => {
    const instrument = instrumentBijNaam(naam);
    if (!instrument) return [];
    return naam.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\p{L}]+/gu, ' ').trim().split(/\s+/)
      .filter((woord) => woord.length >= 4)
      .map((woord) => ({ woord, instrument }));
  });

function afstandLevenshtein(eerste, tweede) {
  const a = Array.from(eerste);
  const b = Array.from(tweede);
  let vorige = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const huidige = [i];
    for (let j = 1; j <= b.length; j++) {
      huidige[j] = Math.min(
        huidige[j - 1] + 1,
        vorige[j] + 1,
        vorige[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    vorige = huidige;
  }
  return vorige[b.length];
}

function instrumentInKop(waarde) {
  const direct = instrumentBijNaam(waarde);
  if (direct) return direct;

  const woorden = herstelOcr(waarde).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/\d+/g, ' ').replace(/[^\p{L}]+/gu, ' ').trim().split(/\s+/);
  for (const woord of woorden) {
    if (woord.length < 4) continue;
    for (const term of instrumentTermen) {
      if (term.woord.startsWith(woord)) return term.instrument;
      const maximum = Math.max(woord.length, term.woord.length) <= 6 ? 1 : 2;
      if (afstandLevenshtein(woord, term.woord) <= maximum) return term.instrument;
    }
  }
  return null;
}

const TEMPOWOORDEN = ['Vivace', 'Allegro', 'Andante', 'Moderato', 'Adagio', 'Presto', 'Largo', 'Lento'];

function tempowoordInKop(waarde) {
  const woord = waarde.trim();
  if (!/^\p{L}+$/u.test(woord)) return null;
  const klein = woord.toLocaleLowerCase('nl');
  return TEMPOWOORDEN.find((tempowoord) => afstandLevenshtein(klein, tempowoord.toLocaleLowerCase('nl')) <= 1) ?? null;
}

export function maakNetjes(partituur, naam, credits) {
  const creditGegevens = credits.map((credit) => typeof credit === 'string'
    ? { tekst: credit, type: null, y: null }
    : credit);
  const creditWoorden = creditGegevens.map((credit) => credit.tekst);
  const eersteMaatVoorCreditrust = partituur.partijen?.[0]?.maten?.[0];
  const aantalCreditrusten = eersteMaatVoorCreditrust?.maatrust == null ? creditBeginRust(creditGegevens) : null;
  if (aantalCreditrusten) {
    const creditrust = structuredClone(partituur);
    creditrust.partijen[0].maten[0].elementen.unshift({
      soort: 'aanwijzing', start: 0, type: 'letter', waarde: String(aantalCreditrusten + 1), zekerheid: 1, creditrust: true,
    });
    const aangevuld = vulOorspronkelijkeBeginRust(creditrust);
    aangevuld.partijen[0].maten[aantalCreditrusten].elementen = aangevuld.partijen[0].maten[aantalCreditrusten].elementen
      .filter((element) => !element.creditrust);
    Object.assign(partituur, aangevuld);
  }
  if (!partituur.titel && naam) partituur.titel = basename(naam, extname(naam));
  partituur.componist = herstelComponist(partituur.componist);
  const arrangeur = creditWoorden.map((waarde) => waarde.trim().match(/^arr(?:\.|\s)\s*(.+)$/i)).find(Boolean);
  if (arrangeur) partituur.arrangeur = arrangeur[1].trim();
  if (!partituur.arrangeur) {
    const componisten = creditGegevens.filter((credit) => credit.type?.toLowerCase() === 'composer');
    const [eersteComponist, tweedeComponist] = componisten;
    if (Number.isFinite(eersteComponist?.y)
      && Number.isFinite(tweedeComponist?.y)
      && eersteComponist.y > tweedeComponist.y
      && eersteComponist.y - tweedeComponist.y < 60) {
      partituur.arrangeur = tweedeComponist.tekst.replace(/^arr\.\s*/i, '').trim();
    }
  }
  const eersteMaat = partituur.partijen?.[0]?.maten?.[0];
  const heeftTempo = eersteMaat?.tempo != null
    || eersteMaat?.elementen?.some((element) => element.soort === 'aanwijzing' && element.type === 'tempo');
  if (eersteMaat && !heeftTempo) {
    const creditTempo = creditTempos(creditGegevens)
      .filter((tempo) => tempo.pagina === 0)
      .sort((a, b) => b.y - a.y)[0];
    if (creditTempo) {
      Object.assign(partituur, zetTempo(partituur, 0, creditTempo.bpm));
    } else {
      const tempowoord = creditWoorden.map(tempowoordInKop).find(Boolean);
      if (tempowoord) {
        const tempo = tempoVoorWoord(tempowoord);
        eersteMaat.tempo = tempo;
        eersteMaat.elementen.push({
          soort: 'aanwijzing', start: 0, type: 'tempo', waarde: tempo, getoond: tempowoord, zekerheid: 1,
        });
      }
    }
  }
  partituur.partijen.forEach((partij, index) => {
    if (!partij.naam || partij.naam === 'Voice') {
      const gevonden = creditWoorden.map((waarde) => {
        const hersteld = herstelOcr(waarde);
        return { waarde: hersteld, instrument: instrumentInKop(hersteld) };
      }).find(({ instrument }) => instrument);
      if (gevonden) {
        const volgnummer = gevonden.waarde.match(/\s+(\d+)\s*$/)?.[1];
        const instrumentNaam = gevonden.instrument.id === 'bugel' ? 'Flugelhorn' : gevonden.instrument.naam;
        partij.naam = partijNaamUitKop(gevonden.waarde) ?? `${instrumentNaam}${volgnummer ? ` ${volgnummer}` : ''}`;
        Object.assign(partij.instrument, { midiProgramma: gevonden.instrument.midiProgramma, transpositie: gevonden.instrument.transpositie });
      } else {
        partij.naam = `Partij ${index + 1}`; // zonder tekst op het blad noemt Audiveris elke partij Voice
      }
      return;
    }
    const instrument = instrumentBijNaam(partij.naam);
    if (instrument) Object.assign(partij.instrument, { midiProgramma: instrument.midiProgramma, transpositie: instrument.transpositie });
  });
  const hersteldeNamen = herstelInstrumentnamen(partituur.partijen.map((partij) => partij.naam));
  partituur.partijen.forEach((partij, index) => {
    if (!/^Partij \d+$/.test(partij.naam)) partij.naam = hersteldeNamen[index];
    const instrument = instrumentBijNaam(partij.naam);
    if (instrument) Object.assign(partij.instrument, { midiProgramma: instrument.midiProgramma, transpositie: instrument.transpositie });
  });
}

const herkenMelding = (tekst) => ({ soort: 'herkenning', ernst: 'waarschuwing', partij: null, maat: null, tekst });

import { verbeterTekst } from '../model/muziektermen.mjs';

export function maakHerken({ map, draaier }) {
  const taken = new Map();
  const herkenningenPerUur = maakLimiet({
    max: Number(process.env.SCORE2SOUND_HERKENNINGEN_PER_UUR ?? 10),
    venster: 3600000,
  });
  let rij = Promise.resolve();

  function voortgang(taak) {
    let nummers = [];
    return (regel) => {
      const reeks = regel.match(/reaching PAGE on sheets:\[([^\]]*)\]/);
      if (reeks) nummers = taak.gevraagd = [...reeks[1].matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
      const stand = leesVoortgang(regel);
      if (!stand) return;
      const bladIndex = Math.max(0, nummers.indexOf(stand.blad));
      const bladen = Math.max(1, nummers.length);
      taak.tekst = `Pagina ${bladIndex + 1} van ${bladen}: ${stapTekst(stand.stap)}`;
      taak.procent = voortgangProcent({ bladIndex, bladen, stap: stand.stap });
    };
  }

  async function herken(taak) {
    taak.stand = 'bezig';
    taak.lopend = draaier.transcribeer({ invoer: taak.invoer, uitmap: taak.uitmap, paginas: taak.paginas, opRegel: voortgang(taak) });
    const { log } = await taak.lopend.klaar;
    if (taak.stand === 'afgebroken') return;

    const omr = join(taak.uitmap, 'invoer.omr');
    let bestanden;
    try {
      bestanden = leesZip(await readFile(omr));
    } catch {
      throw new Error(leesFoutmelding(log));
    }
    // book.xml noemt alle pagina's van de PDF; alleen de gevraagde tellen mee.
    const gevraagd = (nummer) => !taak.gevraagd || taak.gevraagd.includes(nummer);
    // Een pagina kan vastlopen zonder dat er iets mis is met het blad: een tweede ronde op hetzelfde boek maakt hem meestal af.
    const vast = vastgelopenBladen(bestanden.get('book.xml').toString('utf8')).filter(gevraagd);
    if (vast.length > 0) {
      taak.lopend = draaier.herstel({ omr, uitmap: taak.uitmap, bladen: vast, opRegel: (regel) => {
        const stand = leesVoortgang(regel);
        if (stand) taak.tekst = `Pagina ${stand.blad} nog een keer: ${stapTekst(stand.stap)}`;
      } });
      await taak.lopend.klaar;
      if (taak.stand === 'afgebroken') return;
      bestanden = leesZip(await readFile(omr));
    }
    const boek = bestanden.get('book.xml').toString('utf8');
    const uitBoek = leesBladen(boek);
    const goed = uitBoek.goed.filter(gevraagd);
    const mislukt = uitBoek.mislukt.filter(gevraagd);
    if (goed.length === 0) throw new Error(leesFoutmelding(log));

    const bladen = bladenUitOmr(bestanden, [...goed, ...mislukt].sort((a, b) => a - b));
    for (const blad of bladen) if (blad.png) await writeFile(join(taak.uitmap, `blad-${blad.nummer}.png`), blad.png);

    taak.lopend = draaier.exporteer({ omr, uitmap: taak.uitmap, bladen: goed });
    await taak.lopend.klaar;
    if (taak.stand === 'afgebroken') return;
    const uitvoer = await leesUitvoer(taak.uitmap);
    if (!uitvoer) throw new Error('De bladmuziek is niet herkend.');
    const { partituur, creditGegevens, paginaKopregels } = uitvoer;

    const bladenGoed = bladen.filter((blad) => goed.includes(blad.nummer));
    const uit = koppelOmr(voegPaginasSamen(partituur, boek, bladenGoed), bladenGoed);
    uit.partituur.bron = {
      herkenning: taak.id,
      bladen: bladen.map(({ nummer, breedte, hoogte }) => ({ nummer, breedte, hoogte })),
    };
    maakNetjes(uit.partituur, taak.naam, creditGegevens);
    const eersteMaat = uit.partituur.partijen?.[0]?.maten?.[0];
    const tempoBekend = eersteMaat?.tempo != null
      || eersteMaat?.elementen?.some((element) => element.soort === 'aanwijzing' && element.type === 'tempo');
    const ocrPerBlad = await Promise.all(bladenGoed.map(async (blad) => ({
      ...await leesBlad(join(taak.uitmap, `blad-${blad.nummer}.png`)),
      blad: blad.nummer,
    })));
    const ocr = ocrPerBlad[0] ?? { regels: [] };
    const kop = kopUitOcr(ocr, { arrangeurBekend: Boolean(uit.partituur.arrangeur), tempoBekend });
    if (kop.arrangeur) uit.partituur.arrangeur = kop.arrangeur;
    if (kop.tempoWoord && eersteMaat) {
      const tempo = tempoVoorWoord(kop.tempoWoord);
      eersteMaat.tempo = tempo;
      eersteMaat.elementen.push({
        soort: 'aanwijzing', start: 0, type: 'tempo', waarde: tempo, getoond: kop.tempoWoord, zekerheid: 1,
      });
    }
    const paginaNamen = paginaKopregels.map((regels) => (regels ?? [])
      .map((regel) => partijNaamUitKop(herstelOcr(regel))).find(Boolean) ?? null);
    uit.partituur = splitsPartijenOpKoppen(uit.partituur, paginaNamen);
    uit.partituur = woordenNaarMaten(uit.partituur, ocrPerBlad);
    uit.partituur = meermaatsRustenUitCijfers(uit.partituur, ocrPerBlad);
    verbeterTekstaanwijzingen(uit.partituur);
  const gevuld = vulLegeMaten(uit.partituur);
  const maatMeldingen = controleerMaatduur(gevuld);
  const nagekeken = markeerFouteMaten(gevuld, maatMeldingen);
  uit.partituur = nagekeken;
  const letters = voegLettersToe(uit.partituur, bladenGoed);
  uit.partituur = markeerVerdachteNoten(letters.partituur);
  const koppelRedenen = [
    [uit.redenen.geenKopInMaat, 'geen kop in de maat'],
    [uit.redenen.andereToonhoogte, 'andere toonhoogte'],
    [uit.redenen.alGebruikt, 'al aan een andere noot gekoppeld'],
  ].filter(([aantal]) => aantal > 0);
  const koppelRedenenTekst = koppelRedenen.length > 0
    ? ` (${koppelRedenen.map(([aantal, reden]) => `${aantal} ${reden}`).join(', ')})`
    : '';
  const meldingen = [
    ...letters.meldingen.map(herkenMelding),
      ...mislukt.map((nummer) => herkenMelding(`Pagina ${nummer} is overgeslagen: daar kon de app geen muziek lezen.`)),
      ...uit.overgeslagen.map((nummer) => herkenMelding(`Op pagina ${nummer} konden de noten niet aan het blad gekoppeld worden. Ze staan in het rood: kijk ze na.`)),
      ...(uit.nietGekoppeld > 0 ? [herkenMelding(`${uit.nietGekoppeld} noten konden niet aan het origineel worden gekoppeld${koppelRedenenTekst}.`)] : []),
    ...maatMeldingen,
    ];
  await writeFile(join(taak.uitmap, 'resultaat.json'), JSON.stringify({
    id: taak.id,
    gebruiker: taak.gebruiker,
    naam: taak.naam,
    partituur: uit.partituur,
    meldingen,
  }));
  Object.assign(taak, { stand: 'klaar', tekst: 'Klaar', procent: 100, partituur: uit.partituur, meldingen });
  }

  async function werk(taak) {
    try {
      if (taak.stand !== 'afgebroken') await herken(taak);
    } catch (fout) {
      if (taak.stand !== 'afgebroken') Object.assign(taak, { stand: 'fout', fout: fout.message });
    }
    // Opruimen mag een herkenning nooit laten mislukken; wat blijft staan, ruimt de server later op.
    const opruimen = taak.stand === 'klaar' ? ruimTussenbestandenOp(taak.uitmap) : rm(taak.uitmap, { recursive: true, force: true });
    await opruimen.catch(() => {});
  }

  async function werkOud(taak) {
    if (taak.stand === 'afgebroken') return;
    try {
      await herken(taak);
    } catch (fout) {
      if (taak.stand !== 'afgebroken') Object.assign(taak, { stand: 'fout', fout: fout.message });
    }
  }

  async function start({ body, query, gebruiker }) {
    if (!body || body.length === 0) return { status: 400, body: { fout: 'Het bestand is leeg.' } };
    const soort = soortVan(body);
    if (!soort) return { status: 415, body: { fout: 'Kies een PDF, PNG of JPG.' } };
    const paginas = (query.paginas ?? '').trim();
    if (paginas && !PAGINAS.test(paginas)) return { status: 400, body: { fout: 'Schrijf de pagina\'s als 1-4 7.' } };
    if (paginas && meerDanVeertigPaginas(paginas)) return { status: 400, body: { fout: 'Kies hooguit 40 pagina\'s per keer.' } };
    if (soort === 'pdf' && !paginas) {
      const aantal = telPdfPaginas(body);
      if (aantal > 60) return { status: 400, body: { fout: `Deze PDF heeft ${aantal} pagina's. Kies hooguit 60 pagina's, bijvoorbeeld 1-10.` } };
    }
    const eigenaar = gebruiker || null;
    if (eigenaar && [...taken.values()].some((taak) => taak.gebruiker === eigenaar && (taak.stand === 'wacht' || taak.stand === 'bezig'))) {
      return { status: 429, body: { fout: 'Er loopt al een herkenning van jou. Wacht tot die klaar is.' } };
    }
    if (eigenaar && !herkenningenPerUur(eigenaar)) {
      return { status: 429, body: { fout: 'Je hebt dit uur al 10 herkenningen gestart. Probeer het later opnieuw.' } };
    }

    const id = randomBytes(6).toString('hex');
    const uitmap = join(map, id);
    const invoer = join(uitmap, `invoer.${soort}`); // nooit de naam van de gebruiker als pad
    const taak = { id, gebruiker: eigenaar, stand: 'wacht', tekst: 'Wacht op zijn beurt', procent: 0, naam: query.naam ?? '', paginas, invoer, uitmap };
    taken.set(id, taak);
    try {
      await mkdir(uitmap, { recursive: true });
      await writeFile(invoer, body);
    } catch (fout) {
      taken.delete(id);
      throw fout;
    }
    rij = rij.then(() => werk(taak));
    return { status: 202, body: { id } };
  }

  async function blad(id, nummer) {
    try {
      return { status: 200, body: await readFile(join(map, id, `blad-${nummer}.png`)), soort: 'image/png' };
    } catch {
      return { status: 404, body: { fout: 'Deze pagina is er niet.' } };
    }
  }

  function stand(taak) {
    const { id, stand: huidig, tekst, procent, fout, partituur, meldingen } = taak;
    return { status: 200, body: { id, stand: huidig, tekst, procent, ...(fout ? { fout } : {}), ...(partituur ? { partituur, meldingen } : {}) } };
  }

  async function leesResultaat(id) {
    let resultaat;
    try {
      resultaat = JSON.parse(await readFile(join(map, id, 'resultaat.json'), 'utf8'));
    } catch (fout) {
      if (fout.code === 'ENOENT') return null;
      throw fout;
    }
    if (
      !resultaat
      || typeof resultaat !== 'object'
      || resultaat.id !== id
      || (resultaat.gebruiker !== null && typeof resultaat.gebruiker !== 'string')
      || typeof resultaat.naam !== 'string'
      || !resultaat.partituur
      || !Array.isArray(resultaat.meldingen)
    ) return null;
    return resultaat;
  }

  return async function afhandelaar(verzoek) {
    const { methode, rest = '' } = verzoek;
    if (methode === 'POST' && !rest) return start(verzoek);

    const pagina = rest.match(/^([a-f0-9]{12})\/blad\/(\d+)$/);
    if (pagina && methode === 'GET') {
      const taak = taken.get(pagina[1]) ?? await leesResultaat(pagina[1]);
      if (!taak || taak.gebruiker !== (verzoek.gebruiker || null)) return { status: 404, body: { fout: 'Onbekende herkenning.' } };
      return blad(pagina[1], pagina[2]);
    }

    let taak = GELDIG_ID.test(rest) ? taken.get(rest) : null;
    if (!taak && methode === 'GET' && GELDIG_ID.test(rest)) {
      const resultaat = await leesResultaat(rest);
      if (resultaat) taak = { ...resultaat, stand: 'klaar', tekst: 'Klaar', procent: 100 };
    }
    if (!taak || taak.gebruiker !== (verzoek.gebruiker || null)) return { status: 404, body: { fout: 'Onbekende herkenning.' } };
    if (methode === 'GET') return stand(taak);
    if (methode === 'DELETE') {
      if (taak.stand === 'wacht' || taak.stand === 'bezig') {
        const liep = taak.stand === 'bezig';
        taak.stand = 'afgebroken';
        taak.tekst = 'Afgebroken';
        if (liep) taak.lopend?.stop();
      }
      return { status: 200, body: { id: taak.id } };
    }
    return { status: 405, body: { fout: 'Dat kan hier niet.' } };
  };
}

export default maakHerken({
  map: process.env.SCORE2SOUND_HERKENNING || fileURLToPath(new URL('../../herkenning/', import.meta.url)),
  draaier: echteDraaier,
});
import { rm } from 'node:fs/promises';
import { voegLettersToe } from './letters.mjs';
import { ruimTussenbestandenOp } from './opruimen.mjs';

function verbeterTekstaanwijzingen(project) {
  for (const partij of project.partijen ?? []) {
    for (const maat of partij.maten ?? []) {
      for (const aanwijzing of maat.aanwijzingen ?? []) {
        if (aanwijzing.soort === 'aanwijzing' && aanwijzing.type === 'tekst') {
          aanwijzing.waarde = verbeterTekst(aanwijzing.waarde);
        }
      }
    }
  }
  return project;
}

import { voegSplitsingenSamen } from './samenvoegen.mjs';
import { herstelHerkenning } from '../model/herstel.mjs';
