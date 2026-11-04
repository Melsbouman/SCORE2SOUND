import {
  onzekereElementen,
  keurGoed,
  suggestieToonhoogte,
  zetToonhoogte,
} from '/src/model/corrigeren.mjs';
import { herstelHerkenning } from '/src/model/herstel.mjs';
import { controleerMaatduur } from '/src/controle/maatduur.mjs';

export function start(app) {
  const vlak = document.getElementById('onzeker');
  let gekozen = null;
  let bevestigen = false;
  let laatsteMelding = null;

  function kiesOnzeker(richting) {
    const partituur = app.stand.partituur;
    if (!partituur) return;
    const ids = onzekereElementen(partituur);
    if (ids.length === 0) return;
    const index = ids.indexOf(gekozen);
    const volgende = index < 0
      ? (richting > 0 ? 0 : ids.length - 1)
      : (index + richting + ids.length) % ids.length;
    app.meld('kies-noot', { id: ids[volgende] });
  }

  function keurAllesGoed() {
    const ids = onzekereElementen(app.stand.partituur);
    if (!bevestigen) {
      bevestigen = true;
      teken();
      return;
    }

    bevestigen = false;
    let partituur = app.stand.partituur;
    for (const id of ids) partituur = keurGoed(partituur, id);
    app.zet({ partituur });
    app.meld('kies-noot', { id: null });
  }

  function maakKnop(naam, actie, uitgeschakeld = false) {
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'knop';
    knop.textContent = naam;
    knop.disabled = uitgeschakeld;
    knop.addEventListener('click', actie);
    return knop;
  }

  function teken() {
    const partituur = app.stand.partituur;
    if (!partituur) {
      vlak.replaceChildren();
      return;
    }

    const ids = onzekereElementen(partituur);
    const status = document.createElement('p');
    status.className = 'onzeker__status';
    status.setAttribute('role', 'status');
    status.textContent = ids.length === 0
      ? 'Alle noten zijn gecontroleerd'
      : `Nog ${ids.length} onzekere ${ids.length === 1 ? 'noot' : 'noten'}`;
    if (laatsteMelding !== null) {
      status.textContent = laatsteMelding;
      laatsteMelding = null;
    }

    const knoppen = document.createElement('div');
    knoppen.className = 'onzeker__knoppen';
    const suggestieKnop = maakKnop(
      'Suggestie toepassen',
      () => {
        const toonhoogte = suggestieToonhoogte(app.stand.partituur, gekozen);
        if (toonhoogte) {
          app.zet({ partituur: zetToonhoogte(app.stand.partituur, gekozen, toonhoogte) });
        }
      },
      gekozen === null || suggestieToonhoogte(partituur, gekozen) === null,
    );
    suggestieKnop.setAttribute('aria-label', 'Pas de voorgestelde toonhoogte toe op de gekozen noot');
    const herstelKnop = maakKnop('Herkenning herstellen', () => {
      const nieuw = herstelHerkenning(app.stand.partituur);
      app.zet({ partituur: nieuw, meldingen: controleerMaatduur(nieuw) });
      app.meld('kies-noot', { id: null });
      laatsteMelding = `Herkenning hersteld: ${nieuw.partijen[0].maten.length} maten.`;
      const status = vlak.querySelector('p.onzeker__status');
      if (status) status.textContent = laatsteMelding;
    });
    herstelKnop.setAttribute('aria-label', 'Herstel bekende leesfouten van de herkenning in dit stuk');
    knoppen.append(
      maakKnop('Vorige', () => kiesOnzeker(-1), ids.length === 0),
      maakKnop('Volgende', () => kiesOnzeker(1), ids.length === 0),
      suggestieKnop,
      herstelKnop,
      maakKnop(
        bevestigen ? 'Bevestig alles goedkeuren' : 'Alles goedkeuren',
        keurAllesGoed,
        ids.length === 0,
      ),
    );
    vlak.replaceChildren(status, knoppen);
  }

  document.addEventListener('keydown', (gebeurtenis) => {
    const doel = gebeurtenis.target instanceof Element ? gebeurtenis.target : null;
    if (doel?.matches('input, select, textarea') || doel?.isContentEditable) return;
    if (gebeurtenis.altKey || gebeurtenis.ctrlKey || gebeurtenis.metaKey) return;
    const toets = gebeurtenis.key.toLowerCase();
    if (toets === 'n' || toets === 'p') {
      gebeurtenis.preventDefault();
      kiesOnzeker(toets === 'n' ? 1 : -1);
    }
  });

  app.op('partituur', () => {
    bevestigen = false;
    teken();
  });
  app.op('kies-noot', ({ id }) => {
    gekozen = id;
    teken();
  });
  teken();
}
