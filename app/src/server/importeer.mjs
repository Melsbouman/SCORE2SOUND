import { importeerBestand } from '../import/importeer.mjs';

export default async function importeer(verzoek) {
  if (verzoek.methode !== 'POST') {
    return { status: 405, body: { fout: 'Gebruik POST om een bestand te importeren.' } };
  }

  try {
    const resultaat = await importeerBestand(new Uint8Array(verzoek.body ?? []));
    return { status: 200, body: resultaat };
  } catch (fout) {
    const status = fout.message === 'Het bestand is leeg.' ? 400 : 422;
    return { status, body: { fout: fout.message } };
  }
}
