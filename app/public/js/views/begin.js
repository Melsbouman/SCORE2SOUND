import { INSTRUMENTEN } from '/src/model/instrumenten.mjs';
import { FAMILIES_KIEZER, GENRES, instrumentenVoorFamilie, zoekInstrumenten, sorteerPartituur } from '/src/model/instrumentkiezer.mjs';
import { SJABLONEN, maakLeegStuk, maakVoorbeeldStuk } from '/src/model/nieuw.mjs';
import { start as newPartituurStart } from './nieuwe-partituur.js';

const TOONSOORTEN = [
  [-7, 'Ces majeur'],
  [-6, 'Ges majeur'],
  [-5, 'Des majeur'],
  [-4, 'As majeur'],
  [-3, 'Es majeur'],
  [-2, 'Bes majeur'],
  [-1, 'F majeur'],
  [0, 'C majeur'],
  [1, 'G majeur'],
  [2, 'D majeur'],
  [3, 'A majeur'],
  [4, 'E majeur'],
  [5, 'B majeur'],
  [6, 'Fis majeur'],
  [7, 'Cis majeur'],
];

function maakElement(naam, klasse, tekst = '') {
  const element = document.createElement(naam);
  if (klasse) element.className = klasse;
  element.textContent = tekst;
  return element;
}

export function start(app) {
  newPartituurStart(app);
  function openBegin() {
    if (window.location.hash !== '#begin') return;
    const vlak = document.getElementById('nieuw');
    if (vlak) vlak.scrollIntoView({ block: 'start' });
  }
  window.addEventListener('hashchange', openBegin);
  openBegin();
}
