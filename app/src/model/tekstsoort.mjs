const SOORTEN = [
  ["tempo", [
    "largo", "lento", "adagio", "andante", "moderato", "allegretto", "allegro",
    "vivace", "presto", "prestissimo", "rit.", "ritard.", "rall.", "molto rall.",
    "accel.", "stringendo", "allargando", "meno mosso", "piu mosso", "a tempo",
    "tempo primo", "tempo i", "l'istesso tempo",
  ]],
  ["expressie", [
    "dolce", "cantabile", "dolce cantabile", "cant.", "espressivo", "espress.",
    "con espressione", "sostenuto", "marcato", "leggiero", "maestoso", "con brio",
    "tranquillo", "agitato", "poco", "molto", "sempre", "cresc.", "dim.",
  ]],
  ["spelwijze", [
    "open", "muted", "straight mute", "con sord.", "senza sord.", "con sordino",
    "senza sordino", "pizz.", "arco",
  ]],
  ["structuur", [
    "cadenza", "ad libitum", "solo", "soli", "tutti", "fine", "d.c.", "d.s.",
    "segno", "coda",
  ]],
];

function herkenningstekst(tekst) {
  return String(tekst)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .replace(/\s+/g, " ");
}

function begintMetTerm(tekst, term) {
  return tekst === term || tekst.startsWith(`${term} `);
}

export function tekstSoort(tekst) {
  const waarde = herkenningstekst(tekst);
  let eerste = null;

  for (const [soort, termen] of SOORTEN) {
    for (const term of termen) {
      const herkenning = herkenningstekst(term);
      if (!begintMetTerm(waarde, herkenning)) continue;
      const lengte = herkenning.split(/\s+/).length;
      if (!eerste || lengte > eerste.lengte) eerste = { soort, lengte };
    }
  }

  return eerste?.soort ?? "tekst";
}

export function plaatsingVoor(soort) {
  return soort === "expressie" || soort === "tekst" ? "below" : "above";
}
