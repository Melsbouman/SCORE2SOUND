import { zetTitelgegevens } from '/src/model/titelgegevens.mjs';

export function start(app) {
  const vlak = document.getElementById('titel');
  let laatstGetekendeIdentiteit;

  function teken() {
    const partituur = app.stand.partituur;
    const identiteit = partituur
      ? JSON.stringify([partituur.titel ?? '', partituur.componist ?? '', partituur.arrangeur ?? ''])
      : null;
    if (identiteit === laatstGetekendeIdentiteit) return;
    laatstGetekendeIdentiteit = identiteit;

    if (!partituur) {
      vlak.replaceChildren();
      return;
    }

    const kop = document.createElement('h2');
    kop.textContent = 'Titelgegevens';
    const formulier = document.createElement('form');
    formulier.addEventListener('submit', gebeurtenis => gebeurtenis.preventDefault());

    for (const [veldnaam, labeltekst] of [
      ['titel', 'Titel'],
      ['componist', 'Componist'],
      ['arrangeur', 'Arrangeur']
    ]) {
      const label = document.createElement('label');
      const invoer = document.createElement('input');
      const id = `titel-${veldnaam}`;
      label.htmlFor = id;
      label.textContent = labeltekst;
      invoer.id = id;
      invoer.name = veldnaam;
      invoer.type = 'text';
      invoer.value = partituur[veldnaam] ?? '';
      invoer.addEventListener('change', () => {
        const nieuw = zetTitelgegevens(app.stand.partituur, { [veldnaam]: invoer.value });
        app.zet({ partituur: nieuw });
      });
      formulier.append(label, invoer);
    }

    vlak.replaceChildren(kop, formulier);
  }

  app.op('partituur', teken);
  teken();
}
