import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const leegResultaat = () => ({ breedte: 0, hoogte: 0, regels: [] });

function voerUit(programma, argumenten, timeout) {
  return new Promise((resolve, reject) => {
    execFile(programma, argumenten, { timeout, maxBuffer: 16 * 1024 * 1024 }, (fout, stdout) => {
      if (fout) {
        reject(fout);
        return;
      }
      resolve(stdout);
    });
  });
}

// Windows: de ingebouwde tekstherkenning via ocr-windows.ps1, die al JSON in de vorm van leesBlad geeft.
function voerWindowsOcrUit(pad) {
  const script = fileURLToPath(new URL('ocr-windows.ps1', import.meta.url));
  return voerUit('powershell', ['-NoProfile', '-File', script, pad], 60_000);
}

// Linux (de server): Tesseract met tsv-uitvoer. Talen via SCORE2SOUND_OCR_TALEN (standaard eng; bijvoorbeeld eng+ita+nld
// als die taalbestanden zijn geïnstalleerd). Psm 11 zoekt losse tekst verspreid over het blad, zoals op bladmuziek.
function voerTesseractUit(pad) {
  const talen = process.env.SCORE2SOUND_OCR_TALEN || 'eng';
  return voerUit('tesseract', [pad, 'stdout', '-l', talen, '--psm', '11', 'tsv'], 60_000);
}

// Zet de tsv van Tesseract om naar { breedte, hoogte, regels: [{ tekst, woorden: [{ tekst, x, y, breedte, hoogte, zekerheid }] }] }.
// Niveau 1 is de pagina (breedte en hoogte), niveau 5 een woord; een woord hoort bij een regel via blok, alinea en regelnummer.
// Lege woorden en woorden zonder zekerheid (-1) vallen weg; de zekerheid gaat van 0-100 naar 0-1.
export function leesTesseractTsv(tsv) {
  const lijnen = String(tsv ?? '').split(/\r?\n/).filter((lijn) => lijn.trim() !== '');
  if (lijnen.length === 0) return leegResultaat();
  const kop = lijnen[0].split('\t');
  const kolom = (naam) => kop.indexOf(naam);
  const k = Object.fromEntries(['level', 'block_num', 'par_num', 'line_num', 'left', 'top', 'width', 'height', 'conf', 'text'].map((naam) => [naam, kolom(naam)]));
  if (Object.values(k).some((index) => index < 0)) return leegResultaat();

  let breedte = 0;
  let hoogte = 0;
  const regels = new Map();
  for (const lijn of lijnen.slice(1)) {
    const v = lijn.split('\t');
    const niveau = Number(v[k.level]);
    if (niveau === 1) {
      breedte = Number(v[k.width]) || 0;
      hoogte = Number(v[k.height]) || 0;
      continue;
    }
    if (niveau !== 5) continue;
    const tekst = String(v[k.text] ?? '').trim();
    const zekerheid = Number(v[k.conf]);
    if (!tekst || !(zekerheid >= 0)) continue;
    const sleutel = `${v[k.block_num]}-${v[k.par_num]}-${v[k.line_num]}`;
    if (!regels.has(sleutel)) regels.set(sleutel, []);
    regels.get(sleutel).push({
      tekst,
      x: Number(v[k.left]),
      y: Number(v[k.top]),
      breedte: Number(v[k.width]),
      hoogte: Number(v[k.height]),
      zekerheid: Math.round(zekerheid * 10) / 1000,
    });
  }
  return { breedte, hoogte, regels: [...regels.values()].map((woorden) => ({ tekst: woorden.map((woord) => woord.tekst).join(' '), woorden })) };
}

// Welke tekstherkenning: SCORE2SOUND_OCR = uit, windows of tesseract; zonder keuze Windows op Windows en anders Tesseract.
function kies() {
  const keuze = process.env.SCORE2SOUND_OCR;
  if (keuze === 'tesseract' || (keuze !== 'windows' && process.platform !== 'win32')) return { uitvoeren: voerTesseractUit, lees: leesTesseractTsv };
  return { uitvoeren: voerWindowsOcrUit, lees: (json) => JSON.parse(json) };
}

// Een eigen uitvoerder (voor tests) geeft JSON in de vorm van de Windows-tekstherkenning.
export async function leesBlad(pad, { uitvoerder } = {}) {
  if (process.env.SCORE2SOUND_OCR === 'uit') return leegResultaat();
  const { uitvoeren, lees } = uitvoerder ? { uitvoeren: uitvoerder, lees: (json) => JSON.parse(json) } : kies();
  try {
    return lees(await uitvoeren(pad));
  } catch {
    return leegResultaat();
  }
}
