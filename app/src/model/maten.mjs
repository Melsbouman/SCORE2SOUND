export function maatIndexVanNummer(maten, tekst) {
  const nummer = tekst.trim();
  const plek = maten.findIndex((maat) => maat.nummer === nummer);
  if (plek !== -1) return plek;

  const getal = Number(tekst);
  if (!Number.isFinite(getal)) return 0;
  return Math.min(Math.max(0, getal - 1), Math.max(0, maten.length - 1));
}

// De maten in de volgorde waarin ze klinken, met herhaalstrepen. Een herhaling zonder beginstreep gaat terug naar het begin
// of naar het einde van de vorige herhaling.
export function speelVolgorde(maten) {
  const basis = [];
  let begin = 0;
  const nummersVoorKeer = (einde) => {
    let actief = null;
    for (let plek = begin; plek <= einde; plek += 1) {
      const volta = maten[plek].volta;
      if (volta?.begin) actief = volta.nummers;
      const nummers = volta?.nummers ?? actief;
      if (plek === einde) return nummers;
      if (volta?.eind) actief = null;
    }
    return null;
  };
  const voegHerhalingToe = (einde, keer) => {
    let actief = null;
    for (let plek = begin; plek <= einde; plek += 1) {
      const volta = maten[plek].volta;
      if (volta?.begin) actief = volta.nummers;
      const nummers = volta?.nummers ?? actief;
      if (!nummers || nummers.includes(keer)) basis.push(plek);
      if (volta?.eind) actief = null;
    }
  };
  maten.forEach((maat, index) => {
    if (maat.herhaling?.begin) begin = index;
    const nummers = nummersVoorKeer(index, 1);
    if (!nummers || nummers.includes(1)) basis.push(index);
    if (maat.herhaling?.eind) {
      for (let keer = 1; keer < (maat.herhaling.keer ?? 2); keer += 1) {
        voegHerhalingToe(index, keer + 1);
      }
      begin = index + 1;
    }
  });

  const heeftSprongen = maten.some((maat) => maat.sprong);
  if (!heeftSprongen) return basis;

  const volgorde = [];
  const gebruikt = { daCapo: false, dalSegno: false, naarCoda: false };
  let actief = false;
  const vindDoel = (veld, naam) => maten.findIndex((maat) => {
    const waarde = maat.sprong?.[veld];
    return waarde && (waarde === naam || waarde === 'waar' || naam === 'waar');
  });
  const lineairVanaf = (start) => {
    let plek = start;
    while (plek >= 0 && plek < maten.length) {
      volgorde.push(plek);
      const sprong = maten[plek].sprong ?? {};
      if (actief && sprong.fine) break;
      if (actief && sprong.naarCoda && !gebruikt.naarCoda) {
        const coda = vindDoel('coda', sprong.naarCoda);
        if (coda !== -1) {
          gebruikt.naarCoda = true;
          plek = coda;
          continue;
        }
      }
      if (sprong.daCapo && !gebruikt.daCapo) {
        gebruikt.daCapo = true;
        actief = true;
        plek = 0;
        continue;
      }
      if (sprong.dalSegno && !gebruikt.dalSegno) {
        const segno = vindDoel('segno', sprong.dalSegno);
        if (segno !== -1) {
          gebruikt.dalSegno = true;
          actief = true;
          plek = segno;
          continue;
        }
      }
      plek += 1;
    }
  };
  for (const plek of basis) {
    volgorde.push(plek);
    const sprong = maten[plek].sprong ?? {};
    if (sprong.daCapo && !gebruikt.daCapo) {
      gebruikt.daCapo = true;
      actief = true;
      lineairVanaf(0);
      return volgorde;
    }
    if (sprong.dalSegno && !gebruikt.dalSegno) {
      const segno = vindDoel('segno', sprong.dalSegno);
      if (segno !== -1) {
        gebruikt.dalSegno = true;
        actief = true;
        lineairVanaf(segno);
        return volgorde;
      }
    }
  }
  return volgorde;
}

// De partituur zoals hij klinkt: herhaalde maten staan er meer keer in, zonder herhaalstrepen.
export function uitgevouwen(partituur) {
  const volgorde = speelVolgorde(partituur.partijen[0]?.maten ?? []);
  return {
    ...partituur,
    partijen: partituur.partijen.map((partij) => ({
      ...partij,
      maten: volgorde.filter((index) => partij.maten[index]).map((index, plek) => {
        const maat = { ...partij.maten[index], index: plek, herhaling: { begin: false, eind: false, keer: 2 } };
        delete maat.volta;
        return maat;
      }),
    })),
  };
}
