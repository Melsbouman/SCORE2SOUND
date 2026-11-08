// Meermaatsrust uit het cijfer boven de balk. Audiveris leest de balk van een meermaatsrust als één lege maat en mist het
// cijfer erboven; de tekstherkenning (OCR) leest dat cijfer wel. Staat zo'n cijfer boven een maat met alleen rust, dan wordt
// die maat een meermaatsrust van dat aantal maten (maatrust: N plus N-1 verborgen maten, zoals in docs/model.md).
// Een maat moet daarvoor zijn plek op het blad kennen: maat.vak = { blad, links, rechts, boven, onder } (pixels), gezet door koppelOmr.

const MAX_AANTAL = 99;

function alleenRust(maat) {
  return Boolean(maat) && !maat.verborgen && !(maat.maatrust > 1) && !(maat.elementen ?? []).some((element) => element.soort === 'noot');
}

// Het cijfer (2 tot 99) waarvan het midden boven deze maat staat, het dichtst boven de bovenste lijn van de balk.
function cijferBoven(vak, ocr) {
  const hoogte = vak.onder - vak.boven;
  if (!(hoogte > 0)) return null;
  let beste = null;
  for (const regel of ocr?.regels ?? []) {
    for (const woord of regel.woorden ?? []) {
      const tekst = String(woord.tekst ?? '').trim();
      if (!/^\d{1,2}$/.test(tekst)) continue;
      const aantal = Number(tekst);
      if (aantal < 2 || aantal > MAX_AANTAL) continue;
      const midden = woord.x + woord.breedte / 2;
      if (midden < vak.links || midden > vak.rechts) continue;
      const afstand = vak.boven - (woord.y + woord.hoogte);
      if (afstand < -0.1 * hoogte || afstand > 1.5 * hoogte) continue;
      if (!beste || afstand < beste.afstand) beste = { aantal, afstand };
    }
  }
  return beste?.aantal ?? null;
}

const maatLengte = (maat) => ((maat.maatsoort?.teller ?? 4) * 1920) / (maat.maatsoort?.noemer ?? 4);

export function meermaatsRustenUitCijfers(partituur, ocrPerBlad) {
  const kopie = structuredClone(partituur);
  const partijen = kopie.partijen ?? [];
  if (partijen.length === 0) return kopie;
  const ocrVoor = (blad) => (ocrPerBlad ?? []).find((ocr) => ocr?.blad === blad);

  // Een maat wordt alleen een meermaatsrust als hij in alle partijen alleen rust heeft, zodat de partijen gelijk blijven.
  const vondsten = [];
  const lengte = Math.max(...partijen.map((partij) => partij.maten.length));
  for (let index = 0; index < lengte; index += 1) {
    const maten = partijen.map((partij) => partij.maten[index]);
    if (!maten.every(alleenRust)) continue;
    const aantal = maten.map((maat) => (maat.vak ? cijferBoven(maat.vak, ocrVoor(maat.vak.blad)) : null)).find(Boolean);
    if (aantal) vondsten.push({ index, aantal });
  }

  for (const partij of partijen) {
    for (const { index, aantal } of vondsten.toReversed()) {
      const maat = partij.maten[index];
      maat.maatrust = aantal;
      // De rust komt uit de tekstherkenning: rood (zekerheid 0,75), zodat je het aantal nakijkt.
      const rusten = maat.elementen.filter((element) => element.soort === 'rust');
      if (rusten.length === 0) maat.elementen.push({ soort: 'rust', start: 0, duur: maatLengte(maat), stem: 1, notenbalk: 1, heleMaat: true, zekerheid: 0.75 });
      for (const rust of rusten) rust.zekerheid = Math.min(rust.zekerheid ?? 1, 0.75);

      const nummer = Number(maat.nummer);
      const verborgenMaten = Array.from({ length: aantal - 1 }, (_, positie) => {
        const verborgen = {
          ...structuredClone(maat),
          ...(Number.isInteger(nummer) ? { nummer: String(nummer + positie + 1) } : {}),
          verborgen: true,
          regelbegin: false,
          paginabegin: false,
          tempo: null,
          elementen: maat.elementen.filter((element) => element.soort === 'rust').map((rust) => ({ ...rust, zekerheid: 1 })),
        };
        for (const veld of ['maatrust', 'vak', 'herhaling', 'volta', 'sprong']) delete verborgen[veld];
        return verborgen;
      });
      partij.maten.splice(index + 1, 0, ...verborgenMaten);
      if (Number.isInteger(nummer)) {
        for (const volgende of partij.maten.slice(index + aantal)) {
          const volgendNummer = Number(volgende.nummer);
          if (Number.isInteger(volgendNummer)) volgende.nummer = String(volgendNummer + aantal - 1);
        }
      }
    }
    partij.maten.forEach((maat, index) => {
      maat.index = index;
    });
  }
  return kopie;
}
