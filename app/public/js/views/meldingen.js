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
    const lijst = document.createElement('ul');
    lijst.className = 'meldingen__lijst';
    if (meldingen.length === 0) {
      kop.textContent = 'Meldingen';
      const uitleg = document.createElement('p');
      uitleg.className = 'zacht';
      uitleg.textContent = 'Geen meldingen: alle maten lijken te kloppen.';
      vlak.replaceChildren(kop, uitleg);
      return;
    }

    kop.textContent = `Meldingen (${meldingen.length})`;
    for (const melding of [
      ...meldingen.filter(item => item.ernst === 'fout'),
      ...meldingen.filter(item => item.ernst === 'waarschuwing'),
    ]) {
      const item = document.createElement('li');
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = `knop melding--${melding.ernst}`;
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
      lijst.append(item);
    }

    vlak.replaceChildren(kop, lijst);
  }

  app.op('meldingen', teken);
  app.op('partituur', teken);
  teken();
}
