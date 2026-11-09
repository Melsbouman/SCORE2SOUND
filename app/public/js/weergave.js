// Notatie tekenen met Verovio in #weergave.
// Tekent opnieuw bij een nieuwe partituur (via naarMusicXML uit /src/musicxml/schrijven.mjs) of bij app.meld('musicxml', tekst).
// Luistert naar 'naar-maat' ({ maat }: markeert en toont die maat) en 'speel-maat' ({ maat } of null: de maat die nu klinkt).
import { zetTitelgegevens } from '../../src/model/titelgegevens.mjs';
import { kiesBladindeling } from '../../src/export/bladverdeling.mjs';

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

async function naarMusicXML(partituur, verberg, metAccolade) {
  const { naarMusicXML: omzetten } = await import('/src/musicxml/schrijven.mjs');
  const musicxml = omzetten(partituur, { weergave: true, verberg });
  if (!metAccolade) return musicxml;
  return musicxml
    .replace('<part-list>', '<part-list><part-group type="start"><group-symbol>brace</group-symbol><group-barline>yes</group-barline></part-group>')
    .replace('</part-list>', '<part-group type="stop"/></part-list>');
}

function aantalNotenbalken(partij) {
  const sleutels = partij.maten?.[0]?.sleutels ?? [];
  return Math.max(1, ...sleutels.map((sleutel) => sleutel.notenbalk || 1));
}

export function start(app) {
  const BEGINZOOM = 1;
  const vlak = document.getElementById('weergave-notatie');
  const soortKeuze = document.getElementById('weergave-soort');
  const partijKeuze = document.getElementById('weergave-partij');
  const uitzoomen = document.getElementById('weergave-uitzoomen');
  const inzoomen = document.getElementById('weergave-inzoomen');
  let zoom = BEGINZOOM;
  try {
    const opgeslagenZoom = Number(sessionStorage.getItem('score2sound-zoom'));
    if (opgeslagenZoom >= 0.4 && opgeslagenZoom <= 1.6) zoom = opgeslagenZoom;
  } catch {}

  document.addEventListener('keydown', (gebeurtenis) => {
    const doel = gebeurtenis.target;
    if (
      app.stand.partituur === null ||
      !doel?.closest?.('#weergave') ||
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
      zetZoom(BEGINZOOM);
    }
  });
  try {
    soortKeuze.value = sessionStorage.getItem('score2sound-weergave-soort') === 'partij' ? 'partij' : 'partituur';
  } catch {}

  function vulPartijen(partituur) {
    const opgeslagen = (() => {
      try { return sessionStorage.getItem('score2sound-weergave-partij'); } catch { return null; }
    })();
    const gekozenId = partituur.partijen.some((partij) => partij.id === partijKeuze.value)
      ? partijKeuze.value
      : partituur.partijen.some((partij) => partij.id === opgeslagen) ? opgeslagen : partituur.partijen[0]?.id;
    partijKeuze.replaceChildren(...partituur.partijen.map((partij) => {
      const optie = document.createElement('option');
      optie.value = partij.id;
      optie.textContent = partij.naam || partij.id;
      return optie;
    }));
    partijKeuze.value = gekozenId ?? '';
    partijKeuze.disabled = soortKeuze.value !== 'partij';
  }

  soortKeuze.addEventListener('change', () => {
    partijKeuze.disabled = soortKeuze.value !== 'partij';
    try { sessionStorage.setItem('score2sound-weergave-soort', soortKeuze.value); } catch {}
    if (app.stand.partituur) tekenPartituur(app.stand.partituur);
  });
  partijKeuze.addEventListener('change', () => {
    try { sessionStorage.setItem('score2sound-weergave-partij', partijKeuze.value); } catch {}
    if (app.stand.partituur) tekenPartituur(app.stand.partituur);
  });

  function zetZoom(waarde) {
    zoom = waarde;
    uitzoomen.disabled = zoom <= 0.4;
    inzoomen.disabled = zoom >= 1.6;
    try { sessionStorage.setItem('score2sound-zoom', String(zoom)); } catch {}
    teken(huidige, { meteen: true, opnieuw: true });
  }

  function wijzigZoom(stap) {
    zetZoom(Math.min(1.6, Math.max(0.4, Math.round((zoom + stap) * 10) / 10)));
  }

  uitzoomen.addEventListener('click', () => wijzigZoom(-0.1));
  inzoomen.addEventListener('click', () => wijzigZoom(0.1));
  uitzoomen.disabled = zoom <= 0.4;
  inzoomen.disabled = zoom >= 1.6;

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
    const nieuweZoom = Math.min(1.6, Math.max(0.4,
      Math.round(beginZoom * afstand / beginAfstand * 10) / 10));
    if (nieuweZoom !== zoom) zetZoom(nieuweZoom);
  }, { passive: false });

  vlak.addEventListener('touchend', (event) => {
    if (event.touches.length < 2) beginAfstand = undefined;
  });

  let huidige = null; // de laatst aangevraagde MusicXML
  let laatstGetekend = null;
  let tekenNummer = 0;
  let tekenTimer = null;
  let eersteTekeningGestart = false;
  let gekozen = null;
  let gekozenMaat = null;
  let gekozenTot = null;
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
    const basisschaal = pdfVorm ? 40 : vasteRegels ? vasteSchaal(breedte, zoom) : Math.round(schaalVoor(breedte) * zoom);
    const bronnen = Array.isArray(musicxml) ? musicxml : [{ musicxml }];
    const gegevens = app.stand?.partituur ?? {};
    const bladbron = gegevens.bron?.bladen?.[0];
    const heeftPaginabegin = gegevens.partijen?.some((partij) => partij.maten?.some((maat) => maat.paginabegin)) ?? false;
    const heeftPaginavorm = false; // Mels, 3 november 2026: regels automatisch afbreken en gelijkmatig vullen
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
    for (const bron of bronnen) {
      const schaal = pdfVorm
        ? Math.max(1, Math.min(basisschaal, Math.floor(basisschaal * 14 / (bron.notenbalken || 14))))
        : basisschaal;
      const paginaBreedte = pdfVorm ? 2100 : vasteRegels ? VASTE_PAGINABREEDTE : Math.round((breedte * 100) / schaal);
      const paginaPixels = pdfVorm ? Math.round(Math.min(breedte, 794) * (zoom / BEGINZOOM)) : Math.round((paginaBreedte * schaal) / 100);
      tk.setOptions({
        scale: schaal,
        pageWidth: paginaBreedte,
        ...(pdfVorm ? { pageHeight: 2970, adjustPageHeight: false } : heeftPaginavorm ? {
          pageHeight: Math.round(paginaBreedte * bladbron.hoogte / bladbron.breedte),
          adjustPageHeight: false,
        } : { adjustPageHeight: true }),
        breaks: (!pdfVorm && (vasteRegels || heeftPaginavorm)) ? 'encoded' : 'auto',
        footer: 'none',
        header: 'none',
        ...(pdfVorm ? { pageMarginBottom: 250 } : { font: 'Leland', pageMarginLeft: 60, pageMarginRight: 60, pageMarginTop: 60 }),
        spacingStaff: 10,
        spacingSystem: 12,
        spacingLinear: 0.25,
        spacingNonLinear: 0.6,
        minLastJustification: 0,
        justifyVertically: false,
      });
      if (!tk.loadData(bron.musicxml)) return status('Deze partituur kon niet worden getekend.');
      if (bron.kop) {
        const kop = document.createElement('h2');
        kop.textContent = bron.kop;
        blad.append(kop);
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
      app.meld('klik-noot', { id: kandidaten[0].id });
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
    if (!maat) return;
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

  // Slepen vanuit het palet. Het doel is de maat onder de muis, in de partij van de notenbalk onder de muis; bij een hokje
  // voor een noot (articulatie, voorteken) de noot onder de muis. De partij en de maat komen uit de id's van de noten en
  // rusten ('n-<partij>-<maat>-<element>'), zodat het ook klopt na een meermaatsrust (verborgen maten worden niet getekend).
  const PALET = 'application/x-palet';
  function paletDoel(gebeurtenis, opNoot) {
    const x = gebeurtenis.clientX;
    const y = gebeurtenis.clientY;
    const maatG = maten()
      .map((g) => ({ g, kader: g.getBoundingClientRect() }))
      .filter(({ kader }) => x >= kader.left && x <= kader.right && y >= kader.top && y <= kader.bottom)
      .sort((a, b) => a.kader.width * a.kader.height - b.kader.width * b.kader.height)[0]?.g;
    if (!maatG) return null;
    const delen = [...maatG.querySelectorAll('g.note[id^="n-"], g.rest[id^="n-"], g.mRest[id^="n-"], g.multiRest[id^="n-"]')]
      .map((element) => {
        const kader = element.getBoundingClientRect();
        const balk = (element.closest('g.staff') ?? element).getBoundingClientRect();
        const dx = x - (kader.left + kader.right) / 2;
        const dy = y - (kader.top + kader.bottom) / 2;
        return {
          element,
          dichtbij: x >= kader.left - 14 && x <= kader.right + 14 && y >= kader.top - 14 && y <= kader.bottom + 14,
          afstand: dx * dx + dy * dy,
          balkAfstand: y < balk.top ? balk.top - y : y > balk.bottom ? y - balk.bottom : 0,
        };
      });
    if (opNoot) {
      const noot = delen.filter((deel) => deel.dichtbij && deel.element.matches('g.note')).sort((a, b) => a.afstand - b.afstand)[0];
      return noot ? { element: noot.element, plek: { ...leesNootId(noot.element.id), elementId: noot.element.id } } : null;
    }
    const inBalk = [...delen].sort((a, b) => a.balkAfstand - b.balkAfstand || a.afstand - b.afstand)[0];
    if (!inBalk) {
      const index = maten().indexOf(maatG);
      return { element: maatG, plek: { partijId: null, maatIndex: index, start: 0 } };
    }
    const plaats = leesNootId(inBalk.element.id);
    const dichtste = delen.filter((deel) => deel.dichtbij && deel.balkAfstand === inBalk.balkAfstand).sort((a, b) => a.afstand - b.afstand)[0];
    const start = dichtste ? zoekStart(dichtste.element.id) : 0;
    return { element: maatG, plek: { partijId: plaats.partijId, maatIndex: plaats.maatIndex, start } };
  }
  function leesNootId(id) {
    const delen = id.split('-');
    const elementIndex = Number(delen.pop());
    const maatIndex = Number(delen.pop());
    return { partijId: delen.slice(1).join('-'), maatIndex, elementIndex };
  }
  function zoekStart(id) {
    const { partijId, maatIndex, elementIndex } = leesNootId(id);
    const partij = app.stand.partituur?.partijen.find((kandidaat) => kandidaat.id === partijId);
    return partij?.maten[maatIndex]?.elementen[elementIndex]?.start ?? 0;
  }
  function wisSleepDoel() {
    for (const element of vlak.querySelectorAll('.sleep-doel')) element.classList.remove('sleep-doel');
  }

  vlak.addEventListener('dragover', (gebeurtenis) => {
    const soorten = [...gebeurtenis.dataTransfer.types];
    if (!soorten.includes(PALET)) return;
    const doel = paletDoel(gebeurtenis, soorten.includes(`${PALET}-noot`));
    wisSleepDoel();
    if (!doel) return;
    gebeurtenis.preventDefault();
    gebeurtenis.dataTransfer.dropEffect = 'copy';
    doel.element.classList.add('sleep-doel');
  });

  vlak.addEventListener('dragleave', (gebeurtenis) => {
    if (!vlak.contains(gebeurtenis.relatedTarget)) wisSleepDoel();
  });

  vlak.addEventListener('drop', async (gebeurtenis) => {
    const id = gebeurtenis.dataTransfer.getData(PALET);
    wisSleepDoel();
    if (!id) return;
    gebeurtenis.preventDefault();
    const doel = paletDoel(gebeurtenis, [...gebeurtenis.dataTransfer.types].includes(`${PALET}-noot`));
    if (!doel) return;
    // Pas hier laden: paletten.js gebruikt paden voor de browser, en deze module wordt ook in Node getest.
    const { pasPaletToe, zoekItem } = await import('./views/paletten.js');
    const item = zoekItem(id);
    if (!item) return;
    const gelukt = pasPaletToe(app, item, doel.plek);
    app.meld('palet-gezet', { naam: item.naam, gelukt });
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
      vulPartijen(partituur);
      const lossePartij = soortKeuze.value === 'partij';
      const verberg = lossePartij
        ? partituur.partijen.filter((partij) => partij.id !== partijKeuze.value).map((partij) => partij.id)
        : app.stand.verborgen ?? [];
      const groepen = lossePartij ? [partituur] : kiesBladindeling(partituur);
      let eerstePartij = 1;
      const bronnen = [];
      for (const groep of groepen) {
        const laatstePartij = eerstePartij + groep.partijen.length - 1;
        bronnen.push({
          musicxml: await naarMusicXML(groep, verberg, !lossePartij && groep.partijen.length > 1),
          kop: groepen.length > 1 ? `Partijen ${eerstePartij} tot en met ${laatstePartij}` : null,
          notenbalken: groep.partijen.reduce((totaal, partij) => totaal + aantalNotenbalken(partij), 0),
        });
        eerstePartij = laatstePartij + 1;
      }
      await teken(bronnen, { meteen: true });
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
