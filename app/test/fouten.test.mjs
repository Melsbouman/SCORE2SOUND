import test from 'node:test';
import assert from 'node:assert/strict';
import { request } from 'node:http';
import { maakServer } from '../server.mjs';

function vraag(poort, methode, pad, body) {
  return new Promise((ok, mis) => {
    const verzoek = request({ host: '127.0.0.1', port: poort, method: methode, path: pad }, (antwoord) => {
      const delen = [];
      antwoord.on('data', (deel) => delen.push(deel));
      antwoord.on('end', () => ok({
        status: antwoord.statusCode,
        koppen: antwoord.headers,
        tekst: Buffer.concat(delen).toString('utf8'),
      }));
    });
    verzoek.on('error', mis);
    verzoek.end(body);
  });
}

function vraagMetTeGroteBody(poort) {
  return new Promise((ok, mis) => {
    let antwoordOntvangen = false;
    let aanvraagBeeindigd = false;
    let verzoek;
    const beeindigAanvraag = () => {
      if (!aanvraagBeeindigd) {
        aanvraagBeeindigd = true;
        verzoek.end();
      }
    };
    verzoek = request({
      host: '127.0.0.1',
      port: poort,
      method: 'POST',
      path: '/api/projecten',
    }, (antwoord) => {
      antwoordOntvangen = true;
      beeindigAanvraag();
      const delen = [];
      antwoord.on('data', (deel) => delen.push(deel));
      antwoord.on('end', () => ok({
        status: antwoord.statusCode,
        tekst: Buffer.concat(delen).toString('utf8'),
      }));
    });
    verzoek.on('error', (fout) => {
      if (!antwoordOntvangen) mis(fout);
    });

    const deel = Buffer.alloc(1024 * 1024);
    let geschreven = 0;
    function schrijfDeel() {
      while (geschreven < 101 && !antwoordOntvangen) {
        geschreven++;
        if (!verzoek.write(deel)) {
          verzoek.once('drain', schrijfDeel);
          return;
        }
      }
      if (!antwoordOntvangen) beeindigAanvraag();
    }
    schrijfDeel();
  });
}

test('de server geeft nette JSON-fouten voor ongeldige aanvragen', async (t) => {
  const server = maakServer();
  await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
  t.after(() => server.close());
  const poort = server.address().port;

  const ongeldigeJson = await vraag(poort, 'POST', '/api/projecten', '{');
  assert.equal(ongeldigeJson.status, 400);
  const jsonFout = JSON.parse(ongeldigeJson.tekst);
  assert.deepEqual(jsonFout, { fout: 'De gegevens zijn geen geldige JSON.' });
  assert.doesNotMatch(ongeldigeJson.tekst, /SyntaxError|[A-Za-z]:[\\/]|(?:\/(?:Users|home|tmp)\/)/);
  assert.doesNotMatch(ongeldigeJson.tekst, /\bat\s.+\(.+\)/);

  const onbekendPad = await vraag(poort, 'POST', '/api/onbekend');
  assert.equal(onbekendPad.status, 404);
  assert.deepEqual(JSON.parse(onbekendPad.tekst), { fout: 'Niet gevonden.' });

  const teGroteBody = await vraagMetTeGroteBody(poort);
  assert.equal(teGroteBody.status, 413);
  assert.deepEqual(JSON.parse(teGroteBody.tekst), { fout: 'Het bestand is te groot (maximaal 100 MB).' });
  assert.doesNotMatch(teGroteBody.tekst, /\bat\s.+\(.+\)/);
});
