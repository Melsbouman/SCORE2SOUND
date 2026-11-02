export function maakGeschiedenis(max) {
  const standen = [];
  let positie = -1;

  return {
    zet(stand) {
      standen.splice(positie + 1);
      standen.push(stand);
      if (standen.length > max + 1) standen.shift();
      positie = standen.length - 1;
    },
    ongedaan() {
      if (positie <= 0) return null;
      positie -= 1;
      return standen[positie];
    },
    opnieuw() {
      if (positie < 0 || positie >= standen.length - 1) return null;
      positie += 1;
      return standen[positie];
    },
    kanOngedaan() {
      return positie > 0;
    },
    kanOpnieuw() {
      return positie >= 0 && positie < standen.length - 1;
    },
  };
}
