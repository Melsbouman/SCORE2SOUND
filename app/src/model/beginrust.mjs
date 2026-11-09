export function vulBeginRust(partituur) {
  const nieuw = structuredClone(partituur);
  const partij = nieuw.partijen?.[0];
  const gevonden = partij?.maten?.slice(0, 8).map((maat, k) => ({
    k,
    aanwijzing: maat.elementen.find((element) => element.soort === 'aanwijzing'
      && element.type === 'letter'
      && /^\d+$/.test(String(element.waarde).trim())),
  })).find(({ aanwijzing }) => aanwijzing);

  if (!gevonden) return nieuw;

  const nummer = Number(String(gevonden.aanwijzing.waarde).trim());
  const aantal = nummer - (gevonden.k + 1);
  if (nummer > 200 || aantal < 1 || aantal > 200) return nieuw;

  // Een scan die niet bij blad 1 begint (alleen latere pagina's gekozen): de eerste maat is niet maat 1 van het stuk. Dan geen
  // beginrust, maar de nummering laten beginnen zoals het repetitiecijfer zegt.
  if ((partituur?.bron?.bladen?.[0]?.nummer ?? 1) > 1) {
    for (const huidigePartij of nieuw.partijen) {
      for (const maat of huidigePartij.maten) {
        if (/^-?\d+$/.test(String(maat.nummer))) maat.nummer = String(Number(maat.nummer) + aantal);
      }
    }
    return nieuw;
  }

  for (const huidigePartij of nieuw.partijen) {
    const eersteMaat =huidigePartij.maten[0];
    const teller = eersteMaat.maatsoort.teller;
    const noemer = eersteMaat.maatsoort.noemer;
    const ingevoegd = Array.from({ length: aantal }, (_, index) => ({
        ...structuredClone(eersteMaat),
        nummer: String(index + 1),
        index,
        opmaat: false,
        sleutels: index === 0 ? structuredClone(eersteMaat.sleutels) : [],
        toonsoort: structuredClone(eersteMaat.toonsoort),
        tempo: index === 0 ? eersteMaat.tempo : null,
        herhaling: { begin: false, eind: false, keer: 2 },
        elementen: [{
          soort: 'rust', start: 0, duur: Math.round(teller * 1920 / noemer), stem: 1,
          notenbalk: 1, heleMaat: true, zekerheid: 1,
        }],
        ...(aantal >= 2 && index === 0 ? { maatrust: aantal } : {}),
        ...(aantal >= 2 && index > 0 ? { verborgen: true } : {}),
        // Alleen de eerste ingevoegde maat begint de regel en de pagina; de rest is verborgen.
        ...(index > 0 ? { regelbegin: false, paginabegin: false } : {}),
      }));
    // De kopieën van de eerste maat nemen geen plek op het blad en geen meermaatsrust van die maat mee (zoals een ingevoegde rust).
    ingevoegd.forEach((maat, positie) => {
      delete maat.vak;
      delete maat.verlorenRust;
      if (positie > 0 || aantal < 2) delete maat.maatrust;
    });
    // De meermaatsrust staat nu vooraan: de oorspronkelijke eerste maat begint geen regel of pagina meer.
    if (eersteMaat.regelbegin) eersteMaat.regelbegin = false;
    if (eersteMaat.paginabegin) eersteMaat.paginabegin = false;
    for (const maat of huidigePartij.maten) {
      maat.index += aantal;
      if (/^-?\d+$/.test(String(maat.nummer))) {
        maat.nummer = String(Number(maat.nummer) + aantal);
      }
    }
    huidigePartij.maten.unshift(...ingevoegd);
  }

  return nieuw;
}
