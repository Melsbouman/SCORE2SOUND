function toonFout(element, tekst) {
  element.textContent = tekst;
}

export function start() {
  const sectie = document.querySelector('#inloggen');
  const kop = document.querySelector('header.kop');
  if (!sectie || !kop) return;

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
      const gebruiker = document.createElement('div');
      gebruiker.className = 'inloggen__gebruiker';
      const email = document.createElement('span');
      email.textContent = gegevens.gebruiker.email;
      const uitloggen = document.createElement('button');
      uitloggen.className = 'knop';
      uitloggen.type = 'button';
      uitloggen.textContent = 'Uitloggen';
      const foutElement = document.createElement('span');
      foutElement.className = 'inloggen__uitlogfout';
      foutElement.setAttribute('role', 'status');
      const wijzigKnop = document.createElement('button');
      wijzigKnop.className = 'knop';
      wijzigKnop.type = 'button';
      wijzigKnop.textContent = 'Wachtwoord wijzigen';
      wijzigKnop.setAttribute('aria-expanded', 'false');
      wijzigKnop.setAttribute('aria-controls', 'inloggen-wachtwoord-wijzigen');
      const wijzigSectie = document.createElement('div');
      wijzigSectie.id = 'inloggen-wachtwoord-wijzigen';
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
          <p class="melding--fout" role="status" aria-live="polite"></p>
        </form>`;
      const wijzigFormulier = wijzigSectie.querySelector('form');
      const wijzigFout = wijzigSectie.querySelector('[role="status"]');
      const verwijderenKnop = document.createElement('button');
      verwijderenKnop.className = 'knop';
      verwijderenKnop.type = 'button';
      verwijderenKnop.textContent = 'Account verwijderen';
      verwijderenKnop.setAttribute('aria-expanded', 'false');
      verwijderenKnop.setAttribute('aria-controls', 'inloggen-account-verwijderen');
      const verwijderenSectie = document.createElement('div');
      verwijderenSectie.id = 'inloggen-account-verwijderen';
      verwijderenSectie.hidden = true;
      verwijderenSectie.innerHTML = `
        <p>Let op: als je je account verwijdert, worden je account en al je gegevens definitief verwijderd.</p>
        <form class="inloggen__formulier">
          <label>Vul je wachtwoord in om je account te verwijderen
            <input name="wachtwoord" type="password" autocomplete="current-password" required>
          </label>
          <button class="knop" type="submit">Account definitief verwijderen</button>
          <p class="melding--fout" role="status" aria-live="polite"></p>
        </form>`;
      const verwijderenFormulier = verwijderenSectie.querySelector('form');
      const verwijderenFout = verwijderenSectie.querySelector('[role="status"]');
      gebruiker.append(email, uitloggen, foutElement, wijzigKnop, wijzigSectie, verwijderenKnop, verwijderenSectie);
      const accountVak = document.getElementById("account"); (accountVak ?? kop).append(gebruiker);

      wijzigKnop.addEventListener('click', () => {
        wijzigSectie.hidden = !wijzigSectie.hidden;
        wijzigKnop.setAttribute('aria-expanded', String(!wijzigSectie.hidden));
      });

      wijzigFormulier.addEventListener('submit', async (gebeurtenis) => {
        gebeurtenis.preventDefault();
        const knop = wijzigFormulier.querySelector('[type="submit"]');
        const formulierGegevens = new FormData(wijzigFormulier);
        knop.disabled = true;
        toonFout(wijzigFout, '');
        try {
          const resultaat = await fetch('/api/account/wachtwoord', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              oud: formulierGegevens.get('oud'),
              nieuw: formulierGegevens.get('nieuw'),
            }),
          });
          if (!resultaat.ok) {
            const antwoordJson = await resultaat.json();
            toonFout(wijzigFout, antwoordJson.fout || 'Het wachtwoord kon niet worden gewijzigd.');
            return;
          }
          wijzigFormulier.reset();
          wijzigSectie.hidden = true;
          wijzigKnop.setAttribute('aria-expanded', 'false');
          toonFout(wijzigFout, 'Je wachtwoord is gewijzigd.');
        } catch {
          toonFout(wijzigFout, 'Het wachtwoord kon niet worden gewijzigd. Controleer je verbinding en probeer het opnieuw.');
        } finally {
          knop.disabled = false;
        }
      });

      verwijderenKnop.addEventListener('click', () => {
        verwijderenSectie.hidden = !verwijderenSectie.hidden;
        verwijderenKnop.setAttribute('aria-expanded', String(!verwijderenSectie.hidden));
      });

      verwijderenFormulier.addEventListener('submit', async (gebeurtenis) => {
        gebeurtenis.preventDefault();
        const knop = verwijderenFormulier.querySelector('[type="submit"]');
        const formulierGegevens = new FormData(verwijderenFormulier);
        knop.disabled = true;
        toonFout(verwijderenFout, '');
        try {
          const resultaat = await fetch('/api/account', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wachtwoord: formulierGegevens.get('wachtwoord') }),
          });
          if (!resultaat.ok) {
            const antwoordJson = await resultaat.json();
            toonFout(verwijderenFout, antwoordJson.fout || 'Je account kon niet worden verwijderd.');
            return;
          }
          window.location.reload();
        } catch {
          toonFout(verwijderenFout, 'Je account kon niet worden verwijderd. Controleer je verbinding en probeer het opnieuw.');
        } finally {
          knop.disabled = false;
        }
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
