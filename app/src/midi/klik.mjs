import { maatLengte } from '../model/duur.mjs';
import { uitgevouwen } from '../model/maten.mjs';

function maatDuur(maat) {
  if (!maat.opmaat) return maatLengte(maat.maatsoort);
  return maat.elementen
    .filter((element) => element.soort === 'noot' || element.soort === 'rust')
    .reduce((einde, element) => Math.max(einde, element.start + element.duur), 0);
}

export function klikGebeurtenissen(partituur, { voorinteller = 0 } = {}) {
  const gespeeld = uitgevouwen(partituur);
  const maten = gespeeld.partijen[0]?.maten ?? [];
  const eersteMaatsoort = maten[0]?.maatsoort ?? { teller: 4, noemer: 4 };
  const voorintellerMaat = maatLengte(eersteMaatsoort);
  const gebeurtenissen = [];

  for (let maat = -voorinteller; maat < 0; maat += 1) {
    const telDuur = 1920 / eersteMaatsoort.noemer;
    for (let tel = 0; tel < eersteMaatsoort.teller; tel += 1) {
      gebeurtenissen.push({ tik: maat * voorintellerMaat + tel * telDuur, kracht: tel === 0 ? 110 : 80 });
    }
  }

  let maatBegin = 0;
  for (const maat of maten) {
    const telDuur = 1920 / maat.maatsoort.noemer;
    const duur = maatDuur(maat);
    for (let tel = 0; tel < maat.maatsoort.teller && tel * telDuur < duur; tel += 1) {
      gebeurtenissen.push({ tik: maatBegin + tel * telDuur, kracht: tel === 0 ? 110 : 80 });
    }
    maatBegin += duur;
  }
  return gebeurtenissen;
}
