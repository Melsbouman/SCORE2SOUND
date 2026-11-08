// Audiveris telt een samengestelde rust (bijvoorbeeld 6 maten rust) als één stapel (maat op het blad), de MusicXML heeft er zes maten voor.
// Deze kaart zet het nummer van een stapel om in de index van de maat in de partij.
// Een maatrust mag ook zonder de verborgen maten erachter staan (docs/model.md: "alleen als ze er zijn"); sla daarom alleen de
// verborgen maten over die er echt zijn, anders schuiven alle stapels erna een of meer maten op.
export function stapelKaart(maten) {
  const kaart = [];
  for (let index = 0; index < maten.length;) {
    // Een maat die de herkenning zelf invoegde (omdat hij ontbrak), staat niet op het blad en heeft dus geen stapel.
    if (maten[index].ingevoegd) {
      index += 1;
      continue;
    }
    kaart.push(index);
    let volgende = index + 1;
    const einde = index + (maten[index].maatrust > 1 ? maten[index].maatrust : 1);
    while (volgende < einde && volgende < maten.length && maten[volgende].verborgen) volgende += 1;
    index = volgende;
  }
  return kaart;
}

// Koppelt de stapels van Audiveris (maten op het blad) aan de maten van de partij door uit te lijnen op het aantal nootkoppen.
// Audiveris laat in zijn MusicXML soms een lege maat weg die wel als stapel op het blad staat; tel je dan gewoon op volgorde
// af, dan schuiven alle maten erna een stapel op. Uitlijnen maakt van zo'n stapel een gat.
// koppen: per stapel (in volgorde over alle bladen) het aantal nootkoppen van deze partij, of null als het onbekend is.
// Geeft per stapel de index van de maat, of undefined voor een stapel zonder maat.
const GAT = 0.7;

export function lijnStapelsUit(maten, koppen) {
  const kandidaten = stapelKaart(maten);
  const noten = kandidaten.map((index) => maten[index].elementen.filter((element) => element.soort === 'noot').length);
  const n = koppen.length;
  const m = kandidaten.length;
  const prijs = (i, j) => {
    const k = koppen[i];
    if (k == null) return 0;
    return Math.abs(k - noten[j]) / Math.max(1, k, noten[j]);
  };
  const kosten = Array.from({ length: n + 1 }, () => new Float64Array(m + 1));
  for (let i = 1; i <= n; i += 1) kosten[i][0] = i * GAT;
  for (let j = 1; j <= m; j += 1) kosten[0][j] = j * GAT;
  for (let i = 1; i <= n; i += 1) {
    for (let j = 1; j <= m; j += 1) {
      kosten[i][j] = Math.min(kosten[i - 1][j - 1] + prijs(i - 1, j - 1), kosten[i - 1][j] + GAT, kosten[i][j - 1] + GAT);
    }
  }
  // Terug door de tabel; bij gelijke kosten wint het paar (de gewone volgorde).
  const kaart = new Array(n).fill(undefined);
  let i = n;
  let j = m;
  while (i > 0 && j > 0) {
    if (Math.abs(kosten[i][j] - (kosten[i - 1][j - 1] + prijs(i - 1, j - 1))) < 1e-9) {
      kaart[i - 1] = kandidaten[j - 1];
      i -= 1;
      j -= 1;
    } else if (Math.abs(kosten[i][j] - (kosten[i - 1][j] + GAT)) < 1e-9) {
      i -= 1;
    } else {
      j -= 1;
    }
  }
  return kaart;
}

export function aantalUitSamengesteldeRust(maat) {
  const heeftHeleMaatrust = maat.elementen.some((element) => element.soort === 'rust' && element.heleMaat);
  if (!heeftHeleMaatrust || maat.elementen.some((element) => element.soort === 'noot')) return null;
  const cijfer = maat.elementen.find((element) => (
    element.soort === 'aanwijzing'
    && element.type === 'letter'
    && /^\d+$/.test(String(element.waarde ?? '').trim())
  ));
  const aantal = Number(String(cijfer?.waarde ?? '').trim());
  return Number.isInteger(aantal) && aantal > 1 && aantal <= 40 ? aantal : null;
}

export function verwijderDubbeleSleutels(partituur) {
  for (const partij of partituur.partijen ?? []) {
    const geldendeSleutels = new Map();
    for (let index = 0; index < partij.maten.length; index += 1) {
      const maat = partij.maten[index];
      const naSamengesteldeRust = index > 0 && aantalUitSamengesteldeRust(partij.maten[index - 1]) !== null;
      maat.sleutels = (maat.sleutels ?? []).filter((sleutel) => {
        const notenbalk = sleutel.notenbalk ?? 1;
        const geldende = geldendeSleutels.get(notenbalk);
        if (naSamengesteldeRust && geldende?.teken === sleutel.teken && geldende?.lijn === sleutel.lijn) return false;
        geldendeSleutels.set(notenbalk, sleutel);
        return true;
      });
    }
  }
  return partituur;
}
