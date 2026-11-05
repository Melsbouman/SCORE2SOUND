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
    .replace(/\s+/g, " ")
    .trim();
}

function begintMetTerm(tekst, term) {
  return tekst === term || tekst.startsWith(`${term} `);
}

function verschil(links, rechts) {
  let vorige = Array.from({ length: rechts.length + 1 }, (_, index) => index);
  for (let i = 1; i <= links.length; i += 1) {
    const huidige = [i];
    for (let j = 1; j <= rechts.length; j += 1) {
      huidige[j] = Math.min(
        huidige[j - 1] + 1,
        vorige[j] + 1,
        vorige[j - 1] + (links[i - 1] === rechts[j - 1] ? 0 : 1),
      );
    }
    vorige = huidige;
  }
  return vorige[rechts.length];
}

export function tekstenBijnaGelijk(links, rechts) {
  const eerste = herkenningstekst(links);
  const tweede = herkenningstekst(rechts);
  if (!eerste || !tweede) return false;
  if (eerste === tweede) return true;
  if (Math.max(eerste.length, tweede.length) < 10) return false;
  return verschil(eerste, tweede) <= 2;
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
