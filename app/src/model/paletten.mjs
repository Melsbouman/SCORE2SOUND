// De paletten in de editor: hokjes die je op een maat of een noot zet (slepen of klikken).
// Elk hokje heeft een id, een naam (ook de uitleg bij de muis), een icoon en een actie.
// Het icoon is `teken` (tekens uit het muzieklettertype Bravura, SMuFL-codes) en/of `woord` (gewone tekst, met `stijl`).
// Sleutels, toonsoorten en maatsoorten krijgen een kleine notenbalk; die tekent het scherm uit de actie, net als de haken,
// de hokjes 1 en 2 en de overbinding. Wat een actie doet staat in paletactie.mjs.

const G = {
  vioolsleutel: '\uE050', vioolsleutel8vb: '\uE052', altsleutel: '\uE05C', bassleutel: '\uE062',
  mol: '\uE260', herstel: '\uE261', kruis: '\uE262', dubbelkruis: '\uE263', dubbelmol: '\uE264',
  p: '\uE520', m: '\uE521', f: '\uE522', r: '\uE523', s: '\uE524', z: '\uE525',
  halve: '\uE1D3', kwart: '\uE1D5', achtste: '\uE1D7', punt: '\uE1E7',
  accent: '\uE4A0', staccato: '\uE4A2', tenuto: '\uE4A4', staccatissimo: '\uE4A6', marcato: '\uE4AC', fermate: '\uE4C0',
  herhalingBegin: '\uE040', herhalingEind: '\uE041', segno: '\uE047', coda: '\uE048',
  streep: '\uE030', dubbeleStreep: '\uE031', eindstreep: '\uE032',
  achtHoger: '\uE511', achtLager: '\uE51C',
};

// Dynamiek als losse letters uit Bravura: 'sfz' wordt s, f en z.
const dyn = (term) => [...term].map((letter) => G[letter]).join('');

const sleutel = (id, naam, teken, lijn, octaafVerschuiving, icoon) => ({
  id, naam, teken: icoon, actie: { soort: 'sleutel', waarde: { teken, lijn, octaafVerschuiving } },
});

const TOONSOORT_NAMEN = {
  0: 'C majeur / A mineur', 1: 'G majeur / E mineur', 2: 'D majeur / B mineur', 3: 'A majeur / F♯ mineur',
  4: 'E majeur / C♯ mineur', 5: 'B majeur / G♯ mineur', 6: 'F♯ majeur / D♯ mineur', 7: 'C♯ majeur / A♯ mineur',
  '-1': 'F majeur / D mineur', '-2': 'B♭ majeur / G mineur', '-3': 'E♭ majeur / C mineur', '-4': 'A♭ majeur / F mineur',
  '-5': 'D♭ majeur / B♭ mineur', '-6': 'G♭ majeur / E♭ mineur', '-7': 'C♭ majeur / A♭ mineur',
};
const toonsoort = (kwinten) => ({
  id: `toonsoort-${kwinten < 0 ? `${-kwinten}-mollen` : `${kwinten}-kruisen`}`,
  naam: TOONSOORT_NAMEN[kwinten],
  actie: { soort: 'toonsoort', waarde: { kwinten, modus: 'majeur' } },
});

const maatsoort = (teller, noemer, symbool) => ({
  id: `maatsoort-${symbool ?? `${teller}-${noemer}`}`,
  naam: symbool === 'common' ? 'C (vierkwartsmaat)' : symbool === 'cut' ? 'Alla breve' : `${teller}/${noemer}`,
  actie: { soort: 'maatsoort', waarde: { teller, noemer, ...(symbool ? { symbool } : {}) } },
});

// Een metronoomhokje: het tempo in kwartnoten per minuut, en de noot zoals hij getoond wordt (eenheid, punt, getal).
const metronoom = (noot, naam, getal, kwartPerMinuut, eenheid = 'quarter', punt = false) => ({
  id: `tempo-${naam.replace(/\./g, 'punt')}-${getal}`, naam: `${naam} = ${getal}`, teken: noot, woord: ` = ${getal}`, stijl: 'vet',
  actie: { soort: 'tempo', waarde: kwartPerMinuut, ...(eenheid === 'quarter' && !punt ? {} : { getoond: { eenheid, punt, getal } }) },
});
const tempoterm = (naam, bpm) => ({
  id: `tempo-${naam.toLowerCase()}`, naam, woord: naam, stijl: 'vet',
  actie: { soort: 'tempo', waarde: bpm, tekst: naam },
});
const tempotekst = (tekst) => ({
  id: `tempotekst-${tekst.replace(/[^a-z]/gi, '')}`, naam: tekst, woord: tekst, stijl: 'cursief',
  actie: { soort: 'tempotekst', waarde: tekst },
});
const dynamiek = (term) => ({ id: `dynamiek-${term}`, naam: term, teken: dyn(term), actie: { soort: 'dynamiek', waarde: term } });
const tekst = (waarde) => ({
  id: `tekst-${waarde.replace(/[^a-z]/gi, '')}`, naam: waarde, woord: waarde, stijl: 'cursief', actie: { soort: 'tekst', waarde },
});
const sprong = (id, naam, veld, waarde, icoon) => ({ id, naam, ...icoon, actie: { soort: 'sprong', waarde: { veld, waarde } } });

export const PALETTEN = [
  {
    id: 'sleutels',
    naam: 'Muzieksleutels',
    items: [
      sleutel('sleutel-viool', 'Vioolsleutel', 'G', 2, 0, G.vioolsleutel),
      sleutel('sleutel-viool-8vb', 'Vioolsleutel, een octaaf lager', 'G', 2, -1, G.vioolsleutel8vb),
      sleutel('sleutel-bas', 'Bassleutel', 'F', 4, 0, G.bassleutel),
      sleutel('sleutel-alt', 'Altsleutel', 'C', 3, 0, G.altsleutel),
      sleutel('sleutel-tenor', 'Tenorsleutel', 'C', 4, 0, G.altsleutel),
    ],
  },
  {
    id: 'toonsoorten',
    naam: 'Toonsoorten',
    items: [0, 1, 2, 3, 4, 5, 6, 7, -1, -2, -3, -4, -5, -6, -7].map(toonsoort),
  },
  {
    id: 'maatsoorten',
    naam: 'Maatsoorten',
    items: [
      maatsoort(2, 4), maatsoort(3, 4), maatsoort(4, 4), maatsoort(5, 4), maatsoort(6, 4),
      maatsoort(3, 8), maatsoort(6, 8), maatsoort(9, 8), maatsoort(12, 8),
      maatsoort(2, 2), maatsoort(3, 2), maatsoort(4, 4, 'common'), maatsoort(2, 2, 'cut'),
    ],
  },
  {
    id: 'tempo',
    naam: 'Tempo',
    items: [
      metronoom(G.kwart, '♩', 60, 60), metronoom(G.kwart, '♩', 80, 80), metronoom(G.kwart, '♩', 100, 100),
      metronoom(G.kwart, '♩', 120, 120), metronoom(G.kwart, '♩', 144, 144), metronoom(G.halve, 'halve noot', 80, 160, 'half'),
      metronoom(`${G.kwart}${G.punt}`, '♩.', 60, 90, 'quarter', true), metronoom(G.achtste, '♪', 120, 60, 'eighth'),
      tempoterm('Grave', 40), tempoterm('Largo', 50), tempoterm('Adagio', 66), tempoterm('Andante', 76),
      tempoterm('Moderato', 100), tempoterm('Allegretto', 108), tempoterm('Allegro', 120), tempoterm('Vivace', 160),
      tempoterm('Presto', 180),
      tempotekst('accel.'), tempotekst('rall.'), tempotekst('rit.'), tempotekst('allarg.'),
      tempotekst('a tempo'), tempotekst('tempo primo'),
    ],
  },
  {
    id: 'toonhoogte',
    naam: 'Toonhoogte',
    items: [
      { id: 'toonhoogte-octaaf-hoger', naam: 'Noot een octaaf hoger', teken: G.achtHoger, actie: { soort: 'octaaf', waarde: 1 } },
      { id: 'toonhoogte-octaaf-lager', naam: 'Noot een octaaf lager', teken: G.achtLager, actie: { soort: 'octaaf', waarde: -1 } },
      { id: 'toonhoogte-halve-toon-hoger', naam: 'Noot een halve toon hoger', woord: '+½', stijl: 'vet', actie: { soort: 'halvetoon', waarde: 1 } },
      { id: 'toonhoogte-halve-toon-lager', naam: 'Noot een halve toon lager', woord: '−½', stijl: 'vet', actie: { soort: 'halvetoon', waarde: -1 } },
    ],
  },
  {
    id: 'voortekens',
    naam: 'Voortekens',
    items: [
      { id: 'voorteken-dubbelmol', naam: 'Dubbelmol', teken: G.dubbelmol, actie: { soort: 'voorteken', waarde: -2 } },
      { id: 'voorteken-mol', naam: 'Mol', teken: G.mol, actie: { soort: 'voorteken', waarde: -1 } },
      { id: 'voorteken-herstel', naam: 'Herstellingsteken', teken: G.herstel, actie: { soort: 'voorteken', waarde: 0 } },
      { id: 'voorteken-kruis', naam: 'Kruis', teken: G.kruis, actie: { soort: 'voorteken', waarde: 1 } },
      { id: 'voorteken-dubbelkruis', naam: 'Dubbelkruis', teken: G.dubbelkruis, actie: { soort: 'voorteken', waarde: 2 } },
    ],
  },
  {
    id: 'dynamiek',
    naam: 'Dynamiek',
    items: [
      ...['ppp', 'pp', 'p', 'mp', 'mf', 'f', 'ff', 'fff', 'fp', 'sf', 'sfz', 'sffz', 'fz', 'rfz'].map(dynamiek),
      { id: 'dynamiek-crescendo', naam: 'Crescendo (haak)', actie: { soort: 'haak', waarde: 'crescendo' } },
      { id: 'dynamiek-decrescendo', naam: 'Decrescendo (haak)', actie: { soort: 'haak', waarde: 'decrescendo' } },
      { id: 'dynamiek-cresc', naam: 'cresc.', woord: 'cresc.', stijl: 'cursief', actie: { soort: 'tekst', waarde: 'cresc.' } },
      { id: 'dynamiek-dim', naam: 'dim.', woord: 'dim.', stijl: 'cursief', actie: { soort: 'tekst', waarde: 'dim.' } },
    ],
  },
  {
    id: 'articulaties',
    naam: 'Articulaties',
    items: [
      { id: 'articulatie-accent', naam: 'Accent', teken: G.accent, actie: { soort: 'articulatie', waarde: 'accent' } },
      { id: 'articulatie-staccato', naam: 'Staccato', teken: G.staccato, actie: { soort: 'articulatie', waarde: 'staccato' } },
      { id: 'articulatie-tenuto', naam: 'Tenuto', teken: G.tenuto, actie: { soort: 'articulatie', waarde: 'tenuto' } },
      { id: 'articulatie-staccatissimo', naam: 'Staccatissimo', teken: G.staccatissimo, actie: { soort: 'articulatie', waarde: 'staccatissimo' } },
      { id: 'articulatie-marcato', naam: 'Marcato', teken: G.marcato, actie: { soort: 'articulatie', waarde: 'marcato' } },
      { id: 'articulatie-fermate', naam: 'Fermate', teken: G.fermate, actie: { soort: 'fermate', waarde: true } },
      { id: 'articulatie-overbinding', naam: 'Overbinding naar de volgende noot', actie: { soort: 'overbinding', waarde: true } },
    ],
  },
  {
    id: 'tekst',
    naam: 'Tekst',
    items: [
      { id: 'tekst-letter', naam: 'Repetitieletter (de volgende letter)', woord: 'A', stijl: 'kader', actie: { soort: 'letter', waarde: null } },
      tekst('solo'), tekst('tutti'), tekst('con sord.'), tekst('senza sord.'), tekst('open'),
      tekst('dolce'), tekst('espress.'), tekst('cantabile'), tekst('legato'), tekst('sim.'),
    ],
  },
  {
    id: 'herhalingen',
    naam: 'Herhalingen en sprongen',
    items: [
      { id: 'herhaling-begin', naam: 'Herhaling begin', teken: G.herhalingBegin, actie: { soort: 'herhaling', waarde: 'begin' } },
      { id: 'herhaling-eind', naam: 'Herhaling eind', teken: G.herhalingEind, actie: { soort: 'herhaling', waarde: 'eind' } },
      { id: 'volta-1', naam: 'Eerste einde (hokje 1)', actie: { soort: 'volta', waarde: 1 } },
      { id: 'volta-2', naam: 'Tweede einde (hokje 2)', actie: { soort: 'volta', waarde: 2 } },
      sprong('sprong-segno', 'Segno', 'segno', 'segno', { teken: G.segno }),
      sprong('sprong-coda', 'Coda', 'coda', 'coda', { teken: G.coda }),
      sprong('sprong-naar-coda', 'To Coda', 'naarCoda', 'coda', { woord: 'To Coda', stijl: 'gewoon' }),
      sprong('sprong-fine', 'Fine', 'fine', true, { woord: 'Fine', stijl: 'gewoon' }),
      sprong('sprong-dc', 'D.C. al Fine', 'daCapo', true, { woord: 'D.C.', stijl: 'gewoon' }),
      sprong('sprong-ds', 'D.S. al Fine', 'dalSegno', 'segno', { woord: 'D.S.', stijl: 'gewoon' }),
    ],
  },
  {
    id: 'maatstrepen',
    naam: 'Maatstrepen',
    items: [
      { id: 'maatstreep-enkel', naam: 'Gewone maatstreep', teken: G.streep, actie: { soort: 'maatstreep', waarde: 'enkel' } },
      { id: 'maatstreep-dubbel', naam: 'Dubbele maatstreep', teken: G.dubbeleStreep, actie: { soort: 'maatstreep', waarde: 'dubbel' } },
      { id: 'maatstreep-eind', naam: 'Eindstreep', teken: G.eindstreep, actie: { soort: 'maatstreep', waarde: 'eind' } },
    ],
  },
];
