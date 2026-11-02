// De gedeelde stand van de app in de browser.
// Schermen lezen app.stand, veranderen hem met app.zet({ sleutel: waarde }) en luisteren met app.op(sleutel, functie).
// app.zet meldt elke gewijzigde sleutel; app.meld(naam, gegevens) meldt een losse gebeurtenis, zoals 'naar-maat'.
import { maakGeschiedenis } from '../../src/model/geschiedenis.mjs';

export function maakApp() {
  const geschiedenis = maakGeschiedenis(50);
  const luisteraars = new Map();
  const app = {
    stand: {
      partituur: null, // het muziekmodel uit docs/model.md
      meldingen: [], // meldingen uit de controles, zie docs/model.md
      project: null, // { id, naam } van het bewaarde project, of null
    },
    ongedaan() {
      const partituur = geschiedenis.ongedaan();
      if (partituur == null) return;
      app.stand.partituur = partituur;
      app.meld('partituur', partituur);
    },
    opnieuw() {
      const partituur = geschiedenis.opnieuw();
      if (partituur == null) return;
      app.stand.partituur = partituur;
      app.meld('partituur', partituur);
    },
    kanOngedaan() {
      return geschiedenis.kanOngedaan();
    },
    kanOpnieuw() {
      return geschiedenis.kanOpnieuw();
    },
    op(naam, functie) {
      if (!luisteraars.has(naam)) luisteraars.set(naam, new Set());
      luisteraars.get(naam).add(functie);
      return () => luisteraars.get(naam).delete(functie);
    },
    meld(naam, gegevens) {
      for (const functie of luisteraars.get(naam) ?? []) {
        try {
          functie(gegevens);
        } catch (fout) {
          console.error(`Fout bij '${naam}':`, fout);
        }
      }
    },
    zet(wijziging) {
      if (Object.hasOwn(wijziging, 'partituur') && wijziging.partituur != null) geschiedenis.zet(wijziging.partituur);
      Object.assign(app.stand, wijziging);
      for (const sleutel of Object.keys(wijziging)) app.meld(sleutel, app.stand[sleutel]);
    },
  };
  return app;
}
