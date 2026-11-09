import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { leesXmlBoom, kinderen, tekst } from '../musicxml/xml.mjs';

export const STAPPEN = ['LOAD', 'BINARY', 'SCALE', 'GRID', 'HEADERS', 'STEM_SEEDS', 'BEAMS', 'LEDGERS', 'HEADS', 'STEMS', 'REDUCTION', 'CUE_BEAMS', 'TEXTS', 'MEASURES', 'CHORDS', 'CURVES', 'SYMBOLS', 'LINKS', 'RHYTHMS', 'PAGE'];

const STAPTEKSTEN = {
  LOAD: 'pagina laden',
  BINARY: 'zwart-wit maken',
  SCALE: 'notenbalken meten',
  GRID: 'notenbalken zoeken',
  HEADERS: 'sleutels en voortekens lezen',
  STEM_SEEDS: 'stokken voorbereiden',
  BEAMS: 'waardestrepen zoeken',
  LEDGERS: 'hulplijnen zoeken',
  HEADS: 'noten zoeken',
  STEMS: 'stokken zoeken',
  REDUCTION: 'twijfelgevallen oplossen',
  CUE_BEAMS: 'stichnoten zoeken',
  TEXTS: 'tekst lezen',
  MEASURES: 'maten zoeken',
  CHORDS: 'akkoorden maken',
  CURVES: 'bogen zoeken',
  SYMBOLS: 'tekens zoeken',
  LINKS: 'alles koppelen',
  RHYTHMS: 'ritme bepalen',
  PAGE: 'pagina afmaken',
};

export function audiverisPad(env = process.env) {
  return env.AUDIVERIS || 'C:\\Program Files\\Audiveris\\Audiveris.exe';
}

export function transcribeerArgumenten({ invoer, uitmap, paginas, limiet = 240 }) {
  const bladen = paginas.trim() ? ['-sheets', ...paginas.trim().split(/\s+/)] : [];
  return [
    '-batch', '-transcribe', '-save', ...bladen,
    '-constant', `org.audiveris.omr.Main.sheetStepTimeOut=${limiet}`,
    // Eén partituur per boek: zonder dit splitst Audiveris een pagina met korte oefeningen in meerdere scores die elkaar overschrijven.
    '-constant', 'org.audiveris.omr.sheet.ProcessingSwitches.indentations=false',
    '-output', uitmap, '--', invoer,
  ];
}

export function exporteerArgumenten({ omr, uitmap, bladen }) {
  return [
    '-batch', '-export', '-sheets', ...bladen.map(String),
    '-constant', 'org.audiveris.omr.sheet.BookManager.useCompression=false',
    '-output', uitmap, '--', omr,
  ];
}

// Een nieuwe ronde op het bewaarde boek: Audiveris gaat verder bij de stap waar de pagina vastliep.
export function hervatArgumenten({ omr, uitmap, bladen }) {
  return [
    '-batch', '-transcribe', '-force', '-save', '-sheets', ...bladen.map(String),
    '-constant', 'org.audiveris.omr.Main.sheetStepTimeOut=240',
    '-output', uitmap, '--', omr,
  ];
}

export function leesVoortgang(regel) {
  const gevonden = regel.match(/\[[^\]#]*#(\d+)\]\s+StepMonitoring\s+\d+\s+\|\s+([A-Z_]+)\s*$/);
  return gevonden ? { blad: Number(gevonden[1]), stap: gevonden[2] } : null;
}

export function voortgangProcent({ bladIndex, bladen, stap }) {
  return Math.min(99, Math.floor(((bladIndex + STAPPEN.indexOf(stap) / STAPPEN.length) / bladen) * 100));
}

export function stapTekst(stap) {
  return STAPTEKSTEN[stap] || 'bezig';
}

export function leesBladen(bookXml) {
  const boom = leesXmlBoom(bookXml);
  const goed = [];
  const mislukt = [];
  for (const sheet of kinderen(boom, 'sheet')) {
    const nummer = Number(sheet.attr.number);
    const stappen = tekst(sheet, 'steps');
    if (sheet.attr.invalid !== 'true' && stappen.split(/\s+/).includes('PAGE')) goed.push(nummer);
    else mislukt.push(nummer);
  }
  return { goed, mislukt };
}

// Begonnen, niet afgekeurd en toch geen PAGE: de pagina liep vast op de tijdslimiet.
export function vastgelopenBladen(bookXml) {
  return kinderen(leesXmlBoom(bookXml), 'sheet')
    .filter((sheet) => {
      const stappen = tekst(sheet, 'steps').split(/\s+/);
      return sheet.attr.invalid !== 'true' && stappen.includes('LOAD') && !stappen.includes('PAGE');
    })
    .map((sheet) => Number(sheet.attr.number));
}

export function leesFoutmelding(log) {
  if (log.includes('too low') || log.includes('300 DPI')) {
    return 'De afbeelding is te klein om noten te lezen. Scan op 300 dpi en probeer het opnieuw.';
  }
  if (log.includes('No regularly spaced lines') || log.includes('No system found')) {
    return 'Op dit blad staan geen notenbalken die de app kan lezen. Staat het blad rechtop? Een liggende scan, of twee pagina\'s naast elkaar op één blad, kan de app nog niet lezen: draai het blad of knip het eerst in tweeën.';
  }
  return 'De bladmuziek is niet herkend.';
}

export function draai({ exe, argumenten, opRegel = () => {}, maxStil = 30 * 60 * 1000 }) {
  const child = spawn(exe, argumenten, { windowsHide: true });
  const regels = [];
  let gestopt = false;
  let stil = false;
  let timer;

  const stelTimerIn = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      stil = true;
      child.kill();
    }, maxStil);
  };
  const verwerkRegel = (regel) => {
    regels.push(regel);
    if (regels.length > 200) regels.shift();
    opRegel(regel);
    stelTimerIn();
  };

  createInterface({ input: child.stdout }).on('line', verwerkRegel);
  createInterface({ input: child.stderr }).on('line', verwerkRegel);
  stelTimerIn();

  const klaar = new Promise((resolve, reject) => {
    child.once('error', () => {
      clearTimeout(timer);
      reject(new Error('Audiveris is niet gevonden. Zet het pad in de omgevingsvariabele AUDIVERIS.'));
    });
    child.once('close', (code) => {
      clearTimeout(timer);
      resolve({ code, log: regels.join('\n'), gestopt, stil });
    });
  });

  return {
    klaar,
    stop() {
      gestopt = true;
      child.kill();
    },
  };
}
