function toonFout(element, tekst) {
  element.textContent = tekst;
}

export function maakWachtwoordWijzigen() {
  const vak = document.createElement('div');
  const wijzigKnop = document.createElement('button');
  wijzigKnop.type = 'button';
  wijzigKnop.textContent = 'Wachtwoord wijzigen';
  wijzigKnop.setAttribute('aria-expanded', 'false');
  const wijzigSectie = document.createElement('div');
  wijzigSectie.className = 'instellingen__wachtwoordformulier';
  wijzigSectie.hidden = true;
  wijzigSectie.innerHTML = `
    <form class="inloggen__formulier">
      <label>Huidig wachtwoord
        <input name="oud" type="password" autocomplete="current-password" required>
      </label>
      <label>Nieuw wachtwoord
        <input name="nieuw" type="password" autocomplete="new-password" required minlength="10">
      </label>
      <button class="knop" type="submit">Wachtwoord wijzigen</button>
      <p role="status" aria-live="polite"></p>
    </form>`;
  const formulier = wijzigSectie.querySelector('form');
  const melding = wijzigSectie.querySelector('[role="status"]');

  wijzigKnop.addEventListener('click', () => {
    wijzigSectie.hidden = !wijzigSectie.hidden;
    wijzigKnop.setAttribute('aria-expanded', String(!wijzigSectie.hidden));
    if (!wijzigSectie.hidden) formulier.elements.oud.focus();
  });

  formulier.addEventListener('submit', async (gebeurtenis) => {
    gebeurtenis.preventDefault();
    const knop = formulier.querySelector('[type="submit"]');
    const gegevens = new FormData(formulier);
    knop.disabled = true;
    melding.className = '';
    toonFout(melding, '');
    try {
      const resultaat = await fetch('/api/account/wachtwoord', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oud: gegevens.get('oud'), nieuw: gegevens.get('nieuw') }),
      });
      if (!resultaat.ok) {
        const antwoordJson = await resultaat.json();
        throw new Error(antwoordJson.fout || 'Het wachtwoord kon niet worden gewijzigd.');
      }
      formulier.reset();
      toonFout(melding, 'Je wachtwoord is gewijzigd.');
    } catch (fout) {
      melding.className = 'melding--fout';
      toonFout(melding, fout.message || 'Het wachtwoord kon niet worden gewijzigd. Controleer je verbinding en probeer het opnieuw.');
    } finally {
      knop.disabled = false;
    }
  });

  vak.append(wijzigKnop, wijzigSectie);
  return vak;
}

function maakAvatar(avatar) {
  if (avatar?.soort === 'afbeelding') {
    const afbeelding = document.createElement('img');
    afbeelding.className = 'zijbalk__avatar';
    afbeelding.src = avatar.waarde;
    afbeelding.alt = '';
    return afbeelding;
  }
  const emoji = document.createElement('span');
  emoji.className = 'zijbalk__avatar';
  emoji.setAttribute('aria-hidden', 'true');
  emoji.textContent = avatar?.waarde || '🎵';
  return emoji;
}

function werkActievePlekBij() {
  const hash = window.location.hash || '#nieuw';
  const links = [...document.querySelectorAll('.zijbalk__item')];
  for (const link of links) link.removeAttribute('aria-current');
  const passend = links.filter(link => link.getAttribute('href') === hash);
  passend.at(-1)?.setAttribute('aria-current', 'page');
}

export function start() {
  const sectie = document.querySelector('#inloggen');
  const kop = document.querySelector('header.kop');
  if (!sectie || !kop) return;
  werkActievePlekBij();
  window.addEventListener('hashchange', werkActievePlekBij);
  // Proefmodus (?proef=1): geen inlog, de editor is zichtbaar; de rest staat onderaan dit bestand.
  if (new URLSearchParams(window.location.search).get('proef') === '1') return;

  document.body.classList.add('inloggen-niet-ingelogd');
  fetch('/api/account')
    .then(async (antwoord) => {
      if (antwoord.status === 404) {
        document.body.classList.remove('inloggen-niet-ingelogd');
        return;
      }
      if (antwoord.status === 401) {
        sectie.innerHTML = `
          <h2>Inloggen</h2>
          <p>Log in of registreer om SCORE2SOUND te gebruiken.</p>
          <form class="inloggen__formulier">
            <label>E-mailadres
              <input name="email" type="email" autocomplete="email" required>
            </label>
            <label>Wachtwoord
              <input name="wachtwoord" type="password" autocomplete="current-password" required>
            </label>
            <label>Uitnodigingscode <span class="zacht">(alleen bij registreren)</span>
              <input name="code" type="text" autocomplete="off">
            </label>
            <div class="inloggen__knoppen">
              <button class="knop knop--hoofd" type="submit" name="handeling" value="login">Inloggen</button>
              <button class="knop" type="submit" name="handeling" value="registreer">Registreren</button>
            </div>
            <p class="inloggen__fout melding--fout" role="status" aria-live="polite"></p>
          </form>`;

        const formulier = sectie.querySelector('form');
        const foutElement = sectie.querySelector('[role="status"]');
        formulier.addEventListener('submit', async (gebeurtenis) => {
          gebeurtenis.preventDefault();
          const knop = gebeurtenis.submitter || formulier.querySelector('[value="login"]');
          const gegevens = new FormData(formulier);
          const handeling = knop?.value === 'registreer' ? 'registreer' : 'login';
          const inhoud = {
            email: gegevens.get('email'),
            wachtwoord: gegevens.get('wachtwoord'),
          };
          if (handeling === 'registreer') inhoud.code = gegevens.get('code');

          knop.disabled = true;
          toonFout(foutElement, '');
          try {
            const resultaat = await fetch(`/api/account/${handeling}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(inhoud),
            });
            const antwoordJson = await resultaat.json();
            if (!resultaat.ok) {
              toonFout(foutElement, antwoordJson.fout || 'Inloggen is niet gelukt.');
              return;
            }
            window.location.reload();
          } catch {
            toonFout(foutElement, 'Inloggen is niet gelukt. Controleer je verbinding en probeer het opnieuw.');
          } finally {
            knop.disabled = false;
          }
        });
        return;
      }

      if (!antwoord.ok) throw new Error('Het account kon niet worden gecontroleerd.');
      const gegevens = await antwoord.json();
      if (!gegevens.gebruiker?.email) throw new Error('De accountgegevens zijn onvolledig.');

      document.body.classList.remove('inloggen-niet-ingelogd');
      const accountVak = document.getElementById('account');
      if (!accountVak) return;
      const accountKnop = document.createElement('button');
      accountKnop.className = 'zijbalk__accountknop';
      accountKnop.type = 'button';
      accountKnop.setAttribute('aria-expanded', 'false');
      accountKnop.setAttribute('aria-controls', 'account-menu');
      accountKnop.append(maakAvatar(gegevens.gebruiker.profiel?.avatar));
      const accountNaam = document.createElement('span');
      accountNaam.textContent = gegevens.gebruiker.profiel?.naam || 'Jouw account';
      accountKnop.append(accountNaam);
      const menu = document.createElement('div');
      menu.className = 'zijbalk__accountmenu';
      menu.id = 'account-menu';
      menu.hidden = true;
      const instellingen = document.createElement('a');
      instellingen.href = '#instellingen';
      instellingen.textContent = 'Instellingen';
      const uitloggen = document.createElement('button');
      uitloggen.type = 'button';
      uitloggen.className = 'zijbalk__uitlogknop';
      uitloggen.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 5H5v14h5m4-3 4-4-4-4m4 4H9"/></svg><span>Uitloggen</span>';
      const foutElement = document.createElement('span');
      foutElement.className = 'zijbalk__uitlogfout';
      foutElement.setAttribute('role', 'status');
      menu.append(instellingen);
      accountVak.replaceChildren(accountKnop, menu);
      document.getElementById('uitloggen')?.replaceChildren(uitloggen, foutElement);

      function sluitMenu() {
        menu.hidden = true;
        accountKnop.setAttribute('aria-expanded', 'false');
      }

      accountKnop.addEventListener('click', () => {
        menu.hidden = !menu.hidden;
        accountKnop.setAttribute('aria-expanded', String(!menu.hidden));
        if (!menu.hidden) menu.querySelector('a')?.focus();
      });

      instellingen.addEventListener('click', sluitMenu);

      document.addEventListener('click', (gebeurtenis) => {
        if (!accountVak.contains(gebeurtenis.target)) sluitMenu();
      });
      document.addEventListener('keydown', (gebeurtenis) => {
        if (gebeurtenis.key !== 'Escape' || menu.hidden) return;
        gebeurtenis.preventDefault();
        sluitMenu();
        accountKnop.focus();
      });

      window.addEventListener('profiel-gewijzigd', (gebeurtenis) => {
        accountKnop.firstElementChild?.replaceWith(maakAvatar(gebeurtenis.detail?.avatar));
        accountNaam.textContent = gebeurtenis.detail?.naam || 'Jouw account';
      });

      uitloggen.addEventListener('click', async () => {
        uitloggen.disabled = true;
        toonFout(foutElement, '');
        try {
          const resultaat = await fetch('/api/account/uit', { method: 'POST' });
          if (!resultaat.ok) throw new Error('Uitloggen is niet gelukt.');
          window.location.reload();
        } catch {
          toonFout(foutElement, 'Uitloggen is niet gelukt. Probeer het opnieuw.');
          uitloggen.disabled = false;
        }
      });
    })
    .catch((fout) => {
      sectie.innerHTML = '<p class="melding--fout" role="status"></p>';
      toonFout(sectie.querySelector('[role="status"]'), fout.message || 'Het account kon niet worden gecontroleerd.');
    });
}

const proefmodus = new URLSearchParams(window.location.search).get('proef') === '1';

if (proefmodus) {
  document.body.classList.add('proef');
  document.body.classList.remove('inloggen-niet-ingelogd');

  const proefmelding = document.createElement('p');
  proefmelding.className = 'proef-melding';
  proefmelding.textContent = 'Dit is een proef: één pagina, met watermerk. Log in om alles te gebruiken.';
  document.body.prepend(proefmelding);
}
