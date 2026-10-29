import { leesMusicXML } from '../musicxml/lezen.mjs';
import { controleerMaatduur } from '../controle/maatduur.mjs';

export default async function importeer(verzoek) {
  if (verzoek.methode !== 'POST') {
    return { status: 405, body: { fout: 'Gebruik POST om een bestand te importeren.' } };
  }

  if (!verzoek.body || verzoek.body.length === 0) {
    return { status: 400, body: { fout: 'Het bestand is leeg.' } };
  }

  if (verzoek.body.length >= 4
    && verzoek.body[0] === 0x50
    && verzoek.body[1] === 0x4b
    && verzoek.body[2] === 0x03
    && verzoek.body[3] === 0x04) {
    return {
      status: 415,
      body: { fout: 'Gecomprimeerde MusicXML (.mxl) kan de app nog niet openen. Bewaar het bestand als .musicxml en probeer het opnieuw.' },
    };
  }

  try {
    const xml = verzoek.body.toString('utf8').replace(/^\uFEFF/, '');
    const partituur = leesMusicXML(xml);
    return { status: 200, body: { partituur, meldingen: controleerMaatduur(partituur) } };
  } catch (fout) {
    return { status: 422, body: { fout: fout.message } };
  }
}
