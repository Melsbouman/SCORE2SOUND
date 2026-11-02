import { zoekElement } from '/src/model/corrigeren.mjs';

export function start(app) {
  const vlak = document.getElementById('origineel');
  const werkvlak = document.querySelector('.werkvlak');
  vlak.tabIndex = 0;
  vlak.setAttribute(
    'aria-label',
    'Origineel: pijltjestoetsen voor de vorige en volgende pagina',
  );
  let bron = null;
  let bronBekend = false;
  let paginaIndex = 0;
  let zoom = 100;
  let papier;
  let afbeelding;
  let paginTekst;
  let vorigeKnop;
  let volgendeKnop;
  let kleinerKnop;
  let groterKnop;
  let markering = null;

  vlak.addEventListener('keydown', (event) => {
    if (event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    if (!bron) return;
    const volgendeIndex = paginaIndex + (event.key === 'ArrowRight' ? 1 : -1);
    if (volgendeIndex < 0 || volgendeIndex >= bron.bladen.length) return;
    verwijderMarkering();
    paginaIndex = volgendeIndex;
    toonPagina();
  });

  function verwijderMarkering() {
    markering?.remove();
    markering = null;
  }

  function toonPagina() {
    const blad = bron.bladen[paginaIndex];
    const nummer = blad ? paginaIndex + 1 : 0;
    paginTekst.textContent = `Pagina ${nummer} van ${bron.bladen.length}`;
    papier.style.width = `${zoom}%`;
    afbeelding.setAttribute('alt', `Pagina ${nummer} van het origineel`);
    if (blad) {
      afbeelding.setAttribute(
        'src',
        `/api/herken/${encodeURIComponent(bron.herkenning)}/blad/${blad.nummer}`,
      );
    } else {
      afbeelding.removeAttribute('src');
    }
    vorigeKnop.disabled = paginaIndex <= 0;
    volgendeKnop.disabled = paginaIndex >= bron.bladen.length - 1;
    kleinerKnop.disabled = zoom <= 100;
    groterKnop.disabled = zoom >= 400;
  }

  function maakVlak() {
    const kop = document.createElement('h2');
    kop.textContent = 'Origineel';

    const knoppen = document.createElement('div');
    knoppen.className = 'origineel__knoppen';

    vorigeKnop = document.createElement('button');
    vorigeKnop.type = 'button';
    vorigeKnop.className = 'knop';
    vorigeKnop.textContent = 'Vorige';
    vorigeKnop.addEventListener('click', () => {
      if (paginaIndex > 0) {
        verwijderMarkering();
        paginaIndex -= 1;
        toonPagina();
      }
    });

    volgendeKnop = document.createElement('button');
    volgendeKnop.type = 'button';
    volgendeKnop.className = 'knop';
    volgendeKnop.textContent = 'Volgende';
    volgendeKnop.addEventListener('click', () => {
      if (paginaIndex < bron.bladen.length - 1) {
        verwijderMarkering();
        paginaIndex += 1;
        toonPagina();
      }
    });

    kleinerKnop = document.createElement('button');
    kleinerKnop.type = 'button';
    kleinerKnop.className = 'knop';
    kleinerKnop.textContent = 'Kleiner';
    kleinerKnop.addEventListener('click', () => {
      zoom = Math.max(100, zoom - 25);
      toonPagina();
    });

    groterKnop = document.createElement('button');
    groterKnop.type = 'button';
    groterKnop.className = 'knop';
    groterKnop.textContent = 'Groter';
    groterKnop.addEventListener('click', () => {
      zoom = Math.min(400, zoom + 25);
      toonPagina();
    });

    paginTekst = document.createElement('span');
    knoppen.append(vorigeKnop, volgendeKnop, kleinerKnop, groterKnop, paginTekst);

    const bladVlak = document.createElement('div');
    bladVlak.className = 'origineel__blad';
    papier = document.createElement('div');
    papier.className = 'origineel__papier';
    afbeelding = document.createElement('img');
    papier.append(afbeelding);
    bladVlak.append(papier);
    vlak.replaceChildren(kop, knoppen, bladVlak);
  }

  function gaNaarBlad(nummer, metMarkering = false, plek = null) {
    const index = bron.bladen.findIndex((blad) => blad.nummer === nummer);
    if (index < 0) {
      verwijderMarkering();
      return;
    }
    if (index !== paginaIndex) verwijderMarkering();
    paginaIndex = index;
    toonPagina();

    if (!metMarkering || !plek) {
      verwijderMarkering();
      papier.scrollIntoView({ block: 'center', inline: 'center' });
      return;
    }

    verwijderMarkering();
    const blad = bron.bladen[index];
    markering = document.createElement('div');
    markering.className = 'origineel__plek';
    markering.style.left = `${Math.max(0, (plek.x / blad.breedte) * 100 - 1)}%`;
    markering.style.top = `${Math.max(0, (plek.y / blad.hoogte) * 100 - 1)}%`;
    markering.style.width = `${Math.min(100, (plek.breedte / blad.breedte) * 100 + 2)}%`;
    markering.style.height = `${Math.min(100, (plek.hoogte / blad.hoogte) * 100 + 2)}%`;
    papier.append(markering);
    markering.scrollIntoView({ block: 'center', inline: 'center' });
  }

  function toonPartituur(partituur) {
    if (!partituur?.bron) {
      werkvlak.classList.remove('met-origineel');
      vlak.replaceChildren();
      bron = null;
      bronBekend = false;
      verwijderMarkering();
      papier = null;
      afbeelding = null;
      paginTekst = null;
      vorigeKnop = null;
      volgendeKnop = null;
      kleinerKnop = null;
      groterKnop = null;
      zoom = 100;
      return;
    }

    const nieuweBron = partituur.bron;
    const huidigBlad = bron?.bladen[paginaIndex]?.nummer;
    const zelfdeHerkenning = bronBekend && bron.herkenning === nieuweBron.herkenning;
    bron = nieuweBron;
    bronBekend = true;
    if (zelfdeHerkenning && huidigBlad !== undefined) {
      const index = bron.bladen.findIndex((blad) => blad.nummer === huidigBlad);
      paginaIndex = index >= 0 ? index : 0;
      if (index < 0) verwijderMarkering();
    } else {
      paginaIndex = 0;
      zoom = 100;
      verwijderMarkering();
    }

    werkvlak.classList.add('met-origineel');
    if (!papier) maakVlak();
    toonPagina();
  }

  app.op('partituur', toonPartituur);
  app.op('kies-noot', ({ id }) => {
    if (id === null) {
      verwijderMarkering();
      return;
    }
    if (!app.stand.partituur) {
      verwijderMarkering();
      return;
    }
    const element = zoekElement(app.stand.partituur, id);
    if (!element?.plek) {
      verwijderMarkering();
      return;
    }
    gaNaarBlad(element.plek.blad, true, element.plek);
  });
  app.op('naar-maat', ({ partij, maat }) => {
    const partituur = app.stand.partituur;
    if (!partituur?.bron) return;
    const gekozenPartij = partij === null
      ? partituur.partijen[0]
      : partituur.partijen.find((item) => item.id === partij);
    const element = gekozenPartij?.maten[maat]?.elementen.find((item) => item.plek);
    if (element?.plek) gaNaarBlad(element.plek.blad);
    else verwijderMarkering();
  });

  toonPartituur(app.stand.partituur);
}
