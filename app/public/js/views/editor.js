import {
  leesId,
  zoekElement,
  verschuif,
  zetAlter,
  zetDuur,
  maakRust,
  keurGoed,
  keurMaatGoed,
} from '/src/model/corrigeren.mjs';
import {
  zetFermate,
  zetArticulatie,
  zetOverbinding,
  verwijderElement,
} from '/src/model/noten-bewerken.mjs';
import { controleerMaatduur } from '/src/controle/maatduur.mjs';

const DUUR = { heel: 1920, half: 960, kwart: 480, achtste: 240, zestiende: 120 };
const DUUR_TOETSEN = { 1: 'heel', 2: 'half', 3: 'kwart', 4: 'achtste', 5: 'zestiende' };
const GESTIPTE_DUUR = new Map([[180, 120], [360, 240], [720, 480], [1440, 960], [2880, 1920]]);
const PICTOGRAMMEN = {
  hoger: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  lager: '<path d="M12 5v14m-6-6 6 6 6-6"/>',
  kruis: '<path d="M9 4 7 20M17 4l-2 16M4 9h16M3 15h16"/>',
  mol: '<path d="M7 4v15c0-7 11-7 11 0s-11 7-11-3"/>',
  herstelling: '<path d="M7 4v14l6-3V9l6-3v14"/>',
  dubbelkruis: '<path d="M8 5 6 19m10-14-2 14M4 9h16M3 15h16"/>',
  dubbelmol: '<path d="M5 4v15c0-7 8-7 8 0s-8 7-8-3m8-12v15c0-7 8-7 8 0s-8 7-8-3"/>',
  heel: '<path d="M7 14c1-3 9-5 10-2s-6 7-9 5-1-2-1-3Z"/>',
  half: '<path d="M7 16c1-3 9-5 10-2s-6 7-9 5-1-2-1-3Zm11-2V4"/>',
  kwart: '<path d="M7 16c1-3 9-5 10-2s-6 7-9 5-1-2-1-3Zm11-2V4"/>',
  achtste: '<path d="M7 16c1-3 9-5 10-2s-6 7-9 5-1-2-1-3Zm11-2V4c4 1 5 3 2 5"/>',
  zestiende: '<path d="M7 16c1-3 9-5 10-2s-6 7-9 5-1-2-1-3Zm11-2V4c4 1 5 3 2 5m-2-2c4 1 5 3 2 5"/>',
  punt: '<path d="M5 12h8"/><circle cx="18" cy="12" r="2" fill="currentColor" stroke="none"/>',
  rust: '<path d="m8 4 8 4-6 4 6 4-6 4"/>',
  goedkeuren: '<path d="m4 12 5 5L20 6"/>',
  ongedaan: '<path d="M9 8 4 12l5 4M4 12h10a6 6 0 0 1 6 6"/>',
  opnieuw: '<path d="m15 8 5 4-5 4m5-4H10a6 6 0 0 0-6 6"/>',
  fermate: '<path d="M5 15a7 7 0 0 1 14 0M3 16h18"/><circle cx="12" cy="7" r="1.5" fill="currentColor" stroke="none"/>',
  staccato: '<circle cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>',
  accent: '<path d="m5 7 14 5-14 5"/>',
  tenuto: '<path d="M5 12h14"/>',
  overbinding: '<path d="M5 10c3 7 11 7 14 0"/>',
  verwijderen: '<path d="M5 7h14m-12 0 1 13h8l1-13M9 7V4h6v3m-4 4v5m2-5v5"/>',
};

export function start(app) {
  const vlak = document.getElementById('editor');
  let gekozen = null;
  let gekozenMaat = null;
  let statusBalk = null;
  let vorigePartituur = app.stand.partituur;
  let bezigMetGeschiedenis = false;
  let projectWerdNetNull = false;
  const ongedaan = [];
  const opnieuw = [];

  function wisGeschiedenis() {
    ongedaan.length = 0;
    opnieuw.length = 0;
  }

  function teken() {
    const partituur = app.stand.partituur;
    if (!partituur) {
      vlak.replaceChildren();
      return;
    }

    const element = gekozen ? zoekElement(partituur, gekozen) : null;
    const balk = document.createElement('div');
    balk.className = 'editor__balk';
    balk.setAttribute('role', 'toolbar');
    balk.setAttribute('aria-label', 'Noot aanpassen');

    function maakKnop(naam, pictogram, actie, uitgeschakeld = false, ingedrukt = null) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'knop editor__knop';
      knop.title = naam;
      knop.setAttribute('aria-label', naam);
      if (ingedrukt !== null) knop.setAttribute('aria-pressed', String(ingedrukt));
      knop.disabled = uitgeschakeld;
      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.innerHTML = pictogram;
      if (['heel', 'half', 'kwart', 'achtste', 'zestiende'].includes(naam.toLowerCase())) {
        const nootkop = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
        nootkop.setAttribute('cx', '8.5');
        nootkop.setAttribute('cy', '17');
        nootkop.setAttribute('rx', '3.2');
        nootkop.setAttribute('ry', '2');
        if (naam !== 'Heel' && naam !== 'Half') nootkop.setAttribute('fill', 'currentColor');
        svg.append(nootkop);
      }
      knop.append(svg);
      knop.addEventListener('click', actie);
      return knop;
    }

    function groep(knoppen) {
      const rij = document.createElement('div');
      rij.className = 'editor__groep';
      for (const knop of knoppen) rij.append(knop);
      balk.append(rij);
    }

    const isNoot = element?.soort === 'noot';
    const heeftKeuze = Boolean(element);
    groep([
      maakKnop('Hoger', PICTOGRAMMEN.hoger, () => pas(verschuif(app.stand.partituur, gekozen, 1)), !isNoot),
      maakKnop('Lager', PICTOGRAMMEN.lager, () => pas(verschuif(app.stand.partituur, gekozen, -1)), !isNoot),
    ]);
    groep([
      maakKnop('Kruis', PICTOGRAMMEN.kruis, () => pas(zetAlter(app.stand.partituur, gekozen, 1)), !isNoot),
      maakKnop('Mol', PICTOGRAMMEN.mol, () => pas(zetAlter(app.stand.partituur, gekozen, -1)), !isNoot),
      maakKnop('Herstellingsteken', PICTOGRAMMEN.herstelling, () => pas(zetAlter(app.stand.partituur, gekozen, 0)), !isNoot),
      maakKnop('Dubbelkruis', PICTOGRAMMEN.dubbelkruis, () => pas(zetAlter(app.stand.partituur, gekozen, 2)), !isNoot),
      maakKnop('Dubbelmol', PICTOGRAMMEN.dubbelmol, () => pas(zetAlter(app.stand.partituur, gekozen, -2)), !isNoot),
    ]);
    groep(Object.entries(DUUR).map(([naam, duur]) => {
      const labels = { heel: 'Heel', half: 'Half', kwart: 'Kwart', achtste: 'Achtste', zestiende: 'Zestiende' };
      return maakKnop(labels[naam], PICTOGRAMMEN[naam], () => pas(zetDuur(app.stand.partituur, gekozen, duur)), !heeftKeuze);
    }).concat(
      maakKnop(
        'Punt',
        PICTOGRAMMEN.punt,
        () => {
          const nieuweDuur = GESTIPTE_DUUR.get(element.duur) ?? Math.round(element.duur * 1.5);
          pas(zetDuur(app.stand.partituur, gekozen, nieuweDuur));
        },
        !heeftKeuze,
        GESTIPTE_DUUR.has(element?.duur),
      ),
    ));
    groep([
      maakKnop('Wordt rust', PICTOGRAMMEN.rust, () => pas(maakRust(app.stand.partituur, gekozen)), !isNoot),
      maakKnop('Goedkeuren', PICTOGRAMMEN.goedkeuren, () => pas(keurGoed(app.stand.partituur, gekozen)), !heeftKeuze),
    ]);
    if (gekozenMaat !== null) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'knop editor__knop';
      knop.textContent = 'Maat klopt';
      knop.setAttribute('aria-label', 'Keur alle noten in de gekozen maat goed');
      knop.addEventListener('click', () => {
        let nieuw = app.stand.partituur;
        for (const partij of app.stand.partituur.partijen) {
          nieuw = keurMaatGoed(nieuw, partij.id, gekozenMaat);
        }
        pas(nieuw);
      });
      groep([knop]);
    }
    groep([
      maakKnop(
        'Fermate',
        PICTOGRAMMEN.fermate,
        () => pas(zetFermate(app.stand.partituur, gekozen, !element.fermate)),
        !isNoot,
        Boolean(element?.fermate),
      ),
      maakKnop(
        'Staccato',
        PICTOGRAMMEN.staccato,
        () => pas(zetArticulatie(app.stand.partituur, gekozen, 'staccato')),
        !isNoot,
        Boolean(element?.articulaties?.includes('staccato')),
      ),
      maakKnop(
        'Accent',
        PICTOGRAMMEN.accent,
        () => pas(zetArticulatie(app.stand.partituur, gekozen, 'accent')),
        !isNoot,
        Boolean(element?.articulaties?.includes('accent')),
      ),
      maakKnop(
        'Tenuto',
        PICTOGRAMMEN.tenuto,
        () => pas(zetArticulatie(app.stand.partituur, gekozen, 'tenuto')),
        !isNoot,
        Boolean(element?.articulaties?.includes('tenuto')),
      ),
      maakKnop(
        'Overbinding',
        PICTOGRAMMEN.overbinding,
        () => {
          let nieuwePartituur;
          try {
            nieuwePartituur = zetOverbinding(app.stand.partituur, gekozen, !element.overbinding.begin);
          } catch (fout) {
            if (!(fout instanceof Error)) throw fout;
            statusBalk.textContent = fout.message;
            return;
          }
          pas(nieuwePartituur);
        },
        !isNoot,
        Boolean(element?.overbinding?.begin),
      ),
      maakKnop(
        'Verwijderen',
        PICTOGRAMMEN.verwijderen,
        () => pas(verwijderElement(app.stand.partituur, gekozen)),
        !isNoot,
      ),
    ]);
    groep([
      maakKnop('Ongedaan maken', PICTOGRAMMEN.ongedaan, ongedaanMaken, ongedaan.length === 0),
      maakKnop('Opnieuw', PICTOGRAMMEN.opnieuw, opnieuwMaken, opnieuw.length === 0),
    ]);

    const status = document.createElement('span');
    status.className = `editor__status${element ? ' editor__status--gekozen' : ''}`;
    status.textContent = element ? 'Noot gekozen' : 'Geen noot gekozen';
    status.setAttribute('aria-live', 'polite');
    status.setAttribute('role', 'status');
    statusBalk = status;
    balk.append(status);
    vlak.replaceChildren(balk);
  }

  function pas(nieuwePartituur) {
    app.zet({
      partituur: nieuwePartituur,
      meldingen: controleerMaatduur(nieuwePartituur),
    });
    app.meld('kies-noot', { id: gekozen });
  }

  function ongedaanMaken() {
    if (ongedaan.length === 0) return;
    const huidige = app.stand.partituur;
    const vorige = ongedaan.pop();
    opnieuw.push(huidige);
    bezigMetGeschiedenis = true;
    app.zet({ partituur: vorige, meldingen: controleerMaatduur(vorige) });
    bezigMetGeschiedenis = false;
    app.meld('kies-noot', { id: gekozen });
    teken();
  }

  function opnieuwMaken() {
    if (opnieuw.length === 0) return;
    const huidige = app.stand.partituur;
    const volgende = opnieuw.pop();
    ongedaan.push(huidige);
    bezigMetGeschiedenis = true;
    app.zet({ partituur: volgende, meldingen: controleerMaatduur(volgende) });
    bezigMetGeschiedenis = false;
    app.meld('kies-noot', { id: gekozen });
    teken();
  }

  app.op('partituur', (partituur) => {
    const vorige = vorigePartituur;
    const bronGewijzigd = vorige
      && partituur
      && JSON.stringify(vorige.bron ?? null) !== JSON.stringify(partituur.bron ?? null);
    const projectReset = projectWerdNetNull;
    projectWerdNetNull = false;
    if (bronGewijzigd || projectReset || !partituur) {
      wisGeschiedenis();
      if (bronGewijzigd) {
        gekozen = null;
        app.meld('kies-noot', { id: null });
      }
    } else if (!bezigMetGeschiedenis && vorige) {
      ongedaan.push(vorige);
      if (ongedaan.length > 100) ongedaan.shift();
      opnieuw.length = 0;
    }
    vorigePartituur = partituur;
    teken();
  });
  app.op('project', (project) => {
    if (project === null) {
      wisGeschiedenis();
      projectWerdNetNull = true;
      queueMicrotask(() => {
        projectWerdNetNull = false;
      });
      teken();
    }
  });
  app.op('kies-noot', ({ id }) => {
    gekozen = id;
    if (id) gekozenMaat = null;
    teken();
  });
  app.op('kies-maat', ({ maat }) => {
    gekozenMaat = maat;
    teken();
  });
  document.addEventListener('keydown', (gebeurtenis) => {
    if (gebeurtenis.target?.closest?.('input, select, textarea, [contenteditable="true"]')) return;
    if (gebeurtenis.key === 'Enter' && gebeurtenis.target?.closest?.('button')) return;
    const partituur = app.stand.partituur;
    const element = gekozen && partituur ? zoekElement(partituur, gekozen) : null;
    const toets = gebeurtenis.key;
    if (toets === 'ArrowLeft' || toets === 'ArrowRight') {
      if (gebeurtenis.ctrlKey || gebeurtenis.metaKey || (element?.soort !== 'noot' && element?.soort !== 'rust')) return;
      const gelezen = leesId(gekozen);
      const partij = gelezen && partituur?.partijen.find((kandidaat) => kandidaat.id === gelezen.partijId);
      if (!partij) return;
      const elementen = partij.maten.flatMap((maat, maatIndex) => (
        maat.elementen.map((item, elementIndex) => ({ item, maatIndex, elementIndex }))
      ));
      const huidigeIndex = elementen.findIndex(({ maatIndex, elementIndex }) => (
        maatIndex === gelezen.maatIndex && elementIndex === gelezen.elementIndex
      ));
      const richting = toets === 'ArrowLeft' ? -1 : 1;
      for (let index = huidigeIndex + richting; index >= 0 && index < elementen.length; index += richting) {
        const volgende = elementen[index];
        if (volgende.item.soort !== 'noot' && volgende.item.soort !== 'rust') continue;
        gebeurtenis.preventDefault();
        gebeurtenis.stopImmediatePropagation();
        app.meld('kies-noot', { id: `n-${partij.id}-${volgende.maatIndex}-${volgende.elementIndex}` });
        return;
      }
      return;
    }
    if (element?.soort !== 'noot') return;

    let actie = null;
    if (gebeurtenis.ctrlKey || gebeurtenis.metaKey) {
      if (toets.toLowerCase() === 'z') actie = gebeurtenis.shiftKey ? opnieuwMaken : ongedaanMaken;
      else if (toets.toLowerCase() === 'y') actie = opnieuwMaken;
    } else if (toets === 'ArrowUp') {
      actie = () => pas(verschuif(app.stand.partituur, gekozen, gebeurtenis.shiftKey ? 7 : 1));
    } else if (toets === 'ArrowDown') {
      actie = () => pas(verschuif(app.stand.partituur, gekozen, gebeurtenis.shiftKey ? -7 : -1));
    } else if (toets === '+') {
      actie = () => pas(zetAlter(app.stand.partituur, gekozen, 1));
    } else if (toets === '-') {
      actie = () => pas(zetAlter(app.stand.partituur, gekozen, -1));
    } else if (toets === '=') {
      actie = () => pas(zetAlter(app.stand.partituur, gekozen, 0));
    } else if (DUUR_TOETSEN[toets]) {
      const duur = DUUR[DUUR_TOETSEN[toets]];
      actie = () => pas(zetDuur(app.stand.partituur, gekozen, duur));
    } else if (toets === '.') {
      const nieuweDuur = GESTIPTE_DUUR.get(element.duur) ?? Math.round(element.duur * 1.5);
      actie = () => pas(zetDuur(app.stand.partituur, gekozen, nieuweDuur));
    } else if (toets.toLowerCase() === 'r') {
      actie = () => pas(maakRust(app.stand.partituur, gekozen));
    } else if (toets.toLowerCase() === 's') {
      actie = () => pas(zetArticulatie(app.stand.partituur, gekozen, 'staccato'));
    } else if (toets.toLowerCase() === 'a') {
      actie = () => pas(zetArticulatie(app.stand.partituur, gekozen, 'accent'));
    } else if (toets.toLowerCase() === 't') {
      actie = () => pas(zetArticulatie(app.stand.partituur, gekozen, 'tenuto'));
    } else if (toets.toLowerCase() === 'f') {
      actie = () => pas(zetFermate(app.stand.partituur, gekozen, !element.fermate));
    } else if (toets === 'Delete' || toets === 'Backspace') {
      actie = () => pas(verwijderElement(app.stand.partituur, gekozen));
    } else if (toets === '~') {
      actie = () => {
        let nieuwePartituur;
        try {
          nieuwePartituur = zetOverbinding(app.stand.partituur, gekozen, !element.overbinding.begin);
        } catch (fout) {
          if (!(fout instanceof Error)) throw fout;
          statusBalk.textContent = fout.message;
          return;
        }
        pas(nieuwePartituur);
      };
    } else if (toets === 'Enter') {
      actie = () => pas(keurGoed(app.stand.partituur, gekozen));
    }
    if (!actie) return;
    gebeurtenis.preventDefault();
    gebeurtenis.stopImmediatePropagation();
    actie();
  });
  teken();
}
