import { randomBytes } from 'node:crypto';
import { access, mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { draai, audiverisPad, transcribeerArgumenten, exporteerArgumenten } from './audiveris.mjs';
import { leesZip, leesBladen, bladenUitOmr, koppelOmr } from './omr.mjs';
import { leesVoortgang, stapTekst, voortgangProcent, leesFoutmelding } from './voortgang.mjs';
import { leesMusicXML } from '../musicxml/lezen.mjs';
import { instrumentBijNaam } from '../model/instrumenten.mjs';
import { controleerMaatduur } from '../controle/maatduur.mjs';

const echteDraaier = {
  transcribeer({ invoer, uitmap, paginas, opRegel }) {
    return draai({ exe: audiverisPad(), argumenten: transcribeerArgumenten({ invoer, uitmap, paginas }), opRegel });
  },
  exporteer({ omr, uitmap, bladen }) {
    return draai({ exe: audiverisPad(), argumenten: exporteerArgumenten({ omr, uitmap, bladen }) });
  },
};
const antwoord = (status, body, soort) => ({ status, body, ...(soort ? { soort } : {}) });
const soortVan = (b) => b.subarray(0, 4).toString() === '%PDF' ? 'pdf'
  : b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 ? 'png'
    : b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff ? 'jpg' : null;

export function maakHerken({ map, draaier }) {
  const taken = new Map();
  let rij = Promise.resolve();
  async function werk(taak) {
    if (taak.stand === 'afgebroken') return;
    try {
      taak.stand = 'bezig';
      let nummers = [];
      const transcribeer = draaier.transcribeer({ invoer: taak.invoer, uitmap: taak.uitmap, paginas: taak.paginas, opRegel(regel) {
        const pagina = regel.match(/reaching PAGE on sheets:\[([^\]]*)\]/);
        if (pagina) nummers = [...pagina[1].matchAll(/#(\d+)/g)].map((m) => Number(m[1]));
        const stap = leesVoortgang(regel);
        if (stap) {
          const genoemd = regel.match(/herkenning#(\d+)/);
          const index = Math.max(0, nummers.indexOf(genoemd ? Number(genoemd[1]) : nummers[0]));
          const totaal = Math.max(1, nummers.length);
          taak.tekst = `Pagina ${index + 1} van ${totaal}: ${stapTekst(stap)}`;
          taak.procent = voortgangProcent({ bladIndex: index, bladen: totaal, stap });
        }
      } });
      taak.lopend = transcribeer;
      const resultaat = await transcribeer.klaar;
      taak.lopend = null;
      if (taak.stand === 'afgebroken') return;
      const omr = join(taak.uitmap, 'invoer.omr');
      try { await access(omr); } catch {
        taak.stand = 'fout'; taak.fout = leesFoutmelding(resultaat.log); return;
      }
      const zip = await leesZip(omr);
      const book = zip.get('book.xml');
      const bladen = book ? leesBladen(book.toString()) : [];
      const goed = bladen.filter((b) => !b.mislukt);
      if (!goed.length) { taak.stand = 'fout'; taak.fout = leesFoutmelding(resultaat.log); return; }
      for (const blad of bladenUitOmr(zip, bladen)) await writeFile(join(taak.uitmap, `blad-${blad.nummer}.png`), blad.png);
      const exporteer = draaier.exporteer({ omr, uitmap: taak.uitmap, bladen: goed.map((b) => b.nummer) });
      taak.lopend = exporteer;
      await exporteer.klaar;
      taak.lopend = null;
      if (taak.stand === 'afgebroken') return;
      const namen = (await readdir(taak.uitmap)).filter((n) => /^invoer(\.mvt\d+)?\.xml$/.test(n)).sort();
      if (!namen.length) { taak.stand = 'fout'; taak.fout = 'De bladmuziek is niet herkend.'; return; }
      const partituren = [];
      for (const naam of namen) partituren.push(leesMusicXML(await readFile(join(taak.uitmap, naam), 'utf8')));
      const partituur = partituren[0];
      for (const vervolg of partituren.slice(1)) if (vervolg.partijen.length === partituur.partijen.length) {
        vervolg.partijen.forEach((partij, i) => partij.maten.forEach((maat) => {
          maat.index = partituur.partijen[i].maten.length;
          partituur.partijen[i].maten.push(maat);
        }));
      }
      const nietGekoppeld = koppelOmr(partituur, goed);
      partituur.bron = { herkenning: taak.id, bladen: [...bladen].sort((a, b) => a.nummer - b.nummer).map(({ nummer, breedte, hoogte }) => ({ nummer, breedte, hoogte })) };
      if (!partituur.titel) partituur.titel = taak.naam ? basename(taak.naam, extname(taak.naam)) : '';
      partituur.partijen.forEach((partij, i) => {
        if (!partij.naam || partij.naam === 'Voice') partij.naam = `Partij ${i + 1}`;
        else {
          const instrument = instrumentBijNaam(partij.naam);
          if (instrument) {
            partij.instrument.midiProgramma = instrument.midiProgramma;
            partij.instrument.transpositie = instrument.transpositie;
          }
        }
      });
      const meldingen = controleerMaatduur(partituur);
      for (const blad of bladen.filter((b) => b.mislukt)) meldingen.push({ soort: 'herkenning', ernst: 'waarschuwing', partij: null, maat: null, tekst: `Pagina ${blad.nummer} is overgeslagen: daar kon de app geen muziek lezen.` });
      if (nietGekoppeld > 0) meldingen.push({ soort: 'herkenning', ernst: 'waarschuwing', partij: null, maat: null, tekst: `${nietGekoppeld} noten konden niet aan het origineel worden gekoppeld.` });
      if (taak.stand !== 'afgebroken') Object.assign(taak, { stand: 'klaar', tekst: 'Klaar', procent: 100, partituur, meldingen });
    } catch (fout) {
      if (taak.stand !== 'afgebroken') Object.assign(taak, { stand: 'fout', fout: fout.message });
    }
  }
  return async (verzoek) => {
    const rest = verzoek.rest || '';
    if (verzoek.methode === 'POST' && !rest) {
      if (!verzoek.body?.length) return antwoord(400, { fout: 'Het bestand is leeg.' });
      const soort = soortVan(verzoek.body);
      if (!soort) return antwoord(415, { fout: 'Kies een PDF, PNG of JPG.' });
      const paginas = verzoek.query.paginas || '';
      if (paginas && !/^\d+(-\d+)?( \d+(-\d+)?)*$/.test(paginas)) return antwoord(400, { fout: "Schrijf de pagina's als 1-4 7." });
      const id = randomBytes(6).toString('hex');
      const uitmap = join(map, id);
      await mkdir(uitmap, { recursive: true });
      const invoer = join(uitmap, `invoer.${soort}`);
      await writeFile(invoer, verzoek.body);
      const taak = { id, stand: 'wacht', tekst: 'Wacht op zijn beurt', procent: 0, naam: verzoek.query.naam, paginas, invoer, uitmap };
      taken.set(id, taak);
      rij = rij.then(() => werk(taak));
      return antwoord(202, { id });
    }
    const blad = rest.match(/^([a-f0-9]{12})\/blad\/(\d+)$/);
    if (verzoek.methode === 'GET' && blad) {
      try { return antwoord(200, await readFile(join(map, blad[1], `blad-${blad[2]}.png`)), 'image/png'); }
      catch { return antwoord(404, { fout: 'Niet gevonden.' }); }
    }
    if (!/^[a-f0-9]{12}$/.test(rest)) return antwoord(rest ? 404 : 405, { fout: rest ? 'Onbekende herkenning.' : 'Methode niet toegestaan.' });
    const taak = taken.get(rest);
    if (!taak) return antwoord(404, { fout: 'Onbekende herkenning.' });
    if (verzoek.methode === 'GET') {
      const body = { id: taak.id, stand: taak.stand, tekst: taak.tekst, procent: taak.procent };
      if (taak.fout) body.fout = taak.fout;
      if (taak.partituur) body.partituur = taak.partituur;
      if (taak.meldingen) body.meldingen = taak.meldingen;
      return antwoord(200, body);
    }
    if (verzoek.methode === 'DELETE') {
      taak.stand = 'afgebroken'; taak.lopend?.stop(); return antwoord(200, { id: taak.id });
    }
    return antwoord(405, { fout: 'Methode niet toegestaan.' });
  };
}

export default maakHerken({
  map: process.env.SCORE2SOUND_HERKENNING || fileURLToPath(new URL('../../herkenning/', import.meta.url)),
  draaier: echteDraaier,
});
