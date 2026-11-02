// Meldingen tonen: welke maat, wat er mis is, en naar die maat springen.
export function start(app) {
  const vlak = document.getElementById('meldingen');

  function teken() {
    const { partituur, meldingen } = app.stand;
    if (!partituur) {
      vlak.replaceChildren();
      return;
    }

    const kop = document.createElement('h2');
    if (meldingen.length === 0) {
      kop.textContent = 'Meldingen';
      const uitleg = document.createElement('p');
      uitleg.className = 'zacht';
      uitleg.textContent = 'Geen meldingen: alle maten lijken te kloppen.';
      vlak.replaceChildren(kop, uitleg);
      return;
    }

    kop.textContent = `Meldingen (${meldingen.length})`;
    const perSoort = new Map();
    for (const melding of [
      ...meldingen.filter(item => item.ernst === 'fout'),
      ...meldingen.filter(item => item.ernst === 'waarschuwing'),
    ]) {
      if (!perSoort.has(melding.soort)) {
        perSoort.set(melding.soort, []);
      }
      perSoort.get(melding.soort).push(melding);
    }

    const namen = {
      maatduur: 'Maten die niet kloppen',
      herkenning: 'Herkenning',
      bereik: 'Buiten het bereik',
      maatsoort: 'Maatsoort',
      'aantal-maten': 'Aantal maten',
      'ontbrekende-partij': 'Ontbrekende partijen',
    };
    const soorten = [...perSoort].sort((a, b) => {
      const aHeeftFout = a[1].some(melding => melding.ernst === 'fout');
      const bHeeftFout = b[1].some(melding => melding.ernst === 'fout');
      return Number(bHeeftFout) - Number(aHeeftFout);
    });
    const blokken = [];
    for (const [soort, soortMeldingen] of soorten) {
      const details = document.createElement('details');
      if (soortMeldingen.length < 6) {
        details.open = true;
      }
      const samenvatting = document.createElement('summary');
      samenvatting.textContent = `${namen[soort] ?? soort} (${soortMeldingen.length})`;
      details.append(samenvatting);

      const soortLijst = document.createElement('ul');
      soortLijst.className = 'meldingen__lijst';
      for (const melding of soortMeldingen) {
        const item = document.createElement('li');
        const knop = document.createElement('button');
        knop.type = 'button';
        knop.className = `knop melding--${melding.ernst} melding--soort-${melding.soort}`;
        knop.append(document.createTextNode(melding.tekst));

        if (melding.partij !== null) {
          const partij = partituur.partijen.find(item => item.id === melding.partij);
          if (partij) {
            knop.append(document.createElement('br'));
            const naam = document.createElement('span');
            naam.className = 'zacht';
            naam.textContent = partij.naam;
            knop.append(naam);
          }
        }

        knop.addEventListener('click', () => {
          if (melding.maat !== null && melding.maat !== undefined) {
            app.meld('naar-maat', { partij: melding.partij, maat: melding.maat });
          }
        });
        item.append(knop);
        soortLijst.append(item);
      }
      details.append(soortLijst);
      blokken.push(details);
    }

    vlak.replaceChildren(kop, ...blokken);
  }

  app.op('meldingen', teken);
  app.op('partituur', teken);
  teken();
}
