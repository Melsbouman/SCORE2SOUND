// Slepen uit het palet met de muis, een pen of een vinger (pointer events, dus ook op een telefoon of tablet), met een zwevend
// kaartje dat meebeweegt. Werkwijze:
// - Indrukken en een paar pixels bewegen maakt van een klik een sleep. Met een vinger of pen telt alleen een beweging opzij
//   (omhoog en omlaag schuift het palet), of even vasthouden; na vasthouden mag je alle kanten op.
// - Tijdens het slepen meldt het kaartje 'palet-sleep' met fase 'beweeg' en de plek; weergave.js laat het doel oplichten en geeft
//   in het bericht het doel terug (de plek in het model en het kader op het scherm).
// - Bij loslaten op een doel krimpt het kaartje naar het doel toe en komt het hokje op die plek; ernaast loslaten, Escape, een
//   ander venster of een muisknop die niet meer ingedrukt is laat het kaartje terugvliegen naar het palet.
// - Een klik na een sleep telt niet als klik. Een langzame tik (vasthouden zonder te bewegen) telt wel als klik.

const DREMPEL = 6; // pixels voordat indrukken een sleep wordt
const VASTHOUDEN = 350; // milliseconden vasthouden met een vinger of pen
const WEG = 220; // milliseconden voor het wegvliegen

const minderBeweging = () => globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
// Een vinger of pen schuift de pagina bij een beweging omhoog of omlaag; een muis niet.
const schuiftMee = (soort) => soort === 'touch' || soort === 'pen';

// Maak een paletknop sleepbaar. opties: { app, item, vlaggen, zet(plek) => boolean, klaar(gelukt) }.
export function maakSleepbaar(knop, { app, item, vlaggen, zet, klaar }) {
  let sleep = null;

  knop.addEventListener('pointerdown', (gebeurtenis) => {
    if (gebeurtenis.button !== 0 || sleep) return;
    sleep = {
      id: gebeurtenis.pointerId, soort: gebeurtenis.pointerType, startX: gebeurtenis.clientX, startY: gebeurtenis.clientY,
      x: gebeurtenis.clientX, y: gebeurtenis.clientY, bewogen: 0, bezig: false, doorVasthouden: false, spook: null, frame: 0,
      doel: null,
    };
    if (schuiftMee(sleep.soort)) {
      sleep.timer = setTimeout(() => {
        if (sleep && !sleep.bezig) {
          sleep.doorVasthouden = true;
          begin();
        }
      }, VASTHOUDEN);
    }
    window.addEventListener('pointermove', beweeg, { passive: false });
    window.addEventListener('pointerup', laatLos);
    window.addEventListener('pointercancel', breekAf);
    // In de vangfase: de editor vangt Escape zelf af (op document), en dan komt hij hier nooit aan.
    window.addEventListener('keydown', toets, true);
    window.addEventListener('blur', breekAfZonderPlek);
    document.addEventListener('visibilitychange', breekAfZonderPlek);
  });

  // Tijdens een sleep met een vinger mag de pagina niet schuiven (touch-action ligt vast bij het aanraken; alleen dit houdt het
  // schuiven na vasthouden tegen).
  knop.addEventListener('touchmove', (gebeurtenis) => {
    if (sleep?.bezig) gebeurtenis.preventDefault();
  }, { passive: false });

  // Een klik direct na een sleep is geen klik.
  knop.addEventListener('click', (gebeurtenis) => {
    if (knop.dataset.netGesleept) {
      delete knop.dataset.netGesleept;
      gebeurtenis.stopImmediatePropagation();
      gebeurtenis.preventDefault();
    }
  }, true);

  function geenKlik() {
    knop.dataset.netGesleept = '1';
    setTimeout(() => { delete knop.dataset.netGesleept; }, 400);
  }

  function beweeg(gebeurtenis) {
    if (!sleep || gebeurtenis.pointerId !== sleep.id) return;
    // Een muisknop die niet meer ingedrukt is (de pointerup ging verloren, bijvoorbeeld door een ander venster): afbreken.
    if (sleep.soort === 'mouse' && gebeurtenis.buttons === 0) return breekAf();
    sleep.x = gebeurtenis.clientX;
    sleep.y = gebeurtenis.clientY;
    const dx = Math.abs(sleep.x - sleep.startX);
    const dy = Math.abs(sleep.y - sleep.startY);
    sleep.bewogen = Math.max(sleep.bewogen, dx, dy);
    if (!sleep.bezig) {
      if (Math.max(dx, dy) < DREMPEL) return;
      // Een vinger of pen die omhoog of omlaag gaat, schuift het palet: dan geen sleep.
      if (schuiftMee(sleep.soort) && dy > dx) return ruimOp();
      begin();
    }
    gebeurtenis.preventDefault();
    if (!sleep.frame) sleep.frame = requestAnimationFrame(teken);
  }

  function begin() {
    clearTimeout(sleep.timer);
    sleep.bezig = true;
    const kader = knop.getBoundingClientRect();
    const spook = document.createElement('div');
    spook.className = 'palet-spook';
    spook.setAttribute('aria-hidden', 'true');
    for (const kind of knop.childNodes) spook.append(kind.cloneNode(true));
    document.body.append(spook);
    sleep.spook = spook;
    // De maat van het kaartje zelf, zodat het midden onder de muis of vinger staat.
    sleep.breedte = spook.offsetWidth || kader.width;
    sleep.hoogte = spook.offsetHeight || kader.height;
    // Het kaartje begint op de knop en springt dan naar de vinger of muis (een korte, zachte beweging).
    zetSpook(kader.left + kader.width / 2, kader.top + kader.height / 2, 1);
    spook.getBoundingClientRect();
    spook.classList.add('palet-spook--op');
    knop.classList.add('paletten__cel--sleept');
    document.body.classList.add('palet-sleept');
    if (schuiftMee(sleep.soort)) navigator.vibrate?.(8);
    try { knop.setPointerCapture?.(sleep.id); } catch {}
    teken();
  }

  // Verschuiven, draaien en schalen in één transform (opgetild: iets groter en schuin; boven een doel recht).
  function zetSpook(x, y, schaal, draai = 0) {
    const stil = minderBeweging();
    sleep.spook.style.transform = `translate(${Math.round(x - sleep.breedte / 2)}px, ${Math.round(y - sleep.hoogte / 2)}px) `
      + `rotate(${stil ? 0 : draai}deg) scale(${stil ? 1 : schaal})`;
  }

  function teken() {
    if (!sleep?.bezig) return;
    sleep.frame = 0;
    const bericht = { fase: 'beweeg', x: sleep.x, y: sleep.y, vlaggen, item };
    app.meld('palet-sleep', bericht);
    sleep.doel = bericht.doel ?? null;
    sleep.spook.classList.toggle('palet-spook--raak', Boolean(sleep.doel));
    // Een vinger bedekt het doel: dan zweeft het kaartje er iets boven.
    zetSpook(sleep.x, sleep.y - (sleep.soort === 'touch' ? 40 : 0), 1.12, sleep.doel ? 0 : -4);
    // Bij de boven- of onderrand van het venster schuift de pagina mee (op een telefoon staat het palet boven de partituur), maar
    // pas als je echt naar de rand toe beweegt (niet als de knop zelf al onderaan staat).
    const hoogte = globalThis.innerHeight;
    const naarRand = Math.abs(sleep.y - sleep.startY) > 60;
    const schuif = naarRand && typeof hoogte === 'number' && hoogte > 0 ? (sleep.y < 48 ? -14 : sleep.y > hoogte - 48 ? 14 : 0) : 0;
    if (schuif) {
      window.scrollBy?.(0, schuif);
      sleep.frame = requestAnimationFrame(teken);
    }
  }

  function laatLos(gebeurtenis) {
    if (!sleep || gebeurtenis.pointerId !== sleep.id) return;
    if (!sleep.bezig) return ruimOp();
    cancelAnimationFrame(sleep.frame);
    // Vastgehouden zonder te bewegen: een langzame tik. Dan telt het als klik (de click volgt vanzelf).
    if (sleep.doorVasthouden && sleep.bewogen < DREMPEL) {
      app.meld('palet-sleep', { fase: 'stop', vlaggen, item });
      return vliegTerug();
    }
    const bericht = { fase: 'los', x: sleep.x, y: sleep.y, vlaggen, item };
    app.meld('palet-sleep', bericht);
    geenKlik();
    if (bericht.doel) {
      const { kader, plek } = bericht.doel;
      const x = kader.left + kader.width / 2;
      const y = kader.top + kader.height / 2;
      vliegWeg(x, y, 0.3);
      plof(x, y);
      const gelukt = zet(plek);
      klaar?.(gelukt);
    } else {
      vliegTerug();
    }
  }

  function breekAf(gebeurtenis) {
    if (!sleep || (gebeurtenis?.pointerId !== undefined && gebeurtenis.pointerId !== sleep.id)) return;
    if (sleep.bezig) {
      app.meld('palet-sleep', { fase: 'stop', vlaggen, item });
      // Loslaten op de knop na afbreken is geen klik.
      geenKlik();
      vliegTerug();
    } else {
      ruimOp();
    }
  }

  function breekAfZonderPlek() {
    breekAf();
  }

  function toets(gebeurtenis) {
    if (gebeurtenis.key === 'Escape' && sleep?.bezig) {
      gebeurtenis.preventDefault();
      gebeurtenis.stopPropagation();
      breekAf();
    }
  }

  function vliegTerug() {
    const kader = knop.getBoundingClientRect();
    vliegWeg(kader.left + kader.width / 2, kader.top + kader.height / 2, 1);
  }

  // Het kaartje vliegt naar (x, y) en verdwijnt; daarna is alles opgeruimd.
  function vliegWeg(x, y, schaal) {
    const spook = sleep.spook;
    spook.classList.add('palet-spook--weg');
    zetSpook(x, y, schaal);
    const weg = () => spook.remove();
    if (minderBeweging()) weg();
    else {
      spook.addEventListener('transitionend', weg, { once: true });
      setTimeout(weg, WEG + 80);
    }
    ruimOp();
  }

  // Een kring die even opbloeit waar het hokje landde.
  function plof(x, y) {
    if (minderBeweging()) return;
    const kring = document.createElement('div');
    kring.className = 'palet-plof';
    kring.setAttribute('aria-hidden', 'true');
    kring.style.left = `${Math.round(x)}px`;
    kring.style.top = `${Math.round(y)}px`;
    document.body.append(kring);
    kring.addEventListener('animationend', () => kring.remove(), { once: true });
    setTimeout(() => kring.remove(), 800);
  }

  function ruimOp() {
    if (!sleep) return;
    clearTimeout(sleep.timer);
    cancelAnimationFrame(sleep.frame);
    try { knop.releasePointerCapture?.(sleep.id); } catch {}
    knop.classList.remove('paletten__cel--sleept');
    document.body.classList.remove('palet-sleept');
    window.removeEventListener('pointermove', beweeg);
    window.removeEventListener('pointerup', laatLos);
    window.removeEventListener('pointercancel', breekAf);
    window.removeEventListener('keydown', toets, true);
    window.removeEventListener('blur', breekAfZonderPlek);
    document.removeEventListener('visibilitychange', breekAfZonderPlek);
    sleep = null;
  }
}
