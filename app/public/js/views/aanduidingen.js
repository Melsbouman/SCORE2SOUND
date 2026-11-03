import { AANDUIDINGEN } from '/src/model/aanduidingen.mjs';
import { voegAanwijzingToe, verwijderAanwijzing, leesId, zoekElement, voegHaakToe } from '/src/model/corrigeren.mjs';

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
  let gekozenTot = null;

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

    const tempo = document.createElement('div');
    tempo.className = 'aanduidingen__tempo';
    const tempoLabel = document.createElement('label');
    tempoLabel.textContent = 'Tempo (bpm) ';
    const tempoInput = document.createElement('input');
    tempoInput.type = 'number';
    tempoInput.min = '20';
    tempoInput.max = '300';
    tempoInput.value = '96';
    tempoInput.setAttribute('aria-label', 'Tempo in slagen per minuut');
    tempoLabel.append(tempoInput);
    const tempoKnop = document.createElement('button');
    tempoKnop.type = 'button';
    tempoKnop.className = 'knop aanduidingen__knop';
    tempoKnop.textContent = 'Zetten';
    tempoKnop.disabled = !app.stand.partituur || (gekozenNoot == null && gekozenMaat == null);
    tempoKnop.addEventListener('click', () => {
      const partituur = app.stand.partituur;
      if (!partituur) return;

      const getal = Number(tempoInput.value);
      if (!Number.isInteger(getal) || getal < 20 || getal > 300) return;

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
      app.zet({
        partituur: voegAanwijzingToe(partituur, partijId, maatIndex, start, 'tempo', getal),
      });
    });
    tempo.append(tempoLabel, tempoKnop);

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

    const haakGroep = document.createElement('div');
    haakGroep.className = 'aanduidingen__groep';
    const haakKop = document.createElement('div');
    haakKop.className = 'aanduidingen__kop';
    haakKop.textContent = 'Haak';
    haakGroep.append(haakKop);
    for (const [label, type] of [['Crescendo', 'crescendo'], ['Decrescendo', 'decrescendo']]) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'knop aanduidingen__knop';
      knop.textContent = label;
      knop.disabled = !app.stand.partituur || (gekozenNoot == null && gekozenMaat == null);
      knop.addEventListener('click', () => {
        const partituur = app.stand.partituur;
        if (!partituur) return;

        let partijId;
        let vanMaat;
        if (gekozenNoot != null) {
          const plaats = leesId(gekozenNoot);
          if (!plaats) return;
          ({ partijId, maatIndex: vanMaat } = plaats);
        } else {
          partijId = partituur.partijen[0]?.id;
          vanMaat = gekozenMaat;
        }

        if (partijId == null || vanMaat == null) return;
        const totMaat = gekozenTot ?? vanMaat;
        const partij = partituur.partijen.find((item) => item.id === partijId);
        const elementen = partij?.maten[totMaat]?.elementen;
        if (!elementen?.length) return;
        const totStart = Math.max(...elementen.map((element) => element.start));
        app.zet({
          partituur: voegHaakToe(partituur, partijId, vanMaat, 0, totMaat, totStart, type),
        });
      });
      haakGroep.append(knop);
    }

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

    vlak.replaceChildren(tekst, tempo, ...groepen, haakGroep, ...(lijst ? [lijst] : []));
  }

  app.op('kies-noot', ({ id }) => {
    gekozenNoot = id ?? null;
    teken();
  });
  app.op('kies-maat', ({ maat, tot }) => {
    gekozenMaat = maat ?? null;
    gekozenTot = tot ?? null;
    teken();
  });
  app.op('partituur', teken);
  teken();
}
