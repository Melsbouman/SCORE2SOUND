const MIDI_STAPPEN = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function midiWaarde(noot) {
  const { stap, alter, octaaf } = noot.toonhoogte;
  return (octaaf + 1) * 12 + MIDI_STAPPEN[stap] + alter;
}

export function markeerVerdachteNoten(partituur) {
  const kopie = structuredClone(partituur);

  for (const partij of kopie.partijen) {
    const noten = partij.maten.flatMap((maat) => maat.elementen)
      .filter((element) => element.soort === 'noot' && !element.akkoord);

    const verdacht = new Array(noten.length).fill(false);
    for (let index = 1; index < noten.length; index++) {
      const noot = noten[index];
      const huidig = midiWaarde(noot);
      const heeftVolgende = index < noten.length - 1;
      const grens = heeftVolgende ? 15 : 25;
      const wijktAfVanVorige = Math.abs(huidig - midiWaarde(noten[index - 1])) >= grens;
      const wijktAfVanVolgende = !heeftVolgende || Math.abs(huidig - midiWaarde(noten[index + 1])) >= grens;

      if (wijktAfVanVorige && wijktAfVanVolgende && (!verdacht[index - 1] || heeftVolgende)) {
        verdacht[index] = true;
        noot.zekerheid = Math.min(noot.zekerheid, 0.5);
      }
    }
  }

  return kopie;
}
