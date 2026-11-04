import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';

test('een onjuist tempo valt netjes terug', { timeout: 2000 }, async () => {
  const tijdlijnUrl = new URL('../src/midi/tijdlijn.mjs', import.meta.url).href;
  const schrijvenUrl = new URL('../src/midi/schrijven.mjs', import.meta.url).href;
  const worker = new Worker(`
    const { parentPort } = require('node:worker_threads');

    (async () => {
      const tijdlijnModule = await import(${JSON.stringify(tijdlijnUrl)});
      const { schrijfMidi } = await import(${JSON.stringify(schrijvenUrl)});
      const partituur = {
        maten: [
          { nummer: 1, tempo: 0 },
          { nummer: 2, tempo: Number.NaN },
        ],
        partijen: [],
      };
      const midi = schrijfMidi(partituur);
      const maakTijdlijn = Object.values(tijdlijnModule).find(
        (waarde) => typeof waarde === 'function',
      );
      const tijdlijn = maakTijdlijn(partituur);
      const waarden = [];
      const verzamelGetallen = (waarde) => {
        if (typeof waarde === 'number') {
          waarden.push(waarde);
          return;
        }
        if (waarde && typeof waarde === 'object') {
          Object.values(waarde).forEach(verzamelGetallen);
        }
      };
      verzamelGetallen(tijdlijn);
      parentPort.postMessage({ midiLengte: midi.length, eindig: waarden.every(Number.isFinite) });
    })().catch((fout) => { throw fout; });
  `, { eval: true });

  const resultaat = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      worker.terminate();
      reject(new Error('schrijfMidi was niet binnen de testtijd klaar'));
    }, 1000);
    worker.once('message', (waarde) => {
      clearTimeout(timer);
      resolve(waarde);
    });
    worker.once('error', (fout) => {
      clearTimeout(timer);
      reject(fout);
    });
  });

  assert.ok(resultaat.midiLengte > 0);
  assert.ok(resultaat.eindig);
  await worker.terminate();
});
