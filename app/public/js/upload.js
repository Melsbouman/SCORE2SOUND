// Een muziekbestand kiezen of slepen, naar de API sturen en het resultaat in app zetten.
import { voegSamen } from '/src/model/partijen.mjs';
import { importeerBestand } from '/src/import/importeer.mjs';

export function start(app) {
  const vlak = document.getElementById('upload');
  const kop = document.createElement('h2');
  kop.textContent = 'Open bladmuziek';

  const uitleg = document.createElement('p');
  uitleg.textContent = 'Sleep een PDF, scan, foto of MusicXML-bestand hierheen, of kies een bestand.';

  const stappen = document.createElement('ol');
  stappen.className = 'zacht';
  for (const tekst of [
    'Open een PDF, scan, foto of MusicXML-bestand.',
    'Bekijk de noten naast het origineel en corrigeer wat rood is.',
    'Luister, oefen per partij en exporteer.',
  ]) {
    const stap = document.createElement('li');
    stap.textContent = tekst;
    stappen.append(stap);
  }
  stappen.hidden = Boolean(app.stand.partituur);
  app.op('partituur', (partituur) => {
    stappen.hidden = Boolean(partituur);
  });

  const knop = document.createElement('button');
  knop.type = 'button';
  knop.className = 'knop knop--hoofd';
  knop.textContent = 'Kies een bestand';

  const paginaLabel = document.createElement('label');
  paginaLabel.append('Pagina’s (leeg is alles) ');
  const paginaVeld = document.createElement('input');
  paginaVeld.type = 'text';
  paginaVeld.placeholder = '1-4 7';
  paginaVeld.inputMode = 'text';
  paginaLabel.append(paginaVeld);

  const invoer = document.createElement('input');
  invoer.type = 'file';
  invoer.accept = '.musicxml,.xml,.mxl,.pdf,.png,.jpg,.jpeg';
  invoer.multiple = true;
  invoer.hidden = true;

  const status = document.createElement('p');
  status.className = 'zacht';
  status.setAttribute('role', 'status');

  vlak.replaceChildren(kop, uitleg, stappen, knop, paginaLabel, invoer, status);

  knop.addEventListener('click', () => invoer.click());

  let herkenning = null;

  async function openBestand(bestand, batch = null) {
    if (!bestand) return;

    if (herkenning) {
      status.textContent = 'Wacht tot de herkenning klaar is, of breek hem af.';
      return;
    }

    const toonStatus = (tekst) => {
      status.textContent = batch ? `Bestand ${batch.index} van ${batch.totaal}: ${bestand.name} — ${tekst}` : tekst;
    };

    if (/\.(pdf|png|jpe?g)$/i.test(bestand.name)) {
      return herken(bestand, toonStatus, batch !== null);
    }

    if (!/\.(musicxml|xml|mxl)$/i.test(bestand.name)) {
      toonStatus('Dit bestand kan de app niet openen. Kies een PDF, PNG, JPG of MusicXML-bestand.');
      return null;
    }

    toonStatus(`Bezig met lezen van ${bestand.name}…`);

    let resultaat;
    try {
      resultaat = await importeerBestand(new Uint8Array(await bestand.arrayBuffer()));
    } catch (fout) {
      toonStatus(`Het bestand kon niet worden geopend: ${fout.message}`);
      return null;
    }

    app.zet({ partituur: resultaat.partituur, meldingen: resultaat.meldingen, project: null });
    window.location.hash = '#bewerken';
    toonStatus(`Geopend: ${bestand.name}`);
    return { partituur: resultaat.partituur, meldingen: resultaat.meldingen };
  }

  async function herken(bestand, toonStatus = (tekst) => { status.textContent = tekst; }, batch = false) {
    const taak = { stop: false, voortgang: null, afbreken: null };
    herkenning = taak;
    toonStatus(`Bezig met uploaden van ${bestand.name}…`);
    let geopend = null;

    const ruimOp = () => {
      taak.voortgang?.remove();
      taak.afbreken?.remove();
    };
    const nietBereikbaar = () => {
      taak.stop = true;
      ruimOp();
      toonStatus('De server is niet bereikbaar. Probeer het opnieuw.');
    };

    try {
      let antwoord;
      try {
        antwoord = await fetch(
          `/api/herken?naam=${encodeURIComponent(bestand.name)}&paginas=${encodeURIComponent(paginaVeld.value.trim())}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/octet-stream' },
            body: bestand,
          },
        );
      } catch {
        nietBereikbaar();
        return;
      }

      let resultaat;
      try {
        resultaat = await antwoord.json();
      } catch (fout) {
        ruimOp();
        toonStatus(`Het bestand kon niet worden geopend: ${fout.message}`);
        return;
      }

      if (!antwoord.ok) {
        ruimOp();
        toonStatus(`Het bestand kon niet worden geopend: ${resultaat.fout ?? 'onbekende fout'}`);
        return;
      }

      taak.voortgang = document.createElement('progress');
      taak.voortgang.max = 100;
      taak.afbreken = document.createElement('button');
      taak.afbreken.type = 'button';
      taak.afbreken.className = 'knop';
      taak.afbreken.textContent = 'Afbreken';
      vlak.append(taak.voortgang, taak.afbreken);

      taak.afbreken.addEventListener('click', async () => {
        try {
          const antwoordAfbreken = await fetch(`/api/herken/${encodeURIComponent(resultaat.id)}`, {
            method: 'DELETE',
          });
          if (!antwoordAfbreken.ok) {
            const fout = await antwoordAfbreken.json();
            taak.stop = true;
            ruimOp();
            toonStatus(`Afbreken lukte niet: ${fout.fout ?? 'onbekende fout'}`);
          }
        } catch {
          nietBereikbaar();
        }
      });

      while (!taak.stop) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (taak.stop) break;

        let antwoordStatus;
        try {
          antwoordStatus = await fetch(`/api/herken/${encodeURIComponent(resultaat.id)}`);
        } catch {
          if (!taak.stop) nietBereikbaar();
          break;
        }
        if (taak.stop) break;

        let voortgang;
        try {
          voortgang = await antwoordStatus.json();
        } catch (fout) {
          taak.stop = true;
          ruimOp();
          toonStatus(`Herkennen lukte niet: ${fout.message}`);
          break;
        }
        if (taak.stop) break;

        if (!antwoordStatus.ok) {
          taak.stop = true;
          ruimOp();
          toonStatus(`Herkennen lukte niet: ${voortgang.fout ?? 'onbekende fout'}`);
          break;
        }

        taak.voortgang.value = voortgang.procent;
        toonStatus(voortgang.tekst);

        if (voortgang.stand === 'klaar') {
          taak.stop = true;
          ruimOp();
          geopend = { partituur: voortgang.partituur, meldingen: voortgang.meldingen };
          if (!batch) {
            app.zet({
              partituur: voortgang.partituur,
              meldingen: voortgang.meldingen,
              project: null,
            });
            window.location.hash = '#bewerken';
          }
          toonStatus(`Geopend: ${bestand.name}`);
        } else if (voortgang.stand === 'fout') {
          taak.stop = true;
          ruimOp();
          toonStatus(`Herkennen lukte niet: ${voortgang.fout}`);
        } else if (voortgang.stand === 'afgebroken') {
          taak.stop = true;
          ruimOp();
          toonStatus('Afgebroken.');
        }
      }
      return geopend;
    } finally {
      if (herkenning === taak) herkenning = null;
    }
  }

  async function openBestanden(bestanden) {
    if (bestanden.length < 2) {
      openBestand(bestanden[0]);
      return;
    }
    if (herkenning) {
      status.textContent = 'Wacht tot de herkenning klaar is, of breek hem af.';
      return;
    }

    let basis = null;
    let meldingen = [];
    const mislukt = [];
    let aantalGeopend = 0;

    for (let index = 0; index < bestanden.length; index += 1) {
      const bestand = bestanden[index];
      const voortgang = { index: index + 1, totaal: bestanden.length };
      try {
        const resultaat = await openBestand(bestand, voortgang);
        if (!resultaat) {
          mislukt.push(bestand.name);
          continue;
        }

        if (!basis) {
          basis = resultaat.partituur;
          meldingen = [...(resultaat.meldingen ?? [])];
        } else {
          const samengevoegd = voegSamen([basis, resultaat.partituur]);
          basis = samengevoegd.partituur;
          meldingen.push(...(resultaat.meldingen ?? []), ...samengevoegd.meldingen);
        }
        aantalGeopend += 1;
      } catch (fout) {
        mislukt.push(bestand.name);
        status.textContent = `Bestand ${index + 1} van ${bestanden.length}: ${bestand.name} — Het bestand kon niet worden geopend: ${fout.message}`;
      }
    }

    if (basis) {
      app.zet({ partituur: basis, meldingen, project: null });
      window.location.hash = '#bewerken';
    }
    if (mislukt.length) {
      status.textContent = basis
        ? `${aantalGeopend} bestanden geopend. Niet gelukt: ${mislukt.join(', ')}.`
        : `Geen bestand kon worden geopend. Niet gelukt: ${mislukt.join(', ')}.`;
    } else {
      status.textContent = `${aantalGeopend} bestanden geopend.`;
    }
  }

  invoer.addEventListener('change', () => {
    const bestanden = Array.from(invoer.files);
    invoer.value = '';
    openBestanden(bestanden);
  });

  vlak.addEventListener('dragover', (gebeurtenis) => {
    gebeurtenis.preventDefault();
    vlak.classList.add('sleept');
  });
  vlak.addEventListener('dragleave', (gebeurtenis) => {
    if (!gebeurtenis.relatedTarget || !vlak.contains(gebeurtenis.relatedTarget)) {
      vlak.classList.remove('sleept');
    }
  });
  vlak.addEventListener('drop', (gebeurtenis) => {
    gebeurtenis.preventDefault();
    vlak.classList.remove('sleept');
    openBestanden(Array.from(gebeurtenis.dataTransfer.files));
  });
}

const gewoneFetch = window.fetch.bind(window);

if (document.body.classList.contains('proef')) {
  window.fetch = async (invoer, opties = {}) => {
    let url = typeof invoer === 'string' ? invoer : invoer.url;
    url = url.replace('/api/herken', '/api/proef');

    if (opties.body instanceof FormData) {
      opties.body.delete('paginas');
    }

    const antwoord = await gewoneFetch(url, opties);
    if ([404, 429, 503].includes(antwoord.status)) {
      const body = await antwoord.clone().json().catch(() => ({}));
      if (body.fout) window.alert(body.fout);
    }
    return antwoord;
  };
}
