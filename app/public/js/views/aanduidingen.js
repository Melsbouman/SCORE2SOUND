import { AANDUIDINGEN } from '/src/model/aanduidingen.mjs';
import { voegAanwijzingToe, verwijderAanwijzing, leesId, zoekElement } from '/src/model/corrigeren.mjs';

const groepsnamen = {
  tempo: 'Tempo',
  expressie: 'Expressie',
  spelwijze: 'Spelwijze',
  dynamiek: 'Sterkte',
};

const dynamiekTermen = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp'];

export function start(app) {
  let gekozenNoot = null;
  let gekozenMaat = null;

  function teken() {
    const vlak = document.getElementById('aanduidingen');
    if (!vlak) return;

    const tekst = document.createElement('p');
    tekst.className = 'zacht';
    tekst.textContent = gekozenNoot != null
      ? 'Gekozen: noot'
      : gekozenMaat != null
        ? `Gekozen: maat ${gekozenMaat + 1}`
        : 'Kies een noot of een maat en klik op een aanduiding.';

    const groepen = Object.entries(AANDUIDINGEN).map(([groep, termen]) => {
      const element = document.createElement('div');
      element.className = 'aanduidingen__groep';

      const kop = document.createElement('div');
      kop.className = 'aanduidingen__kop';
      kop.textContent = groepsnamen[groep];
      element.append(kop);

      for (const term of termen) {
        const knop = document.createElement('button');
        knop.type = 'button';
        knop.className = 'knop aanduidingen__knop';
        knop.textContent = term;
        knop.disabled = !app.stand.partituur || (gekozenNoot == null && gekozenMaat == null);
        knop.addEventListener('click', () => {
          const partituur = app.stand.partituur;
          if (!partituur) return;

          let partijId;
          let maatIndex;
          let start;
          if (gekozenNoot != null) {
            const plaats = leesId(gekozenNoot);
            const elementBijNoot = zoekElement(partituur, gekozenNoot);
            if (!plaats || !elementBijNoot) return;
            ({ partijId, maatIndex } = plaats);
            start = elementBijNoot.start;
          } else {
            partijId = partituur.partijen[0]?.id;
            maatIndex = gekozenMaat;
            start = 0;
          }

          if (partijId == null) return;
          const type = dynamiekTermen.includes(term) ? 'dynamiek' : 'tekst';
          app.zet({
            partituur: voegAanwijzingToe(partituur, partijId, maatIndex, start, type, term),
          });
        });
        element.append(knop);
      }

      return element;
    });

    const partituur = app.stand.partituur;
    let partijId;
    let maatIndex;
    if (gekozenNoot != null) {
      const plaats = leesId(gekozenNoot);
      if (plaats) ({ partijId, maatIndex } = plaats);
    } else if (gekozenMaat != null) {
      partijId = partituur?.partijen[0]?.id;
      maatIndex = gekozenMaat;
    }

    const maat = partituur?.partijen.find((partij) => partij.id === partijId)?.maten[maatIndex];
    const aanwijzingen = maat?.elementen
      .map((element, index) => ({ element, index }))
      .filter(({ element }) => element.soort === 'aanwijzing') ?? [];
    const lijst = aanwijzingen.length > 0 ? document.createElement('div') : null;
    if (lijst) {
      lijst.className = 'aanduidingen__lijst';
      const kop = document.createElement('div');
      kop.className = 'aanduidingen__kop';
      kop.textContent = 'In deze maat';
      lijst.append(kop);

      for (const { element, index } of aanwijzingen) {
        const waarde = element.type === 'tempo' ? `♩ = ${element.waarde}` : element.waarde;
        const regel = document.createElement('div');
        regel.className = 'aanduidingen__regel';
        const inhoud = document.createElement('span');
        inhoud.textContent = waarde;
        const knop = document.createElement('button');
        knop.type = 'button';
        knop.className = 'knop aanduidingen__knop';
        knop.setAttribute('aria-label', `Verwijder ${waarde}`);
        knop.textContent = 'Verwijderen';
        knop.addEventListener('click', () => {
          app.zet({
            partituur: verwijderAanwijzing(app.stand.partituur, `n-${partijId}-${maatIndex}-${index}`),
          });
        });
        regel.append(inhoud, knop);
        lijst.append(regel);
      }
    }

    vlak.replaceChildren(tekst, ...groepen, ...(lijst ? [lijst] : []));
  }

  app.op('kies-noot', ({ id }) => {
    gekozenNoot = id ?? null;
    teken();
  });
  app.op('kies-maat', ({ maat }) => {
    gekozenMaat = maat ?? null;
    teken();
  });
  app.op('partituur', teken);
  teken();
}
