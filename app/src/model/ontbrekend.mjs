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
  const gaten = [];
  for (let index = 1; index < cijfers.length; index += 1) {
    const vorige = cijfers[index - 1];
    const huidige = cijfers[index];
    const verwacht = huidige.nummer - vorige.nummer;
    const werkelijk = huidige.index - vorige.index;
    const aantal = verwacht - werkelijk;
    if (verwacht > 0 && aantal > 0 && aantal <= 40) {
      const leeg = [];
      for (let maatIndex = vorige.index; maatIndex < huidige.index; maatIndex += 1) {
        const maat = eerstePartij.maten[maatIndex];
        if (maat && !maat.elementen.some((element) => ['noot', 'rust'].includes(element.soort))) {
          leeg.push(maatIndex);
        }
      }
      gaten.push({ index: huidige.index, aantal, leeg });
    }
  }

  for (const partij of kopie.partijen) {
    const origineleIndex = new Map(partij.maten.map((maat, index) => [maat, index]));
    const ingevoegdeMaten = new Map();
    for (const gat of gaten.toReversed()) {
      if (gat.leeg.length > 0) {
        const perMaat = 1 + Math.floor(gat.aantal / gat.leeg.length);
        const extra = gat.aantal % gat.leeg.length;
        gat.leeg.forEach((maatIndex, index) => {
          const maat = partij.maten[maatIndex];
          if (!maat) return;
          const maatrust = perMaat + (index < extra ? 1 : 0);
          maat.maatrust = maatrust;
          maat.elementen = [{
            soort: 'rust',
            start: 0,
            duur: Math.round(maat.maatsoort.teller * 1920 / maat.maatsoort.noemer),
            stem: 1,
            notenbalk: 1,
            heleMaat: true,
            zekerheid: 0.3,
          }];
        });
        continue;
      }

      const volgende = partij.maten[gat.index];
      if (!volgende) continue;
      const nummerVolgende = Number(volgende.nummer);
      const eerderIngevoegd = extraVoorIndex(gaten, gat.index);
      const nieuweMaten = Array.from({ length: gat.aantal }, (_, index) => {
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
        ingevoegdeMaten.set(nieuweMaat, true);
        return nieuweMaat;
      });
      partij.maten.splice(gat.index, 0, ...nieuweMaten);
    }

    partij.maten.forEach((maat, index) => {
      maat.index = index;
      if (!ingevoegdeMaten.has(maat)) {
        const oorspronkelijkNummer = Number(maat.nummer);
        if (Number.isInteger(oorspronkelijkNummer)) {
          const oorspronkelijkeIndex = origineleIndex.get(maat);
          maat.nummer = String(oorspronkelijkNummer + extraVoorIndex(gaten, oorspronkelijkeIndex, true));
        }
      }
    });
  }
  return kopie;
}

function extraVoorIndex(gaten, index, invoegingOpIndexTeltMee = false) {
  return gaten.reduce((totaal, gat) => {
    if (gat.leeg.length === 0) {
      return totaal + (gat.index < index || (invoegingOpIndexTeltMee && gat.index === index) ? gat.aantal : 0);
    }
    return totaal + gat.leeg.reduce((extra, maatIndex, maatPositie) => (
      extra + (maatIndex < index
        ? Math.floor(gat.aantal / gat.leeg.length) + (maatPositie < gat.aantal % gat.leeg.length ? 1 : 0)
        : 0)
    ), 0);
  }, 0);
}
