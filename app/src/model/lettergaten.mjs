const letterGetal = (waarde) => {
  let getal = 0;
  for (const teken of waarde) getal = getal * 26 + teken.charCodeAt(0) - 64;
  return getal;
};

const letterCode = (getal) => {
  let waarde = '';
  while (getal > 0) {
    getal -= 1;
    waarde = String.fromCharCode(65 + (getal % 26)) + waarde;
    getal = Math.floor(getal / 26);
  }
  return waarde;
};

const lettersVan = (partij) => partij.maten.flatMap((maat, maatIndex) =>
  maat.elementen
    .filter((element) => element.soort === 'aanwijzing' && element.type === 'letter')
    .map((element) => ({ element, maatIndex })),
);

const verdeelMaten = (begin, eind, aantal) => Array.from(
  { length: aantal },
  (_, index) => begin + Math.floor(((index + 1) * (eind - begin)) / (aantal + 1)),
);

const voegLetterToe = (partij, maatIndex, waarde) => {
  partij.maten[maatIndex].elementen.unshift({
    soort: 'aanwijzing',
    start: 0,
    type: 'letter',
    waarde,
    zekerheid: 0.3,
  });
};

export function vulLetterGaten(stuk) {
  const resultaat = structuredClone(stuk);

  for (const partij of resultaat.partijen) {
    let letters = lettersVan(partij);
    if (letters.length === 0) continue;

    let vorige = letterGetal(letters[0].element.waarde);
    for (const letter of letters.slice(1)) {
      const huidig = letterGetal(letter.element.waarde);
      if (huidig <= vorige) {
        letter.element.waarde = letterCode(vorige + 1);
        letter.element.zekerheid = 0.3;
        vorige += 1;
      } else {
        vorige = huidig;
      }
    }

    letters = lettersVan(partij);
    let onoplosbaarGat = false;
    for (let index = 1; index < letters.length; index += 1) {
      const eerste = letters[index - 1];
      const tweede = letters[index];
      const eersteGetal = letterGetal(eerste.element.waarde);
      const tweedeGetal = letterGetal(tweede.element.waarde);
      const aantal = tweedeGetal - eersteGetal - 1;
      const beschikbareMaten = tweede.maatIndex - eerste.maatIndex - 1;
      if (aantal <= 0) continue;
      if (beschikbareMaten < aantal) {
        onoplosbaarGat = true;
        continue;
      }

      const maten = verdeelMaten(eerste.maatIndex, tweede.maatIndex, aantal);
      for (let gat = 0; gat < aantal; gat += 1) {
        voegLetterToe(partij, maten[gat], letterCode(eersteGetal + gat + 1));
      }
    }

    letters = lettersVan(partij);
    const eersteGetal = letterGetal(letters[0].element.waarde);
    const aantal = eersteGetal - 1;
    if (!onoplosbaarGat && aantal > 0 && letters[0].maatIndex > aantal) {
      const maten = verdeelMaten(-1, letters[0].maatIndex, aantal);
      for (let index = 0; index < aantal; index += 1) {
        voegLetterToe(partij, maten[index], letterCode(index + 1));
      }
    }
  }

  return resultaat;
}
