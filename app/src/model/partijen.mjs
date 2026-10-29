export function partijUitnemen(partituur, id) {
  const partij = partituur.partijen.find((item) => item.id === id);
  if (!partij) {
    throw new Error('Onbekende partij.');
  }

  const kopie = structuredClone(partij);
  return {
    versie: 1,
    titel: `${partituur.titel} (${kopie.naam})`,
    componist: partituur.componist,
    partijen: [kopie],
  };
}

export function voegSamen(partituren) {
  if (partituren.length === 0) {
    throw new Error('Er zijn geen partituren om samen te voegen.');
  }

  const kopieën = structuredClone(partituren);
  const eerstePartituur = kopieën[0];
  const partijen = [];
  const gebruikteIds = new Set();

  for (const partituur of kopieën) {
    for (const partij of partituur.partijen) {
      const basisId = partij.id;
      let id = basisId;
      let volgnummer = 2;
      while (gebruikteIds.has(id)) {
        id = `${basisId}-${volgnummer}`;
        volgnummer += 1;
      }
      partij.id = id;
      gebruikteIds.add(id);
      partijen.push(partij);
    }
  }

  const meldingen = [];
  const referentie = partijen[0];
  if (referentie) {
    for (const partij of partijen.slice(1)) {
      if (partij.maten.length !== referentie.maten.length) {
        meldingen.push({
          soort: 'aantal-maten',
          ernst: 'waarschuwing',
          partij: partij.id,
          maat: null,
          tekst: `${partij.naam} heeft ${partij.maten.length} maten, ${referentie.naam} heeft er ${referentie.maten.length}.`,
        });
      }

      const aantalGemeenschappelijkeMaten = Math.min(partij.maten.length, referentie.maten.length);
      for (let index = 0; index < aantalGemeenschappelijkeMaten; index += 1) {
        const maat = partij.maten[index];
        const referentieMaat = referentie.maten[index];
        if (
          maat.maatsoort.teller !== referentieMaat.maatsoort.teller
          || maat.maatsoort.noemer !== referentieMaat.maatsoort.noemer
        ) {
          meldingen.push({
            soort: 'maatsoort',
            ernst: 'waarschuwing',
            partij: partij.id,
            maat: index,
            tekst: `Maat ${referentieMaat.nummer}: ${partij.naam} staat in ${maat.maatsoort.teller}/${maat.maatsoort.noemer}, ${referentie.naam} in ${referentieMaat.maatsoort.teller}/${referentieMaat.maatsoort.noemer}.`,
          });
        }
      }
    }
  }

  return {
    partituur: {
      versie: 1,
      titel: eerstePartituur.titel,
      componist: eerstePartituur.componist,
      partijen,
    },
    meldingen,
  };
}
