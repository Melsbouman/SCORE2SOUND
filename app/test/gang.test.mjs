import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { maakServer } from '../server.mjs';

function vraag(poort, methode, pad, body) {
  return new Promise((resolve, reject) => {
    const verzoek = http.request(
      {
        hostname: '127.0.0.1',
        port: poort,
        method: methode,
        path: pad,
        headers: body === undefined
          ? undefined
          : {
              'content-type': 'application/json',
              'content-length': Buffer.byteLength(body),
            },
      },
      (antwoord) => {
        const delen = [];
        antwoord.on('data', (deel) => delen.push(deel));
        antwoord.on('end', () => {
          resolve({
            status: antwoord.statusCode,
            tekst: Buffer.concat(delen).toString('utf8'),
          });
        });
      },
    );
    verzoek.on('error', reject);
    if (body !== undefined) verzoek.write(body);
    verzoek.end();
  });
}

function startServer() {
  const server = maakServer();
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve({ server, poort: server.address().port });
    });
  });
}

test('importeren, bewaren, teruglezen en verwijderen met de echte server', async () => {
  const projecten = await mkdtemp(join(tmpdir(), 'score2sound-projecten-'));
  const herkenning = await mkdtemp(join(tmpdir(), 'score2sound-herkenning-'));
  const vorigeProjecten = process.env.SCORE2SOUND_PROJECTEN;
  const vorigeHerkenning = process.env.SCORE2SOUND_HERKENNING;
  process.env.SCORE2SOUND_PROJECTEN = projecten;

  let server;
  try {
    let gestart;
    try {
      process.env.SCORE2SOUND_HERKENNING = herkenning;
      gestart = await startServer();
    } finally {
      if (process.env.SCORE2SOUND_HERKENNING === herkenning) {
        if (vorigeHerkenning === undefined) delete process.env.SCORE2SOUND_HERKENNING;
        else process.env.SCORE2SOUND_HERKENNING = vorigeHerkenning;
      }
    }
    server = gestart.server;
    const { poort } = gestart;
    const musicxml = await readFile(
      new URL('./voorbeelden/eenvoudig.musicxml', import.meta.url),
      'utf8',
    );

    const importeerAntwoord = await vraag(
      poort,
      'POST',
      '/api/importeer?naam=eenvoudig.musicxml',
      musicxml,
    );
    assert.equal(importeerAntwoord.status, 200);
    const { partituur } = JSON.parse(importeerAntwoord.tekst);
    assert.ok(partituur);

    const versie = {
      id: 'versie-1',
      naam: 'Eerste versie',
      tijd: '2026-11-02T12:00:00.000Z',
      partituur,
    };
    const bewarenAntwoord = await vraag(
      poort,
      'POST',
      '/api/projecten',
      JSON.stringify({
        naam: 'Eenvoudig',
        partituur,
        versies: [versie],
      }),
    );
    assert.equal(bewarenAntwoord.status, 200);
    const { id } = JSON.parse(bewarenAntwoord.tekst);
    assert.ok(id);

    const terugleesAntwoord = await vraag(poort, 'GET', `/api/projecten/${id}`);
    assert.equal(terugleesAntwoord.status, 200);
    const teruggelezen = JSON.parse(terugleesAntwoord.tekst);
    assert.deepEqual(teruggelezen.partituur, partituur);
    assert.deepEqual(teruggelezen.versies, [versie]);

    const lijstAntwoord = await vraag(poort, 'GET', '/api/projecten');
    assert.equal(lijstAntwoord.status, 200);
    const lijst = JSON.parse(lijstAntwoord.tekst);
    assert.ok(lijst.some((project) => project.id === id));

    const verwijderAntwoord = await vraag(poort, 'DELETE', `/api/projecten/${id}`);
    assert.equal(verwijderAntwoord.status, 200);
    assert.deepEqual(JSON.parse(verwijderAntwoord.tekst), { verwijderd: true });

    const ontbreektAntwoord = await vraag(poort, 'GET', `/api/projecten/${id}`);
    assert.equal(ontbreektAntwoord.status, 404);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    if (process.env.SCORE2SOUND_PROJECTEN === projecten) {
      if (vorigeProjecten === undefined) delete process.env.SCORE2SOUND_PROJECTEN;
      else process.env.SCORE2SOUND_PROJECTEN = vorigeProjecten;
    }
    await rm(projecten, { recursive: true, force: true });
    await rm(herkenning, { recursive: true, force: true });
  }
});
