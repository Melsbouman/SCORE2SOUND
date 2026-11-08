// Een beginrust die Audiveris als los getal op de pagina bewaart (credit-words), zoals de 12 maten rust aan het begin van een partij.
// Het getal moet net boven de eerste notenbalk staan: een maatnummer aan het begin van een latere regel of een rustcijfer verderop
// staat lager op de pagina en is geen beginrust. y is MusicXML default-y in tienden, gemeten vanaf de onderkant van de pagina.
const MAX_BOVEN_BALK = 250;

// De bovenkant van de eerste notenbalk van pagina 1, in dezelfde maat als default-y van een credit, of null als het onbekend is.
export function eersteBalkBoven(xml) {
  const getal = (patroon) => {
    const gevonden = String(xml ?? '').match(patroon);
    return gevonden ? Number(gevonden[1]) : NaN;
  };
  const boven = getal(/<page-height>\s*([\d.]+)/) - getal(/<top-margin>\s*([\d.]+)/) - getal(/<top-system-distance>\s*([\d.]+)/);
  return Number.isFinite(boven) ? boven : null;
}

export function creditBeginRust(creditGegevens, { eersteBalkBoven: balkBoven = null } = {}) {
  const numeriekeCredits = creditGegevens
    .filter(({ tekst, pagina }) => pagina === 0 && /^\d+$/.test(tekst.trim()))
    .filter(({ y }) => balkBoven == null || (y != null && y > balkBoven && y <= balkBoven + MAX_BOVEN_BALK))
    .map((credit) => ({ ...credit, getal: Number(credit.tekst.trim()) }))
    .filter(({ getal }) => getal >= 2 && getal <= 200);

  if (numeriekeCredits.length === 0) return null;

  return numeriekeCredits.reduce((hoogste, credit) => (
    credit.y > hoogste.y ? credit : hoogste
  )).getal;
}
