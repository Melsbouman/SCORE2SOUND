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

// Kanaal per partij, zoals in schrijfMidi: kanaal 9 (slagwerk) wordt overgeslagen.
import { kanaalVan } from '/src/midi/schrijven.mjs';

// Kanaal per partij, zoals in schrijfMidi: elke poort heeft 16 kanalen en kanaal 9 (slagwerk) wordt overgeslagen.
const kanaal = (index) => { const plek = kanaalVan(index); return plek.poort * 16 + plek.kanaal; };

export function start(app) {
  const vlak = document.getElementById('speler');
  let tijden = []; // begin van elke gespeelde maat in seconden; herhaalde maten staan er meer keer in
  let volgorde = []; // welke maat op elke plek in tijden klinkt
  let geladen = false;
  let speelMaat = null;
  let lus = 0;
  let luisterNaar = null; // een bewaarde versie die klinkt in plaats van de huidige partituur

  const knop = (tekst, klasse = 'knop') => Object.assign(document.createElement('button'), { type: 'button', className: klasse, textContent: tekst });
  const veld = (label, ...invoeren) => {
    const l = document.createElement('label');
    l.className = 'speler__veld';
    l.append(label, ...invoeren);
    return l;
  };
  const speel = knop('Afspelen', 'knop knop--hoofd');
  const stop = knop('Naar het begin');
  const tempo = Object.assign(document.createElement('input'), { type: 'range', min: 25, max: 150, step: 5, value: 100 });
  const tempoPercentage = Object.assign(document.createElement('input'), { type: 'number', min: 10, max: 300, step: 1, value: 100 });
  tempoPercentage.setAttribute('aria-label', 'Tempo in procenten');
  const tempoTekst = document.createElement('span');
  const van = Object.assign(document.createElement('input'), { type: 'text', value: '1', inputMode: 'numeric', size: 4 });
  const tot = Object.assign(document.createElement('input'), { type: 'text', value: '1', inputMode: 'numeric', size: 4 });
  const herhaal = Object.assign(document.createElement('input'), { type: 'checkbox' });
  const status = Object.assign(document.createElement('p'), { className: 'zacht' });
  status.setAttribute('role', 'status');

  function teken() {
    if (!app.stand.partituur) return vlak.replaceChildren();
    const kop = document.createElement('h2');
    kop.textContent = 'Afspelen';
    const knoppen = document.createElement('div');
    knoppen.className = 'speler__knoppen';
    knoppen.append(speel, stop);
    const passage = document.createElement('fieldset');
    passage.className = 'speler__passage';
    passage.append(Object.assign(document.createElement('legend'), { textContent: 'Passage herhalen' }), veld('Van maat ', van), veld('tot en met maat ', tot), veld(herhaal, document.createTextNode(' Herhalen')));
    vlak.replaceChildren(kop, knoppen, veld('Tempo ', tempo, tempoPercentage), tempoTekst, passage, status);
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
    let i = 0;
    while (i + 1 < tijden.length && tijden[i + 1] <= seconden + 1e-6) i++;
    return i;
  };
  const maten = () => app.stand.partituur?.partijen[0]?.maten ?? [];
  const geldigeMaat = (invoer) => maatIndexVanNummer(maten(), invoer.value);
  const eersteKeer = (maat) => Math.max(0, volgorde.indexOf(maat));

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
      const eindSec = eind < tijden.length ? tijden[eind] : geluid.seq.duration;
      if (t >= eindSec || t < tijden[begin] - 0.05) {
        geluid.seq.currentTime = tijden[begin];
        t = tijden[begin];
      }
    }
    const nu = maatIndex(t);
    if (nu !== speelMaat) {
      speelMaat = nu;
      app.meld('speel-maat', { maat: volgorde[nu] });
    }
    lus = requestAnimationFrame(volg);
  }

  async function laad() {
    const { schrijfMidi } = await import('/src/midi/schrijven.mjs');
    const midi = schrijfMidi(luisterNaar ?? app.stand.partituur);
    geluid.seq.loadNewSongList([{ binary: midi.buffer.slice(midi.byteOffset, midi.byteOffset + midi.byteLength), fileName: 'partituur.mid' }]);
    geluid.seq.pause();
    geladen = true;
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
      if (herhaal.checked) geluid.seq.currentTime = tijden[eersteKeer(geldigeMaat(van))];
      geluid.seq.play();
      pasMixerToe();
      speel.textContent = 'Pauze';
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
    speel.textContent = 'Afspelen';
    speel.setAttribute('aria-pressed', 'false');
  }

  speel.addEventListener('click', () => (geluid && !geluid.seq.paused ? pauze() : afspelen()));
  stop.addEventListener('click', () => {
    pauze();
    if (geluid && geladen) geluid.seq.currentTime = 0;
    speelMaat = null;
    app.meld('speel-maat', { maat: null });
  });
  tempo.addEventListener('input', () => {
    pasTempoToe(Number(tempo.value));
  });
  tempoPercentage.addEventListener('input', () => pasTempoToe(Number(tempoPercentage.value)));

  app.op('partituur', (partituur) => {
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
  app.op('mixer', pasMixerToe);
  app.op('kies-maat', ({ maat }) => {
    if (typeof maat !== 'number' || !Number.isFinite(maat)) return;
    const nummer = maat + 1;
    if (nummer > Number(tot.value)) {
      tot.value = String(nummer);
      tot.dispatchEvent(new Event('input', { bubbles: true }));
    }
    van.value = String(nummer);
    van.dispatchEvent(new Event('input', { bubbles: true }));
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
    if (geluid && geladen) geluid.seq.currentTime = tijden[eersteKeer(doel.maat)];
  });
  teken();
}
import { maatIndexVanNummer, speelVolgorde } from '/src/model/maten.mjs';
import { maatTijden } from '/src/midi/tijdlijn.mjs';
