import { AANDUIDINGENLIJST } from './aanduidingenlijst.mjs';
import { MUZIEKTERMEN } from './muziektermen.mjs';

const termen = new Map();

function sleutel(tekst) {
  return tekst.toLocaleLowerCase('nl').trim().replace(/\s+/g, ' ');
}

for (const aanduiding of AANDUIDINGENLIJST) {
  termen.set(sleutel(aanduiding.naam), aanduiding.naam);
  if (aanduiding.afkorting) termen.set(sleutel(aanduiding.afkorting), aanduiding.afkorting);
}
for (const term of MUZIEKTERMEN) termen.set(sleutel(term), term);
for (const term of ['Marcato', 'open', 'st. mute', 'marc.', 'rall.', 'dolce', 'legato']) termen.set(sleutel(term), term);

function bijnaGelijk(eerste, tweede) {
  return sleutel(eerste).replace(/[^\p{L}\d]+/gu, '') === sleutel(tweede).replace(/[^\p{L}\d]+/gu, '');
}

function aanwijzingTekst(element) {
  if (element?.soort !== 'aanwijzing') return null;
  return element.tekst ?? element.waarde ?? element.getoond ?? null;
}

function maatVoorWoord(maten, blad, woord) {
  let beste = null;
  for (const [index, maat] of maten.entries()) {
    const plekken = (maat.elementen ?? []).map((element) => element.plek)
      .filter((plek) => plek?.blad === blad && Number.isFinite(plek.x) && Number.isFinite(plek.y));
    if (plekken.length === 0) continue;
    const eersteY = Math.min(...plekken.map((plek) => plek.y));
    if (eersteY <= woord.y || eersteY - woord.y > 250) continue;
    const afstand = Math.min(...plekken.map((plek) => Math.abs(plek.x - woord.x)));
    if (!beste || afstand < beste.afstand) beste = { index, afstand };
  }
  return beste?.index ?? null;
}

export function woordenNaarMaten(partituur, ocrPerBlad) {
  const nieuw = {
    ...partituur,
    partijen: (partituur.partijen ?? []).map((partij) => ({
      ...partij,
      maten: (partij.maten ?? []).map((maat) => ({ ...maat, elementen: [...(maat.elementen ?? [])] })),
    })),
  };
  const maten = nieuw.partijen[0]?.maten ?? [];

  for (const [bladIndex, ocr] of (ocrPerBlad ?? []).entries()) {
    const blad = ocr?.blad ?? bladIndex + 1;
    for (const regel of ocr?.regels ?? []) {
      for (const woord of regel.woorden ?? []) {
        if (typeof woord.tekst !== 'string' || !termen.has(sleutel(woord.tekst))) continue;
        if (!Number.isFinite(woord.x) || !Number.isFinite(woord.y)) continue;
        const maatIndex = maatVoorWoord(maten, blad, woord);
        if (maatIndex == null) continue;
        const nabij = maten.slice(Math.max(0, maatIndex - 1), maatIndex + 2);
        const bestaat = nabij.some((maat) => (maat.elementen ?? []).some((element) => {
          const tekst = aanwijzingTekst(element);
          return typeof tekst === 'string' && bijnaGelijk(tekst, woord.tekst);
        }));
        if (!bestaat) {
          maten[maatIndex].elementen.push({
            soort: 'aanwijzing', type: 'tekst', tekst: woord.tekst, start: 0, zekerheid: 0.6,
          });
        }
      }
    }
  }

  return nieuw;
}
