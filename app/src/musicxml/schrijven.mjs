import { dynamiekUitTekst } from '../model/dynamiek.mjs';

const esc = (waarde) => String(waarde)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

const tag = (naam, inhoud = '', attributen = {}) => {
  const attrs = Object.entries(attributen).filter(([, waarde]) => waarde !== null && waarde !== undefined)
    .map(([sleutel, waarde]) => ` ${sleutel}="${esc(waarde)}"`).join('');
  return `<${naam}${attrs}>${inhoud}</${naam}>`;
};
const leeg = (naam, attributen = {}) => {
  const attrs = Object.entries(attributen).map(([sleutel, waarde]) => ` ${sleutel}="${esc(waarde)}"`).join('');
  return `<${naam}${attrs}/>`;
};

const gelijk = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const modus = (waarde) => waarde === 'mineur' ? 'minor' : waarde === 'majeur' ? 'major' : waarde;

function duurInfo(duur) {
  const types = [[1920, 'whole'], [960, 'half'], [480, 'quarter'], [240, 'eighth'], [120, '16th'], [60, '32nd'], [30, '64th']];
  for (const [basis, type] of types) {
    if (duur === basis) return { type, punten: 0, triool: false };
    if (duur === basis * 1.5) return { type, punten: 1, triool: false };
    if (duur === basis * 1.75) return { type, punten: 2, triool: false };
    if (duur * 1.5 === basis) return { type, punten: 0, triool: true };
  }
  return { type: null, punten: 0, triool: false };
}

function schrijfSleutel(sleutel, meerdere) {
  let inhoud = tag('sign', esc(sleutel.teken)) + tag('line', sleutel.lijn);
  if (sleutel.octaafVerschuiving) inhoud += tag('clef-octave-change', sleutel.octaafVerschuiving);
  return tag('clef', inhoud, meerdere ? { number: sleutel.notenbalk } : {});
}

function schrijfAttributes(maat, vorige, instrument) {
  const eerste = !vorige;
  const keyVeranderd = eerste || !gelijk(maat.toonsoort, vorige.toonsoort);
  const timeVeranderd = eerste || !gelijk(maat.maatsoort, vorige.maatsoort);
  const clefVeranderd = eerste || !gelijk(maat.sleutels, vorige.sleutels);
  if (!eerste && !keyVeranderd && !timeVeranderd && !clefVeranderd && !maat.maatrust) return '';
  const balken = Math.max(1, ...maat.sleutels.map((sleutel) => sleutel.notenbalk || 1));
  let inhoud = eerste ? tag('divisions', 480) : '';
  if (eerste && balken > 1) inhoud += tag('staves', balken);
  if (keyVeranderd) inhoud += tag('key', tag('fifths', maat.toonsoort.kwinten) + tag('mode', modus(maat.toonsoort.modus)));
  if (timeVeranderd) inhoud += tag('time', tag('beats', maat.maatsoort.teller) + tag('beat-type', maat.maatsoort.noemer));
  if (clefVeranderd) inhoud += maat.sleutels.map((sleutel) => schrijfSleutel(sleutel, balken > 1)).join('');
  const transpositie = instrument?.transpositie;
  if (eerste && transpositie && (transpositie.diatonisch || transpositie.chromatisch)) {
    inhoud += tag('transpose', tag('diatonic', transpositie.diatonisch) + tag('chromatic', transpositie.chromatisch));
  }
  if (maat.maatrust) inhoud += tag('measure-style', tag('multiple-rest', maat.maatrust));
  return tag('attributes', inhoud);
}

function schrijfAanwijzing(aanwijzing, weergave) {
  const offset = aanwijzing.start > 0 ? tag('offset', aanwijzing.start) : '';
  let type = '';
  let sound = '';
  let dynamiekTekst = false;
  let verloopWoord = false;
  if (aanwijzing.type === 'tempo') {
    const getoond = aanwijzing.getoond;
    const eenheid = getoond?.eenheid ?? 'quarter';
    const getal = getoond?.getal ?? aanwijzing.waarde;
    type = tag('metronome', tag('beat-unit', eenheid)
      + (getoond?.punt ? leeg('beat-unit-dot') : '')
      + tag('per-minute', getal));
    sound = leeg('sound', { tempo: aanwijzing.waarde });
  } else if (aanwijzing.type === 'dynamiek') {
    type = tag('dynamics', leeg(aanwijzing.waarde));
  } else if (aanwijzing.type === 'crescendo' || aanwijzing.type === 'decrescendo') {
    const waarde = aanwijzing.waarde === 'eind' ? 'stop' : aanwijzing.type === 'crescendo' ? 'crescendo' : 'diminuendo';
    type = leeg('wedge', { type: waarde });
  } else if (aanwijzing.type === 'octaafteken') {
    const waarde = { 'begin-omhoog': 'down', 'begin-omlaag': 'up', eind: 'stop' }[aanwijzing.waarde];
    type = leeg('octave-shift', {
      type: waarde,
      size: aanwijzing.grootte ?? 8,
      number: aanwijzing.nummer ?? 1,
    });
  } else if (aanwijzing.type === 'tekst') {
    const dynamiek = dynamiekUitTekst(String(aanwijzing.waarde).trim().replace(/\.$/, ''));
    if (dynamiek) {
      type = tag('dynamics', leeg(dynamiek));
      dynamiekTekst = true;
    }
    else {
      const verloop = /^(?:cresc\.|cresc|crescendo|dim\.|dimin\.|decresc\.|decrescendo)$/i
        .test(String(aanwijzing.waarde).trim());
      type = tag('words', esc(aanwijzing.waarde), verloop ? { 'font-style': 'italic' } : {});
    }
  } else if (aanwijzing.type === 'letter') {
    type = tag('rehearsal', esc(aanwijzing.waarde), {
      enclosure: 'square',
      color: weergave && aanwijzing.zekerheid < 0.8 ? '#C0392B' : null,
    });
  } else if (aanwijzing.type === 'pedaal') {
    const waarde = aanwijzing.musicxmlType ?? { begin: 'start', eind: 'stop', wissel: 'change' }[aanwijzing.waarde];
    if (waarde) type = leeg('pedal', { type: waarde });
  }
  verloopWoord = aanwijzing.type === 'tekst' && /cresc|dim/i.test(String(aanwijzing.waarde));
  const placement = !dynamiekTekst && !verloopWoord && ['tekst', 'tempo', 'letter', 'octaafteken'].includes(aanwijzing.type) ? 'above' : 'below';
  return tag('direction', tag('direction-type', type) + offset + sound, { placement });
}

function schrijfAkkoord(aanwijzing) {
  const naam = String(aanwijzing.waarde);
  const delen = naam.match(/^([A-G])([#b]?)(.*)$/);
  const suffixen = {
    '': 'major',
    m: 'minor',
    '7': 'dominant',
    m7: 'minor-seventh',
    maj7: 'major-seventh',
    dim: 'diminished',
    aug: 'augmented',
    sus4: 'suspended-fourth',
  };
  let inhoud = '';
  let suffix = naam;
  let bas = null;
  if (delen) {
    suffix = delen[3];
    const basDelen = suffix.match(/^(.*)\/([A-G])([#b]?)$/);
    if (basDelen) {
      suffix = basDelen[1];
      bas = { stap: basDelen[2], alter: basDelen[3] };
    }
    inhoud += tag('root', tag('root-step', delen[1])
      + (delen[2] ? tag('root-alter', delen[2] === '#' ? 1 : -1) : ''));
  }
  const kindNaam = suffixen[suffix] ?? 'other';
  const kindTekst = suffixen[suffix] === undefined ? suffix : null;
  inhoud += tag('kind', kindNaam, kindTekst === null ? {} : { text: kindTekst });
  if (bas) {
    inhoud += tag('bass', tag('bass-step', bas.stap)
      + (bas.alter ? tag('bass-alter', bas.alter === '#' ? 1 : -1) : ''));
  }
  if (aanwijzing.start > 0) inhoud += tag('offset', aanwijzing.start);
  return tag('harmony', inhoud);
}

function schrijfSprongen(sprong = {}) {
  const richtingen = [
    ['segno', sprong.segno, leeg('segno')],
    ['coda', sprong.coda, leeg('coda')],
    ['dacapo', sprong.daCapo ? 'yes' : null, tag('words', 'D.C. al Fine')],
    ['dalsegno', sprong.dalSegno, tag('words', 'D.S. al Fine')],
    ['tocoda', sprong.naarCoda, tag('words', 'To Coda')],
    ['fine', sprong.fine ? 'yes' : null, tag('words', 'Fine')],
  ];
  return richtingen.filter(([, waarde]) => waarde !== null && waarde !== undefined && waarde !== false && waarde !== '')
    .map(([attribuut, waarde, type]) => {
      const soundWaarde = ['dacapo', 'fine'].includes(attribuut) ? 'yes' : waarde;
      return tag('direction', tag('direction-type', type) + leeg('sound', { [attribuut]: soundWaarde }), { placement: 'above' });
    }).join('');
}

// Waar een triool begint en eindigt. Staat dat niet in het bestand, dan begint hij bij de eerste noot en eindigt hij bij de laatste.
function tupletMarkeringen(elementen) {
  const uit = new Map();
  let open = false;
  let vorige = null;
  const sluit = () => {
    if (open && vorige) uit.set(vorige, { ...uit.get(vorige), stop: true });
    open = false;
  };
  for (const element of elementen) {
    if (element.akkoord) continue;
    if (!element.tuplet) {
      sluit();
      vorige = element;
      continue;
    }
    if (element.tuplet.begin) sluit();
    if (element.tuplet.begin || !open) {
      uit.set(element, { start: true });
      open = true;
    }
    if (element.tuplet.eind) {
      uit.set(element, { ...uit.get(element), stop: true });
      open = false;
    }
    vorige = element;
  }
  sluit();
  return uit;
}

function schrijfNotations(element, markering = {}, openBogen) {
  let inhoud = '';
  if (markering.start) inhoud += leeg('tuplet', { type: 'start', number: 1, placement: 'above', bracket: 'yes' });
  if (markering.stop) inhoud += leeg('tuplet', { type: 'stop', number: 1 });
  if (element.fermate) inhoud += leeg('fermata', { type: 'upright' });
  if (element.overbinding?.eind) inhoud += leeg('tied', { type: 'stop' });
  if (element.overbinding?.begin) inhoud += leeg('tied', { type: 'start' });
  if (element.legato?.eind && openBogen.length) {
    const number = openBogen.pop();
    inhoud += leeg('slur', { type: 'stop', number });
  }
  if (element.legato?.begin) {
    let number = 1;
    while (openBogen.includes(number)) number += 1;
    openBogen.push(number);
    inhoud += leeg('slur', { type: 'start', number });
  }
  if (element.articulaties?.length) inhoud += tag('articulations', element.articulaties.map((naam) => leeg(naam === 'marcato' ? 'strong-accent' : naam)).join(''));
  let ornaments = '';
  if (element.versiering) {
    const namen = { triller: 'trill-mark', mordent: 'mordent', dubbelslag: 'turn' };
    if (namen[element.versiering]) ornaments += leeg(namen[element.versiering]);
  }
  if (element.tremolo) ornaments += tag('tremolo', esc(element.tremolo.streepjes), { type: element.tremolo.type });
  if (ornaments) inhoud += tag('ornaments', ornaments);
  if (element.arpeggio) {
    const direction = { omlaag: 'down', omhoog: 'up' }[element.arpeggio];
    inhoud += leeg('arpeggiate', direction ? { direction } : {});
  }
  if (element.glissando?.begin) inhoud += leeg('glissando', { type: 'start', number: 1 });
  if (element.glissando?.eind) inhoud += leeg('glissando', { type: 'stop', number: 1 });
  return inhoud ? tag('notations', inhoud) : '';
}

function dynamiekVanTekst(tekst) {
  const genormaliseerd = String(tekst).trim().replace(/[.\s]+$/, '');
  return dynamiekUitTekst(genormaliseerd);
}

function alterUitToonsoort(stap, kwinten) {
  const kruisen = ['F', 'C', 'G', 'D', 'A', 'E', 'B'];
  const mollen = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  if (kwinten > 0) return kruisen.slice(0, kwinten).includes(stap) ? 1 : 0;
  if (kwinten < 0) return mollen.slice(0, -kwinten).includes(stap) ? -1 : 0;
  return 0;
}

function maakAccidentalen(maat) {
  const huidig = new Map();
  const accidentalen = new Map();
  const namen = { 1: 'sharp', 0: 'natural', '-1': 'flat', 2: 'double-sharp', '-2': 'flat-flat' };
  const noten = maat.elementen
    .filter((element) => element.soort === 'noot' && !element.ongestemd)
    .sort((a, b) => a.start - b.start);
  for (const element of noten) {
    const toon = element.toonhoogte;
    const sleutel = `${toon.stap}:${toon.octaaf}`;
    const geldend = huidig.has(sleutel) ? huidig.get(sleutel) : alterUitToonsoort(toon.stap, maat.toonsoort.kwinten);
    const accidental = element.overbinding?.eind || geldend === toon.alter ? null : namen[toon.alter];
    if (accidental) accidentalen.set(element, accidental);
    huidig.set(sleutel, toon.alter);
  }
  return accidentalen;
}

function schrijfNoot(element, meerdereBalken, partij, maat, weergave, markering, verborgen, openBogen, accidental) {
  const info = element.voorslag ? { type: 'eighth', punten: 0, triool: false } : duurInfo(element.duur);
  let inhoud = element.voorslag ? leeg('grace', element.voorslag.schuin ? { slash: 'yes' } : {}) : element.akkoord ? leeg('chord') : '';
  if (element.soort === 'rust') inhoud += leeg('rest', element.heleMaat ? { measure: 'yes' } : {});
  else {
    const toon = element.toonhoogte;
    inhoud += element.ongestemd
      ? tag('unpitched', tag('display-step', esc(toon.stap)) + tag('display-octave', toon.octaaf))
      : tag('pitch', tag('step', esc(toon.stap)) + (toon.alter ? tag('alter', toon.alter) : '') + tag('octave', toon.octaaf));
  }
  if (!element.voorslag) inhoud += tag('duration', element.duur);
  if (element.overbinding?.eind) inhoud += leeg('tie', { type: 'stop' });
  if (element.overbinding?.begin) inhoud += leeg('tie', { type: 'start' });
  inhoud += tag('voice', element.stem);
  if (!(element.soort === 'rust' && element.heleMaat) && info.type) inhoud += tag('type', info.type);
  inhoud += leeg('dot').repeat(info.punten);
  if (accidental) inhoud += tag('accidental', accidental);
  const tuplet = element.tuplet ?? (info.triool ? { aantal: 3, normaal: 2 } : null);
  if (tuplet) inhoud += tag('time-modification', tag('actual-notes', tuplet.aantal) + tag('normal-notes', tuplet.normaal));
  if (meerdereBalken) inhoud += tag('staff', element.notenbalk);
  if (element.balk && ['eighth', '16th', '32nd', '64th'].includes(info.type)) {
    inhoud += tag('beam', { begin: 'begin', midden: 'continue', eind: 'end' }[element.balk], { number: 1 });
  }
  inhoud += schrijfNotations(element, markering, openBogen);
  for (const lyric of element.teksten ?? []) {
    if (dynamiekVanTekst(lyric.lettergreep)) continue;
    const syllabic = { single: 'single', begin: 'begin', midden: 'middle', eind: 'end' }[lyric.soort] ?? 'single';
    inhoud += tag('lyric', tag('syllabic', syllabic) + tag('text', esc(lyric.lettergreep)), { number: lyric.couplet ?? 1 });
  }
  const attributen = weergave ? {
    id: `n-${partij.id}-${maat.index}-${maat.elementen.indexOf(element)}`,
    color: element.zekerheid < 0.8 ? '#C0392B' : null,
  } : {};
  if (verborgen && element.soort === 'rust') attributen['print-object'] = 'no';
  return tag('note', inhoud, attributen);
}

function schrijfStemmen(maat, partij, weergave, openBogen, accidentalen) {
  const elementen = maat.elementen.filter((element) => element.soort === 'noot' || element.soort === 'rust');
  const stemmen = [...new Set(elementen.map((element) => element.stem))].sort((a, b) => a - b);
  const balken = Math.max(1, ...maat.sleutels.map((sleutel) => sleutel.notenbalk || 1));
  let xml = '';
  stemmen.forEach((stem, index) => {
    let positie = 0;
    const gesorteerd = elementen.filter((item) => item.stem === stem).sort((a, b) => a.start - b.start || Number(Boolean(b.voorslag)) - Number(Boolean(a.voorslag)) || Number(a.akkoord) - Number(b.akkoord));
    const markeringen = tupletMarkeringen(gesorteerd);
    for (const element of gesorteerd) {
      if (!element.voorslag && !element.akkoord && element.start > positie) xml += tag('forward', tag('duration', element.start - positie));
      for (const tekst of element.teksten ?? []) {
        const dynamiek = dynamiekVanTekst(tekst.lettergreep);
        if (dynamiek) xml += tag('direction', tag('direction-type', tag('dynamics', leeg(dynamiek))), { placement: 'below' });
      }
      xml += schrijfNoot(element, balken > 1, partij, maat, weergave, markeringen.get(element), maat.verborgen, openBogen, accidentalen.get(element));
      if (!element.voorslag && !element.akkoord) positie = Math.max(positie, element.start + element.duur);
    }
    if (index < stemmen.length - 1 && positie > 0) xml += tag('backup', tag('duration', positie));
  });
  return xml;
}

function schrijfMaat(maat, vorige, instrument, partij, weergave, openBogen) {
  let inhoud = schrijfAttributes(maat, vorige, instrument);
  const accidentalen = maakAccidentalen(maat);
  if (maat.regelbegin || maat.paginabegin) {
    inhoud += leeg('print', {
      ...(maat.regelbegin ? { 'new-system': 'yes' } : {}),
      ...(maat.paginabegin ? { 'new-page': 'yes' } : {}),
    });
  }
  const aanwijzingen = maat.elementen.filter((element) => element.soort === 'aanwijzing');
  if (maat.tempo != null && !aanwijzingen.some((item) => item.type === 'tempo')) aanwijzingen.unshift({ start: 0, type: 'tempo', waarde: maat.tempo });
  inhoud += aanwijzingen.map((aanwijzing) => aanwijzing.type === 'akkoord'
    ? schrijfAkkoord(aanwijzing)
    : schrijfAanwijzing(aanwijzing, weergave)).join('');
  inhoud += schrijfSprongen(maat.sprong);
  if (maat.volta?.begin) {
    const nummer = maat.volta.nummers.join(',');
    let streep = leeg('ending', { number: nummer, type: 'start' });
    if (maat.herhaling?.begin) streep += leeg('repeat', { direction: 'forward' });
    inhoud += tag('barline', streep, { location: 'left' });
  } else if (maat.herhaling?.begin) inhoud += tag('barline', leeg('repeat', { direction: 'forward' }), { location: 'left' });
  inhoud += schrijfStemmen(maat, partij, weergave, openBogen, accidentalen);
  if (maat.volta?.eind) {
    const nummer = maat.volta.nummers.join(',');
    let streep = leeg('ending', { number: nummer, type: 'stop' });
    if (maat.herhaling?.eind) streep += leeg('repeat', { direction: 'backward', times: maat.herhaling.keer });
    inhoud += tag('barline', streep, { location: 'right' });
  } else if (maat.herhaling?.eind) inhoud += tag('barline', leeg('repeat', { direction: 'backward', times: maat.herhaling.keer }), { location: 'right' });
  return tag('measure', inhoud, { number: maat.nummer, ...(maat.opmaat ? { implicit: 'yes' } : {}) });
}

function matenMetOngeldigeMaatrust(maten) {
  const ongeldige = new Set();
  maten.forEach((maat, index) => {
    if (!(maat.maatrust > 1)) return;
    const einde = Math.min(maten.length, index + maat.maatrust);
    const reeks = maten.slice(index, einde);
    if (reeks.some((deel) => deel.elementen.some((element) => element.soort === 'noot'))) {
      for (let i = index; i < einde; i += 1) ongeldige.add(i);
    }
  });
  return ongeldige;
}

export function naarMusicXML(partituur, opties = {}) {
  const xml = naarMusicXMLZonderArrangeur(partituur, opties);
  if (!partituur.arrangeur) return xml;

  const arrangeur = String(partituur.arrangeur)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
  const creator = `<creator type="arranger">${arrangeur}</creator>`;
  if (xml.includes('</identification>')) {
    return xml.replace('</identification>', `${creator}</identification>`);
  }
  return xml.replace('<part-list>', `<identification>${creator}</identification><part-list>`);
}

function naarMusicXMLZonderArrangeur(partituur, opties = {}) {
  let partijen = partituur.partijen;
  if (opties.weergave && Array.isArray(opties.verberg)) {
    const verborgen = new Set(opties.verberg);
    partijen = partijen.filter((partij) => !verborgen.has(partij.id));
    if (partijen.length === 0 && partituur.partijen.length > 0) partijen = [partituur.partijen[0]];
  }
  let hoofd = '';
  if (partituur.titel) hoofd += tag('work', tag('work-title', esc(partituur.titel)));
  if (partituur.componist) hoofd += tag('identification', tag('creator', esc(partituur.componist), { type: 'composer' }));
  const meerPartijen = partijen.length > 1;
  hoofd += tag('part-list', partijen.map((partij) => {
    let inhoud = (opties.weergave && !meerPartijen) || (opties.zonderPartijnamen && !opties.weergave)
      ? tag('part-name', esc(partij.naam), { 'print-object': 'no' })
      : tag('part-name', esc(partij.naam));
    if ((opties.weergave && !meerPartijen) || (opties.zonderPartijnamen && !opties.weergave)) inhoud += leeg('part-abbreviation-display', { 'print-object': 'no' });
    else if (opties.weergave && meerPartijen) inhoud += tag('part-abbreviation', esc(partij.afkorting || partij.naam));
    else if (partij.afkorting) inhoud += tag('part-abbreviation', esc(partij.afkorting));
    inhoud += tag('midi-instrument', tag('midi-program', partij.instrument.midiProgramma + 1), { id: `${partij.id}-I1` });
    return tag('score-part', inhoud, { id: partij.id });
  }).join(''));
  hoofd += partijen.map((partij) => {
    const ongeldigeMaatrusten = matenMetOngeldigeMaatrust(partij.maten);
    const openBogen = [];
    return tag('part', partij.maten.map((maat, index) => {
      const schrijfbareMaat = ongeldigeMaatrusten.has(index) ? { ...maat, maatrust: undefined, verborgen: false } : maat;
      return schrijfMaat(schrijfbareMaat, partij.maten[index - 1], partij.instrument, partij, opties.weergave, openBogen);
    }).join(''), { id: partij.id });
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>${tag('score-partwise', hoofd, { version: '4.0' })}`;
}
import { plaatsingVoor, tekstSoort } from "../model/tekstsoort.mjs";
