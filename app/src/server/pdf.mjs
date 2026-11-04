import { maakPdf } from '../export/pdf.mjs';

export default async function pdf(verzoek) {
  if (verzoek.methode !== 'POST') {
    return { status: 405, body: { fout: 'Gebruik POST om een pdf te maken.' } };
  }

  if (!verzoek.body?.length) {
    return { status: 400, body: { fout: 'Er is geen MusicXML meegestuurd.' } };
  }

  const inhoud = verzoek.body.toString('utf8');
  let musicxml = inhoud;
  let titelblok;
  if (inhoud.trimStart().startsWith('{')) {
    let aanvraag;
    try {
      aanvraag = JSON.parse(inhoud);
    } catch {
      return { status: 400, body: { fout: 'De aanvraag is geen geldige JSON.' } };
    }
    musicxml = aanvraag.musicxml;
    titelblok = aanvraag.titelblok;
  }

  try {
    return {
      status: 200,
      soort: 'application/pdf',
      body: await maakPdf(musicxml, { titelblok, watermerk: verzoek.gebruiker ? false : 'SCORE2SOUND' }),
      koppen: { 'Content-Disposition': 'attachment; filename="partituur.pdf"' },
    };
  } catch {
    return { status: 422, body: { fout: 'De pdf kon niet worden gemaakt.' } };
  }
}
