// De gedeelde stand van de app in de browser.
// Schermen lezen app.stand, veranderen hem met app.zet({ sleutel: waarde }) en luisteren met app.op(sleutel, functie).
// app.zet meldt elke gewijzigde sleutel; app.meld(naam, gegevens) meldt een losse gebeurtenis, zoals 'naar-maat'.
export function maakApp() {
  const luisteraars = new Map();
  const app = {
    stand: {
      partituur: null, // het muziekmodel uit docs/model.md
      meldingen: [], // meldingen uit de controles, zie docs/model.md
      project: null, // { id, naam } van het bewaarde project, of null
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
      Object.assign(app.stand, wijziging);
      for (const sleutel of Object.keys(wijziging)) app.meld(sleutel, app.stand[sleutel]);
    },
  };
  return app;
}
