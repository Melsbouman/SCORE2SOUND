// Notatie tekenen met Verovio in #weergave.
// Tekent opnieuw bij een nieuwe partituur (via naarMusicXML uit /src/musicxml/schrijven.mjs) of bij app.meld('musicxml', tekst).
// Luistert naar 'naar-maat' ({ maat }: markeert en toont die maat) en 'speel-maat' ({ maat } of null: de maat die nu klinkt).
import { zetTitelgegevens } from '../../src/model/titelgegevens.mjs';

const VASTE_PAGINABREEDTE = 2100;
const schaalVoor = (breedte) => (breedte < 500 ? 70 : breedte <= 1200 ? 60 : 75); // op een telefoon zijn de noten anders te klein.
const SVG_NS = 'http://www.w3.org/2000/svg';

let toolkitBelofte = null;

export function vasteSchaal(breedte, zoom) {
  return Math.min(140, Math.max(35, Math.round(breedte * 100 / VASTE_PAGINABREEDTE * zoom)));
}

// Verovio is groot (WebAssembly); hij wordt pas geladen als er iets te tekenen is.
function toolkit() {
  toolkitBelofte ??= (async () => {
    const [{ default: maakModule }, { VerovioToolkit }] = await Promise.all([
      import('/vendor/verovio/verovio-module.mjs'),
      import('/vendor/verovio/verovio.mjs'),
    ]);
    return new VerovioToolkit(await maakModule());
  })();
  return toolkitBelofte;
}

async function naarMusicXML(partituur, app) {
  const { naarMusicXML: omzetten } = await import('/src/musicxml/schrijven.mjs');
  return omzetten(partituur, { weergave: true, verberg: app.stand.verborgen ?? [] });
}

export function start(app) {
  const BEGINZOOM = window.innerWidth < 700 ? 0.5 : 0.8;
  document.addEventListener('keydown', (gebeurtenis) => {
    const doel = gebeurtenis.target;
    if (
      app.stand.partituur === null ||
      doel?.closest?.('input, select, textarea, [contenteditable]') ||
      (!gebeurtenis.ctrlKey && !gebeurtenis.metaKey)
    ) {
      return;
    }

    if (['+', '=', 'Add'].includes(gebeurtenis.key)) {
      gebeurtenis.preventDefault();
      wijzigZoom(0.1);
    } else if (['-', 'Subtract'].includes(gebeurtenis.key)) {
      gebeurtenis.preventDefault();
      wijzigZoom(-0.1);
    } else if (gebeurtenis.key === '0') {
      gebeurtenis.preventDefault();
      zoom = BEGINZOOM;
      localStorage.setItem('score2sound-zoom', String(zoom));
      teken(huidige, { meteen: true, opnieuw: true });
    }
  });
const vlak = document.getElementById('weergave');

  function zetZoom(waarde) {
    zoom = waarde;
    localStorage.setItem('score2sound-zoom', String(zoom));
    teken(huidige, { meteen: true, opnieuw: true });
  }

  function wijzigZoom(stap) {
    zetZoom(Math.min(2, Math.max(0.3, Math.round((zoom + stap) * 10) / 10)));
  }

  function voegZoombalkToe() {
    if (vlak.querySelector('.zoombalk')) return;
    const titelblok = vlak.firstElementChild;
    if (!titelblok) return;
    const zoombalk = document.createElement('div');
    zoombalk.className = 'zoombalk';
    const kleiner = document.createElement('button');
    kleiner.type = 'button';
    kleiner.className = 'knop';
    kleiner.textContent = '−';
    kleiner.setAttribute('aria-label', 'Stuk kleiner');
    kleiner.addEventListener('click', () => wijzigZoom(-0.1));
    const percentage = document.createElement('button');
    percentage.type = 'button';
    percentage.className = 'knop';
percentage.textContent = Math.round((zoom / BEGINZOOM) * 100) + '%';
    percentage.setAttribute('aria-label', 'Zoom terugzetten');
    percentage.addEventListener('click', () => wijzigZoom(BEGINZOOM - zoom));
    const groter = document.createElement('button');
    groter.type = 'button';
    groter.className = 'knop';
    groter.textContent = '+';
    groter.setAttribute('aria-label', 'Stuk groter');
    groter.addEventListener('click', () => wijzigZoom(0.1));
    zoombalk.append(kleiner, percentage, groter);
    titelblok.after(zoombalk);
  }

  vlak.addEventListener('wheel', (gebeurtenis) => {
    if (!gebeurtenis.ctrlKey) return;
    gebeurtenis.preventDefault();
    if (gebeurtenis.deltaY !== 0) wijzigZoom(gebeurtenis.deltaY < 0 ? 0.1 : -0.1);
  }, { passive: false });

  let beginAfstand;
  let beginZoom;

  vlak.addEventListener('touchstart', (event) => {
    if (event.touches.length !== 2) return;
    beginAfstand = Math.hypot(
      event.touches[1].clientX - event.touches[0].clientX,
      event.touches[1].clientY - event.touches[0].clientY,
    );
    beginZoom = zoom;
  });

  vlak.addEventListener('touchmove', (event) => {
    if (event.touches.length !== 2 || beginAfstand === undefined) return;
    event.preventDefault();
    const afstand = Math.hypot(
      event.touches[1].clientX - event.touches[0].clientX,
      event.touches[1].clientY - event.touches[0].clientY,
    );
    const nieuweZoom = Math.min(2, Math.max(0.3,
      Math.round(beginZoom * afstand / beginAfstand * 10) / 10));
    if (nieuweZoom !== zoom) zetZoom(nieuweZoom);
  }, { passive: false });

  vlak.addEventListener('touchend', (event) => {
    if (event.touches.length < 2) beginAfstand = undefined;
  });

  new MutationObserver(voegZoombalkToe).observe(vlak, { childList: true });
  voegZoombalkToe();
  let huidige = null; // de laatst aangevraagde MusicXML
  let laatstGetekend = null;
  let tekenNummer = 0;
  let tekenTimer = null;
  let eersteTekeningGestart = false;
  let gekozen = null;
  let gekozenMaat = null;
  let gekozenTot = null;
  let zoom = BEGINZOOM;
  try {
    const opgeslagenZoom = Number(localStorage.getItem('score2sound-zoom'));
    if (opgeslagenZoom >= 0.3 && opgeslagenZoom <= 2) zoom = opgeslagenZoom;
  } catch {}
  document.addEventListener('click', (gebeurtenis) => {
    if (gebeurtenis.target.textContent.trim() !== 'Kleiner') return;
    try {
      localStorage.setItem('score2sound-zoom', String(zoom));
    } catch {}
  });
  document.addEventListener('click', (gebeurtenis) => {
    if (gebeurtenis.target.textContent.trim() !== 'Groter') return;
    try {
      localStorage.setItem('score2sound-zoom', String(zoom));
    } catch {}
  });
  let verschil = []; // maten die anders zijn dan in de gekozen versie

  function status(tekst) {
    vlak.replaceChildren();
    const p = document.createElement('p');
    p.className = 'zacht';
    p.setAttribute('role', 'status');
    p.textContent = tekst;
    vlak.append(p);
  }

  function teken(musicxml, { meteen = false, opnieuw = false } = {}) {
    huidige = musicxml;
    clearTimeout(tekenTimer);
    tekenTimer = null;
    tekenNummer++;
    if (!opnieuw && musicxml === laatstGetekend) {
      return;
    }
    if (meteen || !eersteTekeningGestart) {
      eersteTekeningGestart = true;
      return tekenNu(musicxml);
    }
    tekenTimer = setTimeout(() => {
      tekenTimer = null;
      tekenNu(musicxml);
    }, 120);
  }

  async function tekenNu(musicxml) {
    const nummer = ++tekenNummer;
    if (!vlak.querySelector('.bladmuziek')) status('De partituur wordt getekend…');
    let tk;
    try {
      tk = await toolkit();
    } catch (fout) {
      console.error(fout);
      return status('De notatie kon niet worden geladen. Herlaad de pagina en probeer het opnieuw.');
    }
    if (nummer !== tekenNummer) return; // er kwam intussen een nieuwere partituur
    const breedte = Math.max(320, vlak.clientWidth - 48);
    const pdfVorm = true; // Mels, 4 november 2026: dezelfde staande A4-pagina's als de pdf
    const vasteRegels = false; // Mels, 3 november 2026: regels gelijkmatig vullen in plaats van de afbrekingen van het origineel
    const schaal = pdfVorm ? 40 : vasteRegels ? vasteSchaal(breedte, zoom) : Math.round(schaalVoor(breedte) * zoom);
    const paginaBreedte = pdfVorm ? 2100 : vasteRegels ? VASTE_PAGINABREEDTE : Math.round((breedte * 100) / schaal);
    const paginaPixels = pdfVorm ? Math.round(Math.min(breedte, 794) * (zoom / BEGINZOOM)) : Math.round((paginaBreedte * schaal) / 100);
    const gegevens = app.stand?.partituur ?? {};
    const bladbron = gegevens.bron?.bladen?.[0];
    const heeftPaginabegin = gegevens.partijen?.some((partij) => partij.maten?.some((maat) => maat.paginabegin)) ?? false;
    const heeftPaginavorm = false; // Mels, 3 november 2026: regels automatisch afbreken en gelijkmatig vullen
    tk.setOptions({
      scale: schaal,
      pageWidth: paginaBreedte,
      ...(pdfVorm ? { pageHeight: 2970, adjustPageHeight: false } : heeftPaginavorm ? {
        pageHeight: Math.round(paginaBreedte * bladbron.hoogte / bladbron.breedte),
        adjustPageHeight: false,
      } : { adjustPageHeight: true }),
      breaks: !pdfVorm && (vasteRegels || heeftPaginavorm) ? 'encoded' : 'auto',
      footer: 'none',
      header: 'none',
      ...(pdfVorm ? {} : { font: 'Leland', pageMarginLeft: 60, pageMarginRight: 60, pageMarginTop: 60 }),
      spacingStaff: 10,
      spacingSystem: 12,
      spacingLinear: 0.25,
      spacingNonLinear: 0.6,
      minLastJustification: 0,
      justifyVertically: false,
    });
    if (!tk.loadData(musicxml)) return status('Deze partituur kon niet worden getekend.');
    const blad = document.createElement('div');
    blad.className = 'bladmuziek';
    if (vasteRegels) blad.style.overflowX = 'auto';
    const titel = typeof gegevens.titel === 'string' ? gegevens.titel.trim() : '';
    const ondertitel = typeof gegevens.ondertitel === 'string' ? gegevens.ondertitel.trim() : '';
    const partijnaam = typeof gegevens.partijen?.[0]?.naam === 'string' ? gegevens.partijen[0].naam.trim() : '';
    const componist = typeof gegevens.componist === 'string' ? gegevens.componist.trim() : '';
    const arrangeur = typeof gegevens.arrangeur === 'string' ? gegevens.arrangeur.trim() : '';
    if (titel || ondertitel || partijnaam || componist || arrangeur) {
      const titelblok = document.createElement('header');
      titelblok.className = 'bladmuziek__titelblok';
      if (titel) {
        const kop = document.createElement('h1');
        kop.textContent = titel;
        maakAanpasbaar(kop, 'titel');
        titelblok.append(kop);
      }
      if (ondertitel) {
        const kop = document.createElement('p');
        kop.className = 'bladmuziek__ondertitel';
        kop.textContent = ondertitel;
        titelblok.append(kop);
      }
      if (partijnaam || componist || arrangeur) {
        const { partijTitel } = await import('/src/model/stemming.mjs');
        const details = document.createElement('div');
        details.className = 'bladmuziek__details';
        if (gegevens.partijen.length === 1) {
          const partij = document.createElement('span');
          partij.textContent = partijTitel(gegevens.partijen[0]);
          details.append(partij);
        }
        const maker = document.createElement('div');
        maker.className = 'bladmuziek__maker';
        if (componist) {
          const componistNaam = document.createElement('span');
          componistNaam.textContent = componist;
          maakAanpasbaar(componistNaam, 'componist');
          maker.append(componistNaam);
        }
        if (arrangeur) {
          const arrangeurRegel = document.createElement('div');
          const label = document.createElement('span');
          label.textContent = 'arr. ';
          const bewerker = document.createElement('span');
          bewerker.textContent = arrangeur;
          maakAanpasbaar(bewerker, 'arrangeur');
          arrangeurRegel.append(label, bewerker);
          maker.append(arrangeurRegel);
        }
        details.append(maker);
        titelblok.append(details);
      }
      blad.append(titelblok);
    }
    const knoppen = document.createElement('div');
    knoppen.className = 'origineel__knoppen';
    for (const [label, aanpassen] of [
      ['Kleiner', () => { zoom = Math.round(Math.max(0.3, zoom - 0.2) * 10) / 10; }],
      ['Groter', () => { zoom = Math.round(Math.min(2, zoom + 0.2) * 10) / 10; }],
    ]) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'knop';
      knop.textContent = label;
      knop.addEventListener('click', () => {
        aanpassen();
        teken(huidige, { meteen: true, opnieuw: true });
      });
      knoppen.append(knop);
    }
    const zoomVlak = document.getElementById('zoom');
    if (zoomVlak) {
      zoomVlak.className = 'zoom';
      zoomVlak.replaceChildren(knoppen);
    } else {
      blad.append(knoppen);
    }
    for (let pagina = 1; pagina <= tk.getPageCount(); pagina++) {
      const svg = new DOMParser().parseFromString(tk.renderToSVG(pagina), 'image/svg+xml').documentElement;
    svg.classList.add('bladmuziek__pagina');
    svg.setAttribute('aria-label', `Pagina ${pagina}`);
    const paginanummer = document.createElement('p');
    paginanummer.className = 'bladmuziek__paginanr';
    paginanummer.textContent = `pagina ${pagina} van ${tk.getPageCount()}`;
      svg.style.width = vasteRegels ? '100%' : `${paginaPixels}px`;
      blad.append(document.importNode(svg, true), paginanummer);
    }
    if (typeof gegevens.colofon === 'string' && gegevens.colofon.length > 0) {
      const colofon = document.createElement('p');
      colofon.className = 'bladmuziek__colofon';
      colofon.textContent = gegevens.colofon;
      blad.append(colofon);
    }
    vlak.replaceChildren(blad);
    laatstGetekend = musicxml;
    markeerGekozen(false);
    markeerVerschil();
    markeerMaat(gekozenMaat, gekozenTot);
  }

  function maakAanpasbaar(element, veldnaam) {
    element.tabIndex = 0;
    element.setAttribute('role', 'button');
    element.setAttribute('aria-label', 'Titel aanpassen');
    element.classList.add('bladmuziek__aanpasbaar');
    element.addEventListener('click', (gebeurtenis) => {
      gebeurtenis.stopPropagation();
      pasTitelgegevenAan(element, veldnaam);
    });
    element.addEventListener('keydown', (gebeurtenis) => {
      if (gebeurtenis.key !== 'Enter') return;
      gebeurtenis.preventDefault();
      gebeurtenis.stopPropagation();
      pasTitelgegevenAan(element, veldnaam);
    });
  }

  function pasTitelgegevenAan(element, veldnaam) {
    const oud = element.textContent;
    const invoer = document.createElement('input');
    invoer.type = 'text';
    invoer.className = 'bladmuziek__titel-invoer';
    invoer.setAttribute('aria-label', 'Titel aanpassen');
    invoer.value = oud;
    invoer.size = Math.max(1, oud.length);
    let afgerond = false;

    function herstel() {
      if (afgerond) return;
      afgerond = true;
      invoer.replaceWith(element);
      element.focus();
    }

    function bewaar() {
      if (afgerond) return;
      afgerond = true;
      const waarde = invoer.value;
      element.textContent = waarde;
      invoer.replaceWith(element);
      if (waarde === oud) return;
      const nieuw = zetTitelgegevens(app.stand.partituur, { [veldnaam]: waarde });
      app.zet({ partituur: nieuw });
    }

    invoer.addEventListener('click', (gebeurtenis) => gebeurtenis.stopPropagation());
    invoer.addEventListener('keydown', (gebeurtenis) => {
      gebeurtenis.stopPropagation();
      if (gebeurtenis.key === 'Enter') {
        gebeurtenis.preventDefault();
        bewaar();
      } else if (gebeurtenis.key === 'Escape') {
        gebeurtenis.preventDefault();
        herstel();
      }
    });
    invoer.addEventListener('blur', bewaar);
    element.replaceWith(invoer);
    invoer.focus();
    invoer.select();
  }

  function markeerGekozen(tonen) {
    for (const element of vlak.querySelectorAll('.gekozen')) element.classList.remove('gekozen');
    if (!gekozen) return;
    const element = vlak.querySelector(`[id="${gekozen}"]`);
    if (!element) return;
    element.classList.add('gekozen');
    if (tonen) element.scrollIntoView({ block: 'center', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  vlak.addEventListener('click', (gebeurtenis) => {
    const kandidaten = [...vlak.querySelectorAll('g.note[id^="n-"], g.rest[id^="n-"], g.mRest[id^="n-"]')]
      .map((element) => {
        const kader = element.getBoundingClientRect();
        const binnen = gebeurtenis.clientX >= kader.left - 14
          && gebeurtenis.clientX <= kader.right + 14
          && gebeurtenis.clientY >= kader.top - 14
          && gebeurtenis.clientY <= kader.bottom + 14;
        const dx = gebeurtenis.clientX - (kader.left + kader.right) / 2;
        const dy = gebeurtenis.clientY - (kader.top + kader.bottom) / 2;
        return { id: element.id, binnen, afstand: dx * dx + dy * dy };
      })
      .filter((kandidaat) => kandidaat.binnen)
      .sort((a, b) => a.afstand - b.afstand);
    if (kandidaten.length) {
      app.meld('kies-noot', { id: kandidaten[0].id });
      return;
    }

    const x = gebeurtenis.clientX;
    const y = gebeurtenis.clientY;
    const maat = maten()
      .map((element, index) => {
        const kader = element.getBoundingClientRect();
        return {
          index,
          binnen: x >= kader.left && x <= kader.right && y >= kader.top && y <= kader.bottom,
          oppervlakte: kader.width * kader.height,
        };
      })
      .filter((kandidaat) => kandidaat.binnen)
      .sort((a, b) => a.oppervlakte - b.oppervlakte)[0];
    if (gebeurtenis.shiftKey && gekozenMaat !== null && maat?.index !== undefined) {
      const van = Math.min(gekozenMaat, maat.index);
      const tot = Math.max(gekozenMaat, maat.index);
      app.meld('kies-noot', { id: null });
      app.meld('kies-maat', van === tot ? { maat: van } : { maat: van, tot });
      return;
    }
    app.meld('kies-noot', { id: null });
    app.meld('kies-maat', { maat: maat?.index ?? null });
  });

  // De maten in volgorde; Verovio tekent elke maat als <g class="measure">, over alle partijen heen.
  const maten = () => [...vlak.querySelectorAll('g.measure')];

  function markeerMaat(index, tot) {
    if (tot !== undefined && tot !== null) {
      const markeringen = [];
      for (let maatIndex = index; maatIndex <= tot; maatIndex += 1) {
        markeerMaat(maatIndex);
        const markering = vlak.querySelector('rect.maat-markering');
        if (markering) {
          markeringen.push({ ouder: markering.parentNode, markering: markering.cloneNode(true) });
        }
      }
      vlak.querySelectorAll('rect.maat-markering').forEach((markering) => markering.remove());
      for (const item of markeringen) item.ouder.append(item.markering);
      return;
    }
    for (const rect of vlak.querySelectorAll('rect.maat-markering')) rect.remove();
    if (index === null || index === undefined) return;
    const g = maten()[index];
    if (!g) return;
    const kader = g.getBBox();
    const rect = document.createElementNS(SVG_NS, 'rect');
    rect.setAttribute('class', 'maat-markering');
    rect.setAttribute('x', String(kader.x));
    rect.setAttribute('y', String(kader.y));
    rect.setAttribute('width', String(kader.width));
    rect.setAttribute('height', String(kader.height));
    rect.setAttribute('pointer-events', 'none');
    g.prepend(rect);
  }

  function markeer(index, klasse, tonen) {
    for (const g of vlak.querySelectorAll(`g.measure.${klasse}`)) g.classList.remove(klasse);
    if (index === null || index === undefined) return;
    const g = maten()[index];
    if (!g) return;
    g.classList.add(klasse);
    if (tonen) g.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }

  function markeerVerschil() {
    for (const g of vlak.querySelectorAll('g.measure.verschilt')) g.classList.remove('verschilt');
    for (const index of verschil) maten()[index]?.classList.add('verschilt');
  }

  async function tekenPartituur(partituur) {
    try {
      await teken(await naarMusicXML(partituur, app), { meteen: true });
    } catch (fout) {
      console.error(fout);
      status('De partituur kon niet worden omgezet om te tekenen.');
    }
  }

  app.op('partituur', async (partituur) => {
    if (!partituur) {
      huidige = null;
      laatstGetekend = null;
      eersteTekeningGestart = false;
      clearTimeout(tekenTimer);
      tekenTimer = null;
      tekenNummer++;
      gekozenMaat = null;
      return vlak.replaceChildren();
    }
    gekozenMaat = null;
    await tekenPartituur(partituur);
  });
  app.op('verborgen', () => {
    if (app.stand.partituur) return tekenPartituur(app.stand.partituur);
  });
  app.op('musicxml', (tekst) => teken(tekst));
  app.op('naar-maat', (doel) => markeer(doel?.maat, 'gemarkeerd', true));
  app.op('verschil-maten', ({ maten: lijst }) => {
    verschil = lijst;
    markeerVerschil();
  });
  app.op('speel-maat', (doel) => markeer(doel?.maat ?? null, 'speelt', false));
  app.op('kies-noot', (keuze) => {
    gekozen = keuze?.id ?? null;
    markeerGekozen(true);
  });
  app.op('kies-maat', (keuze) => {
    gekozenMaat = keuze?.maat ?? null;
    gekozenTot = keuze?.tot ?? null;
    markeerMaat(gekozenMaat, gekozenTot);
  });

  // Opnieuw tekenen als de breedte echt verandert, zodat de regels passen.
  let vorigeBreedte = vlak.clientWidth;
  let wacht = null;
  new ResizeObserver(() => {
    if (!huidige || Math.abs(vlak.clientWidth - vorigeBreedte) < 40) return;
    vorigeBreedte = vlak.clientWidth;
    clearTimeout(wacht);
    wacht = setTimeout(() => teken(huidige, { meteen: true, opnieuw: true }), 250);
  }).observe(vlak);
}
