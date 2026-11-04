import { herstelMuziekterm } from './muziektermen.mjs';

export function herstelTeksten(partituur) {
  const kopie = structuredClone(partituur);

  function bezoek(waarde) {
    if (!waarde || typeof waarde !== 'object') return;

    if (Array.isArray(waarde.aanwijzingen)) {
      for (const aanwijzing of waarde.aanwijzingen) {
        if (aanwijzing?.type === 'tekst' && typeof aanwijzing.waarde === 'string') {
          aanwijzing.waarde = herstelMuziekterm(aanwijzing.waarde);
        }
      }
    }

    for (const onderdeel of Object.values(waarde)) bezoek(onderdeel);
  }

  bezoek(kopie);
  return kopie;
}
