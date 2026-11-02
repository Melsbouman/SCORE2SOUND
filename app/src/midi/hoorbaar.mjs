// Wat er in de audio-export klinkt: de partijen die de mixer niet uitzet, even hard als in de speler.
// De speler rekent met gain = volume / 100. MIDI-volume werkt kwadratisch, dus 100 * wortel(gain) klinkt gelijk.
export function hoorbaar(partituur, mixer = {}) {
  const solo = Object.values(mixer).some((m) => m.solo);
  const partijen = partituur.partijen.filter((partij) => {
    const instelling = mixer[partij.id] ?? {};
    return !instelling.gedempt && (!solo || instelling.solo);
  });
  const volume = Object.fromEntries(partijen.map((partij) => [
    partij.id,
    Math.min(127, Math.round(100 * Math.sqrt((mixer[partij.id]?.volume ?? 100) / 100))),
  ]));
  return { partituur: { ...partituur, partijen }, volume };
}
