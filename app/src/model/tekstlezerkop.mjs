const TEMPOWOORDEN = ['Vivace', 'Allegro', 'Andante', 'Moderato', 'Adagio', 'Presto', 'Largo', 'Lento'];

function afstandLevenshtein(eerste, tweede) {
  let vorige = Array.from({ length: tweede.length + 1 }, (_, index) => index);
  for (let i = 1; i <= eerste.length; i++) {
    const huidige = [i];
    for (let j = 1; j <= tweede.length; j++) {
      huidige[j] = Math.min(
        huidige[j - 1] + 1,
        vorige[j] + 1,
        vorige[j - 1] + (eerste[i - 1] === tweede[j - 1] ? 0 : 1),
      );
    }
    vorige = huidige;
  }
  return vorige[tweede.length];
}

function metHoofdletters(waarde) {
  return waarde.replace(/\p{L}+/gu, (woord) => woord[0].toLocaleUpperCase('nl') + woord.slice(1));
}

export function kopUitOcr(ocr, { arrangeurBekend, tempoBekend }) {
  let arrangeur = null;
  let tempoWoord = null;
  const hoogte = Number(ocr?.hoogte) || 0;

  if (!arrangeurBekend) {
    const regel = (ocr?.regels ?? []).find((item) => {
      const y = Math.min(...(item.woorden ?? []).map((woord) => Number(woord.y)).filter(Number.isFinite));
      return y <= hoogte * 0.15 && /^arr(?:\.|\s)\s*.+/i.test(item.tekst?.trim() ?? '');
    });
    const gevonden = regel?.tekst?.trim().match(/^arr(?:\.|\s)\s*(.+)$/i);
    if (gevonden) arrangeur = metHoofdletters(gevonden[1].trim());
  }

  if (!tempoBekend) {
    const woorden = (ocr?.regels ?? []).flatMap((regel) => regel.woorden ?? []);
    for (const woord of woorden) {
      const tekst = woord.tekst?.trim() ?? '';
      if (Number(woord.y) > hoogte * 0.2 || !/^\p{L}+$/u.test(tekst)) continue;
      const klein = tekst.toLocaleLowerCase('nl');
      tempoWoord = TEMPOWOORDEN.find((tempo) => afstandLevenshtein(klein, tempo.toLocaleLowerCase('nl')) <= 1) ?? null;
      if (tempoWoord) break;
    }
  }

  return { arrangeur, tempoWoord };
}
