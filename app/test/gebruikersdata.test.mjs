import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { wisGebruikersdata } from '../src/server/gebruikersdata.mjs';

const gebruikerEen = 'abcdef012345';
const gebruikerTwee = '123456abcdef';

async function bestaat(pad) {
  try {
    await stat(pad);
    return true;
  } catch (fout) {
    if (fout.code === 'ENOENT') return false;
    throw fout;
  }
}

async function maakGebruikersmap(basismap, gebruikerId) {
  const gebruikersmap = join(basismap, gebruikerId);
  await mkdir(gebruikersmap, { recursive: true });
  await writeFile(join(gebruikersmap, 'project.json'), '{}');
  return gebruikersmap;
}

test('wist alle mappen van één gebruiker', async (t) => {
  const tijdelijk = await mkdtemp(join(tmpdir(), 'score2sound-gebruikersdata-'));
  t.after(() => rm(tijdelijk, { recursive: true, force: true }));
  const basismappen = [join(tijdelijk, 'projecten'), join(tijdelijk, 'uploads')];

  for (const basismap of basismappen) {
    await maakGebruikersmap(basismap, gebruikerEen);
    await maakGebruikersmap(basismap, gebruikerTwee);
  }

  const aantal = await wisGebruikersdata({ gebruikerId: gebruikerEen, mappen: basismappen });

  assert.equal(aantal, 2);
  for (const basismap of basismappen) {
    assert.equal(await bestaat(join(basismap, gebruikerEen)), false);
    assert.equal(await bestaat(join(basismap, gebruikerTwee)), true);
  }
});

test('weigert een ongeldig gebruikers-id zonder iets te verwijderen', async (t) => {
  const tijdelijk = await mkdtemp(join(tmpdir(), 'score2sound-gebruikersdata-'));
  t.after(() => rm(tijdelijk, { recursive: true, force: true }));
  const gebruikersmap = await maakGebruikersmap(tijdelijk, gebruikerEen);

  await assert.rejects(
    wisGebruikersdata({ gebruikerId: '../x', mappen: [tijdelijk] }),
    { message: 'Ongeldige gebruiker.' },
  );
  assert.equal(await bestaat(gebruikersmap), true);
});

test('accepteert een map die niet bestaat', async (t) => {
  const tijdelijk = await mkdtemp(join(tmpdir(), 'score2sound-gebruikersdata-'));
  t.after(() => rm(tijdelijk, { recursive: true, force: true }));

  const aantal = await wisGebruikersdata({
    gebruikerId: gebruikerEen,
    mappen: [join(tijdelijk, 'bestaat-niet')],
  });

  assert.equal(aantal, 1);
});
