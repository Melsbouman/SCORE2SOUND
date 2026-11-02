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
import { bladenUitOmr, koppelOmr, voegPaginasSamen } from './omr.mjs';
import { leesMusicXML } from '../musicxml/lezen.mjs';
import { controleerMaatduur } from '../controle/maatduur.mjs';
import { vulLegeMaten, markeerFouteMaten } from '../controle/nabewerken.mjs';
import { instrumentBijNaam } from '../model/instrumenten.mjs';

const GELDIG_ID = /^[a-f0-9]{12}$/;
const PAGINAS = /^\d+(-\d+)?( \d+(-\d+)?)*$/;

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

// Audiveris schrijft bij een partituur met meer delen een bestand per deel: invoer.mvt1.xml, invoer.mvt2.xml.
async function leesUitvoer(uitmap) {
  const namen = (await readdir(uitmap)).filter((naam) => /^invoer(\.mvt\d+)?\.xml$/.test(naam)).sort();
  if (namen.length === 0) return null;
  const delen = await Promise.all(namen.map(async (naam) => leesMusicXML(await readFile(join(uitmap, naam), 'utf8'))));
  const [partituur, ...rest] = delen;
  for (const deel of rest.filter((d) => d.partijen.length === partituur.partijen.length)) {
    deel.partijen.forEach((partij, index) => {
      const maten = partituur.partijen[index].maten;
      for (const maat of partij.maten) maten.push({ ...maat, index: maten.length });
    });
  }
  return partituur;
}

function maakNetjes(partituur, naam) {
  if (!partituur.titel && naam) partituur.titel = basename(naam, extname(naam));
  partituur.partijen.forEach((partij, index) => {
    if (!partij.naam || partij.naam === 'Voice') {
      partij.naam = `Partij ${index + 1}`; // zonder tekst op het blad noemt Audiveris elke partij Voice
      return;
    }
    const instrument = instrumentBijNaam(partij.naam);
    if (instrument) Object.assign(partij.instrument, { midiProgramma: instrument.midiProgramma, transpositie: instrument.transpositie });
  });
}

const herkenMelding = (tekst) => ({ soort: 'herkenning', ernst: 'waarschuwing', partij: null, maat: null, tekst });

export function maakHerken({ map, draaier }) {
  const taken = new Map();
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
    const partituur = await leesUitvoer(taak.uitmap);
    if (!partituur) throw new Error('De bladmuziek is niet herkend.');

    const bladenGoed = bladen.filter((blad) => goed.includes(blad.nummer));
    const uit = koppelOmr(voegPaginasSamen(partituur, boek, bladenGoed), bladenGoed);
    uit.partituur.bron = {
      herkenning: taak.id,
      bladen: bladen.map(({ nummer, breedte, hoogte }) => ({ nummer, breedte, hoogte })),
    };
    maakNetjes(uit.partituur, taak.naam);
  const gevuld = vulLegeMaten(uit.partituur);
  const maatMeldingen = controleerMaatduur(gevuld);
  const nagekeken = markeerFouteMaten(gevuld, maatMeldingen);
  uit.partituur = nagekeken;
  const meldingen = [
      ...mislukt.map((nummer) => herkenMelding(`Pagina ${nummer} is overgeslagen: daar kon de app geen muziek lezen.`)),
      ...uit.overgeslagen.map((nummer) => herkenMelding(`Op pagina ${nummer} is de zekerheid per noot onbekend.`)),
      ...(uit.nietGekoppeld > 0 ? [herkenMelding(`${uit.nietGekoppeld} noten konden niet aan het origineel worden gekoppeld.`)] : []),
    ...maatMeldingen,
    ];
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

  async function start({ body, query }) {
    if (!body || body.length === 0) return { status: 400, body: { fout: 'Het bestand is leeg.' } };
    const soort = soortVan(body);
    if (!soort) return { status: 415, body: { fout: 'Kies een PDF, PNG of JPG.' } };
    const paginas = (query.paginas ?? '').trim();
    if (paginas && !PAGINAS.test(paginas)) return { status: 400, body: { fout: 'Schrijf de pagina\'s als 1-4 7.' } };

    const id = randomBytes(6).toString('hex');
    const uitmap = join(map, id);
    await mkdir(uitmap, { recursive: true });
    const invoer = join(uitmap, `invoer.${soort}`); // nooit de naam van de gebruiker als pad
    await writeFile(invoer, body);
    const taak = { id, stand: 'wacht', tekst: 'Wacht op zijn beurt', procent: 0, naam: query.naam ?? '', paginas, invoer, uitmap };
    taken.set(id, taak);
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

  return async function afhandelaar(verzoek) {
    const { methode, rest = '' } = verzoek;
    if (methode === 'POST' && !rest) return start(verzoek);

    const pagina = rest.match(/^([a-f0-9]{12})\/blad\/(\d+)$/);
    if (pagina && methode === 'GET') return blad(pagina[1], pagina[2]);

    const taak = GELDIG_ID.test(rest) ? taken.get(rest) : null;
    if (!taak) return { status: 404, body: { fout: 'Onbekende herkenning.' } };
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
import { ruimTussenbestandenOp } from './opruimen.mjs';
