// Maakt van de partituur een WAV-bestand, met dezelfde klanken en mixer als de speler.
// Het tempo is dat van de partituur: de tempo-schuif van de speler telt niet mee.
import { hoorbaar } from '/src/midi/hoorbaar.mjs';
import { schrijfMidi } from '/src/midi/schrijven.mjs';

const KLANKBANK = '/klankbank/standaard.sf3';
const PROCESSOR = '/vendor/spessasynth/spessasynth_processor.min.js';
const SAMPLERATE = 44100;
const UITKLINKEN = 2; // seconden na de laatste noot

export async function maakWav(partituur, mixer) {
  const mix = hoorbaar(partituur, mixer);
  if (mix.partituur.partijen.length === 0) throw Object.assign(new Error('alles uit'), { soort: 'stil' });
  const antwoord = await fetch(KLANKBANK);
  if (!antwoord.ok) throw Object.assign(new Error('geen klankbank'), { soort: 'klankbank' });
  const { WorkletSynthesizer, audioBufferToWav } = await import('/vendor/spessasynth/index.js');
  const { BasicMIDI } = await import('/vendor/spessasynth-core/index.js');

  const midi = schrijfMidi(mix.partituur, { volume: mix.volume });
  const reeks = BasicMIDI.fromArrayBuffer(midi.buffer.slice(midi.byteOffset, midi.byteOffset + midi.byteLength));
  const context = new OfflineAudioContext({ numberOfChannels: 2, sampleRate: SAMPLERATE, length: Math.ceil(SAMPLERATE * (reeks.duration + UITKLINKEN)) });
  await context.audioWorklet.addModule(PROCESSOR);
  const synth = new WorkletSynthesizer(context);
  synth.connect(context.destination);
  await synth.startOfflineRender({ midiSequence: reeks, soundBankList: [{ bankOffset: 0, soundBankBuffer: await antwoord.arrayBuffer() }], loopCount: 0 });
  await synth.isReady;
  const geluid = await context.startRendering();
  synth.destroy();
  return audioBufferToWav(geluid, { normalizeAudio: true });
}

export function maakWavVoorPartij(partituur, partijId) {
  const mixer = Object.fromEntries(partituur.partijen.map((partij) => [
    partij.id,
    { gedempt: partij.id !== partijId },
  ]));
  return maakWav(partituur, mixer);
}
