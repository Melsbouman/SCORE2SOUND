import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const leegResultaat = () => ({ breedte: 0, hoogte: 0, regels: [] });

function voerWindowsOcrUit(pad) {
  const script = fileURLToPath(new URL('ocr-windows.ps1', import.meta.url));

  return new Promise((resolve, reject) => {
    execFile(
      'powershell',
      ['-NoProfile', '-File', script, pad],
      { timeout: 60_000 },
      (fout, stdout) => {
        if (fout) {
          reject(fout);
          return;
        }
        resolve(stdout);
      },
    );
  });
}

export async function leesBlad(pad, { uitvoerder } = {}) {
  if (process.env.SCORE2SOUND_OCR === 'uit') return leegResultaat();
  if (!uitvoerder && process.platform !== 'win32') return leegResultaat();

  try {
    const json = await (uitvoerder ?? voerWindowsOcrUit)(pad);
    return JSON.parse(json);
  } catch {
    return leegResultaat();
  }
}
