// Heeft het stuk de regelindeling van het origineel (new-system, minstens twee keer), dan volgen de editor en de pdf die:
// hetzelfde aantal maten per regel als op het blad.
export function heeftOrigineleRegels(musicxml) {
  return (String(musicxml).match(/new-system="yes"/g) ?? []).length >= 2;
}
