// De vaste lijst met aanduidingen (van Mels). De herkenning zet alleen aanduidingen uit deze lijst in de partituur,
// nooit een gegokte tekst: wat Audiveris leest wordt het woord uit de lijst dat er het meest op lijkt.
const groep = (naam, items) => items.map(([itemNaam, afkorting, uitleg]) => ({ naam: itemNaam, ...(afkorting ? { afkorting } : {}), groep: naam, uitleg }));

export const AANDUIDINGENLIJST = [
  ...groep('Tempo', [
    ['Grave', null, 'Zeer langzaam en ernstig'],
    ['Largo', null, 'Breed, zeer langzaam'],
    ['Adagio', null, 'Langzaam en rustig'],
    ['Andante', null, 'Rustig wandeltempo'],
    ['Moderato', null, 'Matig snel'],
    ['Allegro', null, 'Snel en opgewekt'],
    ['Presto', null, 'Zeer snel'],
    ['Prestissimo', null, 'Zo snel mogelijk'],
  ]),
  ...groep('Tempoveranderingen', [
    ['Accelerando', 'accel.', 'Versnellen'],
    ['Ritardando', 'rit.', 'Vertragen'],
    ['Rallentando', 'rall.', 'Vertragen'],
    ['A tempo', null, 'Terug naar het oorspronkelijke basistempo'],
    ['Rubato', null, 'Vrij in tempo spelen'],
  ]),
  ...groep('Dynamiek', [
    ['Pianissimo', 'pp', 'Zeer zacht'],
    ['Piano', 'p', 'Zacht'],
    ['Mezzopiano', 'mp', 'Matig zacht'],
    ['Mezzoforte', 'mf', 'Matig hard'],
    ['Forte', 'f', 'Hard / sterk'],
    ['Fortissimo', 'ff', 'Zeer hard / sterk'],
  ]),
  ...groep('Volumeveranderingen', [
    ['Crescendo', 'cresc.', 'Geleidelijk luider worden'],
    ['Decrescendo', 'decresc.', 'Geleidelijk zachter worden'],
    ['Diminuendo', 'dim.', 'Geleidelijk zachter worden'],
    ['Sforzando', 'sfz', 'Plotseling een sterke nadruk op één noot'],
  ]),
  ...groep('Articulatie', [
    ['Legato', null, 'Vloeiend aan elkaar verbonden spelen'],
    ['Staccato', null, 'Kort en los van elkaar gespeeld'],
    ['Marcato', null, 'Elke noot extra benadrukken en aanzetten'],
    ['Tenuto', null, 'De noot over de volledige lengte breed uithouden'],
  ]),
  ...groep('Karakter en stijl', [
    ['Agitato', null, 'Onrustig, wild'],
    ['Animato', null, 'Levendig, bezield'],
    ['Cantabile', null, 'Zingend'],
    ['Dolce', null, 'Zacht, lieflijk'],
    ['Espressivo', null, 'Met veel uitdrukking en gevoel'],
    ['Maestoso', null, 'Majestueus, plechtig'],
    ['Vivace', null, 'Levendig en snel'],
  ]),
  ...groep('Structuur en navigatie', [
    ['Da Capo', 'D.C.', 'Vanaf het begin herhalen'],
    ['Dal Segno', 'D.S.', 'Vanaf het teken herhalen'],
    ['Fine', null, 'Het einde van het muziekstuk'],
    ['Coda', null, 'Het slotgedeelte'],
    ['Fermata', null, 'De noot of rust langer aanhouden'],
  ]),
  ...groep('Toevoegingen', [
    ['Assai', null, 'Zeer'],
    ['Molto', null, 'Veel / erg'],
    ['Poco a poco', null, 'Beetje bij beetje'],
    ['Non troppo', null, 'Niet te veel'],
  ]),
];

const STERKTES = new Set(['pp', 'p', 'mp', 'mf', 'f', 'ff', 'sfz']);
const VERBINDINGSWOORDEN = new Set(['con', 'di', 'al', 'il', 'e', 'a', 'non', 'poco', 'sempre', 'meno', 'piu', 'più', 'la']);
const DYNAMIEK_GROEPEN = new Set(['Dynamiek', 'Volumeveranderingen']);

const schoon = (tekst) => tekst.toLowerCase().replace(/\./g, '').trim();

function afstand(a, b) {
  let vorige = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const huidige = [i];
    for (let j = 1; j <= b.length; j += 1) {
      huidige[j] = Math.min(huidige[j - 1] + 1, vorige[j] + 1, vorige[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    vorige = huidige;
  }
  return vorige[b.length];
}

function resultaatVoor(item) {
  return DYNAMIEK_GROEPEN.has(item.groep)
    ? { type: 'dynamiek', waarde: item.afkorting }
    : { type: 'tekst', waarde: item.naam };
}

function dichtstbij(woord) {
  let beste = null;
  for (const item of AANDUIDINGENLIJST) {
    const namen = [schoon(item.naam), ...(item.afkorting ? [schoon(item.afkorting)] : [])];
    for (const naam of namen) {
      const volledig = afstand(woord, naam);
      const begin = naam.length > woord.length ? afstand(woord, naam.slice(0, woord.length)) + 0.5 : Infinity;
      // Een gelezen woord waarvan het begin ontbreekt of fout is (slent. voor rallentando) lijkt op een stuk uit het midden of einde van de naam.
      let midden = Infinity;
      if (woord.length >= 4 && naam.length > woord.length) {
        for (let van = 1; van + woord.length <= naam.length; van += 1) midden = Math.min(midden, afstand(woord, naam.slice(van, van + woord.length)) + 0.75);
      }
      const score = Math.min(volledig, begin, midden);
      if (!beste || score < beste.score) beste = { item, score };
    }
  }
  return beste;
}

export function leesAanduidingen(tekst) {
  if (typeof tekst !== 'string') return null;
  // Audiveris leest ff vaak als de ligatuur fl met een apostrof: eerst normaliseren.
  tekst = tekst.normalize('NFKD').replace(/['’`´]/g, '');
  const woorden = tekst.trim().split(/\s+/).filter(Boolean);
  if (woorden.length === 0 || woorden.length > 3 || /\d/.test(tekst)) return null;

  const uit = [];
  let rest = woorden;
  const eerste = schoon(woorden[0]);
  if (!VERBINDINGSWOORDEN.has(eerste) && /^[fpmszli1|]{1,4}$/.test(eerste)) {
    const kandidaat = eerste.replace(/[li1|]/g, 'f');
    if (STERKTES.has(kandidaat)) {
      uit.push({ type: 'dynamiek', waarde: kandidaat });
      rest = woorden.slice(1);
    }
  }

  // Een hele naam van meerdere woorden (Poco a poco, A tempo, Da Capo, ...) eerst als geheel proberen.
  const geheel = schoon(rest.join(' '));
  if (rest.length > 1) {
    const meerwoordig = AANDUIDINGENLIJST.filter((item) => item.naam.includes(' '))
      .map((item) => ({ item, score: afstand(geheel, schoon(item.naam)) }))
      .sort((x, y) => x.score - y.score)[0];
    if (meerwoordig && meerwoordig.score <= Math.max(1, Math.floor(geheel.length / 4))) {
      uit.push(resultaatVoor(meerwoordig.item));
      return uit;
    }
  }

  if (rest.length > 2) return null; // een zin, geen aanduiding

  for (const woord of rest) {
    const sleutel = schoon(woord);
    if (VERBINDINGSWOORDEN.has(sleutel) || sleutel.length <= 2) {
      uit.push({ type: 'tekst', waarde: woord });
      continue;
    }
    const gevonden = dichtstbij(sleutel);
    // Een woord dat niet duidelijk op de lijst lijkt (open, mute, risoluto, fuoco) is geen leesfout: dat blijft zoals het is.
    if (!gevonden || gevonden.score > sleutel.length * 0.4) {
      uit.push({ type: 'tekst', waarde: woord });
      continue;
    }
    uit.push(resultaatVoor(gevonden.item));
  }
  return uit.length > 0 ? uit : null;
}
