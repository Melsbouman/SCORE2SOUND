import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { maakSleepbaar } from '../public/js/views/paletsleep.js';

const lees = (pad) => readFile(new URL(pad, import.meta.url), 'utf8');

test('het palet sleept met pointer events, niet meer met de HTML5-sleep van de browser', async () => {
  const paletten = await lees('../public/js/views/paletten.js');
  const weergave = await lees('../public/js/weergave.js');
  assert.doesNotMatch(paletten, /draggable\s*=\s*true/);
  assert.doesNotMatch(paletten, /'dragstart'/);
  assert.match(paletten, /maakSleepbaar\(/);
  assert.match(weergave, /app\.op\('palet-sleep'/);
  assert.doesNotMatch(weergave, /addEventListener\('drop'/);
});

// Een nagebootste knop en vensters, zodat de sleep in Node te volgen is (zonder browser).
function opzet({ doel = { kader: { left: 400, top: 300, width: 20, height: 20 }, plek: { maatIndex: 1, start: 480 } } } = {}) {
  const luisteraars = new Map();
  const venster = new EventTarget();
  const lichaam = { classList: new Set(), append() {} };
  lichaam.classList.add = lichaam.classList.add.bind(lichaam.classList);
  lichaam.classList.remove = lichaam.classList.delete.bind(lichaam.classList);
  const spoken = [];
  globalThis.window = venster;
  globalThis.document = {
    body: lichaam,
    addEventListener() {},
    removeEventListener() {},
    createElement() {
      const element = { className: '', style: {}, classList: new Set(), children: [], dataset: {}, setAttribute() {}, append(...kind) { this.children.push(...kind); }, remove() { this.weg = true; }, getBoundingClientRect: () => ({}), addEventListener() {}, offsetWidth: 46, offsetHeight: 46 };
      element.classList.add = element.classList.add.bind(element.classList);
      element.classList.toggle = (naam, aan) => (aan ? element.classList.add(naam) : element.classList.delete(naam));
      spoken.push(element);
      return element;
    },
  };
  globalThis.requestAnimationFrame = (functie) => { functie(); return 0; };
  globalThis.cancelAnimationFrame = () => {};
  globalThis.matchMedia = () => ({ matches: true });
  const knop = new EventTarget();
  knop.dataset = {};
  knop.childNodes = [];
  knop.classList = new Set();
  knop.classList.add = knop.classList.add.bind(knop.classList);
  knop.classList.remove = knop.classList.delete.bind(knop.classList);
  knop.getBoundingClientRect = () => ({ left: 10, top: 10, width: 46, height: 46 });
  const meldingen = [];
  const app = {
    meld(naam, bericht) {
      meldingen.push({ naam, fase: bericht.fase });
      if (naam === 'palet-sleep' && bericht.fase !== 'stop' && bericht.x > 300) bericht.doel = doel;
    },
  };
  const gezet = [];
  maakSleepbaar(knop, { app, item: { id: 'dynamiek-ff' }, vlaggen: { bijNoot: true }, zet: (plek) => { gezet.push(plek); return true; } });
  // Een klik die echt doorkomt (zoals het klikken op een hokje in paletten.js).
  const kliks = [];
  knop.addEventListener('click', () => kliks.push(1));
  const druk = (soort, x, y, extra = {}) => {
    const gebeurtenis = new Event(soort, { cancelable: true });
    Object.assign(gebeurtenis, { button: 0, pointerId: 1, pointerType: 'mouse', clientX: x, clientY: y, ...extra });
    return gebeurtenis;
  };
  return { knop, venster, lichaam, spoken, meldingen, gezet, druk, kliks };
}

test('slepen naar een doel: het kaartje volgt, het doel komt terug, en loslaten zet het hokje op die plek', () => {
  const { knop, venster, lichaam, spoken, meldingen, gezet, druk } = opzet();
  knop.dispatchEvent(druk('pointerdown', 20, 20));
  venster.dispatchEvent(druk('pointermove', 22, 21));
  assert.equal(spoken.length, 0, 'een kleine beweging is nog geen sleep');
  venster.dispatchEvent(druk('pointermove', 200, 150));
  assert.ok(spoken.some((spook) => spook.className === 'palet-spook'), 'er zweeft een kaartje');
  assert.ok(lichaam.classList.has('palet-sleept'));
  venster.dispatchEvent(druk('pointermove', 410, 310));
  venster.dispatchEvent(druk('pointerup', 410, 310));
  assert.deepEqual(gezet, [{ maatIndex: 1, start: 480 }]);
  assert.ok(meldingen.some((m) => m.fase === 'beweeg') && meldingen.some((m) => m.fase === 'los'));
  assert.ok(!lichaam.classList.has('palet-sleept'), 'na loslaten is alles opgeruimd');
});

test('loslaten naast een doel, of een gewone klik, zet niets', () => {
  const { knop, venster, gezet, druk } = opzet();
  knop.dispatchEvent(druk('pointerdown', 20, 20));
  venster.dispatchEvent(druk('pointermove', 150, 150));
  venster.dispatchEvent(druk('pointerup', 150, 150));
  knop.dispatchEvent(druk('pointerdown', 20, 20));
  venster.dispatchEvent(druk('pointerup', 20, 20));
  assert.deepEqual(gezet, []);
});

test('met een vinger schuift omhoog bewegen het palet: dan geen sleep', () => {
  const { knop, venster, spoken, druk } = opzet();
  knop.dispatchEvent(druk('pointerdown', 20, 20, { pointerType: 'touch' }));
  venster.dispatchEvent(druk('pointermove', 22, 80, { pointerType: 'touch' }));
  assert.equal(spoken.length, 0);
});

test('Escape breekt een sleep af: het kaartje vliegt terug, er wordt niets gezet, en de klik daarna telt niet', () => {
  const { knop, venster, lichaam, gezet, druk, kliks, meldingen } = opzet();
  knop.dispatchEvent(druk('pointerdown', 20, 20));
  venster.dispatchEvent(druk('pointermove', 410, 310));
  venster.dispatchEvent(Object.assign(new Event('keydown', { cancelable: true }), { key: 'Escape' }));
  assert.ok(meldingen.some((m) => m.fase === 'stop'));
  assert.ok(!lichaam.classList.has('palet-sleept'));
  venster.dispatchEvent(druk('pointerup', 410, 310));
  knop.dispatchEvent(new Event('click'));
  assert.deepEqual(gezet, []);
  assert.deepEqual(kliks, [], 'loslaten op de knop na afbreken is geen klik');
});

test('pointercancel, of een muisknop die niet meer ingedrukt is, breekt af en ruimt alles op', () => {
  const { knop, venster, lichaam, spoken, gezet, druk } = opzet();
  knop.dispatchEvent(druk('pointerdown', 20, 20));
  venster.dispatchEvent(druk('pointermove', 200, 150));
  venster.dispatchEvent(druk('pointercancel', 200, 150));
  assert.ok(!lichaam.classList.has('palet-sleept'));
  // Daarna doet bewegen niets meer (de luisteraars zijn weg).
  const aantal = spoken.length;
  venster.dispatchEvent(druk('pointermove', 300, 300));
  assert.equal(spoken.length, aantal);
  // Muis zonder ingedrukte knop (de pointerup ging verloren): afbreken, en een latere pointerup zet niets.
  knop.dispatchEvent(druk('pointerdown', 20, 20));
  venster.dispatchEvent(druk('pointermove', 200, 150));
  venster.dispatchEvent(druk('pointermove', 410, 310, { buttons: 0 }));
  venster.dispatchEvent(druk('pointerup', 410, 310));
  assert.deepEqual(gezet, []);
});

test('na een sleep telt de klik niet; een gewone klik wel', () => {
  const { knop, venster, druk, kliks } = opzet();
  knop.dispatchEvent(druk('pointerdown', 20, 20));
  venster.dispatchEvent(druk('pointermove', 410, 310));
  venster.dispatchEvent(druk('pointerup', 410, 310));
  knop.dispatchEvent(new Event('click'));
  assert.deepEqual(kliks, []);
  knop.dispatchEvent(druk('pointerdown', 20, 20));
  venster.dispatchEvent(druk('pointerup', 20, 20));
  knop.dispatchEvent(new Event('click'));
  assert.deepEqual(kliks, [1]);
});

test('met een vinger: vasthouden zonder te bewegen is een langzame tik (een klik), vasthouden en bewegen een sleep', async () => {
  const { knop, venster, gezet, druk, kliks } = opzet();
  knop.dispatchEvent(druk('pointerdown', 20, 20, { pointerType: 'touch' }));
  await new Promise((klaar) => setTimeout(klaar, 400));
  venster.dispatchEvent(druk('pointerup', 21, 20, { pointerType: 'touch' }));
  knop.dispatchEvent(new Event('click'));
  assert.deepEqual(kliks, [1], 'een langzame tik telt als klik');
  knop.dispatchEvent(druk('pointerdown', 20, 20, { pointerType: 'touch' }));
  await new Promise((klaar) => setTimeout(klaar, 400));
  venster.dispatchEvent(druk('pointermove', 20, 330, { pointerType: 'touch' }));
  venster.dispatchEvent(druk('pointermove', 410, 330, { pointerType: 'touch' }));
  venster.dispatchEvent(druk('pointerup', 410, 330, { pointerType: 'touch' }));
  assert.deepEqual(gezet, [{ maatIndex: 1, start: 480 }], 'na vasthouden mag je ook omlaag slepen');
});
