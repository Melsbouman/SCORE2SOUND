import { AANDUIDINGEN, uitlegVan } from '/src/model/aanduidingen.mjs';
import { voegAanwijzingToe, verwijderAanwijzing, leesId, zoekElement, voegHaakToe } from '/src/model/corrigeren.mjs';
import { tempoLijst, zetTempo, verwijderTempo, tempoUitMaat } from '/src/model/tempo.mjs';

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

    const tempoPanel = document.createElement('section');
    tempoPanel.className = 'tempo-panel';

    // Overview list of tempo changes
    const overzicht = document.createElement('div');
    overzicht.className = 'tempo-overzicht';
    const partituurOverzicht = app.stand.partituur;
    if (partituurOverzicht) {
      const lijst = tempoLijst(partituurOverzicht);
      lijst.forEach(({ maat, nummer, bpm }) => {
        const regel = document.createElement('div');
        regel.className = 'tempo-overzicht__regel';
        if (gekozenMaat === maat) regel.classList.add('selected');
        const tekst = document.createElement('span');
        tekst.textContent = `Maat ${nummer}: ${bpm} bpm`;
        regel.appendChild(tekst);
        if (maat !== 0) {
          const verwijderKnop = document.createElement('button');
          verwijderKnop.type = 'button';
          verwijderKnop.className = 'knop tempo-overzicht__verwijderknop';
          verwijderKnop.textContent = 'Weghalen';
          verwijderKnop.addEventListener('click', (e) => {
            e.stopPropagation();
            app.zet({ partituur: verwijderTempo(partituurOverzicht, maat) });
          });
          regel.appendChild(verwijderKnop);
        }
        regel.addEventListener('click', () => {
          app.meld('kies-maat', { maat });
        });
        overzicht.appendChild(regel);
      });
    }
    tempoPanel.appendChild(overzicht);

    // Editing section for selected measure
    const editing = document.createElement('div');
    editing.className = 'tempo-bij-maat';
    if (gekozenMaat !== null) {
      const inhoud = document.createElement('div');
      inhoud.className = 'tempo-bij-maat__inhoud';
      const huidigeMaat = app.stand.partituur?.partijen?.[0]?.maten?.[gekozenMaat];
      const huidigeTempo = tempoUitMaat(huidigeMaat) ?? 120;
      // Input with +/- buttons
      const inputContainer = document.createElement('div');
      inputContainer.className = 'tempo-input__container';
      const minusKnop = document.createElement('button');
      minusKnop.type = 'button';
      minusKnop.className = 'knop';
      minusKnop.textContent = '-';
      const bpmInput = document.createElement('input');
      bpmInput.type = 'number';
      bpmInput.min = '20';
      bpmInput.max = '300';
      bpmInput.step = '1';
      bpmInput.value = String(huidigeTempo);
      const plusKnop = document.createElement('button');
      plusKnop.type = 'button';
      plusKnop.className = 'knop';
      plusKnop.textContent = '+';
      minusKnop.addEventListener('click', () => {
        let val = parseInt(bpmInput.value, 10);
        if (isNaN(val) || val <= 20) val = 20;
        else val--;
        bpmInput.value = String(val);
      });
      plusKnop.addEventListener('click', () => {
        let val = parseInt(bpmInput.value, 10);
        if (isNaN(val) || val >= 300) val = 300;
        else val++;
        bpmInput.value = String(val);
      });
      inputContainer.append(minusKnop, bpmInput, plusKnop);
      inhoud.appendChild(inputContainer);
      // Quick choices
      const snelkeuzes = [
        { naam: 'Largo', bpm: 50 },
        { naam: 'Adagio', bpm: 66 },
        { naam: 'Andante', bpm: 76 },
        { naam: 'Moderato', bpm: 100 },
        { naam: 'Allegro', bpm: 120 },
        { naam: 'Presto', bpm: 180 },
      ];
      const snelContainer = document.createElement('div');
      snelContainer.className = 'tempo-snelkeuzes';
      snelkeuzes.forEach(({ naam, bpm }) => {
        const knop = document.createElement('button');
        knop.type = 'button';
        knop.className = 'knop tempo-snelkeuze';
        knop.textContent = `${naam} ${bpm}`;
        knop.addEventListener('click', () => {
          bpmInput.value = String(bpm);
        });
        snelContainer.appendChild(knop);
      });
      inhoud.appendChild(snelContainer);
      const uitleg = document.createElement('p');
      uitleg.className = 'tempo-uitleg';
      uitleg.textContent = 'Het tempo geldt vanaf deze maat tot het volgende tempo.';
      inhoud.appendChild(uitleg);
      // Action buttons
      const acties = document.createElement('div');
      acties.className = 'tempo-acties';
      const zettenKnop = document.createElement('button');
      zettenKnop.type = 'button';
      zettenKnop.className = 'knop';
      zettenKnop.textContent = 'Tempo zetten';
      zettenKnop.addEventListener('click', () => {
        const bpm = parseInt(bpmInput.value, 10);
        if (!Number.isInteger(bpm) || bpm < 20 || bpm > 300) return;
        app.zet({ partituur: zetTempo(app.stand.partituur, gekozenMaat, bpm) });
      });
      acties.appendChild(zettenKnop);
      if (gekozenMaat !== 0) {
        const verwijderKnop = document.createElement('button');
        verwijderKnop.type = 'button';
        verwijderKnop.className = 'knop';
        verwijderKnop.textContent = 'Tempo hier weghalen';
        verwijderKnop.addEventListener('click', () => {
          app.zet({ partituur: verwijderTempo(app.stand.partituur, gekozenMaat) });
        });
        acties.appendChild(verwijderKnop);
      }
      inhoud.appendChild(acties);
      editing.appendChild(inhoud);
    } else {
      const msg = document.createElement('p');
      msg.textContent = 'Kies eerst een maat in de partituur.';
      editing.appendChild(msg);
    }
    tempoPanel.appendChild(editing);

    const groepen = Object.entries(AANDUIDINGEN).map(([groep, termen]) => {
      const element = document.createElement('div');
      element.className = 'aanduidingen__groep';
      element.setAttribute('role', 'group');
      element.setAttribute('aria-label', groepsnamen[groep]);

      const kop = document.createElement('div');
      kop.className = 'aanduidingen__kop';
      kop.textContent = groepsnamen[groep];
      element.append(kop);

      for (const term of termen) {
        const knop = document.createElement('button');
        knop.type = 'button';
        knop.className = 'knop aanduidingen__knop';
        knop.textContent = term;
    const uitleg = uitlegVan(term);
    if (uitleg) {
      knop.title = uitleg;
      knop.setAttribute('aria-label', term + ': ' + uitleg);
    }
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
    haakGroep.setAttribute('role', 'group');
    haakGroep.setAttribute('aria-label', 'Haak');
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
      lijst.setAttribute('role', 'group');
      lijst.setAttribute('aria-label', 'In deze maat');
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

    vlak.replaceChildren(tekst, tempoPanel, ...groepen, haakGroep, ...(lijst ? [lijst] : []));
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
