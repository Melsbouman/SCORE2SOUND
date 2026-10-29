// Kleine hulp om MusicXML te lezen. Bewaart de volgorde van elementen, want in een maat
// tellen note, backup, forward en direction in volgorde. Alleen op de server (gebruikt fast-xml-parser).
import { XMLParser, XMLValidator } from 'fast-xml-parser';

// Een knoop: { naam, attr: { ... }, kinderen: [knoop, ...], tekst: '...' }.
const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
});

function omzetten(item) {
  const naam = Object.keys(item).find((k) => k !== ':@');
  if (naam === '#text') return { naam: '#text', attr: {}, kinderen: [], tekst: String(item['#text']) };
  const kinderen = (item[naam] ?? []).map(omzetten);
  const tekst = kinderen.filter((k) => k.naam === '#text').map((k) => k.tekst).join('');
  return { naam, attr: item[':@'] ?? {}, kinderen: kinderen.filter((k) => k.naam !== '#text'), tekst };
}

// Leest MusicXML-tekst en geeft de knoop <score-partwise>. Gooit een Error met een tekst voor de gebruiker.
export function leesXml(tekst) {
  if (typeof tekst !== 'string' || tekst.trim() === '') throw new Error('Het bestand is leeg.');
  // Eigen entiteiten in een DOCTYPE kunnen een bestand opblazen; MusicXML heeft ze niet nodig.
  if (/<!ENTITY/i.test(tekst)) throw new Error('Dit bestand bevat XML-constructies die niet zijn toegestaan.');
  const geldig = XMLValidator.validate(tekst);
  if (geldig !== true) throw new Error(`Dit is geen geldige MusicXML: ${geldig.err?.msg ?? 'onbekende fout'} (regel ${geldig.err?.line ?? '?'}).`);
  const wortel = parser.parse(tekst).map(omzetten).find((k) => !k.naam.startsWith('?') && k.naam !== '#text');
  if (!wortel) throw new Error('Dit is geen geldige MusicXML: er staat geen muziek in.');
  if (wortel.naam === 'score-timewise') throw new Error('Deze MusicXML is per maat opgeslagen (timewise). Sla hem op als partwise en probeer het opnieuw.');
  if (wortel.naam !== 'score-partwise') throw new Error(`Dit is geen MusicXML-partituur (het bestand begint met <${wortel.naam}>).`);
  return wortel;
}

// Het eerste kind met deze naam, of null.
export function kind(knoop, naam) {
  return knoop?.kinderen.find((k) => k.naam === naam) ?? null;
}

// Alle kinderen, of alleen die met deze naam.
export function kinderen(knoop, naam) {
  if (!knoop) return [];
  return naam ? knoop.kinderen.filter((k) => k.naam === naam) : knoop.kinderen;
}

// De tekst van een kind (of van de knoop zelf zonder naam), of de standaardwaarde.
export function tekst(knoop, naam, standaard = '') {
  const doel = naam ? kind(knoop, naam) : knoop;
  return doel && doel.tekst !== '' ? doel.tekst : standaard;
}

// De tekst van een kind als getal, of de standaardwaarde als hij ontbreekt of geen getal is.
export function getal(knoop, naam, standaard = null) {
  const waarde = Number(tekst(knoop, naam, ''));
  return tekst(knoop, naam, '') === '' || Number.isNaN(waarde) ? standaard : waarde;
}
