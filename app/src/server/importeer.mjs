// API: POST /api/importeer met een MusicXML-bestand als body. Geeft { partituur, meldingen } terug.
// Wordt gebouwd in pakket 9 van werkpakketten/plannen/2026-10-29-score2sound-app.md.
export default async function importeer() {
  return { status: 501, body: { fout: 'Importeren is nog niet gebouwd.' } };
}
