// Een rust die Audiveris miste. In Galop staat vaak "achtste rust, achtste noot, achtste rust, achtste noot"; Audiveris leest één van
// de rusten niet en de maat duurt een achtste te kort. Op het blad staat op die plek een gat tussen twee elementen (of tussen de
// maatstreep en het eerste element). Is een maat precies één notenwaarde te kort en is er één gat duidelijk groter dan de andere,
// dan komt daar een rust van die waarde, rood (zekerheid 0,5) zodat je hem nakijkt. Alleen bij één stem op één balk, en met de
// plek van elk element (plek.x, gezet door koppelOmr). Soms is het een gemiste noot (Galop maat 15); daarom komt er ook een melding
// bij, die verdwijnt als je de maat goedkeurt. Geeft { partituur, meldingen }.

const WAARDEN = [120, 240, 480, 960];
// Gewone duren (zestiende tot hele, ook gepunteerd); een maat met triolen of 32e noten blijft ongemoeid.
const GEWOON = new Set([120, 180, 240, 360, 480, 720, 960, 1440, 1920]);
const ZEKERHEID = 0.5;

const maatLengte = (maat) => ((maat.maatsoort?.teller ?? 4) * 1920) / (maat.maatsoort?.noemer ?? 4);

// Waar de rust hoort: de index van het element waarvóór hij komt (0 = vooraan), of null als het niet duidelijk is.
// Een gat telt alleen tegen gaten na elementen van dezelfde duur: een kwart neemt meer ruimte dan een achtste, en een zestiende
// naar verhouding meer dan een achtste.
function plekVanGat(maat, delen, gewoneVoorruimte = null) {
  const balk = maat.vak ? maat.vak.onder - maat.vak.boven : null;
  const gaten = delen.slice(1).map((deel, index) => ({ na: index, duur: delen[index].duur, breedte: deel.plek.x - delen[index].plek.x }));
  const voor = maat.vak && !maat.regelbegin ? delen[0].plek.x - maat.vak.links : null;
  const breedste = Math.max(0, ...gaten.map((gat) => gat.breedte));
  if (voor !== null && balk && voor > 0.8 * balk && voor >= 1.6 * breedste) return 0;
  let beste = null;
  for (const gat of gaten) {
    const anderen = gaten.filter((ander) => ander !== gat && ander.duur === gat.duur).map((ander) => ander.breedte).sort((a, b) => a - b);
    if (anderen.length === 0) continue;
    const verhouding = gat.breedte / anderen[Math.floor(anderen.length / 2)];
    if (verhouding >= 1.7 && (!beste || verhouding > beste.verhouding)) beste = { na: gat.na, verhouding };
  }
  if (beste) return beste.na + 1;
  // Vooraan, vergeleken met de gewone ruimte na de maatstreep op dit blad: een element meer ruimte (Galop maat 43: de buren beginnen
  // 20 pixels na de maatstreep, deze maat pas na 79). Minstens een halve balk extra, zodat een voorteken voor de eerste noot niet telt.
  if (voor !== null && balk && gewoneVoorruimte !== null && gaten.length > 0) {
    const breedtes = gaten.map((gat) => gat.breedte).sort((a, b) => a - b);
    const extra = voor - gewoneVoorruimte;
    if (extra >= 0.5 * balk && extra >= 0.7 * breedtes[Math.floor(breedtes.length / 2)]) return 0;
  }
  // Twee elementen (een hokje als "noot, rust"): het gat na een korte noot is veel groter dan de ruimte na de maatstreep.
  if (gaten.length === 1 && voor !== null && balk && gaten[0].duur <= 240 && gaten[0].breedte >= 2.5 * voor && voor <= 0.8 * balk) return 1;
  return null;
}

// De gewone ruimte tussen de maatstreep en het eerste element, per blad (de mediaan, met minstens vijf maten midden in een regel).
function gewoneVoorruimtePerBlad(partij) {
  const perBlad = new Map();
  for (const maat of partij.maten ?? []) {
    if (!maat.vak || maat.regelbegin || maat.verborgen) continue;
    const eerste = maat.elementen.filter((element) => (element.soort === 'noot' || element.soort === 'rust') && element.plek)
      .sort((a, b) => a.start - b.start)[0];
    if (!eerste) continue;
    if (!perBlad.has(maat.vak.blad)) perBlad.set(maat.vak.blad, []);
    perBlad.get(maat.vak.blad).push(eerste.plek.x - maat.vak.links);
  }
  return new Map([...perBlad].filter(([, waarden]) => waarden.length >= 5)
    .map(([blad, waarden]) => [blad, waarden.sort((a, b) => a - b)[Math.floor(waarden.length / 2)]]));
}

export function vulRustGaten(partituur) {
  const kopie = structuredClone(partituur);
  const meldingen = [];
  for (const partij of kopie.partijen ?? []) {
    const voorruimte = gewoneVoorruimtePerBlad(partij);
    for (const maat of partij.maten ?? []) {
      if (maat.verborgen || maat.maatrust > 1) continue;
      const delen = maat.elementen.filter((element) => element.soort === 'noot' || element.soort === 'rust');
      if (delen.some((deel) => (deel.stem ?? 1) !== 1 || (deel.notenbalk ?? 1) !== 1 || deel.heleMaat || !deel.plek || !GEWOON.has(deel.duur))) continue;
      // Akkoordnoten delen hun begin; per begin telt het eerste element.
      const opBegin = [...new Map(delen.map((deel) => [deel.start, deel])).values()].sort((a, b) => a.start - b.start);
      if (opBegin.length < 2) continue;
      const einde = opBegin.at(-1).start + opBegin.at(-1).duur;
      const tekort = maatLengte(maat) - einde;
      if (!WAARDEN.includes(tekort)) continue;
      // Aaneengesloten: elk begin is het einde van het vorige; anders is er iets anders aan de hand.
      if (opBegin[0].start !== 0 || opBegin.some((deel, index) => index > 0 && deel.start !== opBegin[index - 1].start + opBegin[index - 1].duur)) continue;
      const voor = plekVanGat(maat, opBegin, voorruimte.get(maat.vak?.blad) ?? null);
      if (voor === null) continue;
      const start = voor === 0 ? 0 : opBegin[voor - 1].start + opBegin[voor - 1].duur;
      for (const element of maat.elementen) if (element.start >= start) element.start += tekort;
      const rust = { soort: 'rust', start, duur: tekort, stem: 1, notenbalk: 1, heleMaat: false, zekerheid: ZEKERHEID };
      const positie = maat.elementen.findIndex((element) => (element.soort === 'noot' || element.soort === 'rust') && element.start > start);
      maat.elementen.splice(positie < 0 ? maat.elementen.length : positie, 0, rust);
      meldingen.push({
        soort: 'herkenning',
        ernst: 'waarschuwing',
        partij: partij.id,
        maat: maat.index,
        tekst: `Maat ${maat.nummer}: de maat was te kort; op de lege plek staat nu een rust (rood). Kijk na of daar een rust of een noot hoort.`,
      });
    }
  }
  return { partituur: kopie, meldingen };
}
