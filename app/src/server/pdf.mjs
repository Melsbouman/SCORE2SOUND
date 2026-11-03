import { maakPdf } from '../export/pdf.mjs';

export default async function pdf(verzoek) {
  if (verzoek.method !== 'POST') {
    return { status: 405, body: { fout: 'Gebruik POST om een pdf te maken.' } };
  }

  if (!verzoek.body?.length) {
    return { status: 400, body: { fout: 'Er is geen MusicXML meegestuurd.' } };
  }

  try {
    return {
      status: 200,
      soort: 'application/pdf',
      body: await maakPdf(verzoek.body.toString('utf8')),
      koppen: { 'Content-Disposition': 'attachment; filename="partituur.pdf"' },
    };
  } catch {
    return { status: 422, body: { fout: 'De pdf kon niet worden gemaakt.' } };
  }
}
