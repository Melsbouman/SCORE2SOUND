export function vulOntbrekendeMaten(partituur) {
  const kopie = structuredClone(partituur);
  const eerstePartij = kopie.partijen?.[0];
  if (!eerstePartij) return kopie;

  const cijfers = eerstePartij.maten.flatMap((maat, index) => {
    const aanwijzing = maat.elementen.find((element) => (
      element.soort === 'aanwijzing'
      && element.type === 'letter'
      && /^\d+$/.test(String(element.waarde ?? '').trim())
    ));
    return aanwijzing ? [{ index, nummer: Number(String(aanwijzing.waarde).trim()) }] : [];
  });
  const invoegingen = [];
  for (let index = 1; index < cijfers.length; index += 1) {
    const vorige = cijfers[index - 1];
    const huidige = cijfers[index];
    const verwacht = huidige.nummer - vorige.nummer;
    const werkelijk = huidige.index - vorige.index;
    const aantal = verwacht - werkelijk;
    if (verwacht > 0 && aantal > 0 && aantal <= 40) invoegingen.push({ index: huidige.index, aantal });
  }

  for (const partij of kopie.partijen) {
    const ingevoegdeMaten = new Set();
    for (const invoeging of invoegingen.toReversed()) {
      const volgende = partij.maten[invoeging.index];
      if (!volgende) continue;
      const nummerVolgende = Number(volgende.nummer);
      const eerderIngevoegd = invoegingen.reduce((totaal, andere) => (
        totaal + (andere.index < invoeging.index ? andere.aantal : 0)
      ), 0);
      const nieuweMaten = Array.from({ length: invoeging.aantal }, (_, index) => {
        const nieuweMaat = structuredClone(volgende);
        nieuweMaat.nummer = Number.isInteger(nummerVolgende)
          ? String(nummerVolgende + eerderIngevoegd + index)
          : volgende.nummer;
        nieuweMaat.opmaat = false;
        nieuweMaat.herhaling = { ...nieuweMaat.herhaling, begin: false, eind: false };
        nieuweMaat.sleutels = [];
        nieuweMaat.tempo = null;
        nieuweMaat.elementen = [{
          soort: 'rust',
          start: 0,
          duur: Math.round(nieuweMaat.maatsoort.teller * 1920 / nieuweMaat.maatsoort.noemer),
          stem: 1,
          notenbalk: 1,
          heleMaat: true,
          zekerheid: 0.3,
        }];
        ingevoegdeMaten.add(nieuweMaat);
        return nieuweMaat;
      });
      partij.maten.splice(invoeging.index, 0, ...nieuweMaten);
    }

    partij.maten.forEach((maat, index) => {
      maat.index = index;
      if (!ingevoegdeMaten.has(maat)) {
        const oorspronkelijkNummer = Number(maat.nummer);
        if (Number.isInteger(oorspronkelijkNummer)) {
          const eerderIngevoegd = invoegingen.reduce((totaal, invoeging) => totaal + (index >= invoeging.index + invoeging.aantal ? invoeging.aantal : 0), 0);
          maat.nummer = String(oorspronkelijkNummer + eerderIngevoegd);
        }
      }
    });
  }
  return kopie;
}
