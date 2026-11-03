// Speler: afspelen, pauze, tempo en een passage herhalen, met spessasynth en een General MIDI-klankbank.
// Speelt het MIDI-bestand uit schrijfMidi (/src/midi/schrijven.mjs) af.
// Leest app.stand.mixer: { [partijId]: { volume: 0-127, gedempt, solo } } (gezet door het mixerscherm).
// Meldt app.meld('speel-maat', { maat }) tijdens het spelen, en { maat: null } als hij stopt.
// Luistert naar 'naar-maat': de speler begint dan bij die maat.
const KLANKBANK = '/klankbank/standaard.sf3';
const PROCESSOR = '/vendor/spessasynth/spessasynth_processor.min.js';

let geluid = null; // { context, synth, seq }, één keer per pagina

async function maakGeluid() {
  const { WorkletSynthesizer, Sequencer } = await import('/vendor/spessasynth/index.js');
  const context = new AudioContext();
  await context.audioWorklet.addModule(PROCESSOR);
  const synth = new WorkletSynthesizer(context);
  synth.connect(context.destination);
  const antwoord = await fetch(KLANKBANK);
  if (!antwoord.ok) throw Object.assign(new Error('geen klankbank'), { soort: 'klankbank' });
  await synth.soundBankManager.addSoundBank(await antwoord.arrayBuffer(), 'main');
  await synth.isReady;
  return { context, synth, seq: new Sequencer(synth) };
}

export function start(app) {
  startSpeler(app);

  const voortgang = document.querySelector('.speler__voortgang');
  const gevuld = voortgang.querySelector('span');
  voortgang.tabIndex = 0;

  function gaNaarMaat(maat) {
    const aantalMaten = app.stand.partituur.partijen[0].maten.length;
    const begrensdeMaat = Math.min(aantalMaten - 1, Math.max(0, maat));
    app.meld('naar-maat', { maat: begrensdeMaat });
    gevuld.style.width = `${(begrensdeMaat + 1) / aantalMaten * 100}%`;
  }

  function gaNaarPointer(gebeurtenis) {
    const kader = voortgang.getBoundingClientRect();
    const fractie = Math.min(1, Math.max(0, (gebeurtenis.clientX - kader.left) / kader.width));
    const aantalMaten = app.stand.partituur.partijen[0].maten.length;
    const maat = Math.round(fractie * (aantalMaten - 1));
    gaNaarMaat(maat);
  }

  voortgang.addEventListener('pointerdown', (gebeurtenis) => {
    voortgang.setPointerCapture(gebeurtenis.pointerId);
    gaNaarPointer(gebeurtenis);
  });
  voortgang.addEventListener('pointermove', (gebeurtenis) => {
    if (gebeurtenis.buttons) gaNaarPointer(gebeurtenis);
  });
  voortgang.addEventListener('keydown', (gebeurtenis) => {
    if (gebeurtenis.key !== 'ArrowLeft' && gebeurtenis.key !== 'ArrowRight') return;
    gebeurtenis.preventDefault();
    const aantalMaten = app.stand.partituur.partijen[0].maten.length;
    const huidigeMaat = Math.round((parseFloat(gevuld.style.width) || 0) / 100 * aantalMaten) - 1;
    gaNaarMaat(huidigeMaat + (gebeurtenis.key === 'ArrowLeft' ? -1 : 1));
  });
}

// Kanaal per partij, zoals in schrijfMidi: kanaal 9 (slagwerk) wordt overgeslagen.
import { kanaalVan } from '/src/midi/schrijven.mjs';
import { maatLengte } from '/src/model/duur.mjs';
import { maakVolumeOp } from '/src/midi/dynamiek.mjs';
import { leesId } from '/src/model/corrigeren.mjs';

// Kanaal per partij, zoals in schrijfMidi: elke poort heeft 16 kanalen en kanaal 9 (slagwerk) wordt overgeslagen.
const kanaal = (index) => { const plek = kanaalVan(index); return plek.poort * 16 + plek.kanaal; };

const VOLUME_DYNAMIEKEN = [
  ['ppp', 30], ['pp', 40], ['p', 55], ['mp', 68], ['mf', 80], ['f', 95], ['ff', 110], ['fff', 120],
];
const DYNAMIEKTEKSTEN = new Set(['cresc.', 'cresc', 'crescendo', 'dim.', 'dimin.', 'decresc.', 'decrescendo']);

function maatDuur(maat) {
  if (!maat.opmaat) return maatLengte(maat.maatsoort);
  return maat.elementen
    .filter((element) => element.soort === 'noot' || element.soort === 'rust')
    .reduce((einde, element) => Math.max(einde, element.start + element.duur), 0);
}

function metDynamiek(partituur) {
  if (!partituur) return partituur;
  return {
    ...partituur,
    partijen: partituur.partijen.map((partij) => {
      const volume = maakVolumeOp(partij);
      let maatBegin = 0;
      const maten = partij.maten.map((maat) => {
        const elementen = [];
        for (const element of maat.elementen) {
          const aanwijzing = element.soort === 'aanwijzing';
          const tekst = String(element.waarde ?? '').trim().toLowerCase();
          const isVerlooptekst = aanwijzing && element.type === 'tekst' && DYNAMIEKTEKSTEN.has(tekst);
          const eenmaligeDynamiek = aanwijzing && element.type === 'dynamiek' && ['sf', 'sfz', 'fp'].includes(tekst);
          if (aanwijzing && ((element.type === 'dynamiek' && !eenmaligeDynamiek)
            || element.type === 'crescendo' || element.type === 'decrescendo' || isVerlooptekst)) {
            continue;
          }
          if (element.soort === 'noot' && !element.voorslag) {
            const kracht = volume(maatBegin + element.start);
            const dynamiek = VOLUME_DYNAMIEKEN.reduce((beste, kandidaat) =>
              Math.abs(kandidaat[1] - kracht) < Math.abs(beste[1] - kracht) ? kandidaat : beste
            )[0];
            elementen.push({ soort: 'aanwijzing', start: element.start, type: 'dynamiek', waarde: dynamiek, zekerheid: 1 });
          }
          elementen.push(element);
        }
        maatBegin += maatDuur(maat);
        return { ...maat, elementen };
      });
      return { ...partij, maten };
    }),
  };
}

function startSpeler(app) {
  const vlak = document.getElementById('speler');
  let tijden = []; // begin van elke gespeelde maat in seconden; herhaalde maten staan er meer keer in
  let volgorde = []; // welke maat op elke plek in tijden klinkt
  let geladen = false;
let speelMaat = null;
let doelMaat = null;
  let lus = 0;
  let luisterNaar = null; // een bewaarde versie die klinkt in plaats van de huidige partituur

  const knop = (klasse = 'knop') => Object.assign(document.createElement('button'), { type: 'button', className: klasse });
  const veld = (label, ...invoeren) => {
    const l = document.createElement('label');
    l.className = 'speler__veld';
    l.append(label, ...invoeren);
    return l;
  };
  const speel = knop('knop knop--hoofd speler__spelen');
  const stop = knop('knop speler__begin');
  const volgende = knop('knop speler__volgende');
  stop.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2v14H6zM20 5v14L9 12z"/></svg>';
  stop.setAttribute('aria-label', 'Naar het begin');
  volgende.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 5h2v14h-2zM4 5v14l11-7z"/></svg>';
  volgende.setAttribute('aria-label', 'Volgende maat');
  function zetSpeelKnop(speelt) {
    speel.innerHTML = speelt
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5h4v14H7zM13 5h4v14h-4z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
    speel.setAttribute('aria-label', speelt ? 'Pauze' : 'Afspelen');
  }
  zetSpeelKnop(false);
  let voortgangVulling = null;
  const tempo = Object.assign(document.createElement('input'), { type: 'range', min: 25, max: 150, step: 5, value: 100 });
  const tempoPercentage = Object.assign(document.createElement('input'), { type: 'number', min: 10, max: 300, step: 1, value: 100 });
  tempoPercentage.setAttribute('aria-label', 'Tempo in procenten');
  const tempoTekst = document.createElement('span');
  const metronoom = Object.assign(document.createElement('input'), { type: 'checkbox' });
  const voorinteller = document.createElement('select');
  voorinteller.append(
    ...[['0', 'Geen'], ['1', '1 maat'], ['2', '2 maten']].map(([waarde, tekst]) =>
      Object.assign(document.createElement('option'), { value: waarde, textContent: tekst })
    )
  );
  try {
    const keuze = JSON.parse(localStorage.getItem('speler-metronoom') ?? 'null');
    if (typeof keuze?.metronoom === 'boolean') metronoom.checked = keuze.metronoom;
    if (['0', '1', '2'].includes(keuze?.voorinteller)) voorinteller.value = keuze.voorinteller;
  } catch {}
  voorinteller.disabled = !metronoom.checked;
  const van = Object.assign(document.createElement('input'), { type: 'text', value: '1', inputMode: 'numeric', size: 4 });
  const tot = Object.assign(document.createElement('input'), { type: 'text', value: '1', inputMode: 'numeric', size: 4 });
  const herhaal = Object.assign(document.createElement('input'), { type: 'checkbox' });
  const status = Object.assign(document.createElement('p'), { className: 'zacht' });
  status.setAttribute('role', 'status');

  function teken() {
    const passageVlak = document.getElementById('passage');
    if (!app.stand.partituur) {
      passageVlak?.replaceChildren();
      voortgangVulling = null;
      return vlak.replaceChildren();
    }
    const links = document.createElement('div');
    links.className = 'speler__links';
    links.append(
      Object.assign(document.createElement('span'), { className: 'speler__titel', textContent: app.stand.partituur.titel || 'SCORE2SOUND' }),
      Object.assign(document.createElement('span'), { className: 'speler__partij', textContent: app.stand.partituur.partijen[0]?.naam ?? '' })
    );
    const midden = document.createElement('div');
    midden.className = 'speler__midden';
    const knoppen = document.createElement('div');
    knoppen.className = 'speler__knoppen';
    knoppen.append(stop, speel, volgende);
    const voortgang = document.createElement('div');
    voortgang.className = 'speler__voortgang';
    voortgang.tabIndex = 0;
    voortgang.setAttribute('role', 'progressbar');
    voortgang.setAttribute('aria-label', 'Voortgang');
    voortgang.setAttribute('aria-valuemin', '0');
    voortgang.setAttribute('aria-valuemax', '100');
    voortgang.setAttribute('aria-valuenow', '0');
    voortgangVulling = document.createElement('span');
    voortgangVulling.style.width = '0%';
    voortgang.append(voortgangVulling);
    const zoekMaat = (maat) => {
      const aantalMaten = app.stand.partituur.partijen[0].maten.length;
      if (!aantalMaten) return;
      voortgangVulling.style.width = `${(maat + 1) / aantalMaten * 100}%`;
      voortgang.setAttribute('aria-valuenow', String((maat + 1) / aantalMaten * 100));
      app.meld('naar-maat', { maat });
    };
    const zoekVanafPointer = (gebeurtenis) => {
      const kader = voortgang.getBoundingClientRect();
      const aantalMaten = app.stand.partituur.partijen[0].maten.length;
      if (!aantalMaten || !kader.width) return;
      const fractie = Math.min(1, Math.max(0, (gebeurtenis.clientX - kader.left) / kader.width));
      const maat = Math.round(fractie * (aantalMaten - 1));
      zoekMaat(maat);
    };
    voortgang.addEventListener('pointerdown', (gebeurtenis) => {
      voortgang.setPointerCapture(gebeurtenis.pointerId);
      zoekVanafPointer(gebeurtenis);
    });
    voortgang.addEventListener('pointermove', (gebeurtenis) => {
      if (gebeurtenis.buttons) zoekVanafPointer(gebeurtenis);
    });
    voortgang.addEventListener('keydown', (gebeurtenis) => {
      if (gebeurtenis.key !== 'ArrowLeft' && gebeurtenis.key !== 'ArrowRight') return;
      gebeurtenis.preventDefault();
      const aantalMaten = app.stand.partituur.partijen[0].maten.length;
      if (!aantalMaten) return;
      const huidige = speelMaat ?? doelMaat ?? 0;
      zoekMaat(Math.min(aantalMaten - 1, Math.max(0, huidige + (gebeurtenis.key === 'ArrowRight' ? 1 : -1))));
    });
    midden.append(knoppen, voortgang);
    const rechts = document.createElement('div');
    rechts.className = 'speler__rechts';
    const passage = document.createElement('fieldset');
    passage.className = 'speler__passage';
    passage.append(Object.assign(document.createElement('legend'), { textContent: 'Passage herhalen' }), veld('Van maat ', van), veld('tot en met maat ', tot), veld(herhaal, document.createTextNode(' Herhalen')));
    rechts.append(veld('Tempo ', tempo, tempoPercentage), tempoTekst, veld(metronoom, document.createTextNode(' Metronoom')), veld('Voorinteller ', voorinteller));
    if (passageVlak) passageVlak.replaceChildren(passage);
    else rechts.append(passage);
    vlak.replaceChildren(links, midden, rechts, status);
    werkTempoTekstBij();
  }

  const begintempo = () => app.stand.partituur?.partijen[0]?.maten[0]?.tempo ?? 120;
  function werkTempoTekstBij() {
    const percentage = Number(tempoPercentage.value);
    tempoTekst.textContent = ` ${percentage}% (${Math.round(begintempo() * percentage / 100)} bpm)`;
  }

  function pasTempoToe(percentage) {
    if (!Number.isFinite(percentage) || percentage < 10 || percentage > 300) return;
    if (percentage < 25 || percentage > 150) {
      tempo.min = 10;
      tempo.max = 300;
    }
    tempo.value = String(percentage);
    tempoPercentage.value = String(percentage);
    werkTempoTekstBij();
    if (geluid) geluid.seq.playbackRate = percentage / 100;
  }

  const maatIndex = (seconden) => {
    if (seconden < 0) return -1;
    let i = 0;
    while (i + 1 < tijden.length && tijden[i + 1] <= seconden + 1e-6) i++;
    return i;
  };
  const voorintellerSeconden = () => {
    if (!metronoom.checked || Number(voorinteller.value) === 0) return 0;
    const eersteMaat = maten()[0];
    const maatsoort = eersteMaat?.maatsoort ?? { teller: 4, noemer: 4 };
    const tikken = maatsoort.teller * 1920 / maatsoort.noemer;
    return Number(voorinteller.value) * tikken / 480 * 60 / (eersteMaat?.tempo ?? 120);
  };
  const maten = () => app.stand.partituur?.partijen[0]?.maten ?? [];
  const geldigeMaat = (invoer) => maatIndexVanNummer(maten(), invoer.value);
  const eersteKeer = (maat) => Math.max(0, volgorde.indexOf(maat));
  function zetSpeelpositie(maat) {
    if (!Number.isInteger(maat) || maat < 0 || maat >= maten().length) return;
    doelMaat = maat;
    const tijd = tijden[eersteKeer(maat)];
    if (geluid && geladen && tijd !== undefined) {
      geluid.seq.currentTime = tijd + voorintellerSeconden();
      if (!geluid.seq.paused) doelMaat = null;
    }
  }

  function pasMixerToe() {
    if (!geluid || !app.stand.partituur) return;
    const mixer = app.stand.mixer ?? {};
    const solo = Object.values(mixer).some((m) => m.solo);
    app.stand.partituur.partijen.forEach((partij, index) => {
      const kanaalObject = geluid.synth.midiChannels[kanaal(index)];
      if (!kanaalObject) return;
      const instelling = mixer[partij.id] ?? {};
      kanaalObject.setSystemParameter('gain', (instelling.volume ?? 100) / 100);
      kanaalObject.setSystemParameter('isMuted', Boolean(instelling.gedempt || (solo && !instelling.solo)));
    });
  }

  function volg() {
    if (!geluid || geluid.seq.paused) return;
    let t = geluid.seq.currentTime;
    // Aan het einde van het stuk: terug naar de beginstand, tenzij een passage herhaald wordt.
    // Direct na play() is de duur soms nog 0; pas een bekende duur telt als einde.
    const duur = geluid.seq.duration;
    if (!herhaal.checked && duur > 0 && t >= duur - 0.05) {
      pauze();
      geluid.seq.currentTime = 0;
      speelMaat = null;
      app.meld('speel-maat', { maat: null });
      return;
    }
    if (herhaal.checked) {
      const begin = eersteKeer(geldigeMaat(van));
      const eind = volgorde.lastIndexOf(geldigeMaat(tot)) + 1;
      const verschuiving = voorintellerSeconden();
      const eindSec = eind < tijden.length ? tijden[eind] + verschuiving : geluid.seq.duration;
      if (t >= verschuiving && (t >= eindSec || t < tijden[begin] + verschuiving - 0.05)) {
        geluid.seq.currentTime = tijden[begin] + verschuiving;
        t = tijden[begin] + verschuiving;
      }
    }
    const nu = maatIndex(t - voorintellerSeconden());
    if (nu !== speelMaat) {
      speelMaat = nu;
      app.meld('speel-maat', { maat: nu < 0 ? null : volgorde[nu] });
    }
    lus = requestAnimationFrame(volg);
  }

  async function laad() {
    const { schrijfMidi } = await import('/src/midi/schrijven.mjs');
    const midi = schrijfMidi(metDynamiek(luisterNaar ?? app.stand.partituur), {
      klik: metronoom.checked,
      voorinteller: metronoom.checked ? Number(voorinteller.value) : 0,
    });
    geluid.seq.loadNewSongList([{ binary: midi.buffer.slice(midi.byteOffset, midi.byteOffset + midi.byteLength), fileName: 'partituur.mid' }]);
    geluid.seq.pause();
    geladen = true;
  }

  async function wijzigMetronoom() {
    voorinteller.disabled = !metronoom.checked;
    try {
      localStorage.setItem('speler-metronoom', JSON.stringify({
        metronoom: metronoom.checked,
        voorinteller: voorinteller.value,
      }));
    } catch {}
    if (!geluid || !geladen) return;
    const tijd = geluid.seq.currentTime - voorintellerSeconden();
    const speelde = !geluid.seq.paused;
    await laad();
    geluid.seq.currentTime = Math.max(0, tijd + voorintellerSeconden());
    geluid.seq.playbackRate = Number(tempoPercentage.value) / 100;
    speelMaat = null;
    doelMaat = null;
    app.meld('speel-maat', { maat: null });
    if (speelde) {
      geluid.seq.play();
      cancelAnimationFrame(lus);
      lus = requestAnimationFrame(volg);
    }
  }

  async function afspelen() {
    try {
      if (!geluid) {
        status.textContent = 'De klanken worden geladen…';
        geluid = await maakGeluid();
      }
      await geluid.context.resume();
      if (!geladen) await laad();
      geluid.seq.playbackRate = Number(tempoPercentage.value) / 100;
      if (doelMaat !== null) {
        geluid.seq.currentTime = tijden[eersteKeer(doelMaat)] + voorintellerSeconden();
        doelMaat = null;
      } else if (herhaal.checked) {
        geluid.seq.currentTime = tijden[eersteKeer(geldigeMaat(van))] + voorintellerSeconden();
      }
      geluid.seq.play();
      pasMixerToe();
      zetSpeelKnop(true);
      speel.setAttribute('aria-pressed', 'true');
      status.textContent = '';
      cancelAnimationFrame(lus);
      lus = requestAnimationFrame(volg);
    } catch (fout) {
      console.error(fout);
      geluid = fout.soort === 'klankbank' ? null : geluid;
      status.textContent = fout.soort === 'klankbank'
        ? 'Er is nog geen klankbank. Zet een General MIDI-klankbank in app/public/klankbank/standaard.sf3.'
        : 'Afspelen lukte niet. Probeer het opnieuw.';
    }
  }

  function pauze() {
    geluid?.seq.pause();
    cancelAnimationFrame(lus);
    zetSpeelKnop(false);
    speel.setAttribute('aria-pressed', 'false');
  }

  speel.addEventListener('click', () => (geluid && !geluid.seq.paused ? pauze() : afspelen()));
  stop.addEventListener('click', () => {
    pauze();
    if (geluid && geladen) geluid.seq.currentTime = 0;
    doelMaat = null;
    speelMaat = null;
    app.meld('speel-maat', { maat: null });
  });
  volgende.addEventListener('click', () => {
    const aantalMaten = app.stand.partituur?.partijen[0]?.maten.length ?? 0;
    if (!aantalMaten) return;
    const huidige = speelMaat ?? doelMaat ?? 0;
    const volgende = Math.min(huidige + 1, aantalMaten - 1);
    doelMaat = volgende;
    app.meld('naar-maat', { maat: volgende });
  });
  document.addEventListener('keydown', (event) => {
    const doel = event.target;
    if (!app.stand.partituur || event.ctrlKey || event.altKey || event.metaKey
      || ['input', 'select', 'textarea', 'button'].includes(doel?.tagName?.toLowerCase())
      || doel?.isContentEditable) return;
    if (event.key === ' ') {
      event.preventDefault();
      speel.click();
    } else if (event.key === 'Home') {
      event.preventDefault();
      stop.click();
    }
  });
  tempo.addEventListener('input', () => {
    pasTempoToe(Number(tempo.value));
  });
  tempoPercentage.addEventListener('input', () => pasTempoToe(Number(tempoPercentage.value)));
  metronoom.addEventListener('change', wijzigMetronoom);
  voorinteller.addEventListener('change', wijzigMetronoom);

  app.op('partituur', (partituur) => {
    doelMaat = null;
    pauze();
    geladen = false;
    luisterNaar = null;
    speelMaat = null;
    tijden = partituur ? maatTijden(partituur) : [];
    volgorde = speelVolgorde(maten());
    van.value = maten()[0]?.nummer ?? '1';
    tot.value = maten().at(-1)?.nummer ?? '1';
    status.textContent = '';
    teken();
  });
  app.op('speel-maat', ({ maat }) => {
    const aantalMaten = app.stand.partituur?.partijen[0]?.maten.length ?? 0;
    const percentage = maat === null || !aantalMaten ? 0 : (maat + 1) / aantalMaten * 100;
    if (!voortgangVulling) return;
    voortgangVulling.style.width = `${percentage}%`;
    voortgangVulling.parentElement.setAttribute('aria-valuenow', String(percentage));
  });
  app.op('mixer', pasMixerToe);
  app.op('kies-maat', ({ maat }) => {
    const nummer = maten()[maat]?.nummer;
    if (nummer === undefined) return;
    if (nummer > Number(tot.value)) {
      tot.value = String(nummer);
      tot.dispatchEvent(new Event('input', { bubbles: true }));
    }
    van.value = String(nummer);
    van.dispatchEvent(new Event('input', { bubbles: true }));
    zetSpeelpositie(maat);
  });
  app.op('kies-noot', ({ id }) => {
    if (typeof id !== 'string') return;
    const plaats = leesId(id);
    if (plaats) {
      const nummer = maten()[plaats.maatIndex]?.nummer;
      if (nummer === undefined) return;
      if (nummer > Number(tot.value)) {
        tot.value = String(nummer);
        tot.dispatchEvent(new Event('input', { bubbles: true }));
      }
      van.value = String(nummer);
      van.dispatchEvent(new Event('input', { bubbles: true }));
      zetSpeelpositie(plaats.maatIndex);
    }
  });
  // Om en om luisteren: de andere versie laden en op dezelfde tijd verder gaan.
  app.op('luister-versie', async (partituur) => {
    luisterNaar = partituur;
    if (!geluid || !geladen) return;
    const tijd = geluid.seq.currentTime;
    const speelde = !geluid.seq.paused;
    await laad();
    geluid.seq.currentTime = tijd;
    if (speelde) {
      geluid.seq.play();
      pasMixerToe();
    }
  });
  app.op('naar-maat', (doel) => {
    if (doel?.maat === null || doel?.maat === undefined || !tijden.length) return;
    van.value = maten()[doel.maat]?.nummer ?? van.value;
    zetSpeelpositie(doel.maat);
  });
  teken();
}
import { maatIndexVanNummer, speelVolgorde } from '/src/model/maten.mjs';
import { maatTijden } from '/src/midi/tijdlijn.mjs';
