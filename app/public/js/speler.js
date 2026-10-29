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
const kanaal = (index) => (index < 9 ? index : index + 1);

// Begin van elke maat in seconden, uit de maatlengtes en tempo's van de eerste partij.
function tijdlijn(partituur) {
  const uit = [];
  let seconden = 0;
  let tempo = 120;
  for (const maat of partituur.partijen[0]?.maten ?? []) {
    if (maat.tempo) tempo = maat.tempo;
    uit.push(seconden);
    const tikken = maat.opmaat
      ? Math.max(0, ...maat.elementen.filter((e) => e.soort !== 'aanwijzing').map((e) => e.start + e.duur))
      : (maat.maatsoort.teller * 1920) / maat.maatsoort.noemer;
    seconden += (tikken / 480) * (60 / tempo);
  }
  return uit;
}

export function start(app) {
  const vlak = document.getElementById('speler');
  let tijden = [];
  let geladen = false;
  let speelMaat = null;
  let lus = 0;

  const knop = (tekst, klasse = 'knop') => Object.assign(document.createElement('button'), { type: 'button', className: klasse, textContent: tekst });
  const veld = (label, invoer) => {
    const l = document.createElement('label');
    l.className = 'speler__veld';
    l.append(label, invoer);
    return l;
  };
  const speel = knop('Afspelen', 'knop knop--hoofd');
  const stop = knop('Naar het begin');
  const tempo = Object.assign(document.createElement('input'), { type: 'range', min: 25, max: 150, step: 5, value: 100 });
  const tempoTekst = document.createElement('span');
  const van = Object.assign(document.createElement('input'), { type: 'number', min: 1, value: 1, inputMode: 'numeric' });
  const tot = Object.assign(document.createElement('input'), { type: 'number', min: 1, value: 1, inputMode: 'numeric' });
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
    vlak.replaceChildren(kop, knoppen, veld('Tempo ', tempo), tempoTekst, passage, status);
    tempoTekst.textContent = ` ${tempo.value}%`;
  }

  const maatIndex = (seconden) => {
    let i = 0;
    while (i + 1 < tijden.length && tijden[i + 1] <= seconden + 1e-6) i++;
    return i;
  };
  const geldigeMaat = (invoer) => Math.min(Math.max(1, Number(invoer.value) || 1), Math.max(1, tijden.length)) - 1;

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
    if (herhaal.checked) {
      const begin = geldigeMaat(van);
      const eind = geldigeMaat(tot) + 1;
      const eindSec = eind < tijden.length ? tijden[eind] : geluid.seq.duration;
      if (t >= eindSec || t < tijden[begin] - 0.05) {
        geluid.seq.currentTime = tijden[begin];
        t = tijden[begin];
      }
    }
    const nu = maatIndex(t);
    if (nu !== speelMaat) {
      speelMaat = nu;
      app.meld('speel-maat', { maat: nu });
    }
    lus = requestAnimationFrame(volg);
  }

  async function laad() {
    const { schrijfMidi } = await import('/src/midi/schrijven.mjs');
    const midi = schrijfMidi(app.stand.partituur);
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
      geluid.seq.playbackRate = Number(tempo.value) / 100;
      if (herhaal.checked) geluid.seq.currentTime = tijden[geldigeMaat(van)];
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
    tempoTekst.textContent = ` ${tempo.value}%`;
    if (geluid) geluid.seq.playbackRate = Number(tempo.value) / 100;
  });

  app.op('partituur', (partituur) => {
    pauze();
    geladen = false;
    speelMaat = null;
    tijden = partituur ? tijdlijn(partituur) : [];
    van.max = tot.max = String(Math.max(1, tijden.length));
    van.value = '1';
    tot.value = String(Math.max(1, tijden.length));
    status.textContent = '';
    teken();
  });
  app.op('mixer', pasMixerToe);
  app.op('naar-maat', (doel) => {
    if (doel?.maat === null || doel?.maat === undefined || !tijden.length) return;
    van.value = String(doel.maat + 1);
    if (geluid && geladen) geluid.seq.currentTime = tijden[doel.maat];
  });
  teken();
}
