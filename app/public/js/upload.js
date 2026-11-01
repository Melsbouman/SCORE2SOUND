// Een muziekbestand kiezen of slepen, naar de API sturen en het resultaat in app zetten.
export function start(app) {
  const vlak = document.getElementById('upload');
  const kop = document.createElement('h2');
  kop.textContent = 'Open bladmuziek';

  const uitleg = document.createElement('p');
  uitleg.textContent = 'Sleep een PDF, scan, foto of MusicXML-bestand hierheen, of kies een bestand.';

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
  invoer.hidden = true;

  const status = document.createElement('p');
  status.className = 'zacht';
  status.setAttribute('role', 'status');

  vlak.replaceChildren(kop, uitleg, knop, paginaLabel, invoer, status);

  knop.addEventListener('click', () => invoer.click());

  let herkenning = null;

  async function openBestand(bestand) {
    if (!bestand) return;

    if (herkenning) {
      status.textContent = 'Wacht tot de herkenning klaar is, of breek hem af.';
      return;
    }

    if (/\.(pdf|png|jpe?g)$/i.test(bestand.name)) {
      herken(bestand);
      return;
    }

    if (!/\.(musicxml|xml|mxl)$/i.test(bestand.name)) {
      status.textContent = 'Dit bestand kan de app niet openen. Kies een PDF, PNG, JPG of MusicXML-bestand.';
      return;
    }

    status.textContent = `Bezig met lezen van ${bestand.name}…`;

    let antwoord;
    try {
      antwoord = await fetch('/api/importeer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/vnd.recordare.musicxml+xml' },
        body: bestand,
      });
    } catch {
      status.textContent = 'De server is niet bereikbaar. Probeer het opnieuw.';
      return;
    }

    let resultaat;
    try {
      resultaat = await antwoord.json();
    } catch (fout) {
      status.textContent = `Het bestand kon niet worden geopend: ${fout.message}`;
      return;
    }

    if (!antwoord.ok) {
      status.textContent = `Het bestand kon niet worden geopend: ${resultaat.fout ?? 'onbekende fout'}`;
      return;
    }

    app.zet({ partituur: resultaat.partituur, meldingen: resultaat.meldingen, project: null });
    status.textContent = `Geopend: ${bestand.name}`;
  }

  async function herken(bestand) {
    const taak = { stop: false, voortgang: null, afbreken: null };
    herkenning = taak;
    status.textContent = `Bezig met uploaden van ${bestand.name}…`;

    const ruimOp = () => {
      taak.voortgang?.remove();
      taak.afbreken?.remove();
    };
    const nietBereikbaar = () => {
      taak.stop = true;
      ruimOp();
      status.textContent = 'De server is niet bereikbaar. Probeer het opnieuw.';
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
        status.textContent = `Het bestand kon niet worden geopend: ${fout.message}`;
        return;
      }

      if (!antwoord.ok) {
        ruimOp();
        status.textContent = `Het bestand kon niet worden geopend: ${resultaat.fout ?? 'onbekende fout'}`;
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
            status.textContent = `Afbreken lukte niet: ${fout.fout ?? 'onbekende fout'}`;
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
          status.textContent = `Herkennen lukte niet: ${fout.message}`;
          break;
        }
        if (taak.stop) break;

        if (!antwoordStatus.ok) {
          taak.stop = true;
          ruimOp();
          status.textContent = `Herkennen lukte niet: ${voortgang.fout ?? 'onbekende fout'}`;
          break;
        }

        taak.voortgang.value = voortgang.procent;
        status.textContent = voortgang.tekst;

        if (voortgang.stand === 'klaar') {
          taak.stop = true;
          ruimOp();
          app.zet({
            partituur: voortgang.partituur,
            meldingen: voortgang.meldingen,
            project: null,
          });
          status.textContent = `Geopend: ${bestand.name}`;
        } else if (voortgang.stand === 'fout') {
          taak.stop = true;
          ruimOp();
          status.textContent = `Herkennen lukte niet: ${voortgang.fout}`;
        } else if (voortgang.stand === 'afgebroken') {
          taak.stop = true;
          ruimOp();
          status.textContent = 'Afgebroken.';
        }
      }
    } finally {
      if (herkenning === taak) herkenning = null;
    }
  }

  invoer.addEventListener('change', () => {
    const bestand = invoer.files[0];
    invoer.value = '';
    openBestand(bestand);
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
    openBestand(gebeurtenis.dataTransfer.files[0]);
  });
}
