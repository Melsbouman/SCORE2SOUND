// Het palettenpaneel: hokjes met een icoon die je naar een maat of een noot sleept, of aanklikt voor de gekozen maat of noot.
// Het neerzetten in de partituur zelf staat in weergave.js (dragover en drop); die roept pasPaletToe aan.
import { PALETTEN } from '/src/model/paletten.mjs';
import { doelVan, voerPaletActieUit } from '/src/model/paletactie.mjs';
import { leesId, zoekElement } from '/src/model/corrigeren.mjs';
import { vernieuwMeldingen } from '/src/controle/meldingen.mjs';

export const SLEEP_SOORT = 'application/x-palet';
const SVG_NS = 'http://www.w3.org/2000/svg';

export function zoekItem(id) {
  for (const sectie of PALETTEN) {
    const item = sectie.items.find((kandidaat) => kandidaat.id === id);
    if (item) return item;
  }
  return null;
}

// Zet een hokje op een plek (zie paletactie.mjs) en werkt de partituur en de meldingen bij. Geeft true als er iets veranderde.
export function pasPaletToe(app, item, plek) {
  const vorige = app.stand.partituur;
  if (!vorige || !item) return false;
  const nieuw = voerPaletActieUit(vorige, item.actie, plek);
  if (nieuw === vorige || JSON.stringify(nieuw) === JSON.stringify(vorige)) return false;
  app.zet({ partituur: nieuw, meldingen: vernieuwMeldingen(app.stand.meldingen, nieuw, vorige) });
  return true;
}

// Kleine notenbalk (5 lijnen, 5 eenheden uit elkaar) met tekens uit Bravura. Plek k: 1 is de onderste lijn, 5 de bovenste,
// 1.5 de ruimte ertussen. In SMuFL staat een sleutel op zijn eigen lijn, en staan voortekens en maatsoortcijfers in het midden.
const ONDER = 34;
const yVan = (k) => ONDER - (k - 1) * 5;
const lijnen = (breedte) => [0, 1, 2, 3, 4]
  .map((lijn) => `<line x1="0" x2="${breedte}" y1="${ONDER - lijn * 5}" y2="${ONDER - lijn * 5}"/>`).join('');
const teken = (tekst, x, k, anker = 'start') => `<text x="${x}" y="${yVan(k)}" text-anchor="${anker}">${tekst}</text>`;
const KRUISEN = [5, 3.5, 5.5, 4, 2.5, 4.5, 3];
const MOLLEN = [3, 4.5, 2.5, 4, 2, 3.5, 1.5];
const cijfers = (getal) => [...String(getal)].map((cijfer) => String.fromCodePoint(0xE080 + Number(cijfer))).join('');

function maakSvg(breedte, hoogte, inhoud, klasse) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${breedte} ${hoogte}`);
  svg.setAttribute('class', klasse);
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  svg.innerHTML = inhoud;
  return svg;
}

function balkIcoon(item) {
  const { soort, waarde } = item.actie;
  if (soort === 'sleutel') return maakSvg(30, 48, lijnen(30) + teken(item.teken, 4, waarde.lijn), 'paletten__balk');
  if (soort === 'toonsoort') {
    const aantal = Math.abs(waarde.kwinten);
    const breedte = Math.max(26, 8 + aantal * 6);
    const plekken = waarde.kwinten > 0 ? KRUISEN : MOLLEN;
    const glyph = waarde.kwinten > 0 ? '\uE262' : '\uE260';
    const tekens = plekken.slice(0, aantal).map((k, index) => teken(glyph, 4 + index * 6, k)).join('');
    return maakSvg(breedte, 48, lijnen(breedte) + tekens, 'paletten__balk');
  }
  if (soort === 'maatsoort') {
    const tekens = waarde.symbool
      ? teken(waarde.symbool === 'cut' ? '\uE08B' : '\uE08A', 13, 3, 'middle')
      : teken(cijfers(waarde.teller), 13, 4, 'middle') + teken(cijfers(waarde.noemer), 13, 2, 'middle');
    return maakSvg(26, 48, lijnen(26) + tekens, 'paletten__balk');
  }
  return null;
}

function lijnIcoon(actie) {
  const lijn = (d) => `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>`;
  if (actie.soort === 'haak') {
    return maakSvg(40, 20, lijn(actie.waarde === 'crescendo' ? 'M38 4 L2 10 L38 16' : 'M2 4 L38 10 L2 16'), 'paletten__lijn');
  }
  if (actie.soort === 'volta') {
    return maakSvg(40, 24, `${lijn('M3 23 V4 H38')}<text x="7" y="17" class="paletten__voltacijfer">${actie.waarde}.</text>`, 'paletten__lijn');
  }
  if (actie.soort === 'overbinding') {
    const kop = (x) => `<ellipse cx="${x}" cy="15" rx="4.2" ry="3" transform="rotate(-20 ${x} 15)"/>`;
    return maakSvg(40, 22, kop(8) + kop(32) + lijn('M8 9 Q20 1 32 9'), 'paletten__lijn');
  }
  return null;
}

function maakIcoon(item) {
  const icoon = balkIcoon(item) ?? lijnIcoon(item.actie);
  if (icoon) return [icoon];
  const delen = [];
  if (item.teken) {
    const span = document.createElement('span');
    span.className = item.actie.soort === 'dynamiek' ? 'paletten__teken paletten__teken--dynamiek' : 'paletten__teken';
    span.setAttribute('aria-hidden', 'true');
    span.textContent = item.teken;
    delen.push(span);
  }
  if (item.woord) {
    const span = document.createElement('span');
    span.className = `paletten__woord paletten__woord--${item.stijl ?? 'gewoon'}`;
    span.setAttribute('aria-hidden', 'true');
    span.textContent = item.woord;
    delen.push(span);
  }
  return delen;
}

export function start(app) {
  const vlak = document.getElementById('aanduidingen');
  if (!vlak) return;
  let gekozenNoot = null;
  let gekozenMaat = null;
  let gekozenTot = null;

  const status = document.createElement('p');
  status.className = 'zacht paletten__status';
  status.setAttribute('aria-live', 'polite');

  const zoek = document.createElement('input');
  zoek.type = 'search';
  zoek.className = 'paletten__zoek';
  zoek.placeholder = 'Zoek een teken';
  zoek.setAttribute('aria-label', 'Zoek een teken in de paletten');

  const container = document.createElement('div');
  container.className = 'paletten-container';

  function uitleg() {
    if (gekozenNoot != null) return 'Gekozen: een noot. Klik op een hokje, of sleep een hokje naar een noot of maat.';
    if (gekozenMaat != null) {
      const tot = gekozenTot != null && gekozenTot !== gekozenMaat ? ` tot en met ${gekozenTot + 1}` : '';
      return `Gekozen: maat ${gekozenMaat + 1}${tot}. Klik op een hokje, of sleep er een naar een maat.`;
    }
    return 'Sleep een hokje naar een maat of een noot, of kies eerst een maat en klik op een hokje.';
  }

  // De plek voor een klik: de gekozen noot, anders de gekozen maat (of reeks maten).
  function gekozenPlek(item) {
    if (gekozenNoot != null) {
      const plaats = leesId(gekozenNoot);
      if (!plaats) return null;
      return {
        partijId: plaats.partijId,
        maatIndex: plaats.maatIndex,
        start: zoekElement(app.stand.partituur, gekozenNoot)?.start ?? 0,
        elementId: doelVan(item.actie) === 'noot' ? gekozenNoot : null,
      };
    }
    if (gekozenMaat != null) return { partijId: null, maatIndex: gekozenMaat, totIndex: gekozenTot ?? gekozenMaat };
    return null;
  }

  for (const sectie of PALETTEN) {
    const details = document.createElement('details');
    details.className = 'paletten__onderdeel';
    details.dataset.id = sectie.id;
    let open = true;
    try {
      const opgeslagen = localStorage.getItem(`score2sound-palet-${sectie.id}`);
      if (opgeslagen !== null) open = opgeslagen === 'true';
    } catch {}
    details.open = open;
    details.addEventListener('toggle', () => {
      if (zoek.value.trim()) return;
      try {
        localStorage.setItem(`score2sound-palet-${sectie.id}`, String(details.open));
      } catch {}
    });

    const kop = document.createElement('summary');
    kop.className = 'paletten__kop';
    kop.textContent = sectie.naam;
    details.append(kop);

    const raster = document.createElement('div');
    raster.className = `paletten__raster paletten__raster--${sectie.id}`;
    for (const item of sectie.items) {
      const doel = doelVan(item.actie);
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'paletten__cel';
      knop.draggable = true;
      knop.dataset.item = item.id;
      knop.dataset.doel = doel;
      knop.title = doel === 'noot' ? `${item.naam} (op een noot)` : item.naam;
      knop.setAttribute('aria-label', `${sectie.naam}: ${item.naam}`);
      knop.append(...maakIcoon(item));

      knop.addEventListener('dragstart', (gebeurtenis) => {
        gebeurtenis.dataTransfer.effectAllowed = 'copy';
        gebeurtenis.dataTransfer.setData(SLEEP_SOORT, item.id);
        gebeurtenis.dataTransfer.setData(`${SLEEP_SOORT}-${doel}`, item.id);
      });
      knop.addEventListener('click', () => {
        const plek = gekozenPlek(item);
        if (!plek) {
          status.textContent = `Kies eerst een maat of noot, of sleep "${item.naam}" naar de partituur.`;
          return;
        }
        const gelukt = pasPaletToe(app, item, plek);
        status.textContent = gelukt ? `${item.naam} gezet.` : `${item.naam} past hier niet${doel === 'noot' ? ' (kies een noot)' : ''}.`;
      });
      raster.append(knop);
    }
    details.append(raster);
    container.append(details);
  }

  zoek.addEventListener('input', () => {
    const gezocht = zoek.value.trim().toLocaleLowerCase('nl');
    for (const details of container.querySelectorAll('.paletten__onderdeel')) {
      let zichtbaar = 0;
      for (const knop of details.querySelectorAll('.paletten__cel')) {
        const past = !gezocht || knop.getAttribute('aria-label').toLocaleLowerCase('nl').includes(gezocht);
        knop.hidden = !past;
        if (past) zichtbaar += 1;
      }
      details.hidden = zichtbaar === 0;
      if (gezocht && zichtbaar > 0) details.open = true;
    }
  });

  status.textContent = uitleg();
  vlak.replaceChildren(zoek, status, container);

  app.op('kies-noot', ({ id }) => {
    gekozenNoot = id ?? null;
    status.textContent = uitleg();
  });
  app.op('kies-maat', ({ maat, tot }) => {
    gekozenMaat = maat ?? null;
    gekozenTot = tot ?? null;
    status.textContent = uitleg();
  });
  app.op('palet-gezet', ({ naam, gelukt }) => {
    status.textContent = gelukt ? `${naam} gezet.` : `${naam} past daar niet.`;
  });
}
