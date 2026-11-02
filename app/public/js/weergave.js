// Notatie tekenen met Verovio in #weergave.
// Tekent opnieuw bij een nieuwe partituur (via naarMusicXML uit /src/musicxml/schrijven.mjs) of bij app.meld('musicxml', tekst).
// Luistert naar 'naar-maat' ({ maat }: markeert en toont die maat) en 'speel-maat' ({ maat } of null: de maat die nu klinkt).
const schaalVoor = (breedte) => (breedte < 500 ? 70 : breedte <= 1200 ? 60 : 75); // op een telefoon zijn de noten anders te klein.
const SVG_NS = 'http://www.w3.org/2000/svg';

let toolkitBelofte = null;

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

async function naarMusicXML(partituur) {
  const { naarMusicXML: omzetten } = await import('/src/musicxml/schrijven.mjs');
  return omzetten(partituur, { weergave: true });
}

export function start(app) {
  const vlak = document.getElementById('weergave');
  let huidige = null; // de laatst aangevraagde MusicXML
  let laatstGetekend = null;
  let tekenNummer = 0;
  let tekenTimer = null;
  let eersteTekeningGestart = false;
  let gekozen = null;
  let gekozenMaat = null;
  let zoom = 1;
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
    const vasteRegels = window.innerWidth >= 700 && musicxml.includes('new-system=');
    const schaal = vasteRegels ? Math.min(100, Math.max(35, Math.round(breedte * 100 / 2400 * zoom))) : Math.round(schaalVoor(breedte) * zoom);
    const paginaBreedte = vasteRegels ? 2400 : Math.round((breedte * 100) / schaal);
    tk.setOptions({
      scale: schaal,
      pageWidth: paginaBreedte,
      adjustPageHeight: true,
      breaks: vasteRegels ? 'encoded' : 'auto',
      footer: 'none',
      header: 'none',
      font: 'Leland',
      pageMarginLeft: 60,
      pageMarginRight: 60,
      pageMarginTop: 40,
      spacingStaff: 12,
      spacingSystem: 14,
      justifyVertically: false,
    });
    if (!tk.loadData(musicxml)) return status('Deze partituur kon niet worden getekend.');
    const blad = document.createElement('div');
    blad.className = 'bladmuziek';
    if (vasteRegels) blad.style.overflowX = 'auto';
    const gegevens = app.stand?.partituur ?? {};
    const titel = typeof gegevens.titel === 'string' ? gegevens.titel.trim() : '';
    const ondertitel = typeof gegevens.ondertitel === 'string' ? gegevens.ondertitel.trim() : '';
    const partijnaam = typeof gegevens.partijen?.[0]?.naam === 'string' ? gegevens.partijen[0].naam.trim() : '';
    const componist = typeof gegevens.componist === 'string' ? gegevens.componist.trim() : '';
    if (titel || ondertitel || partijnaam || componist) {
      const titelblok = document.createElement('header');
      titelblok.className = 'bladmuziek__titelblok';
      if (titel) {
        const kop = document.createElement('h1');
        kop.textContent = titel;
        titelblok.append(kop);
      }
      if (ondertitel) {
        const kop = document.createElement('p');
        kop.className = 'bladmuziek__ondertitel';
        kop.textContent = ondertitel;
        titelblok.append(kop);
      }
      if (partijnaam || componist) {
        const details = document.createElement('div');
        details.className = 'bladmuziek__details';
        if (partijnaam) {
          const partij = document.createElement('span');
          partij.textContent = partijnaam;
          details.append(partij);
        }
        if (componist) {
          const maker = document.createElement('span');
          maker.textContent = componist;
          details.append(maker);
        }
        titelblok.append(details);
      }
      blad.append(titelblok);
    }
    const knoppen = document.createElement('div');
    knoppen.className = 'origineel__knoppen';
    for (const [label, aanpassen] of [
      ['Kleiner', () => { zoom = Math.round(Math.max(0.6, zoom - 0.2) * 10) / 10; }],
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
    blad.append(knoppen);
    for (let pagina = 1; pagina <= tk.getPageCount(); pagina++) {
      const svg = new DOMParser().parseFromString(tk.renderToSVG(pagina), 'image/svg+xml').documentElement;
      svg.classList.add('bladmuziek__pagina');
      svg.style.width = vasteRegels ? '100%' : `${Math.round((paginaBreedte * schaal) / 100)}px`;
      blad.append(document.importNode(svg, true));
    }
    vlak.replaceChildren(blad);
    laatstGetekend = musicxml;
    markeerGekozen(false);
    markeerVerschil();
    markeerMaat(gekozenMaat);
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
    app.meld('kies-noot', { id: null });
    app.meld('kies-maat', { maat: maat?.index ?? null });
  });

  // De maten in volgorde; Verovio tekent elke maat als <g class="measure">, over alle partijen heen.
  const maten = () => [...vlak.querySelectorAll('g.measure')];

  function markeerMaat(index) {
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
    try {
      await teken(await naarMusicXML(partituur), { meteen: true });
    } catch (fout) {
      console.error(fout);
      status('De partituur kon niet worden omgezet om te tekenen.');
    }
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
    markeerMaat(gekozenMaat);
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
