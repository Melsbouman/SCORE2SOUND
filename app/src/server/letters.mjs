// Repetitieletters (A, B, C of een getal in een kader) uit de herkende bladen.
// Audiveris leest zulke kaders niet als muziektekens; we zoeken ze in de zwart-witafbeelding van het blad,
// lezen de letter uit het woord dat Audiveris erin vond, en anders nemen we de volgende letter van het alfabet.
import { stapelKaart } from '../model/stapels.mjs';
import { leesPng, vindKaders } from './kaders.mjs';
import { leesXmlBoom, kind, kinderen } from '../musicxml/xml.mjs';

const MARGE_BOVEN = 10; // pixels dat een kader de bovenste notenlijn mag overlappen
const MAX_AFSTAND = 300; // pixels tussen kader en notenbalk daaronder
const MAAT_MARGE = 60; // pixels dat het midden van een kader van een maatstreep af mag liggen

const getal = (knoop, naam) => Number(knoop.attr[naam]);

// Systemen van een blad met hun maten (links en rechts in pixels) en de y van de bovenste notenlijn.
export function systemenVan(xml) {
  const pagina = kind(leesXmlBoom(xml), 'page');
  return kinderen(pagina, 'system').map((system) => {
    const deel = kinderen(system, 'part')[0];
    const staff = deel ? kinderen(deel, 'staff')[0] : null;
    const punt = staff ? kinderen(kinderen(kind(staff, 'lines'), 'line')[0] ?? { kinderen: [] }, 'point')[0] : null;
    return {
      boven: punt ? getal(punt, 'y') : Infinity,
      stacks: kinderen(system, 'stack').map((stack) => ({ links: getal(stack, 'left'), rechts: getal(stack, 'right') })),
    };
  });
}

// De woorden van Audiveris met hun plek, om de tekst in een kader te vinden.
function woordenVan(xml) {
  const woorden = [];
  const loop = (knoop) => {
    if (knoop.naam === 'word' && knoop.attr.value) {
      const vak = kind(knoop, 'bounds');
      if (vak) woorden.push({ tekst: knoop.attr.value, x: getal(vak, 'x'), y: getal(vak, 'y'), w: getal(vak, 'w'), h: getal(vak, 'h') });
    }
    for (const k of knoop.kinderen) loop(k);
  };
  loop(leesXmlBoom(xml));
  return woorden;
}

const volgende = (letter) => (/^[A-Z]$/.test(letter) ? String.fromCharCode(letter.charCodeAt(0) + 1) : 'A');

// Per blad de letters met hun plaats: [{ systeem, stack, waarde, zekerheid }]. `volgendeLetter` loopt door over bladen heen.
export function lettersVoorBlad({ xml, png }, status = { volgende: 'A' }) {
  const kaders = vindKaders(leesPng(png));
  const systemen = systemenVan(xml);
  const woorden = woordenVan(xml);
  const uit = [];
  for (const kader of kaders.sort((a, b) => a.y - b.y || a.x - b.x)) {
    const midden = kader.x + kader.w / 2;
    const onder = kader.y + kader.h;
    let systeem = -1;
    let afstand = Infinity;
    systemen.forEach((s, index) => {
      const d = s.boven - onder;
      if (d >= -MARGE_BOVEN && d < MAX_AFSTAND && d < afstand) {
        systeem = index;
        afstand = d;
      }
    });
    if (systeem < 0) continue;
    const stacks = systemen[systeem].stacks;
    let stack = stacks.findIndex((s) => Math.abs(s.links - midden) <= MAAT_MARGE);
    if (stack < 0) stack = stacks.findIndex((s) => midden >= s.links && midden < s.rechts);
    if (stack < 0) continue;

    const erin = woorden.filter((w) => w.x + w.w / 2 >= kader.x && w.x + w.w / 2 <= kader.x + kader.w && w.y + w.h / 2 >= kader.y && w.y + w.h / 2 <= kader.y + kader.h);
    const gelezen = erin.map((w) => w.tekst.replace(/[[\]\s]/g, '')).join('');
    if (kader.tekens === 1 || kader.w < 60) {
      const waarde = status.volgende;
      const zekerheid = gelezen === waarde ? 0.9 : 0.5;
      uit.push({ systeem, stack, waarde, zekerheid });
      status.volgende = volgende(status.volgende);
    } else if (/^\d{1,4}$/.test(gelezen)) {
      uit.push({ systeem, stack, waarde: gelezen, zekerheid: 0.9 });
    }
  }
  return uit;
}

// Zet de letters als aanwijzing aan het begin van de maat, in elke partij. Dezelfde indeling als koppelOmr.
export function voegLettersToe(partituur, bladen) {
  const uit = structuredClone(partituur);
  const status = { volgende: 'A' };
  const meldingen = [];
  let maatStart = 0;
  for (const blad of bladen) {
    const systemen = systemenVan(blad.xml);
    let letters = [];
    try {
      letters = blad.png ? lettersVoorBlad(blad, status) : [];
    } catch {
      meldingen.push(`Op pagina ${blad.nummer} konden de letters niet worden gezocht.`);
    }
    const aangenomen = [];
    const eerder = systemen.map((s) => s.stacks.length);
    if (letters.length > 0) {
      const aantalMaten = eerder.reduce((a, b) => a + b, 0);
      for (const partij of uit.partijen) {
        const kaart = stapelKaart(partij.maten);
        for (const maat of partij.maten.slice(kaart[maatStart] ?? partij.maten.length, kaart[maatStart + aantalMaten] ?? partij.maten.length)) {
          maat.elementen = maat.elementen.filter((element) => element.type !== 'letter');
        }
      }
    }
    for (const letter of letters) {
      const begin = maatStart + eerder.slice(0, letter.systeem).reduce((a, b) => a + b, 0) + letter.stack;
      for (const partij of uit.partijen) {
        const maat = partij.maten[stapelKaart(partij.maten)[begin]];
        if (!maat || maat.elementen.some((e) => e.type === 'letter')) continue;
        maat.elementen.unshift({ soort: 'aanwijzing', start: 0, type: 'letter', waarde: letter.waarde, zekerheid: letter.zekerheid });
      }
      if (letter.zekerheid < 0.8) aangenomen.push(letter.waarde);
    }
    if (aangenomen.length === 1) meldingen.push(`Op pagina ${blad.nummer} is de letter ${aangenomen[0]} aangenomen: de app kon hem niet lezen.`);
    if (aangenomen.length > 1) meldingen.push(`Op pagina ${blad.nummer} zijn de letters ${aangenomen.join(', ')} aangenomen: de app kon ze niet lezen.`);
    maatStart += eerder.reduce((a, b) => a + b, 0);
  }
  return { partituur: uit, meldingen };
}
