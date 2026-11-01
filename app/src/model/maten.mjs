export function maatIndexVanNummer(maten, tekst) {
  const nummer = tekst.trim();
  const plek = maten.findIndex((maat) => maat.nummer === nummer);
  if (plek !== -1) return plek;

  const getal = Number(tekst);
  if (!Number.isFinite(getal)) return 0;
  return Math.min(Math.max(0, getal - 1), Math.max(0, maten.length - 1));
}
