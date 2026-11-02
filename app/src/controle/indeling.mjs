import { createRequire } from 'node:module';

import { naarMusicXML } from '../musicxml/schrijven.mjs';

const require = createRequire(import.meta.url);

function verwachteSystemen(partituur) {
  const maten = partituur.maten ?? [];
  const beginnen = maten
    .map((maat, index) => ({ maat, index }))
    .filter(({ maat }) => maat.regelbegin);

  return beginnen.map(({ maat, index }, systeem) => ({
    systeem: systeem + 1,
    eerste: index + 1,
    aantal: (beginnen[systeem + 1]?.index ?? maten.length) - index,
  }));
}

function leesSystemen(svg) {
  const systemen = [];
  const systeemPatroon = /<g\b[^>]*class="[^"]*system[^"]*"[^>]*>([\s\S]*?)(?=<g\b[^>]*class="[^"]*system[^"]*"|<\/svg>)/g;
  let gevonden;

  while ((gevonden = systeemPatroon.exec(svg)) !== null) {
    const maten = [...gevonden[1].matchAll(/<g\b[^>]*class="[^"]*(?:measure|mNum)[^"]*"[^>]*data-n="(\d+)"/g)]
      .map((match) => Number(match[1]));
    const uniekeMaten = [...new Set(maten)];
    if (uniekeMaten.length) {
      systemen.push({ eerste: uniekeMaten[0], aantal: uniekeMaten.length });
    }
  }

  return systemen;
}

function standaardRenderSysteemTelling(musicXml) {
  const verovio = require('verovio');
  const Toolkit = verovio.toolkit ?? verovio.default?.toolkit;
  const toolkit = new Toolkit();
  toolkit.setOptions({ breaks: 'encoded' });
  toolkit.loadData(musicXml);

  return leesSystemen(toolkit.renderToSVG(1, {}));
}

export function controleerIndeling(partituur, renderSysteemTelling = standaardRenderSysteemTelling) {
  const verwacht = verwachteSystemen(partituur);

  if (!verwacht.length) {
    return {
      systemen: [],
      verwacht: [],
      afwijkingen: [],
      goed: true,
      opmerking: 'De partituur bevat geen indeling.',
    };
  }

  const systemen = renderSysteemTelling(naarMusicXML(partituur));
  const afwijkingen = [];
  const aantalSystemen = Math.max(verwacht.length, systemen.length);

  for (let index = 0; index < aantalSystemen; index += 1) {
    const verwachtSysteem = verwacht[index];
    const gevondenSysteem = systemen[index];
    if (
      verwachtSysteem?.eerste !== gevondenSysteem?.eerste
      || verwachtSysteem?.aantal !== gevondenSysteem?.aantal
    ) {
      afwijkingen.push({
        systeem: index + 1,
        verwachtEerste: verwachtSysteem?.eerste ?? null,
        gevondenEerste: gevondenSysteem?.eerste ?? null,
        verwachtAantal: verwachtSysteem?.aantal ?? 0,
        gevondenAantal: gevondenSysteem?.aantal ?? 0,
      });
    }
  }

  return {
    systemen,
    verwacht,
    afwijkingen,
    goed: afwijkingen.length === 0,
  };
}
