import { maakZip } from '../model/zipschrijven.mjs';

const escapeAttribuut = (waarde) => String(waarde)
  .replaceAll('&', '&amp;')
  .replaceAll('"', '&quot;')
  .replaceAll('<', '&lt;');

export function maakMxl(xml, bestandsnaam = 'partituur.musicxml') {
  const container = `<?xml version="1.0" encoding="UTF-8"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="${escapeAttribuut(bestandsnaam)}" media-type="application/vnd.recordare.musicxml+xml"/></rootfiles></container>`;
  return maakZip([
    { naam: 'META-INF/container.xml', inhoud: container },
    { naam: bestandsnaam, inhoud: xml },
  ]);
}
