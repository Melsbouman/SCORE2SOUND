import {
  onzekereElementen,
  keurGoed,
  suggestieToonhoogte,
  zetToonhoogte,
} from '/src/model/corrigeren.mjs';
import { herstelHerkenning } from '/src/model/herstel.mjs';
import { vernieuwMeldingen } from '/src/controle/meldingen.mjs';
import { isConcept, nakijkStand, conceptTekst, conceptTekstKort, markeerNagekeken } from '/src/model/concept.mjs';

const INGEKLAPT_SLEUTEL = 'score2sound-concept-ingeklapt';

function leesIngeklapt() {
  try {
    return localStorage.getItem(INGEKLAPT_SLEUTEL) === '1';
  } catch {
    return false;
  }
}

function bewaarIngeklapt(waarde) {
  try {
    localStorage.setItem(INGEKLAPT_SLEUTEL, waarde ? '1' : '0');
  } catch {
    // zonder localStorage werkt het gewoon, alleen niet bewaard
  }
}

export function start(app) {
  let ingeklapt = leesIngeklapt();
  const vlak = document.getElementById('onzeker');
  let gekozen = null;
  let bevestigen = false;
  let laatsteMelding = null;
  let bevestigKlaar = false;

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

  // Balk bovenaan zolang een gescande partituur nog niet is nagekeken. Met onzekere noten vraagt de knop eerst om bevestiging.
  function conceptBalk(partituur) {
    const stand = nakijkStand(partituur, app.stand.meldingen);
    const balk = document.createElement('div');
    balk.className = 'onzeker__concept';
    const tekst = document.createElement('p');
    tekst.textContent = ingeklapt ? conceptTekstKort(stand) : conceptTekst(stand);
    const klaar = maakKnop(bevestigKlaar ? `Toch klaar (nog ${stand.onzeker} onzeker)` : 'Klaar met nakijken', () => {
      if (stand.onzeker > 0 && !bevestigKlaar) {
        bevestigKlaar = true;
        teken();
        return;
      }
      bevestigKlaar = false;
      app.zet({
        partituur: markeerNagekeken(app.stand.partituur),
        meldingen: (app.stand.meldingen ?? []).filter((melding) => melding.soort !== 'herkenning'),
      });
    });
    klaar.classList.add('knop--hoofd');
    klaar.setAttribute('aria-label', 'Markeer de gescande partituur als nagekeken');
    const klap = maakKnop(ingeklapt ? 'Uitklappen' : 'Inklappen', () => {
      ingeklapt = !ingeklapt;
      bewaarIngeklapt(ingeklapt);
      teken();
    });
    klap.setAttribute('aria-expanded', String(!ingeklapt));
    balk.append(tekst, klaar, klap);
    return balk;
  }

  function teken() {
    const partituur = app.stand.partituur;
    if (!partituur) {
      vlak.replaceChildren();
      return;
    }

    // Check if partituur has any notes
    const heeftNoten = partituur.partijen.some(partij =>
      partij.maten.some(maat => maat.elementen.some(e => e.soort === 'noot'))
    );

    if (!heeftNoten) {
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
      app.zet({ partituur: nieuw, meldingen: vernieuwMeldingen(app.stand.meldingen, nieuw) });
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
    const concept = isConcept(partituur);
    if (concept && ingeklapt) {
      vlak.replaceChildren(conceptBalk(partituur));
      return;
    }
    vlak.replaceChildren(...(concept ? [conceptBalk(partituur)] : []), status, knoppen);
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
    bevestigKlaar = false;
    teken();
  });
  app.op('kies-noot', ({ id }) => {
    gekozen = id;
    teken();
  });
  teken();
}
