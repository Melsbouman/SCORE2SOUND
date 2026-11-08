import { PALETTEN, uitlegVan } from '/src/model/paletten.mjs';
import { voegAanwijzingToe, verwijderAanwijzing, leesId, zoekElement } from '/src/model/corrigeren.mjs';
import { zetTempo, verwijderTempo, tempoLijst, tempoUitMaat } from '/src/model/tempo.mjs';
import { zetSleutel, zetToonsoort, zetMaatsoort, zetHerhaling } from '/src/model/maten-bewerken.mjs';

const dynamiekTermen = ['pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'sf', 'sfz', 'fp'];

export function start(app) {
  let gekozenNoot = null;
  let gekozenMaat = null;
  let gekozenTot = null;

  function teken() {
    const vlak = document.getElementById('aanduidingen');
    if (!vlak) return;

    const tekst = document.createElement('p');
    tekst.className = 'zacht';
    tekst.textContent = gekozenNoot != null
      ? 'Gekozen: noot'
      : gekozenMaat != null
        ? `Gekozen: maat ${gekozenMaat + 1}`
        : 'Kies een noot of een maat en klik op een palet-item of sleep het naar een maat.';

    const container = document.createElement('div');
    container.className = 'paletten-container';

    PALETTEN.forEach((onderdeel) => {
      const details = document.createElement('details');
      details.className = 'paletten__onderdeel';
      details.setAttribute('data-id', onderdeel.id);

      let openStestand = onderdeel.id === 'dynamiek';
      try {
        const opgeslagen = localStorage.getItem(`score2sound-palet-${onderdeel.id}`);
        if (opgeslagen !== null) {
          openStestand = opgeslagen === 'true';
        }
      } catch {}
      if (openStestand) {
        details.open = true;
      }

      details.addEventListener('toggle', () => {
        try {
          localStorage.setItem(`score2sound-palet-${onderdeel.id}`, String(details.open));
        } catch {}
      });

      const summary = document.createElement('summary');
      summary.className = 'paletten__kop';
      summary.textContent = onderdeel.naam;
      details.appendChild(summary);

      const raster = document.createElement('div');
      raster.className = 'paletten__raster';

      onderdeel.items.forEach((item) => {
        const knop = document.createElement('button');
        knop.type = 'button';
        knop.className = 'knop paletten__cel';
        knop.draggable = true;
        knop.textContent = item.tekst || item.naam;
        const uitleg = uitlegVan ? uitlegVan(item.naam) : item.naam;
        knop.title = uitleg || item.naam;
        knop.setAttribute('aria-label', `${onderdeel.naam}: ${item.naam}`);

        const actie = item.actie;
        const soort = actie?.soort;
        const beschikbaar = ['key', 'toonsoort', 'maatsoort', 'tempo', 'dynamiek', 'tekst', 'herhaling', 'volta', 'sprong', 'maatstreep'].includes(soort);

        if (!beschikbaar) {
          knop.disabled = true;
          knop.title = 'Nog niet beschikbaar';
          knop.setAttribute('aria-label', `${item.naam}: Nog niet beschikbaar`);
        }

        knop.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('application/x-palet', JSON.stringify({
            onderdeelId: onderdeel.id,
            itemId: item.id,
          }));
        });

        knop.addEventListener('click', () => {
          voerActieUit(app, actie, gekozenMaat, gekozenNoot);
        });

        raster.appendChild(knop);
      });

      details.appendChild(raster);
      container.appendChild(details);
    });

    vlak.replaceChildren(tekst, container);
  }

  app.op('kies-noot', ({ id }) => {
    gekozenNoot = id ?? null;
    teken();
  });
  app.op('kies-maat', ({ maat, tot }) => {
    gekozenMaat = maat ?? null;
    gekozenTot = tot ?? null;
    teken();
  });
  app.op('partituur', teken);
  teken();
}

export function voerPaletActieUit(app, actie, gekozenMaat, gekozenNoot) {
  const partituur = app.stand.partituur;
  if (!partituur) return;

  let partijId;
  let maatIndex;
  let start = 0;

  if (gekozenNoot != null) {
    const plaats = leesId(gekozenNoot);
    const elementBijNoot = zoekElement(partituur, gekozenNoot);
    if (plaats && elementBijNoot) {
      ({ partijId, maatIndex } = plaats);
      start = elementBijNoot.start;
    }
  }
  if (partijId == null || maatIndex == null) {
    partijId = partituur.partijen[0]?.id;
    maatIndex = gekozenMaat ?? 0;
  }
  if (partijId == null) return;

  const soort = actie?.soort;
  const waarde = actie?.waarde;
  let nieuwePartituur = partituur;

  if (soort === 'key') {
    nieuwePartituur = zetSleutel(partituur, partijId, maatIndex, waarde.teken, waarde.lijn);
  } else if (soort === 'toonsoort') {
    nieuwePartituur = zetToonsoort(partituur, maatIndex, waarde.kwinten, waarde.modus);
  } else if (soort === 'maatsoort') {
    nieuwePartituur = zetMaatsoort(partituur, maatIndex, waarde.teller, waarde.noemer);
  } else if (soort === 'tempo') {
    const bpm = typeof waarde === 'number' ? waarde : (waarde?.bpm ?? 120);
    nieuwePartituur = zetTempo(partituur, maatIndex, bpm);
  } else if (soort === 'dynamiek') {
    const term = typeof waarde === 'string' ? waarde : (waarde?.tekst || 'mf');
    nieuwePartituur = voegAanwijzingToe(partituur, partijId, maatIndex, start, 'dynamiek', term);
  } else if (soort === 'tekst') {
    const term = typeof waarde === 'string' ? waarde : (waarde?.tekst || '');
    if (term) {
      nieuwePartituur = voegAanwijzingToe(partituur, partijId, maatIndex, start, 'tekst', term);
    }
  } else if (soort === 'herhaling') {
    if (waarde?.begin) {
      nieuwePartituur = zetHerhaling(partituur, maatIndex, 'begin', true);
    } else if (waarde?.eind) {
      nieuwePartituur = zetHerhaling(partituur, maatIndex, 'eind', true);
    }
  } else if (soort === 'volta') {
    if (waarde?.nummers?.includes(1)) {
      nieuwePartituur = zetHerhaling(partituur, maatIndex, 'volta1', true);
    } else if (waarde?.nummers?.includes(2)) {
      nieuwePartituur = zetHerhaling(partituur, maatIndex, 'volta2', true);
    }
  }

  if (nieuwePartituur !== partituur) {
    app.zet({ partituur: nieuwePartituur });
  }
}
