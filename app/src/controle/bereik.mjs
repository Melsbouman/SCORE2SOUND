import { instrumentBijNaam } from '../model/instrumenten.mjs';
import { naam, naarMidi } from '../model/toonhoogte.mjs';

export function controleerBereik(partituur) {
  const meldingen = [];

  for (const partij of partituur.partijen) {
    const instrument = instrumentBijNaam(partij.naam);
    if (!instrument) continue;

    const transpositie = partij.instrument?.transpositie?.chromatisch ?? 0;
    for (const maat of partij.maten) {
      const noot = maat.elementen.find((element) => {
        if (element.soort !== 'noot') return false;
        const klinkend = naarMidi(element.toonhoogte) + transpositie;
        return klinkend < instrument.bereik.laag || klinkend > instrument.bereik.hoog;
      });
      if (!noot) continue;

      const klinkend = naarMidi(noot.toonhoogte) + transpositie;
      meldingen.push({
        soort: 'bereik',
        ernst: 'waarschuwing',
        partij: partij.id,
        maat: maat.index,
        tekst: `Maat ${maat.nummer}: ${naam(noot.toonhoogte)} is ${klinkend < instrument.bereik.laag ? 'te laag' : 'te hoog'} voor ${instrument.naam}.`,
      });
    }
  }

  return meldingen;
}
