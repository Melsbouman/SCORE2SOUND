// Notatie tekenen met Verovio in #weergave.
// Tekent opnieuw bij een nieuwe partituur (via naarMusicXML uit /src/musicxml/schrijven.mjs) of bij app.meld('musicxml', tekst).
// Luistert naar 'naar-maat' ({ maat }: markeert en toont die maat) en 'speel-maat' ({ maat } of null: de maat die nu klinkt).
const SCHAAL = 50;

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
  return omzetten(partituur);
}

export function start(app) {
  const vlak = document.getElementById('weergave');
  let huidige = null; // de laatst getekende MusicXML
  let tekenNummer = 0;

  function status(tekst) {
    vlak.replaceChildren();
    const p = document.createElement('p');
    p.className = 'zacht';
    p.setAttribute('role', 'status');
    p.textContent = tekst;
    vlak.append(p);
  }

  async function teken(musicxml) {
    const nummer = ++tekenNummer;
    huidige = musicxml;
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
    tk.setOptions({ scale: SCHAAL, pageWidth: Math.round((breedte * 100) / SCHAAL), adjustPageHeight: true, breaks: 'auto', footer: 'none', header: 'none' });
    if (!tk.loadData(musicxml)) return status('Deze partituur kon niet worden getekend.');
    const blad = document.createElement('div');
    blad.className = 'bladmuziek';
    for (let pagina = 1; pagina <= tk.getPageCount(); pagina++) {
      const svg = new DOMParser().parseFromString(tk.renderToSVG(pagina), 'image/svg+xml').documentElement;
      svg.classList.add('bladmuziek__pagina');
      blad.append(document.importNode(svg, true));
    }
    vlak.replaceChildren(blad);
  }

  // De maten in volgorde; Verovio tekent elke maat als <g class="measure">, over alle partijen heen.
  const maten = () => [...vlak.querySelectorAll('g.measure')];

  function markeer(index, klasse, tonen) {
    for (const g of vlak.querySelectorAll(`g.measure.${klasse}`)) g.classList.remove(klasse);
    if (index === null || index === undefined) return;
    const g = maten()[index];
    if (!g) return;
    g.classList.add(klasse);
    if (tonen) g.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
  }

  app.op('partituur', async (partituur) => {
    if (!partituur) {
      huidige = null;
      return vlak.replaceChildren();
    }
    try {
      await teken(await naarMusicXML(partituur));
    } catch (fout) {
      console.error(fout);
      status('De partituur kon niet worden omgezet om te tekenen.');
    }
  });
  app.op('musicxml', (tekst) => teken(tekst));
  app.op('naar-maat', (doel) => markeer(doel?.maat, 'gemarkeerd', true));
  app.op('speel-maat', (doel) => markeer(doel?.maat ?? null, 'speelt', false));

  // Opnieuw tekenen als de breedte echt verandert, zodat de regels passen.
  let vorigeBreedte = vlak.clientWidth;
  let wacht = null;
  new ResizeObserver(() => {
    if (!huidige || Math.abs(vlak.clientWidth - vorigeBreedte) < 40) return;
    vorigeBreedte = vlak.clientWidth;
    clearTimeout(wacht);
    wacht = setTimeout(() => teken(huidige), 250);
  }).observe(vlak);
}
