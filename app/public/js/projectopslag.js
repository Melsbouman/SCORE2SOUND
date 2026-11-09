import { indexedDbWinkel, maakBrowserOpslag } from '/src/project/browseropslag.mjs';

// De projecten staan in de browser zelf (IndexedDB), niet op de server.
export const opslag = maakBrowserOpslag(indexedDbWinkel());
