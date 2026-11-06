export function creditBeginRust(creditGegevens) {
  const numeriekeCredits = creditGegevens
    .filter(({ tekst, pagina }) => pagina === 0 && /^\d+$/.test(tekst.trim()))
    .map((credit) => ({ ...credit, getal: Number(credit.tekst.trim()) }))
    .filter(({ getal }) => getal >= 2 && getal <= 200);

  if (numeriekeCredits.length === 0) return null;

  return numeriekeCredits.reduce((hoogste, credit) => (
    credit.y > hoogste.y ? credit : hoogste
  )).getal;
}
