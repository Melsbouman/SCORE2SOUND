import { leesMusicXML } from '../musicxml/lezen.mjs';
import { kind, kinderen, leesXml, tekst } from '../musicxml/xml.mjs';
import { controleerMaatduur } from '../controle/maatduur.mjs';
import { instrumentBijNaam } from '../model/instrumenten.mjs';
import { verwijderValseTweedeStemmen } from '../model/corrigeren.mjs';
import { leesZip } from './zip.mjs';

function vulPartijnamenAan(partituur, xml) {
  const creditWoorden = kinderen(leesXml(xml), 'credit')
    .flatMap((credit) => kinderen(credit, 'credit-words').map((woord) => tekst(woord).trim()));
  for (const partij of partituur.partijen) {
    if (!['', 'Voice', 'MusicXML Part'].includes(partij.naam)) continue;
    const gevonden = creditWoorden.map((waarde) => ({ waarde, instrument: instrumentBijNaam(waarde) }))
      .find(({ instrument }) => instrument);
    if (!gevonden) continue;

    const volgnummer = gevonden.waarde.match(/\s+(\d+)\s*$/)?.[1];
    const instrumentNaam = gevonden.instrument.id === 'bugel' ? 'Flugelhorn' : gevonden.instrument.naam;
    partij.naam = `${instrumentNaam}${volgnummer ? ` ${volgnummer}` : ''}`;
    Object.assign(partij.instrument, {
      midiProgramma: gevonden.instrument.midiProgramma,
      transpositie: gevonden.instrument.transpositie,
    });
  }
}

function isAudiveris(xml) {
  const identificatie = kind(leesXml(xml), 'identification');
  const encoding = kind(identificatie, 'encoding');
  return kinderen(encoding, 'software').some((software) => /Audiveris/i.test(tekst(software)));
}

async function importeerOngecomprimeerd(verzoek) {
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
    let partituur = leesMusicXML(xml);
    vulPartijnamenAan(partituur, xml);
    let meldingen = [];
    if (isAudiveris(xml)) {
      const correctie = verwijderValseTweedeStemmen(partituur);
      partituur = correctie.partituur;
      meldingen = correctie.meldingen;
    }
    meldingen.push(...controleerMaatduur(partituur));
    return { status: 200, body: { partituur, meldingen } };
  } catch (fout) {
    return { status: 422, body: { fout: fout.message } };
  }
}
export default async function importeer(verzoek) {
  const body = verzoek.body;
  if (!Buffer.isBuffer(body) || body.length < 4 || body.readUInt32LE(0) !== 0x04034b50) {
    return importeerOngecomprimeerd(verzoek);
  }

  try {
    const gelezen = await leesZip(body);
    const bestanden = gelezen instanceof Map ? gelezen : new Map(Object.entries(gelezen));
    let pad;
    if (bestanden.has('META-INF/container.xml')) {
      const container = Buffer.from(bestanden.get('META-INF/container.xml')).toString('utf8');
      pad = container.match(/full-path="([^"]+)"/)?.[1];
    } else {
      pad = [...bestanden.keys()].find((naam) =>
        !naam.startsWith('META-INF/') && (naam.endsWith('.xml') || naam.endsWith('.musicxml')));
    }
    if (!pad || !bestanden.has(pad)) {
      return { status: 422, body: { fout: 'In dit .mxl-bestand staat geen MusicXML.' } };
    }
    return importeerOngecomprimeerd({ ...verzoek, body: Buffer.from(bestanden.get(pad)) });
  } catch (fout) {
    return { status: 422, body: { fout: fout.message } };
  }
}
