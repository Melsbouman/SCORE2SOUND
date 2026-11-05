import { controleerMaatduur } from '/src/controle/maatduur.mjs';
import { voorbeeldStukken } from '/src/model/voorbeeldstukken.mjs';

const nietBereikbaar = 'De server is niet bereikbaar. Probeer het opnieuw.';
const sorteringSleutel = 'score2sound-projecten-sortering';

function leesSortering() {
  try {
    const sortering = localStorage.getItem(sorteringSleutel);
    return ['nieuwste', 'oudste', 'naam'].includes(sortering) ? sortering : 'nieuwste';
  } catch {
    return 'nieuwste';
  }
}

async function vraag(url, opties) {
  let antwoord;
  try {
    antwoord = await fetch(url, opties);
  } catch {
    throw new Error(nietBereikbaar);
  }

  let gegevens;
  try {
    gegevens = await antwoord.json();
  } catch {
    throw new Error(nietBereikbaar);
  }

  if (!antwoord.ok) {
    throw new Error(gegevens.fout || nietBereikbaar);
  }

  return gegevens;
}

export function start(app) {
  const vlak = document.getElementById('projecten');
  const recenteProjecten = document.getElementById('recente-projecten');
  const bibliotheekMappen = document.getElementById('bibliotheek-mappen');
  let projecten = null;
  let status = '';
  let zoekterm = '';
  let sortering = leesSortering();
  const verwijderTimers = new Map();
  const verwijderBevestigingen = new Set();
  let laatstBewaardePartituur = app.stand.project
    ? JSON.stringify(app.stand.partituur)
    : null;

  function tekenOntdekken() {
    if (!recenteProjecten) return;
    let ontdekken = document.getElementById('ontdekken');
    if (!ontdekken) {
      ontdekken = document.createElement('div');
      ontdekken.id = 'ontdekken';
      recenteProjecten.after(ontdekken);
    }
    ontdekken.replaceChildren();

    const kop = document.createElement('h3');
    const rij = document.createElement('div');
    kop.textContent = 'Ontdekken';
    rij.className = 'projecten__lijst';
    for (const voorbeeld of voorbeeldStukken()) {
      const kaart = document.createElement('button');
      const titel = document.createElement('strong');
      const componist = document.createElement('span');
      const rechten = document.createElement('small');
      kaart.type = 'button';
      kaart.className = 'knop';
      titel.textContent = voorbeeld.titel;
      componist.textContent = voorbeeld.componist;
      rechten.textContent = 'Rechtenvrij';
      kaart.append(titel, componist, rechten);
      kaart.addEventListener('click', () => {
        const partituur = structuredClone(voorbeeld.stuk);
        laatstBewaardePartituur = null;
        app.zet({
          partituur,
          meldingen: controleerMaatduur(partituur),
          project: null,
          versies: [],
        });
        window.location.hash = '#weergave';
      });
      rij.append(kaart);
    }
    ontdekken.append(kop, rij);
  }

  function tekenBibliotheekMappen() {
    if (!bibliotheekMappen || projecten === null) return;
    bibliotheekMappen.replaceChildren();
    const laatstGebruikt = new Map();
    for (const project of projecten) {
      if (!project.map) continue;
      const bijgewerkt = new Date(project.bijgewerkt).getTime();
      laatstGebruikt.set(project.map, Math.max(laatstGebruikt.get(project.map) ?? 0, bijgewerkt));
    }
    const actieveMap = decodeURIComponent(window.location.hash.slice('#bibliotheek/'.length));
    const mappen = [...laatstGebruikt]
      .sort((eerste, tweede) => tweede[1] - eerste[1])
      .slice(0, 5);
    for (const [naam] of mappen) {
      const link = document.createElement('a');
      const icoon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      const pad = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const tekst = document.createElement('span');
      link.href = `#bibliotheek/${encodeURIComponent(naam)}`;
      link.title = naam;
      if (window.location.hash.startsWith('#bibliotheek/') && actieveMap === naam) {
        link.setAttribute('aria-current', 'page');
      }
      icoon.setAttribute('viewBox', '0 0 24 24');
      icoon.setAttribute('aria-hidden', 'true');
      pad.setAttribute('d', 'M4 5h6l2 2h8v12H4V5Z');
      icoon.append(pad);
      tekst.textContent = naam;
      link.append(icoon, tekst);
      bibliotheekMappen.append(link);
    }
  }

  function tekenRecenteProjecten() {
    if (!recenteProjecten || projecten === null) return;
    recenteProjecten.replaceChildren();
    const recent = [...projecten]
      .sort((eerste, tweede) => new Date(tweede.bijgewerkt) - new Date(eerste.bijgewerkt))
      .slice(0, 5);
    if (recent.length === 0) {
      const leeg = document.createElement('span');
      leeg.textContent = 'Nog niets bewaard';
      recenteProjecten.append(leeg);
      return;
    }
    for (const project of recent) {
      const link = document.createElement('a');
      const datum = document.createElement('time');
      link.href = '#projecten';
      link.textContent = project.naam;
      link.title = project.naam;
      datum.dateTime = project.bijgewerkt;
      datum.textContent = new Date(project.bijgewerkt).toLocaleDateString('nl-NL', {
        day: 'numeric',
        month: 'short'
      });
      link.append(datum);
      link.addEventListener('click', async (gebeurtenis) => {
        gebeurtenis.preventDefault();
        try {
          const geopend = await vraag(`/api/projecten/${encodeURIComponent(project.id)}`);
          laatstBewaardePartituur = JSON.stringify(geopend.partituur);
          app.zet({
            partituur: geopend.partituur,
            meldingen: controleerMaatduur(geopend.partituur),
            project: { id: geopend.id, naam: geopend.naam },
            versies: geopend.versies ?? []
          });
          window.location.hash = 'weergave';
        } catch (fout) {
          status = fout.message || nietBereikbaar;
          teken();
        }
      });
      recenteProjecten.append(link);
    }
  }

  async function bewaar(naam) {
    const partituur = app.stand.partituur;
    const partituurJson = JSON.stringify(partituur);
    const project = await vraag('/api/projecten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: app.stand.project?.id,
        naam,
        partituur,
        versies: app.stand.versies
      })
    });
    laatstBewaardePartituur = partituurJson;
    app.zet({ project: { id: project.id, naam: project.naam } });
    return project;
  }

  function teken() {
    tekenRecenteProjecten();
    tekenBibliotheekMappen();
    const kop = document.createElement('h2');
    kop.textContent = 'Projecten';
    vlak.replaceChildren(kop);

    if (app.stand.partituur) {
      const formulier = document.createElement('form');
      const label = document.createElement('label');
      const naamveld = document.createElement('input');
      const knop = document.createElement('button');
      const naamId = 'projecten-naam';

      label.htmlFor = naamId;
      label.textContent = 'Naam van het project';
      naamveld.id = naamId;
      naamveld.name = 'naam';
      naamveld.type = 'text';
      naamveld.required = true;
      naamveld.value = app.stand.project?.naam || app.stand.partituur.titel || '';
      knop.type = 'submit';
      knop.className = 'knop knop--hoofd';
      knop.textContent = app.stand.project ? 'Wijzigingen bewaren' : 'Bewaren';

      formulier.append(label, naamveld, knop);
      formulier.addEventListener('submit', async gebeurtenis => {
        gebeurtenis.preventDefault();
        const naam = naamveld.value.trim();
        if (!naam) return;

        try {
          const project = await bewaar(naam);
          status = `Bewaard: ${project.naam}`;
          teken();
          await laadProjecten();
        } catch (fout) {
          status = fout.message || nietBereikbaar;
          teken();
        }
      });

      vlak.append(formulier);
    }

    const statusRegel = document.createElement('p');
    statusRegel.className = 'zacht';
    statusRegel.setAttribute('role', 'status');
    statusRegel.textContent = status;
    vlak.append(statusRegel);

    if (projecten !== null) {
      if (projecten.length === 0) {
        const leeg = document.createElement('div');
        const legeKop = document.createElement('h3');
        const uitleg = document.createElement('p');
        const acties = document.createElement('div');
        const nieuwLink = document.createElement('a');
        const uploadLink = document.createElement('a');

        leeg.className = 'projecten__leeg';
        legeKop.textContent = 'Nog geen stukken';
        uitleg.textContent = 'Begin met een nieuw stuk of scan bestaande bladmuziek in.';
        acties.className = 'projecten__lege-acties';
        nieuwLink.href = '#nieuw';
        nieuwLink.className = 'knop knop--hoofd';
        nieuwLink.textContent = 'Nieuw stuk beginnen';
        uploadLink.href = '#upload';
        uploadLink.className = 'knop';
        uploadLink.textContent = 'Bladmuziek inscannen';

        acties.append(nieuwLink, uploadLink);
        leeg.append(legeKop, uitleg, acties);
        vlak.append(leeg);
      } else {
        if (projecten.length > 3) {
          const zoeken = document.createElement('input');
          zoeken.type = 'search';
          zoeken.setAttribute('aria-label', 'Zoek een project');
          zoeken.value = zoekterm;
          zoeken.addEventListener('input', () => {
            zoekterm = zoeken.value;
            const positie = zoeken.selectionStart;
            teken();
            const nieuwZoekveld = vlak.querySelector('[aria-label="Zoek een project"]');
            nieuwZoekveld.focus();
            nieuwZoekveld.setSelectionRange(positie, positie);
          });

          const sorteer = document.createElement('select');
          sorteer.setAttribute('aria-label', 'Sorteren');
          for (const [waarde, tekst] of [
            ['nieuwste', 'Nieuwste eerst'],
            ['oudste', 'Oudste eerst'],
            ['naam', 'Naam A tot Z']
          ]) {
            const optie = document.createElement('option');
            optie.value = waarde;
            optie.textContent = tekst;
            sorteer.append(optie);
          }
          sorteer.value = sortering;
          sorteer.addEventListener('change', () => {
            sortering = sorteer.value;
            try {
              localStorage.setItem(sorteringSleutel, sortering);
            } catch {
            }
            teken();
          });
          vlak.append(zoeken, sorteer);
        }

        const actieveZoekterm = projecten.length > 3 ? zoekterm.toLowerCase() : '';
        const getoondeProjecten = projecten
          .filter(project => project.naam.toLowerCase().includes(actieveZoekterm))
          .sort((eerste, tweede) => {
            if (sortering === 'naam') return eerste.naam.localeCompare(tweede.naam, 'nl-NL');
            const verschil = new Date(tweede.bijgewerkt) - new Date(eerste.bijgewerkt);
            return sortering === 'oudste' ? -verschil : verschil;
          });
        if (getoondeProjecten.length === 0) {
          const leeg = document.createElement('p');
          leeg.className = 'zacht';
          leeg.textContent = 'Geen projecten gevonden.';
          vlak.append(leeg);
          return;
        }

        const lijst = document.createElement('div');
        lijst.className = 'projecten__lijst';
        for (const project of getoondeProjecten) {
          const knop = document.createElement('button');
          const verwijderKnop = document.createElement('button');
          const bijgewerkt = document.createElement('span');
          knop.type = 'button';
          knop.className = 'knop';
    const miniatuur = document.createElement('span');
    miniatuur.className = 'projecten__miniatuur';
    miniatuur.setAttribute('aria-hidden', 'true');
    miniatuur.innerHTML = miniatuurSvg(project.naam);
    knop.append(miniatuur);
    knop.append(document.createTextNode(project.naam));
          bijgewerkt.className = 'zacht';
          bijgewerkt.textContent = `bijgewerkt op ${new Date(project.bijgewerkt).toLocaleString('nl-NL', {
            dateStyle: 'medium',
            timeStyle: 'short'
          })}`;
          knop.append(bijgewerkt);
          knop.addEventListener('click', async () => {
            try {
              const geopend = await vraag(`/api/projecten/${encodeURIComponent(project.id)}`);
              laatstBewaardePartituur = JSON.stringify(geopend.partituur);
              app.zet({
                partituur: geopend.partituur,
                meldingen: controleerMaatduur(geopend.partituur),
                project: { id: geopend.id, naam: geopend.naam },
                versies: geopend.versies ?? []
              });
            } catch (fout) {
              status = fout.message || nietBereikbaar;
              teken();
            }
          });

          verwijderKnop.type = 'button';
          verwijderKnop.className = 'knop';
          verwijderKnop.textContent = verwijderBevestigingen.has(project.id)
            ? 'Zeker weten?'
            : 'Verwijderen';
          verwijderKnop.addEventListener('click', async () => {
            if (!verwijderBevestigingen.has(project.id)) {
              verwijderBevestigingen.add(project.id);
              verwijderTimers.set(project.id, setTimeout(() => {
                verwijderBevestigingen.delete(project.id);
                verwijderTimers.delete(project.id);
                teken();
              }, 3000));
              teken();
              return;
            }

            clearTimeout(verwijderTimers.get(project.id));
            verwijderTimers.delete(project.id);
            verwijderBevestigingen.delete(project.id);
            verwijderKnop.disabled = true;
            try {
              await vraag(`/api/projecten/${encodeURIComponent(project.id)}`, {
                method: 'DELETE'
              });
              projecten = projecten.filter(item => item.id !== project.id);
              tekenRecenteProjecten();
              status = `Verwijderd: ${project.naam}`;
              if (app.stand.project?.id === project.id) {
                app.zet({ project: null });
              }
              teken();
            } catch (fout) {
              status = fout.message || nietBereikbaar;
              teken();
            }
          });
          lijst.append(knop, verwijderKnop);
        }
        vlak.append(lijst);
      }
    }
  }

  async function laadProjecten() {
    try {
      projecten = await vraag('/api/projecten');
      teken();
    } catch (fout) {
      status = fout.message || nietBereikbaar;
      teken();
    }
  }

  teken();
  tekenOntdekken();
  setInterval(async () => {
    if (!app.stand.project || !app.stand.partituur) return;
    if (JSON.stringify(app.stand.partituur) === laatstBewaardePartituur) return;

    try {
      await bewaar(app.stand.project.naam);
      status = `Automatisch bewaard om ${new Date().toLocaleTimeString('nl-NL', {
        hour: '2-digit',
        minute: '2-digit'
      })}`;
      teken();
    } catch {
    }
  }, 120000);
  app.op('partituur', teken);
  app.op('project', teken);
  app.op('bewaar-project', async ({ naam }) => {
    try {
      const project = await bewaar(naam);
      status = `Bewaard: ${project.naam}`;
      await laadProjecten();
    } catch (fout) {
      status = fout.message || nietBereikbaar;
      teken();
    }
  });
  window.addEventListener('hashchange', tekenBibliotheekMappen);
  laadProjecten();
}
import { miniatuurSvg } from '../miniatuur.js';

