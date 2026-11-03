import { maatLengte } from './duur.mjs';

const kandidaten = [
  [2, 4], [3, 4], [4, 4], [5, 4], [6, 4],
  [3, 8], [5, 8], [6, 8], [7, 8], [9, 8], [12, 8],
  [2, 2], [3, 2],
];

export function herstelMaatsoorten(partituur) {
  const kopie = structuredClone(partituur);

  for (const partij of kopie.partijen) {
    for (const maat of partij.maten) {
      if (maat.opmaat) continue;

      const inhoudsduur = maat.elementen
        .filter((element) => element.soort === 'noot' || element.soort === 'rust')
        .reduce((grootste, element) => Math.max(grootste, element.start + element.duur), 0);
      if (inhoudsduur === 0 || inhoudsduur <= maatLengte(maat.maatsoort)) continue;

      const passend = kandidaten.filter(([teller, noemer]) => maatLengte({ teller, noemer }) === inhoudsduur);
      if (passend.length === 0) continue;

      const [teller, noemer] = passend.find((kandidaat) => kandidaat[1] === maat.maatsoort.noemer) ?? passend[0];
      maat.maatsoort = { teller, noemer };
    }
  }

  return kopie;
}
