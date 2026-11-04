import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(new URL('../app/package.json', import.meta.url));
const { XMLParser } = require('fast-xml-parser');

function alsLijst(waarde) {
  if (waarde === undefined || waarde === null) return [];
  return Array.isArray(waarde) ? waarde : [waarde];
}

function homrMaten(homrXml) {
  const parser = new XMLParser({ ignoreAttributes: false });
  const document = parser.parse(homrXml);
  const partijen = alsLijst(document['score-partwise']?.part);
  const maten = alsLijst(partijen[0]?.measure);

  return maten.map((maat, index) => ({
    maatnummer: String(maat['@_number'] ?? index + 1),
    toonhoogtes: alsLijst(maat.note)
      .filter((noot) => noot.rest === undefined && noot.pitch)
      .map((noot) => `${noot.pitch.step}${noot.pitch.octave}`),
  }));
}

function appMaten(partituur) {
  const maten = partituur.partijen?.[0]?.maten ?? [];

  return maten.map((maat, index) => ({
    maatnummer: String(maat.nummer ?? maat.maatnummer ?? index + 1),
    toonhoogtes: (maat.elementen ?? [])
      .filter((element) => element.type === 'noot' && element.toonhoogte)
      .map((element) => `${element.toonhoogte.stap}${element.toonhoogte.octaaf}`),
  }));
}

export function vergelijkMotoren(homrXml, partituur) {
  const links = homrMaten(homrXml);
  const rechts = appMaten(partituur);
  const aantalVergelijkbareMaten = Math.min(links.length, rechts.length);
  let matenMetGelijkNotenaantal = 0;
  let notenMetGelijkeToonhoogte = 0;
  const afwijkendeMaten = [];

  for (let index = 0; index < Math.max(links.length, rechts.length); index += 1) {
    const linkerMaat = links[index];
    const rechterMaat = rechts[index];
    const linkerToonhoogtes = linkerMaat?.toonhoogtes ?? [];
    const rechterToonhoogtes = rechterMaat?.toonhoogtes ?? [];
    const gelijkNotenaantal = Boolean(linkerMaat && rechterMaat)
      && linkerToonhoogtes.length === rechterToonhoogtes.length;

    if (index < aantalVergelijkbareMaten && gelijkNotenaantal) {
      matenMetGelijkNotenaantal += 1;
    }

    const aantalNoten = Math.min(linkerToonhoogtes.length, rechterToonhoogtes.length);
    for (let nootIndex = 0; nootIndex < aantalNoten; nootIndex += 1) {
      if (linkerToonhoogtes[nootIndex] === rechterToonhoogtes[nootIndex]) {
        notenMetGelijkeToonhoogte += 1;
      }
    }

    const gelijkeToonhoogtes = gelijkNotenaantal
      && linkerToonhoogtes.every((toonhoogte, nootIndex) => (
        toonhoogte === rechterToonhoogtes[nootIndex]
      ));
    if ((!gelijkeToonhoogtes || !linkerMaat || !rechterMaat) && afwijkendeMaten.length < 10) {
      afwijkendeMaten.push({
        maatnummer: linkerMaat?.maatnummer ?? rechterMaat?.maatnummer ?? String(index + 1),
        homr: linkerToonhoogtes,
        app: rechterToonhoogtes,
      });
    }
  }

  return {
    aantalMatenHomr: links.length,
    aantalMatenApp: rechts.length,
    matenMetGelijkNotenaantal,
    notenMetGelijkeToonhoogte,
    afwijkendeMaten,
  };
}

async function hoofdprogramma() {
  const [, , xmlPad, partituurPad] = process.argv;
  if (!xmlPad || !partituurPad) {
    console.error('Gebruik: node hermes/homr-vergelijk.mjs <homr.musicxml> <partituur.json>');
    process.exitCode = 1;
    return;
  }

  const [homrXml, partituurTekst] = await Promise.all([
    readFile(xmlPad, 'utf8'),
    readFile(partituurPad, 'utf8'),
  ]);
  const resultaat = vergelijkMotoren(homrXml, JSON.parse(partituurTekst));

  console.log(`Aantal maten homr: ${resultaat.aantalMatenHomr}`);
  console.log(`Aantal maten app: ${resultaat.aantalMatenApp}`);
  console.log(`Maten met gelijk notenaantal: ${resultaat.matenMetGelijkNotenaantal}`);
  console.log(`Noten met gelijke toonhoogte: ${resultaat.notenMetGelijkeToonhoogte}`);
  console.log('Eerste tien afwijkende maten:');
  for (const afwijking of resultaat.afwijkendeMaten) {
    console.log(`${afwijking.maatnummer}: homr [${afwijking.homr.join(', ')}], app [${afwijking.app.join(', ')}]`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await hoofdprogramma();
}
