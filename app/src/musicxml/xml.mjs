// Kleine hulp om MusicXML te lezen. Bewaart de volgorde van elementen, want in een maat
// tellen note, backup, forward en direction in volgorde.
// In Node leest fast-xml-parser de XML; in de browser de ingebouwde DOMParser, zodat de browser geen extra bibliotheek hoeft
// te laden (een kale naam als 'fast-xml-parser' kan de browser niet vinden).
const fxp = typeof DOMParser === 'undefined' ? await import('fast-xml-parser') : null;

// Een knoop: { naam, attr: { ... }, kinderen: [knoop, ...], tekst: '...' }.
const parser = fxp ? new fxp.XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: '',
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
}) : null;

// Een element uit de DOMParser van de browser naar dezelfde knoop als hierboven (tekst ingekort, zoals trimValues).
function vanDom(element) {
  const attr = {};
  for (const attribuut of element.attributes) attr[attribuut.name] = attribuut.value;
  const kinderen = [];
  let tekst = '';
  for (const kind of element.childNodes) {
    if (kind.nodeType === 1) kinderen.push(vanDom(kind));
    else if (kind.nodeType === 3 || kind.nodeType === 4) tekst += kind.nodeValue.trim();
  }
  return { naam: element.nodeName, attr, kinderen, tekst };
}

function omzetten(item) {
  const naam = Object.keys(item).find((k) => k !== ':@');
  if (naam === '#text') return { naam: '#text', attr: {}, kinderen: [], tekst: String(item['#text']) };
  const kinderen = (item[naam] ?? []).map(omzetten);
  const tekst = kinderen.filter((k) => k.naam === '#text').map((k) => k.tekst).join('');
  return { naam, attr: item[':@'] ?? {}, kinderen: kinderen.filter((k) => k.naam !== '#text'), tekst };
}

// Leest willekeurige XML (ook de bladen uit een .omr) en geeft de wortelknoop.
export function leesXmlBoom(tekst) {
  if (typeof tekst !== 'string' || tekst.trim() === '') throw new Error('Het bestand is leeg.');
  // Eigen entiteiten in een DOCTYPE kunnen een bestand opblazen; MusicXML heeft ze niet nodig.
  if (/<!ENTITY/i.test(tekst)) throw new Error('Dit bestand bevat XML-constructies die niet zijn toegestaan.');
  if (!parser) {
    const document = new DOMParser().parseFromString(tekst, 'application/xml');
    const fout = document.getElementsByTagName('parsererror')[0];
    if (fout) throw new Error(`Dit is geen geldige MusicXML: ${fout.textContent.trim().split(String.fromCharCode(10))[0]}.`);
    return vanDom(document.documentElement);
  }
  const geldig = fxp.XMLValidator.validate(tekst);
  if (geldig !== true) throw new Error(`Dit is geen geldige MusicXML: ${geldig.err?.msg ?? 'onbekende fout'} (regel ${geldig.err?.line ?? '?'}).`);
  const wortel = parser.parse(tekst).map(omzetten).find((k) => !k.naam.startsWith('?') && k.naam !== '#text');
  if (!wortel) throw new Error('Dit is geen geldige MusicXML: er staat geen muziek in.');
  return wortel;
}

// Leest MusicXML-tekst en geeft de knoop <score-partwise>. Gooit een Error met een tekst voor de gebruiker.
export function leesXml(tekst) {
  const wortel = leesXmlBoom(tekst);
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
