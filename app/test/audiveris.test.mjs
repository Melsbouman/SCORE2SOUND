import test from 'node:test';
import assert from 'node:assert/strict';
import {
  audiverisPad, transcribeerArgumenten, exporteerArgumenten, leesVoortgang, voortgangProcent,
  stapTekst, leesBladen, leesFoutmelding, draai,
} from '../src/server/audiveris.mjs';

test('audiverisPad neemt AUDIVERIS, anders de standaardplek', () => {
  assert.equal(audiverisPad({ AUDIVERIS: 'D:\\a.exe' }), 'D:\\a.exe');
  assert.equal(audiverisPad({}), 'C:\\Program Files\\Audiveris\\Audiveris.exe');
});

test('de eerste ronde herkent en bewaart, zonder te exporteren', () => {
  assert.deepEqual(transcribeerArgumenten({ invoer: 'a/in.pdf', uitmap: 'a/uit', paginas: '' }), [
    '-batch', '-transcribe', '-save', '-constant', 'org.audiveris.omr.Main.sheetStepTimeOut=240', '-constant', 'org.audiveris.omr.sheet.ProcessingSwitches.indentations=false', '-output', 'a/uit', '--', 'a/in.pdf',
  ]);
  assert.deepEqual(transcribeerArgumenten({ invoer: 'in.pdf', uitmap: 'uit', paginas: '1-4 7' }).slice(0, 7), [
    '-batch', '-transcribe', '-save', '-sheets', '1-4', '7', '-constant',
  ]);
});

test('de tweede ronde exporteert alleen de goede bladen, zonder compressie', () => {
  assert.deepEqual(exporteerArgumenten({ omr: 'uit/in.omr', uitmap: 'uit', bladen: [3, 5] }), [
    '-batch', '-export', '-sheets', '3', '5', '-constant', 'org.audiveris.omr.sheet.BookManager.useCompression=false', '-output', 'uit', '--', 'uit/in.omr',
  ]);
});

test('leesVoortgang vindt blad en stap in een logregel', () => {
  assert.deepEqual(leesVoortgang('INFO  [tib#3]            StepMonitoring 98   | HEADS'), { blad: 3, stap: 'HEADS' });
  assert.equal(leesVoortgang('WARN  [tib#3]        ClefBuilder 658  | Staff#23 no recognized header clef.'), null);
  assert.equal(leesVoortgang(''), null);
});

test('voortgangProcent loopt op over de bladen en blijft onder de 100', () => {
  assert.equal(voortgangProcent({ bladIndex: 0, bladen: 2, stap: 'LOAD' }), 0);
  assert.equal(voortgangProcent({ bladIndex: 1, bladen: 2, stap: 'LOAD' }), 50);
  assert.ok(voortgangProcent({ bladIndex: 1, bladen: 2, stap: 'PAGE' }) <= 99);
});

test('stapTekst geeft Nederlandse tekst, ook voor een onbekende stap', () => {
  assert.equal(stapTekst('HEADS'), 'noten zoeken');
  assert.equal(stapTekst('IETS'), 'bezig');
});

test('leesBladen splitst book.xml in goede en mislukte bladen', () => {
  const xml = `<book>
    <sheet number="1" invalid="true"><steps>LOAD BINARY</steps></sheet>
    <sheet number="2"><steps>LOAD BINARY SCALE GRID</steps></sheet>
    <sheet number="3"><steps>LOAD BINARY SCALE GRID HEADERS PAGE</steps></sheet>
  </book>`;
  assert.deepEqual(leesBladen(xml), { goed: [3], mislukt: [1, 2] });
});

test('leesFoutmelding vertaalt bekende logregels', () => {
  assert.match(leesFoutmelding('or the picture resolution is too low (try 300 DPI).'), /300 dpi/);
  assert.match(leesFoutmelding('StepException: No regularly spaced lines found'), /geen notenbalken/);
  assert.match(leesFoutmelding('StepException: No system found'), /geen notenbalken/);
  assert.match(leesFoutmelding('iets anders'), /niet herkend/);
});

test('draai geeft regels door en meldt de exitcode', async () => {
  const regels = [];
  const { klaar } = draai({
    exe: process.execPath,
    argumenten: ['-e', "console.log('een'); console.error('twee'); process.exit(3)"],
    opRegel: (regel) => regels.push(regel),
  });
  const uit = await klaar;
  assert.equal(uit.code, 3);
  assert.deepEqual(regels.sort(), ['een', 'twee']);
  assert.match(uit.log, /een/);
});

test('draai kan stoppen en stopt als het programma te lang stil blijft', async () => {
  const lang = ['-e', 'setTimeout(() => {}, 60000)'];
  const eerste = draai({ exe: process.execPath, argumenten: lang });
  eerste.stop();
  assert.equal((await eerste.klaar).gestopt, true);
  const tweede = draai({ exe: process.execPath, argumenten: lang, maxStil: 100 });
  assert.equal((await tweede.klaar).stil, true);
});

test('draai geeft een nette fout als Audiveris ontbreekt', async () => {
  await assert.rejects(draai({ exe: 'C:\\bestaat\\niet\\Audiveris.exe', argumenten: [] }).klaar, /Audiveris is niet gevonden/);
});
