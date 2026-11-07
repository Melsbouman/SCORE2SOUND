import { leesXml, kind, kinderen, tekst, getal } from '../musicxml/xml.mjs';

export function vergelijkMusicXML(juistXml, gemetenXml) {
  const wortelJuist = leesXml(juistXml);
  const wortelGemeten = leesXml(gemetenXml);

  const delenJuist = kinderen(wortelJuist, 'part');
  const delenGemeten = kinderen(wortelGemeten, 'part');

  // Bouw een kaart van gemeten noten, gesloten per (partId, maatNummer, index)
  const gemetenMap = new Map();
  for (const part of delenGemeten) {
    const partId = part.attr.id;
    const maten = kinderen(part, 'measure');
    for (const maat of maten) {
      const maatNummer = maat.attr.number;
      const noteNodes = kinderen(maat, 'note');
      for (let i = 0; i < noteNodes.length; i++) {
        const note = noteNodes[i];
        if (kind(note, 'rest') !== null) continue; // rusten tellen niet mee
        const pitch = kind(note, 'pitch') || kind(note, 'unpitched');
        const step = pitch ? tekst(pitch, 'step') : null;
        const alterNode = pitch ? kind(pitch, 'alter') : null;
        const alter = alterNode ? (Number(tekst(alterNode, '#text')) || 0) : 0;
        const octave = pitch ? getal(pitch, 'octave') : null;
        const duurKnoop = kind(note, 'duration');
        const duration = duurKnoop ? Number(tekst(duurKnoop, '#text')) : 0;
        const key = `${partId}-${maatNummer}-${i}`;
        gemetenMap.set(key, { step, alter, octave, duration });
      }
    }
  }

  // Tel noten en juist in het goede bestand
  let noten = 0;
  let juist = 0;
  for (const part of delenJuist) {
    const partId = part.attr.id;
    const maten = kinderen(part, 'measure');
    for (const maat of maten) {
      const maatNummer = maat.attr.number;
      const noteNodes = kinderen(maat, 'note');
      for (let i = 0; i < noteNodes.length; i++) {
        const note = noteNodes[i];
        if (kind(note, 'rest') !== null) continue;
        noten++;
        const pitch = kind(note, 'pitch') || kind(note, 'unpitched');
        const step = pitch ? tekst(pitch, 'step') : null;
        const alterNode = pitch ? kind(pitch, 'alter') : null;
        const alter = alterNode ? (Number(tekst(alterNode, '#text')) || 0) : 0;
        const octave = pitch ? getal(pitch, 'octave') : null;
        const duurKnoop = kind(note, 'duration');
        const duration = duurKnoop ? Number(tekst(duurKnoop, '#text')) : 0;
        const key = `${partId}-${maatNummer}-${i}`;
        const gemeten = gemetenMap.get(key);
        if (gemeten && gemeten.step === step && gemeten.alter === alter && gemeten.octave === octave && gemeten.duration === duration) {
          juist++;
        }
      }
    }
  }

  const nauwkeurigheid = noten > 0 ? juist / noten : 0;

  // Tel maten in het goede bestand
  let maten = 0;
  for (const part of delenJuist) {
    maten += kinderen(part, 'measure').length;
  }

  // Tel matenJuist: maten waar alle noten juist zijn en het aantal noten gelijk is
  let matenJuist = 0;
  for (const part of delenJuist) {
    const partId = part.attr.id;
    const gemetenPart = delenGemeten.find(p => p.attr.id === partId);
    if (!gemetenPart) continue;
    const matenJuistMaten = kinderen(part, 'measure');
    const gemetenMaten = kinderen(gemetenPart, 'measure');
    for (const maat of matenJuistMaten) {
      const maatNummer = maat.attr.number;
      const gemetenMaat = gemetenMaten.find(m => m.attr.number === maatNummer);
      if (!gemetenMaat) continue;
      const correctNotes = kinderen(maat, 'note').filter(n => kind(n, 'rest') === null);
      const gemetenNotes = kinderen(gemetenMaat, 'note').filter(n => kind(n, 'rest') === null);
      if (correctNotes.length !== gemetenNotes.length) continue;
      let alleCorrect = true;
      for (let i = 0; i < correctNotes.length; i++) {
        const cn = correctNotes[i];
        const gn = gemetenNotes[i];
        const cpitch = kind(cn, 'pitch') || kind(cn, 'unpitched');
        const gpitch = kind(gn, 'pitch') || kind(gn, 'unpitched');
        const cstep = cpitch ? tekst(cpitch, 'step') : null;
        const calter = cpitch ? getal(cpitch, 'alter', 0) : 0;
        const coctave = cpitch ? getal(cpitch, 'octave') : null;
        const cduur = kind(cn, 'duration') ? Number(tekst(kind(cn, 'duration'), '#text')) : 0;
        const gstep = gpitch ? tekst(gpitch, 'step') : null;
        const galter = gpitch ? getal(gpitch, 'alter', 0) : 0;
        const goctave = gpitch ? getal(gpitch, 'octave') : null;
        const gduur = kind(gn, 'duration') ? Number(tekst(kind(gn, 'duration'), '#text')) : 0;
        if (cstep !== gstep || calter !== galter || coctave !== goctave || cduur !== gduur) {
          alleCorrect = false;
          break;
        }
      }
      if (alleCorrect) {
        matenJuist++;
      }
    }
  }

  return { noten, juist, nauwkeurigheid, maten, matenJuist };
}