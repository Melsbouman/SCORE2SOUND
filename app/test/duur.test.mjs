import test from 'node:test';
import assert from 'node:assert/strict';
import { TIKKEN_PER_KWART, naarTikken, maatLengte, notatieDuur, triool, alsKwarten } from '../src/model/duur.mjs';

test('een kwartnoot is 480 tikken', () => {
  assert.equal(TIKKEN_PER_KWART, 480);
});

test('naarTikken: MusicXML-duur met divisions naar tikken', () => {
  assert.deepEqual(naarTikken(1, 1), { tikken: 480, exact: true });
  assert.deepEqual(naarTikken(1, 2), { tikken: 240, exact: true });
  assert.deepEqual(naarTikken(12, 4), { tikken: 1440, exact: true });
  assert.deepEqual(naarTikken(2, 3), { tikken: 320, exact: true });
  // 480 / 7 is geen geheel getal: afgerond en niet exact.
  assert.deepEqual(naarTikken(1, 7), { tikken: 69, exact: false });
});

test('naarTikken: een divisions van 0 of minder is een fout', () => {
  assert.throws(() => naarTikken(1, 0));
  assert.throws(() => naarTikken(1, -2));
});

test('maatLengte: maatsoort naar tikken', () => {
  assert.equal(maatLengte({ teller: 4, noemer: 4 }), 1920);
  assert.equal(maatLengte({ teller: 3, noemer: 4 }), 1440);
  assert.equal(maatLengte({ teller: 6, noemer: 8 }), 1440);
  assert.equal(maatLengte({ teller: 2, noemer: 2 }), 1920);
  assert.equal(maatLengte({ teller: 5, noemer: 4 }), 2400);
  assert.equal(maatLengte({ teller: 7, noemer: 8 }), 1680);
});

test('notatieDuur: notenwaarde met punteringen', () => {
  assert.equal(notatieDuur('whole'), 1920);
  assert.equal(notatieDuur('half'), 960);
  assert.equal(notatieDuur('quarter'), 480);
  assert.equal(notatieDuur('eighth'), 240);
  assert.equal(notatieDuur('16th'), 120);
  assert.equal(notatieDuur('32nd'), 60);
  assert.equal(notatieDuur('quarter', 1), 720);
  assert.equal(notatieDuur('quarter', 2), 840);
  assert.equal(notatieDuur('half', 1), 1440);
  assert.throws(() => notatieDuur('breve-ish'));
});

test('triool: drie in de tijd van twee', () => {
  assert.equal(triool(240), 160);
  assert.equal(triool(480), 320);
  assert.equal(triool(240, 5, 4), 192);
});

test('alsKwarten: tikken naar aantal kwarten', () => {
  assert.equal(alsKwarten(1440), 3);
  assert.equal(alsKwarten(720), 1.5);
  assert.equal(alsKwarten(0), 0);
});
