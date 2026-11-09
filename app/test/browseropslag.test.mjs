import test from 'node:test';
import assert from 'node:assert/strict';
import { geheugenWinkel, maakBrowserOpslag, projectNaarBestand, projectUitBestand } from '../src/project/browseropslag.mjs';

const partituur = () => ({ titel: 'Proef', partijen: [{ id: 'P1', naam: 'Cornet', maten: [] }] });

test('bewaren geeft een nieuw project met een id van 12 tekens, naam, data en lege map en labels', async () => {
  const opslag = maakBrowserOpslag(geheugenWinkel());
  const project = await opslag.bewaar({ naam: '  Mijn stuk  ', partituur: partituur() });
  assert.match(project.id, /^[a-f0-9]{12}$/);
  assert.equal(project.naam, 'Mijn stuk');
  assert.equal(project.aangemaakt, project.bijgewerkt);
  assert.equal(project.map, null);
  assert.deepEqual(project.labels, []);
  assert.deepEqual(project.versies, []);
  assert.deepEqual((await opslag.open(project.id)).partituur, partituur());
});

test('zonder naam heet het project Naamloos; zonder partituur is het een fout', async () => {
  const opslag = maakBrowserOpslag(geheugenWinkel());
  assert.equal((await opslag.bewaar({ naam: '', partituur: partituur() })).naam, 'Naamloos');
  await assert.rejects(opslag.bewaar({ naam: 'x' }), /Er is geen partituur om te bewaren\./);
});

test('opnieuw bewaren houdt id, aanmaakdatum, map, labels en eerdere versies', async () => {
  const opslag = maakBrowserOpslag(geheugenWinkel());
  const eerste = await opslag.bewaar({ naam: 'A', partituur: partituur(), versies: [{ naam: 'v1' }] });
  await opslag.zetMeta(eerste.id, { map: 'Concert', labels: ['mars'] });
  const tweede = await opslag.bewaar({ id: eerste.id, naam: 'B', partituur: partituur() });
  assert.equal(tweede.id, eerste.id);
  assert.equal(tweede.aangemaakt, eerste.aangemaakt);
  assert.equal(tweede.naam, 'B');
  assert.equal(tweede.map, 'Concert');
  assert.deepEqual(tweede.labels, ['mars']);
  assert.deepEqual(tweede.versies, [{ naam: 'v1' }]);
});

test('de lijst staat op bijgewerkt (nieuwste eerst) en bevat geen partituur', async () => {
  const opslag = maakBrowserOpslag(geheugenWinkel());
  const oud = await opslag.bewaar({ naam: 'Oud', partituur: partituur() });
  await new Promise((klaar) => setTimeout(klaar, 5));
  await opslag.bewaar({ naam: 'Nieuw', partituur: partituur() });
  const lijst = await opslag.lijst();
  assert.deepEqual(lijst.map((project) => project.naam), ['Nieuw', 'Oud']);
  assert.equal('partituur' in lijst[0], false);
  assert.deepEqual(Object.keys(lijst[1]).sort(), ['aangemaakt', 'bijgewerkt', 'id', 'labels', 'map', 'naam']);
  assert.equal(lijst[1].id, oud.id);
});

test('verwijderen haalt het project weg; een onbekend project is een fout', async () => {
  const opslag = maakBrowserOpslag(geheugenWinkel());
  const project = await opslag.bewaar({ naam: 'Weg', partituur: partituur() });
  await opslag.verwijder(project.id);
  assert.deepEqual(await opslag.lijst(), []);
  await assert.rejects(opslag.open(project.id), /Onbekend project\./);
  await assert.rejects(opslag.verwijder('000000000000'), /Onbekend project\./);
  await assert.rejects(opslag.open('../geheim'), /Onbekend project\./);
});

test('een ongeldige map of labels geeft dezelfde fout als op de server', async () => {
  const opslag = maakBrowserOpslag(geheugenWinkel());
  const project = await opslag.bewaar({ naam: 'M', partituur: partituur() });
  await assert.rejects(opslag.zetMeta(project.id, { map: 5 }), /Map moet tekst zijn\./);
});

test('een project als bestand bewaren en weer openen geeft dezelfde naam, partituur en versies, zonder id', async () => {
  const opslag = maakBrowserOpslag(geheugenWinkel());
  const project = await opslag.bewaar({ naam: 'Export', partituur: partituur(), versies: [{ naam: 'v1' }] });
  const tekst = projectNaarBestand(project);
  const terug = projectUitBestand(tekst);
  assert.deepEqual(terug, { naam: 'Export', partituur: partituur(), versies: [{ naam: 'v1' }] });
  const nieuw = await opslag.bewaar(terug);
  assert.notEqual(nieuw.id, project.id);
});

test('een bestand zonder partituur is geen project', () => {
  assert.throws(() => projectUitBestand('{"naam":"x"}'), /Dit bestand is geen SCORE2SOUND-project\./);
  assert.throws(() => projectUitBestand('geen json'), /Dit bestand is geen SCORE2SOUND-project\./);
});

test('de bibliotheek en het beginscherm vragen geen projecten meer aan de server', async () => {
  const { readFile } = await import('node:fs/promises');
  for (const pad of ['../public/js/views/projecten.js', '../public/js/views/begin.js']) {
    const bron = await readFile(new URL(pad, import.meta.url), 'utf8');
    assert.equal(bron.includes('/api/projecten'), false, pad);
  }
});
