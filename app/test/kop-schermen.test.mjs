import test from 'node:test';
import assert from 'node:assert/strict';
import { kopTitel, schermVoor } from '../public/js/views/kop.js';

test('schermVoor kiest het scherm bij de hash', () => {
  assert.equal(schermVoor(''), 'begin');
  assert.equal(schermVoor('#begin'), 'begin');
  assert.equal(schermVoor('#nieuw-partij'), 'begin');
  assert.equal(schermVoor('#projecten'), 'bibliotheek');
  assert.equal(schermVoor('#bibliotheek/Mijn map'), 'bibliotheek');
  assert.equal(schermVoor('#inloggen'), 'inloggen');
  assert.equal(schermVoor('#instellingen'), 'instellingen');
  assert.equal(schermVoor('#weergave'), 'editor');
  assert.equal(schermVoor('#bewerken'), 'editor');
});

test('kopTitel geeft de naam van het scherm en niets op de begin-schermen', () => {
  assert.equal(kopTitel('#begin'), null);
  assert.equal(kopTitel(''), null);
  assert.equal(kopTitel('#weergave'), 'Editor');
  assert.equal(kopTitel('#bewerken'), 'Editor');
  assert.equal(kopTitel('#projecten'), 'Bibliotheek');
  assert.equal(kopTitel('#ontdekken'), 'Ontdekken');
  assert.equal(kopTitel('#instellingen'), 'Instellingen');
});
