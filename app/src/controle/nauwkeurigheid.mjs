function vergelijkbareGebeurtenis(gebeurtenis) {
  const resultaat = {
    soort: gebeurtenis.soort,
    start: gebeurtenis.start,
    duur: gebeurtenis.duur,
  };

  if (gebeurtenis.soort === "noot") resultaat.toonhoogte = gebeurtenis.toonhoogte;
  if (gebeurtenis.akkoord !== undefined) resultaat.akkoord = gebeurtenis.akkoord;
  return resultaat;
}

function gebeurtenissenVan(maat) {
  return [...(maat?.noten ?? []), ...(maat?.rusten ?? [])];
}

function maatIsGelijk(herkend, juist) {
  const herkendeGebeurtenissen = gebeurtenissenVan(herkend).map(vergelijkbareGebeurtenis);
  const juisteGebeurtenissen = gebeurtenissenVan(juist).map(vergelijkbareGebeurtenis);
  return JSON.stringify(herkendeGebeurtenissen) === JSON.stringify(juisteGebeurtenissen);
}

function nootIsGelijk(herkend, juist) {
  return herkend.start === juist.start
    && herkend.duur === juist.duur
    && JSON.stringify(herkend.toonhoogte) === JSON.stringify(juist.toonhoogte);
}

function rondPercentage(aantal, totaal) {
  return totaal === 0 ? 100 : Math.round((aantal / totaal) * 1000) / 10;
}

export function meetNauwkeurigheid(herkend, juist) {
  const partijen = (juist.partijen ?? []).map((juistePartij, partijIndex) => {
    const herkendePartij = herkend.partijen?.[partijIndex];
    const juisteMaten = juistePartij.maten ?? [];
    const herkendeMaten = herkendePartij?.maten ?? [];
    let matenGelijk = 0;
    let noten = 0;
    let notenGoed = 0;
    let ontbrekend = 0;
    let teveel = 0;

    const aantalMaten = Math.max(juisteMaten.length, herkendeMaten.length);
    for (let maatIndex = 0; maatIndex < aantalMaten; maatIndex += 1) {
      const juisteMaat = juisteMaten[maatIndex];
      const herkendeMaat = herkendeMaten[maatIndex];
      if (juisteMaat && herkendeMaat && maatIsGelijk(herkendeMaat, juisteMaat)) matenGelijk += 1;

      const juisteNoten = juisteMaat?.noten ?? [];
      const herkendeNoten = herkendeMaat?.noten ?? [];
      const gebruikt = new Set();
      noten += juisteNoten.length;

      for (const juisteNoot of juisteNoten) {
        const gevonden = herkendeNoten.findIndex((herkendeNoot, index) => (
          !gebruikt.has(index) && nootIsGelijk(herkendeNoot, juisteNoot)
        ));
        if (gevonden === -1) ontbrekend += 1;
        else {
          gebruikt.add(gevonden);
          notenGoed += 1;
        }
      }
      teveel += herkendeNoten.length - gebruikt.size;
    }

    return {
      naam: juistePartij.naam ?? herkendePartij?.naam ?? `Partij ${partijIndex + 1}`,
      maten: juisteMaten.length,
      matenGelijk,
      noten,
      notenGoed,
      ontbrekend,
      teveel,
    };
  });

  const totaal = partijen.reduce((som, partij) => ({
    maten: som.maten + partij.maten,
    matenGelijk: som.matenGelijk + partij.matenGelijk,
    noten: som.noten + partij.noten,
    notenGoed: som.notenGoed + partij.notenGoed,
  }), { maten: 0, matenGelijk: 0, noten: 0, notenGoed: 0 });

  totaal.procentMaten = rondPercentage(totaal.matenGelijk, totaal.maten);
  totaal.procentNoten = rondPercentage(totaal.notenGoed, totaal.noten);
  return { partijen, totaal };
}
