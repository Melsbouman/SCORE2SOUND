import { instrumentBijNaam } from '../model/instrumenten.mjs';
import { FAMILIES } from '../model/nieuw.mjs';

function instrumentFamilieId(instrumentId) {
  for (const familie of FAMILIES) {
    if (familie.instrumenten.includes(instrumentId)) {
      return familie.id;
    }
  }
  return null;
}

export function mixVoorPartijen(partijen) {
  // Determine pitch for each partij based on instrument's lowest note (bereik.laag) or fallback
  const partijenMetPitch = partijen.map((partij) => {
    const instrument = instrumentBijNaam(partij.naam);
    const pitch = instrument?.bereik?.laag ?? instrument?.midiProgramma ?? 127;
    return { partij, pitch };
  });

  // Sort descending pitch (higher pitch left)
  partijenMetPitch.sort((a, b) => b.pitch - a.pitch);

  const N = partijen.length;
  const panSorted = [];
  for (let i = 0; i < N; i++) {
    if (N === 1) {
      panSorted[i] = 64;
    } else {
      panSorted[i] = Math.round(20 + (i * (108 - 20) / (N - 1)));
    }
  }

  // Map sorted positions back to original indices
  const valuesByOriginalIndex = new Map();
  for (let sortedIdx = 0; sortedIdx < partijenMetPitch.length; sortedIdx++) {
    const { partij } = partijenMetPitch[sortedIdx];
    const origIdx = partijen.indexOf(partij);
    const instrument = instrumentBijNaam(partij.naam);
    const instrumentId = instrument?.id ?? null;
    if (!instrumentId) {
      valuesByOriginalIndex.set(origIdx, {
        pan: null,
        galm: null,
        volume: null,
        expressie: null,
      });
      continue;
    }

    // Determine galm based on family
    const familie = instrumentFamilieId(instrumentId);
    let galm;
    if (familie === 'koper') {
      galm = 55;
    } else {
      galm = 40; // houtblazers + strijkers
    }

    // Determine volume based on instrument mapping from spec
    let volume;
    if (!instrumentId) {
      volume = 100; // fallback
    } else if (['es-kornet', 'trompet', 'klarinet', 'viool', 'sopraansaxofoon', 'dwarsfluit', 'piccolo', 'bugel'].includes(instrumentId)) {
      volume = 100;
    } else if (['hoorn', 'althoorn', 'altsaxofoon', 'tenorsaxofoon', 'altviool'].includes(instrumentId)) {
      volume = 90;
    } else if (['tuba', 'bes-tuba', 'trombone', 'baritonsaxofoon', 'cello', 'fagot'].includes(instrumentId)) {
      volume = 85;
    } else {
      volume = 100; // fallback for any other instrument
    }

    // Expressie always 127
    const expressie = 127;

    valuesByOriginalIndex.set(origIdx, {
      pan: panSorted[sortedIdx],
      galm,
      volume,
      expressie,
    });
  }

  // Return array in original order
  const result = [];
  for (let i = 0; i < partijen.length; i++) {
    result.push(valuesByOriginalIndex.get(i));
  }
  return result;
}
