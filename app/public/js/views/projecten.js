const nietBereikbaar = 'De server is niet bereikbaar. Probeer het opnieuw.';

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
  let projecten = null;
  let status = '';

  function teken() {
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
          const project = await vraag('/api/projecten', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: app.stand.project?.id,
              naam,
              partituur: app.stand.partituur
            })
          });
          app.zet({ project: { id: project.id, naam: project.naam } });
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
        const leeg = document.createElement('p');
        leeg.className = 'zacht';
        leeg.textContent = 'Nog geen bewaarde projecten.';
        vlak.append(leeg);
      } else {
        const lijst = document.createElement('div');
        lijst.className = 'projecten__lijst';
        for (const project of projecten) {
          const knop = document.createElement('button');
          const bijgewerkt = document.createElement('span');
          knop.type = 'button';
          knop.className = 'knop';
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
              app.zet({
                partituur: geopend.partituur,
                meldingen: [],
                project: { id: geopend.id, naam: geopend.naam }
              });
            } catch (fout) {
              status = fout.message || nietBereikbaar;
              teken();
            }
          });
          lijst.append(knop);
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
  app.op('partituur', teken);
  app.op('project', teken);
  laadProjecten();
}
