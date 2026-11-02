function isTempoHerstel(waarde) {
  return /^(?:a\s+tempo|tempo\s+primo|tempo\s+i)(?:\b|[.!?])/i.test(String(waarde ?? '').trim());
}

function isMetronoom(maat) {
  return maat?.tempo != null || maat?.elementen?.some(
    (element) => element.soort === 'aanwijzing' && element.type === 'tempo'
  );
}

function factorVanTekst(waarde) {
  const tekst = String(waarde ?? '').trim();
  if (/^(?:molto\s+)?(?:rall(?:\.|entando\b)|rit(?:\.|ard(?:\.|ando\b)|enuto\b)|allargando\b)/i.test(tekst)) {
    return /^molto\s+/i.test(tekst) ? 0.6 : 0.75;
  }
  if (/^(?:accel\.|accelerando\b|stringendo\b)/i.test(tekst)) return 1.2;
  return null;
}

export function tempoOverloop(partituur) {
  const maten = partituur?.partijen?.[0]?.maten ?? [];
  const verlopen = [];

  maten.forEach((maat, vanMaat) => {
    const aanwijzingen = maat.elementen ?? [];
    for (const element of aanwijzingen) {
      if (element.soort !== 'aanwijzing' || element.type !== 'tekst') continue;
      const factorEind = factorVanTekst(element.waarde);
      if (factorEind == null) continue;

      let totMaat = maten.length;
      for (let index = vanMaat + 1; index < maten.length; index += 1) {
        if (isMetronoom(maten[index]) || (maten[index].elementen ?? []).some(
          (volgende) => volgende.soort === 'aanwijzing' && volgende.type === 'tekst' && isTempoHerstel(volgende.waarde)
        )) {
          totMaat = index;
          break;
        }
      }
      if (totMaat === maten.length) totMaat = Math.min(vanMaat + 2, maten.length);
      verlopen.push({ vanMaat, totMaat, factorEind });
    }
  });

  return verlopen;
}
