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
  if (!eerste && !keyVeranderd && !timeVeranderd && !clefVeranderd) return '';
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
  return tag('attributes', inhoud);
}

function schrijfAanwijzing(aanwijzing) {
  const offset = aanwijzing.start > 0 ? tag('offset', aanwijzing.start) : '';
  let type = '';
  let sound = '';
  if (aanwijzing.type === 'tempo') {
    type = tag('metronome', tag('beat-unit', 'quarter') + tag('per-minute', aanwijzing.waarde));
    sound = leeg('sound', { tempo: aanwijzing.waarde });
  } else if (aanwijzing.type === 'dynamiek') {
    type = tag('dynamics', leeg(aanwijzing.waarde));
  } else if (aanwijzing.type === 'crescendo' || aanwijzing.type === 'decrescendo') {
    const waarde = aanwijzing.waarde === 'eind' ? 'stop' : aanwijzing.type === 'crescendo' ? 'crescendo' : 'diminuendo';
    type = leeg('wedge', { type: waarde });
  } else if (aanwijzing.type === 'tekst') {
    type = tag('words', esc(aanwijzing.waarde));
  }
  return tag('direction', tag('direction-type', type) + offset + sound);
}

function schrijfNotations(element) {
  let inhoud = '';
  if (element.overbinding?.eind) inhoud += leeg('tied', { type: 'stop' });
  if (element.overbinding?.begin) inhoud += leeg('tied', { type: 'start' });
  if (element.legato?.eind) inhoud += leeg('slur', { type: 'stop', number: 1 });
  if (element.legato?.begin) inhoud += leeg('slur', { type: 'start', number: 1 });
  if (element.articulaties?.length) inhoud += tag('articulations', element.articulaties.map((naam) => leeg(naam === 'marcato' ? 'strong-accent' : naam)).join(''));
  if (element.versiering) {
    const namen = { triller: 'trill-mark', mordent: 'mordent', dubbelslag: 'turn' };
    if (namen[element.versiering]) inhoud += tag('ornaments', leeg(namen[element.versiering]));
  }
  return inhoud ? tag('notations', inhoud) : '';
}

function schrijfNoot(element, meerdereBalken) {
  const info = duurInfo(element.duur);
  let inhoud = element.akkoord ? leeg('chord') : '';
  if (element.soort === 'rust') inhoud += leeg('rest', element.heleMaat ? { measure: 'yes' } : {});
  else {
    const toon = element.toonhoogte;
    inhoud += tag('pitch', tag('step', esc(toon.stap)) + (toon.alter ? tag('alter', toon.alter) : '') + tag('octave', toon.octaaf));
  }
  inhoud += tag('duration', element.duur);
  if (element.overbinding?.eind) inhoud += leeg('tie', { type: 'stop' });
  if (element.overbinding?.begin) inhoud += leeg('tie', { type: 'start' });
  inhoud += tag('voice', element.stem);
  if (!(element.soort === 'rust' && element.heleMaat) && info.type) inhoud += tag('type', info.type);
  inhoud += leeg('dot').repeat(info.punten);
  if (info.triool) inhoud += tag('time-modification', tag('actual-notes', 3) + tag('normal-notes', 2));
  if (meerdereBalken) inhoud += tag('staff', element.notenbalk);
  inhoud += schrijfNotations(element);
  return tag('note', inhoud);
}

function schrijfStemmen(maat) {
  const elementen = maat.elementen.filter((element) => element.soort === 'noot' || element.soort === 'rust');
  const stemmen = [...new Set(elementen.map((element) => element.stem))].sort((a, b) => a - b);
  const balken = Math.max(1, ...maat.sleutels.map((sleutel) => sleutel.notenbalk || 1));
  let xml = '';
  stemmen.forEach((stem, index) => {
    let positie = 0;
    for (const element of elementen.filter((item) => item.stem === stem).sort((a, b) => a.start - b.start || Number(a.akkoord) - Number(b.akkoord))) {
      if (!element.akkoord && element.start > positie) xml += tag('forward', tag('duration', element.start - positie));
      xml += schrijfNoot(element, balken > 1);
      if (!element.akkoord) positie = Math.max(positie, element.start + element.duur);
    }
    if (index < stemmen.length - 1 && positie > 0) xml += tag('backup', tag('duration', positie));
  });
  return xml;
}

function schrijfMaat(maat, vorige, instrument) {
  let inhoud = schrijfAttributes(maat, vorige, instrument);
  const aanwijzingen = maat.elementen.filter((element) => element.soort === 'aanwijzing');
  if (maat.tempo != null && !aanwijzingen.some((item) => item.type === 'tempo')) aanwijzingen.unshift({ start: 0, type: 'tempo', waarde: maat.tempo });
  inhoud += aanwijzingen.map(schrijfAanwijzing).join('');
  if (maat.herhaling?.begin) inhoud += tag('barline', leeg('repeat', { direction: 'forward' }), { location: 'left' });
  inhoud += schrijfStemmen(maat);
  if (maat.herhaling?.eind) inhoud += tag('barline', leeg('repeat', { direction: 'backward', times: maat.herhaling.keer }), { location: 'right' });
  return tag('measure', inhoud, { number: maat.nummer, ...(maat.opmaat ? { implicit: 'yes' } : {}) });
}

export function naarMusicXML(partituur) {
  let hoofd = '';
  if (partituur.titel) hoofd += tag('work', tag('work-title', esc(partituur.titel)));
  if (partituur.componist) hoofd += tag('identification', tag('creator', esc(partituur.componist), { type: 'composer' }));
  hoofd += tag('part-list', partituur.partijen.map((partij) => {
    let inhoud = tag('part-name', esc(partij.naam));
    if (partij.afkorting) inhoud += tag('part-abbreviation', esc(partij.afkorting));
    inhoud += tag('midi-instrument', tag('midi-program', partij.instrument.midiProgramma + 1), { id: `${partij.id}-I1` });
    return tag('score-part', inhoud, { id: partij.id });
  }).join(''));
  hoofd += partituur.partijen.map((partij) => tag('part', partij.maten.map((maat, index) => schrijfMaat(maat, partij.maten[index - 1], partij.instrument)).join(''), { id: partij.id })).join('');
  return `<?xml version="1.0" encoding="UTF-8"?>${tag('score-partwise', hoofd, { version: '4.0' })}`;
}
