import { zoekElement, verschuif } from '/src/model/corrigeren.mjs';
import { vernieuwMeldingen } from '/src/controle/meldingen.mjs';

const SVG_NS = 'http://www.w3.org/2000/svg';
const LETTERS = 'CDEFGAB';

function nootnaam(noot, stappen) {
  const toonhoogte = noot?.toonhoogte;
  if (!toonhoogte) return '';
  let positie = LETTERS.indexOf(toonhoogte.stap);
  let octaaf = toonhoogte.octaaf;
  for (let stap = 0; stap < Math.abs(stappen); stap += 1) {
    positie += Math.sign(stappen);
    if (positie === LETTERS.length) {
      positie = 0;
      octaaf += 1;
    } else if (positie < 0) {
      positie = LETTERS.length - 1;
      octaaf -= 1;
    }
  }
  return `${LETTERS[positie]}${octaaf}`;
}

function staphoogte(noot) {
  const staff = noot.closest('g.staff')
    ?? noot.closest('g.measure')?.querySelector('g.staff');
  if (staff) {
    let lijnen = [...staff.querySelectorAll(':scope > path')].slice(0, 2);
    if (lijnen.length < 2) {
      lijnen = [...staff.querySelectorAll('path')]
        .filter((pad) => {
          const vak = pad.getBoundingClientRect();
          return (pad.getAttribute('d') ?? '').startsWith('M')
            && vak.width > vak.height;
        })
        .slice(0, 2);
    }
    if (lijnen.length === 2) {
      const [a, b] = lijnen;
      const afstand = Math.abs(
        b.getBoundingClientRect().top - a.getBoundingClientRect().top,
      );
      if (afstand > 0) return afstand / 2;
    }
  }

  const kop = noot.querySelector('.notehead');
  if (!kop) return null;
  const hoogte = kop.getBBox().height;
  const matrix = kop.getScreenCTM();
  if (!matrix || hoogte <= 0) return null;
  const resultaat = hoogte * Math.hypot(matrix.c, matrix.d) / 2;
  return resultaat > 0 ? resultaat : null;
}

function maakLabel(noot, kop, matrix) {
  const kader = kop.getBBox();
  const label = document.createElementNS(SVG_NS, 'text');
  label.setAttribute('class', 'slepen__label');
  label.setAttribute('x', String(kader.x + kader.width + 6));
  label.setAttribute('y', String(kader.y + kader.height / 2));
  label.setAttribute('dominant-baseline', 'middle');
  label.setAttribute('font-size', `${12 / Math.hypot(matrix.a, matrix.b)}px`);
  label.setAttribute('fill', 'currentColor');
  label.setAttribute('pointer-events', 'none');
  noot.append(label);
  return label;
}

function stappenVoor(deltaY, stapHoogte) {
  return -Math.sign(deltaY) * Math.floor(Math.abs(deltaY) / stapHoogte + 0.5);
}

export function start(app) {
  const vlak = document.getElementById('weergave');
  if (!vlak) return;

  let sleep = null;
  let klikTeNegeren = null;

  function zetVoorbeeld(stappen) {
    if (!sleep) return;
    const matrix = sleep.noot.parentElement.getScreenCTM();
    if (!matrix) return;
    const inverse = matrix.inverse();
    const dx = inverse.c * -stappen * sleep.stapHoogte;
    const dy = inverse.d * -stappen * sleep.stapHoogte;
    sleep.transformatie.setTranslate(dx, dy);
    sleep.label.textContent = nootnaam(zoekElement(app.stand.partituur, sleep.id), stappen);
  }

  function ruimOp() {
    if (!sleep) return;
    const vorig = sleep;
    sleep = null;
    if (vorig.transformatieOrigineel === null) vorig.noot.removeAttribute('transform');
    else vorig.noot.setAttribute('transform', vorig.transformatieOrigineel);
    vorig.label.remove();
    vorig.noot.classList.remove('slepend');
    vorig.noot.style.cursor = vorig.cursorOrigineel;
    vorig.noot.style.touchAction = vorig.touchActionOrigineel;
  }

  function begin(gebeurtenis) {
    if (sleep || gebeurtenis.button !== 0) return;
    const noot = gebeurtenis.target.closest?.('g.note');
    if (!noot || !noot.id.startsWith('n-')) return;

    const kop = noot.querySelector('.notehead');
    const matrix = kop?.getScreenCTM();
    const stap = staphoogte(noot);
    if (!kop || !matrix || !stap) return;

    const transformatieOrigineel = noot.getAttribute('transform');
    const cursorOrigineel = noot.style.cursor;
    const touchActionOrigineel = noot.style.touchAction;
    gebeurtenis.preventDefault();
    app.meld('kies-noot', { id: noot.id });
    noot.setPointerCapture(gebeurtenis.pointerId);
    noot.style.touchAction = 'none';
    noot.classList.add('slepend');
    const label = maakLabel(noot, kop, matrix);
    const transformatie = noot.ownerSVGElement.createSVGTransform();
    noot.transform.baseVal.insertItemBefore(transformatie, 0);
    sleep = {
      id: noot.id,
      noot,
      pointerId: gebeurtenis.pointerId,
      startY: gebeurtenis.clientY,
      stapHoogte: stap,
      label,
      transformatie,
      transformatieOrigineel,
      cursorOrigineel,
      touchActionOrigineel,
    };
    noot.style.cursor = 'grabbing';
    zetVoorbeeld(0);
  }

  function beweeg(gebeurtenis) {
    if (!sleep || gebeurtenis.pointerId !== sleep.pointerId) return;
    gebeurtenis.preventDefault();
    zetVoorbeeld(stappenVoor(gebeurtenis.clientY - sleep.startY, sleep.stapHoogte));
  }

  function einde(gebeurtenis, geannuleerd = false) {
    if (!sleep || gebeurtenis.pointerId !== sleep.pointerId) return;
    const huidige = sleep;
    const deltaY = gebeurtenis.clientY - huidige.startY;
    const stappen = stappenVoor(deltaY, huidige.stapHoogte);
    if (!geannuleerd) {
      klikTeNegeren = huidige.id;
      setTimeout(() => {
        if (klikTeNegeren === huidige.id) klikTeNegeren = null;
      }, 0);
    }
    ruimOp();
    if (!geannuleerd && Math.abs(deltaY) >= huidige.stapHoogte / 2 && stappen !== 0) {
      const nieuwe = verschuif(app.stand.partituur, huidige.id, stappen);
      app.zet({ partituur: nieuwe, meldingen: vernieuwMeldingen(app.stand.meldingen, nieuwe) });
    }
  }

  vlak.addEventListener('pointerdown', begin);
  vlak.addEventListener('pointermove', beweeg);
  vlak.addEventListener('pointerup', (gebeurtenis) => einde(gebeurtenis));
  vlak.addEventListener('pointercancel', (gebeurtenis) => einde(gebeurtenis, true));
  vlak.addEventListener('click', (gebeurtenis) => {
    if (!klikTeNegeren) return;
    const noot = gebeurtenis.target.closest?.('g.note');
    if (noot?.id !== klikTeNegeren) return;
    klikTeNegeren = null;
    gebeurtenis.preventDefault();
    gebeurtenis.stopImmediatePropagation();
  }, true);

  function stelTouchActieIn(element) {
    if (element.matches?.('g.note[id^="n-"]')) element.style.touchAction = 'none';
    for (const noot of element.querySelectorAll?.('g.note[id^="n-"]') ?? []) {
      noot.style.touchAction = 'none';
    }
  }

  stelTouchActieIn(vlak);
  new MutationObserver((mutaties) => {
    for (const mutatie of mutaties) {
      for (const node of mutatie.addedNodes) stelTouchActieIn(node);
    }
  }).observe(vlak, { childList: true, subtree: true });
}
