import { maakWachtwoordWijzigen } from './inloggen.js';

const emojis = ['🎵', '🎶', '🎼', '🎺', '🎷', '🎻', '🥁', '🎹', '🎸', '🪗', '🎤', '🎧', '🪕', '🎙️', '🪘', '🎚️'];
const maximaleBestandsgrootte = 10 * 1024 * 1024;

function pasThemaToe(thema) {
  if (thema === 'licht' || thema === 'donker') {
    document.documentElement.dataset.thema = thema;
  } else {
    delete document.documentElement.dataset.thema;
  }
}

function leesThema() {
  try {
    return localStorage.getItem('thema') || 'systeem';
  } catch {
    return 'systeem';
  }
}

function bewaarThema(thema) {
  try {
    localStorage.setItem('thema', thema);
  } catch {
    // Het thema blijft voor deze sessie actief als opslaan niet beschikbaar is.
  }
}

function afbeeldingElement(avatar, klasse) {
  if (avatar?.soort === 'afbeelding') {
    const afbeelding = document.createElement('img');
    afbeelding.className = klasse;
    afbeelding.src = avatar.waarde;
    afbeelding.alt = '';
    return afbeelding;
  }
  const emoji = document.createElement('span');
  emoji.className = klasse;
  emoji.setAttribute('aria-hidden', 'true');
  emoji.textContent = avatar?.waarde || '🎵';
  return emoji;
}

async function snijdAfbeelding(file) {
  if (!file || !['image/png', 'image/jpeg'].includes(file.type)) {
    throw new Error('Kies een afbeelding in png- of jpg-formaat.');
  }
  if (file.size > maximaleBestandsgrootte) {
    throw new Error('De afbeelding is te groot. Kies een bestand van maximaal 10 MB.');
  }

  let bron;
  try {
    bron = await createImageBitmap(file);
  } catch {
    throw new Error('Dit bestand kon niet als afbeelding worden geopend.');
  }
  const zijde = Math.min(bron.width, bron.height);
  if (!zijde) {
    bron.close();
    throw new Error('Dit bestand bevat geen geldige afbeelding.');
  }
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  context.drawImage(
    bron,
    (bron.width - zijde) / 2,
    (bron.height - zijde) / 2,
    zijde,
    zijde,
    0,
    0,
    128,
    128,
  );
  bron.close();
  return canvas.toDataURL('image/jpeg', 0.8);
}

export function start() {
  const bewaardThema = leesThema();
  pasThemaToe(bewaardThema);

  const vlak = document.querySelector('#instellingen');
  const kopTitel = document.querySelector('.kop__tekst h1');
  const kopTekst = document.querySelector('.kop__tekst p');
  if (!vlak || !kopTitel || !kopTekst) return;

  const oorspronkelijkeTitel = kopTitel.innerHTML;
  const oorspronkelijkeTekst = kopTekst.textContent;
  let geladen = false;

  function werkPaginaBij() {
    const open = window.location.hash === '#instellingen';
    document.body.classList.toggle('instellingen-open', open);
    if (!open) {
      kopTitel.innerHTML = oorspronkelijkeTitel;
      kopTekst.textContent = oorspronkelijkeTekst;
      return;
    }
    kopTitel.textContent = 'Instellingen';
    kopTekst.textContent = 'Beheer je profiel, account en weergave.';
    vlak.scrollIntoView({ block: 'start' });
    if (!geladen) laadInstellingen();
  }

  async function laadInstellingen() {
    geladen = true;
    vlak.innerHTML = '<p class="instellingen__laden">Instellingen laden…</p>';
    try {
      const antwoord = await fetch('/api/account');
      if (!antwoord.ok) throw new Error('Je instellingen konden niet worden geladen.');
      const { gebruiker } = await antwoord.json();
      tekenInstellingen(gebruiker);
    } catch (fout) {
      vlak.innerHTML = `<p class="instellingen__melding instellingen__melding--fout" role="status">${fout.message}</p>`;
    }
  }

  function tekenInstellingen(gebruiker) {
    let avatar = gebruiker.profiel?.avatar || { soort: 'emoji', waarde: '🎵' };
    vlak.innerHTML = `
      <div class="instellingen__intro">
        <span class="instellingen__label">Jouw account</span>
        <h2>Maak het <em>persoonlijk</em></h2>
        <p>Pas aan hoe je account eruitziet en beheer je inloggegevens.</p>
      </div>
      <form class="instellingen__formulier">
        <section class="instellingen__kaart">
          <h3>Profiel</h3>
          <label class="instellingen__veld">Naam
            <input name="naam" type="text" maxlength="40" autocomplete="name" value="">
          </label>
          <fieldset class="instellingen__avatarveld">
            <legend>Profielfoto</legend>
            <div class="instellingen__emojis" role="radiogroup" aria-label="Kies een muziek-emoji"></div>
            <label class="instellingen__bestandknop">
              Eigen afbeelding kiezen
              <input name="afbeelding" type="file" accept="image/png,image/jpeg,.png,.jpg,.jpeg">
            </label>
            <div class="instellingen__voorbeeld" aria-live="polite"></div>
            <p class="instellingen__afbeeldingfout instellingen__melding--fout" role="status"></p>
          </fieldset>
        </section>
        <section class="instellingen__kaart">
          <h3>Account</h3>
          <label class="instellingen__veld">E-mailadres
            <input name="email" type="email" readonly value="">
          </label>
          <div class="instellingen__wachtwoord"></div>
        </section>
        <section class="instellingen__kaart">
          <h3>Weergave</h3>
          <label class="instellingen__veld">Thema
            <select name="thema">
              <option value="systeem">Licht (standaard)</option>
              <option value="licht">Licht</option>
              <option value="donker">Donker</option>
            </select>
          </label>
        </section>
        <div class="instellingen__acties">
          <button class="instellingen__knop instellingen__knop--hoofd" type="submit">Opslaan</button>
          <p class="instellingen__melding" role="status" aria-live="polite"></p>
        </div>
      </form>`;

    const formulier = vlak.querySelector('form');
    const naam = formulier.elements.naam;
    const email = formulier.elements.email;
    const emojiRaster = vlak.querySelector('.instellingen__emojis');
    const voorbeeld = vlak.querySelector('.instellingen__voorbeeld');
    const afbeeldingFout = vlak.querySelector('.instellingen__afbeeldingfout');
    const melding = vlak.querySelector('.instellingen__acties [role="status"]');
    naam.value = gebruiker.profiel?.naam || '';
    email.value = gebruiker.email || '';
    formulier.elements.thema.value = ['systeem', 'licht', 'donker'].includes(bewaardThema)
      ? bewaardThema
      : 'systeem';
    formulier.elements.thema.addEventListener('change', () => {
      const thema = formulier.elements.thema.value;
      pasThemaToe(thema);
      bewaarThema(thema);
    });

    function tekenAvatar() {
      voorbeeld.replaceChildren(afbeeldingElement(avatar, 'instellingen__avatarvoorbeeld'));
      for (const knop of emojiRaster.querySelectorAll('button')) {
        const gekozen = avatar.soort === 'emoji' && knop.dataset.emoji === avatar.waarde;
        knop.classList.toggle('instellingen__emoji--gekozen', gekozen);
        knop.setAttribute('aria-checked', String(gekozen));
      }
    }

    for (const emoji of emojis) {
      const knop = document.createElement('button');
      knop.type = 'button';
      knop.className = 'instellingen__emoji';
      knop.dataset.emoji = emoji;
      knop.setAttribute('role', 'radio');
      knop.setAttribute('aria-label', `Kies ${emoji} als profielfoto`);
      knop.textContent = emoji;
      knop.addEventListener('click', () => {
        avatar = { soort: 'emoji', waarde: emoji };
        afbeeldingFout.textContent = '';
        tekenAvatar();
      });
      emojiRaster.append(knop);
    }
    tekenAvatar();

    formulier.elements.afbeelding.addEventListener('change', async () => {
      afbeeldingFout.textContent = '';
      const file = formulier.elements.afbeelding.files[0];
      try {
        avatar = { soort: 'afbeelding', waarde: await snijdAfbeelding(file) };
        tekenAvatar();
      } catch (fout) {
        afbeeldingFout.textContent = fout.message;
        formulier.elements.afbeelding.value = '';
      }
    });

    vlak.querySelector('.instellingen__wachtwoord').append(maakWachtwoordWijzigen());

    formulier.addEventListener('submit', async (gebeurtenis) => {
      if (gebeurtenis.target !== formulier) return;
      gebeurtenis.preventDefault();
      const knop = formulier.querySelector('.instellingen__knop--hoofd');
      knop.disabled = true;
      melding.classList.remove('instellingen__melding--fout');
      melding.textContent = '';
      try {
        const antwoord = await fetch('/api/account/profiel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ naam: naam.value, avatar }),
        });
        const resultaat = await antwoord.json();
        if (!antwoord.ok) throw new Error(resultaat.fout || 'Je profiel kon niet worden opgeslagen.');
        melding.textContent = 'Je instellingen zijn opgeslagen.';
        window.dispatchEvent(new CustomEvent('profiel-gewijzigd', { detail: resultaat.profiel }));
      } catch (fout) {
        melding.classList.add('instellingen__melding--fout');
        melding.textContent = fout.message || 'Je profiel kon niet worden opgeslagen.';
      } finally {
        knop.disabled = false;
      }
    });
  }

  window.addEventListener('hashchange', werkPaginaBij);
  werkPaginaBij();
}
