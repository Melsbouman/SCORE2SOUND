// Ontdekken: zoeken in gratis stukken (OpenScore Lieder, CC0) en ze openen in de app.
import { zoekWerken, uitgelicht, componisten } from '/src/model/ontdekken.mjs';

export function start(app) {
  const vlak = document.getElementById('ontdekken-scherm');
  if (!vlak) return;

  let werken = null;
  let fout = '';

  const zoek = document.createElement('input');
  zoek.type = 'search';
  zoek.className = 'ontdekken__zoek';
  zoek.placeholder = 'Zoek een stuk of componist';
  zoek.setAttribute('aria-label', 'Zoek een stuk of componist');
  const melding = document.createElement('p');
  melding.className = 'ontdekken__melding';
  melding.setAttribute('role', 'status');
  const inhoud = document.createElement('div');
  inhoud.className = 'ontdekken__inhoud';
  const uitleg = document.createElement('p');
  uitleg.className = 'ontdekken__uitleg';
  uitleg.textContent = 'Gratis bladmuziek uit het publieke domein (OpenScore Lieder). Zoek een stuk en open het in de editor.';
  vlak.replaceChildren(uitleg, zoek, melding, inhoud);

  function kaart(werk) {
    const knop = document.createElement('button');
    knop.type = 'button';
    knop.className = 'ontdekken__kaart';
    const titel = document.createElement('strong');
    titel.textContent = werk.titel;
    const componist = document.createElement('span');
    componist.textContent = werk.componist;
    knop.append(titel, componist);
    if (werk.reeks) {
      const reeks = document.createElement('small');
      reeks.textContent = werk.reeks;
      knop.append(reeks);
    }
    const pil = document.createElement('em');
    pil.textContent = 'Rechtenvrij';
    knop.append(pil);
    knop.addEventListener('click', () => open(werk, knop));
    return knop;
  }

  function rij(titel, kaarten) {
    const groep = document.createElement('section');
    groep.className = 'ontdekken__groep';
    const h = document.createElement('h3');
    h.textContent = titel;
    const lijst = document.createElement('div');
    lijst.className = 'ontdekken__raster';
    lijst.append(...kaarten);
    groep.append(h, lijst);
    return groep;
  }

  function teken() {
    inhoud.replaceChildren();
    melding.textContent = fout;
    if (!werken) return;
    const tekst = zoek.value.trim();
    if (tekst) {
      const treffers = zoekWerken(werken, tekst);
      if (treffers.length === 0) {
        const leeg = document.createElement('p');
        leeg.textContent = 'Niets gevonden.';
        inhoud.append(leeg);
      } else {
        inhoud.append(rij(`${treffers.length >= 60 ? '60 of meer' : treffers.length} resultaten`, treffers.map(kaart)));
      }
      return;
    }
    const dag = Math.floor(Date.now() / 86400000);
    inhoud.append(rij('Uitgelicht', uitgelicht(werken, 8, dag).map(kaart)));
    const groep = document.createElement('section');
    groep.className = 'ontdekken__groep';
    const h = document.createElement('h3');
    h.textContent = 'Componisten';
    const pillen = document.createElement('div');
    pillen.className = 'ontdekken__pillen';
    for (const { naam, aantal } of componisten(werken).slice(0, 24)) {
      const pil = document.createElement('button');
      pil.type = 'button';
      pil.className = 'ontdekken__pil';
      pil.textContent = `${naam} (${aantal})`;
      pil.addEventListener('click', () => { zoek.value = naam; teken(); zoek.focus(); });
      pillen.append(pil);
    }
    groep.append(h, pillen);
    inhoud.append(groep);
  }

  async function open(werk, knop) {
    melding.textContent = `Bezig met ophalen van ${werk.titel}…`;
    knop.disabled = true;
    try {
      const bestand = await fetch(`/api/ontdek/${encodeURIComponent(werk.id)}`);
      if (!bestand.ok) throw new Error('Het stuk kon niet worden opgehaald. Is de server online?');
      const antwoord = await fetch('/api/importeer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.recordare.musicxml+xml' },
        body: await bestand.blob(),
      });
      const resultaat = await antwoord.json();
      if (!antwoord.ok) throw new Error(resultaat.fout || 'Het stuk kon niet worden geopend.');
      app.zet({ partituur: resultaat.partituur, meldingen: resultaat.meldingen, project: null, versies: [] });
      melding.textContent = '';
      window.location.hash = '#weergave';
    } catch (e) {
      melding.setAttribute('role', 'alert');
      melding.textContent = e.message || 'Het stuk kon niet worden geopend.';
    } finally {
      knop.disabled = false;
    }
  }

  zoek.addEventListener('input', teken);
  fetch('/ontdekken/lieder.json')
    .then((r) => r.json())
    .then((lijst) => { werken = lijst.werken; teken(); })
    .catch(() => { fout = 'De lijst met stukken kon niet worden geladen.'; teken(); });
}
