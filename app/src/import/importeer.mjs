import { leesMusicXML } from '../musicxml/lezen.mjs';
import { kind, kinderen, leesXml, tekst } from '../musicxml/xml.mjs';
import { controleerMaatduur } from '../controle/maatduur.mjs';
import { instrumentBijNaam } from '../model/instrumenten.mjs';
import { verwijderValseTweedeStemmen } from '../model/corrigeren.mjs';
import { leesZipBrowser } from './zip.mjs';

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

export async function importeerBestand(bytes) {
  let data = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  if (!data || data.length === 0) throw new Error('Het bestand is leeg.');

  if (data.length >= 4 && data[0] === 0x50 && data[1] === 0x4b && data[2] === 0x03 && data[3] === 0x04) {
    const bestanden = await leesZipBrowser(data);
    let pad;
    if (bestanden.has('META-INF/container.xml')) {
      const container = new TextDecoder('utf-8').decode(bestanden.get('META-INF/container.xml'));
      pad = container.match(/full-path="([^"]+)"/)?.[1];
    } else {
      pad = [...bestanden.keys()].find((naam) =>
        !naam.startsWith('META-INF/') && (naam.endsWith('.xml') || naam.endsWith('.musicxml')));
    }
    if (!pad || !bestanden.has(pad)) throw new Error('In dit .mxl-bestand staat geen MusicXML.');
    data = bestanden.get(pad);
  }

  const xml = new TextDecoder('utf-8').decode(data).replace(/^﻿/, '');
  let partituur = leesMusicXML(xml);
  vulPartijnamenAan(partituur, xml);
  let meldingen = [];
  if (isAudiveris(xml)) {
    const correctie = verwijderValseTweedeStemmen(partituur);
    partituur = correctie.partituur;
    meldingen = correctie.meldingen;
  }
  meldingen.push(...controleerMaatduur(partituur));
  return { partituur, meldingen };
}
