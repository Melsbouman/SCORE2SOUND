import { readFile, readdir } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import {
  BasicMIDI,
  SoundBankLoader,
  SpessaSynthProcessor,
  SpessaSynthSequencer,
} from 'spessasynth_core';
import { schrijfMidi } from '../app/src/midi/schrijven.mjs';

const SAMPLEFREQUENTIE = 44_100;
const BLOKGROOTTE = 128;
const UITKLINKEN = 2;
const hoofdmap = resolve(import.meta.dirname, '..');
const projectenmap = resolve(hoofdmap, 'app/projecten');
const klankbankpad = resolve(hoofdmap, 'app/public/klankbank/standaard.sf3');

function arrayBuffer(bytes) {
  return bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
}

async function projectpaden() {
  if (process.argv.length > 2) {
    return process.argv.slice(2).map((pad) => resolve(hoofdmap, pad));
  }
  return (await readdir(projectenmap))
    .filter((naam) => naam.endsWith('.json'))
    .sort()
    .map((naam) => resolve(projectenmap, naam));
}

function telNotenPerSeconde(midi) {
  const aantallen = [];
  for (const noot of midi.getNoteTimes().flat()) {
    const seconde = Math.floor(noot.start);
    aantallen[seconde] = (aantallen[seconde] ?? 0) + 1;
  }
  return aantallen;
}

async function controleer(pad, klankbankBytes) {
  const project = JSON.parse(await readFile(pad, 'utf8'));
  if (!project.partituur) throw new Error(`${pad}: veld partituur ontbreekt`);

  const midiBytes = schrijfMidi(project.partituur);
  const midi = BasicMIDI.fromArrayBuffer(arrayBuffer(midiBytes));
  const noten = telNotenPerSeconde(midi);
  const synth = new SpessaSynthProcessor(SAMPLEFREQUENTIE, { eventsEnabled: false });
  synth.soundBankManager.addSoundBank(
    SoundBankLoader.fromArrayBuffer(arrayBuffer(klankbankBytes)),
    'main',
  );
  await synth.ready;

  const sequencer = new SpessaSynthSequencer(synth);
  sequencer.loadNewSongList([midi]);
  sequencer.play();

  const aantalSamples = Math.ceil(SAMPLEFREQUENTIE * (midi.duration + UITKLINKEN));
  const somKwadraten = [];
  const samplesPerSeconde = [];
  const links = new Float32Array(BLOKGROOTTE);
  const rechts = new Float32Array(BLOKGROOTTE);
  let positie = 0;

  while (positie < aantalSamples) {
    const lengte = Math.min(BLOKGROOTTE, aantalSamples - positie);
    links.fill(0);
    rechts.fill(0);
    sequencer.processTick();
    synth.process(links, rechts, 0, lengte);
    for (let i = 0; i < lengte; i++) {
      const seconde = Math.floor((positie + i) / SAMPLEFREQUENTIE);
      somKwadraten[seconde] = (somKwadraten[seconde] ?? 0)
        + links[i] * links[i] + rechts[i] * rechts[i];
      samplesPerSeconde[seconde] = (samplesPerSeconde[seconde] ?? 0) + 2;
    }
    positie += lengte;
  }

  console.log(`\n${basename(pad)}`);
  console.log('seconde\tRMS\tnoten beginnen');
  const aantalSeconden = Math.ceil(aantalSamples / SAMPLEFREQUENTIE);
  for (let seconde = 0; seconde < aantalSeconden; seconde++) {
    const rms = Math.sqrt((somKwadraten[seconde] ?? 0) / (samplesPerSeconde[seconde] ?? 1));
    const markering = noten[seconde] && rms === 0 ? '\tSTIL MET NOTEN' : '';
    console.log(`${seconde}\t${rms.toExponential(6)}\t${noten[seconde] ?? 0}${markering}`);
  }
}

const klankbankBytes = await readFile(klankbankpad);
for (const pad of await projectpaden()) await controleer(pad, klankbankBytes);
