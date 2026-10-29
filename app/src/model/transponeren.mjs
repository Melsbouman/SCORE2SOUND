import { transponeer, naarMidi, vanMidi, naam } from './toonhoogte.mjs';

const begrensKwinten = (kwinten) => {
  while (kwinten < -7) kwinten += 12;
  while (kwinten > 7) kwinten -= 12;
  return kwinten;
};

export function transponeerPartij(partij, instrument) {
  const nieuwePartij = structuredClone(partij);
  const nieuwId = `${partij.id}-${instrument.id}`;
  const interval = {
    chromatisch: partij.instrument.transpositie.chromatisch - instrument.transpositie.chromatisch,
    diatonisch: partij.instrument.transpositie.diatonisch - instrument.transpositie.diatonisch,
  };
  const meldingen = [];

  nieuwePartij.id = nieuwId;
  nieuwePartij.naam = instrument.naam;
  nieuwePartij.instrument = {
    midiProgramma: instrument.midiProgramma,
    transpositie: structuredClone(instrument.transpositie),
  };

  for (const maat of nieuwePartij.maten) {
    maat.toonsoort.kwinten = begrensKwinten(
      maat.toonsoort.kwinten + 7 * interval.chromatisch - 12 * interval.diatonisch,
    );
    maat.sleutels = [{
      teken: instrument.sleutel.teken,
      lijn: instrument.sleutel.lijn,
      notenbalk: 1,
      octaafVerschuiving: 0,
    }];

    for (const element of maat.elementen) {
      if (element.soort !== 'noot') continue;

      element.toonhoogte = transponeer(element.toonhoogte, interval);
      if (element.toonhoogte.alter < -2 || element.toonhoogte.alter > 2) {
        element.toonhoogte = vanMidi(
          naarMidi(element.toonhoogte),
          maat.toonsoort.kwinten < 0 ? 'mol' : 'kruis',
        );
      }

      const klinkend = naarMidi(element.toonhoogte) + instrument.transpositie.chromatisch;
      const richting = klinkend < instrument.bereik.laag
        ? 'te laag'
        : klinkend > instrument.bereik.hoog ? 'te hoog' : null;
      if (richting) {
        meldingen.push({
          soort: 'bereik',
          ernst: 'waarschuwing',
          partij: nieuwId,
          maat: maat.index,
          tekst: `Maat ${maat.nummer}: ${naam(element.toonhoogte)} is ${richting} voor ${instrument.naam}.`,
        });
      }
    }
  }

  return { partij: nieuwePartij, meldingen };
}
