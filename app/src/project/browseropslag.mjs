import { schoonMeta } from './meta.mjs';

const geldigId = /^[a-f0-9]{12}$/;

// Winkel in het geheugen, voor tests.
export function geheugenWinkel() {
  const kaart = new Map();
  return {
    async alle() {
      return [...kaart.values()];
    },
    async haal(id) {
      return kaart.get(id);
    },
    async zet(id, waarde) {
      kaart.set(id, waarde);
    },
    async wis(id) {
      return kaart.delete(id);
    },
  };
}

// Winkel in IndexedDB, alleen voor de browser.
export function indexedDbWinkel({ database = 'score2sound', tabel = 'projecten' } = {}) {
  let verbinding = null;

  function verbind() {
    if (!verbinding) {
      verbinding = new Promise((klaar, mislukt) => {
        const verzoek = indexedDB.open(database, 1);
        verzoek.onupgradeneeded = () => {
          verzoek.result.createObjectStore(tabel, { keyPath: 'id' });
        };
        verzoek.onsuccess = () => klaar(verzoek.result);
        verzoek.onerror = () => {
          verbinding = null;
          mislukt(verzoek.error);
        };
      });
    }
    return verbinding;
  }

  async function doe(modus, actie) {
    const db = await verbind();
    return new Promise((klaar, mislukt) => {
      const transactie = db.transaction(tabel, modus);
      const verzoek = actie(transactie.objectStore(tabel));
      transactie.oncomplete = () => klaar(verzoek.result);
      transactie.onerror = () => mislukt(transactie.error);
      transactie.onabort = () => mislukt(transactie.error);
    });
  }

  return {
    alle: () => doe('readonly', (winkel) => winkel.getAll()),
    haal: (id) => doe('readonly', (winkel) => winkel.get(id)),
    async zet(id, waarde) {
      await doe('readwrite', (winkel) => winkel.put({ ...waarde, id }));
    },
    async wis(id) {
      const bestond = (await doe('readonly', (winkel) => winkel.get(id))) !== undefined;
      await doe('readwrite', (winkel) => winkel.delete(id));
      return bestond;
    },
  };
}

function nieuwId() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export function maakBrowserOpslag(winkel) {
  async function lees(id) {
    if (typeof id !== 'string' || !geldigId.test(id)) throw new Error('Onbekend project.');
    const project = await winkel.haal(id);
    if (!project) throw new Error('Onbekend project.');
    return structuredClone(project);
  }

  async function lijst() {
    const projecten = await winkel.alle();
    return projecten
      .sort((a, b) => b.bijgewerkt.localeCompare(a.bijgewerkt))
      .map(({ id, naam, aangemaakt, bijgewerkt, map = null, labels = [] }) => (
        structuredClone({ id, naam, aangemaakt, bijgewerkt, map, labels })
      ));
  }

  async function bewaar({ id, naam, partituur, versies }) {
    if (!partituur || !Array.isArray(partituur.partijen)) {
      throw new Error('Er is geen partituur om te bewaren.');
    }

    const nu = new Date().toISOString();
    let aangemaakt = nu;
    let eerdereVersies = [];
    let meta = schoonMeta({});
    if (id) {
      const eerder = await lees(id);
      aangemaakt = eerder.aangemaakt;
      eerdereVersies = eerder.versies ?? [];
      meta = schoonMeta({ map: eerder.map, labels: eerder.labels });
    } else {
      id = nieuwId();
    }

    const project = {
      id,
      naam: String(naam ?? '').trim().slice(0, 120) || 'Naamloos',
      aangemaakt,
      bijgewerkt: nu,
      ...meta,
      partituur,
      versies: Array.isArray(versies) ? versies : eerdereVersies,
    };
    await winkel.zet(id, structuredClone(project));
    return structuredClone(project);
  }

  async function open(id) {
    return lees(id);
  }

  async function zetMeta(id, meta) {
    const project = await lees(id);
    const bijgewerkt = {
      ...project,
      ...schoonMeta(meta),
      bijgewerkt: new Date().toISOString(),
    };
    await winkel.zet(id, structuredClone(bijgewerkt));
    return bijgewerkt;
  }

  async function verwijder(id) {
    if (typeof id !== 'string' || !geldigId.test(id)) throw new Error('Onbekend project.');
    if (!(await winkel.wis(id))) throw new Error('Onbekend project.');
  }

  return { lijst, bewaar, open, zetMeta, verwijder };
}

export function projectNaarBestand(project) {
  return JSON.stringify({
    soort: 'score2sound-project',
    versie: 1,
    naam: project.naam,
    partituur: project.partituur,
    versies: project.versies,
  }, null, 2);
}

export function projectUitBestand(tekst) {
  const fout = new Error('Dit bestand is geen SCORE2SOUND-project.');
  let gegevens;
  try {
    gegevens = JSON.parse(tekst);
  } catch {
    throw fout;
  }
  if (!gegevens || !gegevens.partituur || !Array.isArray(gegevens.partituur.partijen)) throw fout;
  return {
    naam: gegevens.naam,
    partituur: gegevens.partituur,
    versies: Array.isArray(gegevens.versies) ? gegevens.versies : [],
  };
}
