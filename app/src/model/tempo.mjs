function tempoUitMaat(maat) {
  if (typeof maat?.tempo === 'number') return maat.tempo;
  return maat?.elementen?.find(
    (element) => element.soort === 'aanwijzing' && element.type === 'tempo'
  )?.waarde;
}

export function tempoLijst(partituur) {
  const maten = partituur?.partijen?.[0]?.maten ?? [];
  const lijst = [];

  maten.forEach((maat, index) => {
    const tempo = tempoUitMaat(maat);
    if (index === 0 || tempo !== undefined) {
      lijst.push({
        maat: index,
        nummer: maat.nummer,
        bpm: tempo ?? 120,
      });
    }
  });

  return lijst;
}

function geldigTempo(bpm) {
  if (typeof bpm !== 'number' || !Number.isFinite(bpm) || bpm < 20 || bpm > 300) {
    throw new Error('Kies een tempo tussen 20 en 300.');
  }
  return Math.round(bpm);
}

export function zetTempo(partituur, maatIndex, bpm) {
  const waarde = geldigTempo(bpm);
  const nieuwe = structuredClone(partituur);

  for (const partij of nieuwe.partijen ?? []) {
    const maat = partij.maten?.[maatIndex];
    if (!maat) continue;
    maat.tempo = waarde;
    maat.elementen ??= [];
    const aanwijzing = maat.elementen.find(
      (element) =>
        element.soort === 'aanwijzing' && element.type === 'tempo' && element.start === 0
    );
    if (aanwijzing) {
      aanwijzing.waarde = waarde;
    } else {
      maat.elementen.unshift({
        soort: 'aanwijzing',
        start: 0,
        type: 'tempo',
        waarde,
        zekerheid: 1,
      });
    }
  }

  return nieuwe;
}

export function verwijderTempo(partituur, maatIndex) {
  if (maatIndex === 0) {
    throw new Error('Het begintempo kan niet worden weggehaald.');
  }

  const nieuwe = structuredClone(partituur);
  for (const partij of nieuwe.partijen ?? []) {
    const maat = partij.maten?.[maatIndex];
    if (!maat) continue;
    delete maat.tempo;
    maat.elementen = (maat.elementen ?? []).filter(
      (element) => !(element.soort === 'aanwijzing' && element.type === 'tempo')
    );
  }
  return nieuwe;
}
