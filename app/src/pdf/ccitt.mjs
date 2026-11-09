// Een eigen decoder voor CCITT Group 4 (ITU-T T.6, tweedimensionale faxcodering), zonder bibliotheken: draait in de browser en in Node.
// Elke regel wordt gecodeerd ten opzichte van de regel erboven (pass-, horizontal- en vertical-codes); de eerste referentieregel is wit.
// De uitkomst is een Uint8Array van breedte * hoogte met 1 voor een pixel uit een zwarte run en 0 voor wit.

const WIT_EINDE = [
  [0, '00110101'], [1, '000111'], [2, '0111'], [3, '1000'], [4, '1011'], [5, '1100'], [6, '1110'], [7, '1111'],
  [8, '10011'], [9, '10100'], [10, '00111'], [11, '01000'], [12, '001000'], [13, '000011'], [14, '110100'], [15, '110101'],
  [16, '101010'], [17, '101011'], [18, '0100111'], [19, '0001100'], [20, '0001000'], [21, '0010111'], [22, '0000011'],
  [23, '0000100'], [24, '0101000'], [25, '0101011'], [26, '0010011'], [27, '0100100'], [28, '0011000'], [29, '00000010'],
  [30, '00000011'], [31, '00011010'], [32, '00011011'], [33, '00010010'], [34, '00010011'], [35, '00010100'],
  [36, '00010101'], [37, '00010110'], [38, '00010111'], [39, '00101000'], [40, '00101001'], [41, '00101010'],
  [42, '00101011'], [43, '00101100'], [44, '00101101'], [45, '00000100'], [46, '00000101'], [47, '00001010'],
  [48, '00001011'], [49, '01010010'], [50, '01010011'], [51, '01010100'], [52, '01010101'], [53, '00100100'],
  [54, '00100101'], [55, '01011000'], [56, '01011001'], [57, '01011010'], [58, '01011011'], [59, '01001010'],
  [60, '01001011'], [61, '00110010'], [62, '00110011'], [63, '00110100'],
];
const WIT_MAKEUP = [
  [64, '11011'], [128, '10010'], [192, '010111'], [256, '0110111'], [320, '00110110'], [384, '00110111'],
  [448, '01100100'], [512, '01100101'], [576, '01101000'], [640, '01100111'], [704, '011001100'], [768, '011001101'],
  [832, '011010010'], [896, '011010011'], [960, '011010100'], [1024, '011010101'], [1088, '011010110'],
  [1152, '011010111'], [1216, '011011000'], [1280, '011011001'], [1344, '011011010'], [1408, '011011011'],
  [1472, '010011000'], [1536, '010011001'], [1600, '010011010'], [1664, '011000'], [1728, '010011011'],
];
const ZWART_EINDE = [
  [0, '0000110111'], [1, '010'], [2, '11'], [3, '10'], [4, '011'], [5, '0011'], [6, '0010'], [7, '00011'],
  [8, '000101'], [9, '000100'], [10, '0000100'], [11, '0000101'], [12, '0000111'], [13, '00000100'], [14, '00000111'],
  [15, '000011000'], [16, '0000010111'], [17, '0000011000'], [18, '0000001000'], [19, '00001100111'],
  [20, '00001101000'], [21, '00001101100'], [22, '00000110111'], [23, '00000101000'], [24, '00000010111'],
  [25, '00000011000'], [26, '000011001010'], [27, '000011001011'], [28, '000011001100'], [29, '000011001101'],
  [30, '000001101000'], [31, '000001101001'], [32, '000001101010'], [33, '000001101011'], [34, '000011010010'],
  [35, '000011010011'], [36, '000011010100'], [37, '000011010101'], [38, '000011010110'], [39, '000011010111'],
  [40, '000001101100'], [41, '000001101101'], [42, '000011011010'], [43, '000011011011'], [44, '000001010100'],
  [45, '000001010101'], [46, '000001010110'], [47, '000001010111'], [48, '000001100100'], [49, '000001100101'],
  [50, '000001010010'], [51, '000001010011'], [52, '000000100100'], [53, '000000110111'], [54, '000000111000'],
  [55, '000000100111'], [56, '000000101000'], [57, '000001011000'], [58, '000001011001'], [59, '000000101011'],
  [60, '000000101100'], [61, '000001011010'], [62, '000001100110'], [63, '000001100111'],
];
const ZWART_MAKEUP = [
  [64, '0000001111'], [128, '000011001000'], [192, '000011001001'], [256, '000001011011'], [320, '000000110011'],
  [384, '000000110100'], [448, '000000110101'], [512, '0000001101100'], [576, '0000001101101'], [640, '0000001001010'],
  [704, '0000001001011'], [768, '0000001001100'], [832, '0000001001101'], [896, '0000001110010'],
  [960, '0000001110011'], [1024, '0000001110100'], [1088, '0000001110101'], [1152, '0000001110110'],
  [1216, '0000001110111'], [1280, '0000001010010'], [1344, '0000001010011'], [1408, '0000001010100'],
  [1472, '0000001010101'], [1536, '0000001011010'], [1600, '0000001011011'], [1664, '0000001100100'],
  [1728, '0000001100101'],
];
// Extended makeupcodes (1792 tot 2560): voor wit en zwart gelijk.
const UITGEBREID = [
  [1792, '00000001000'], [1856, '00000001100'], [1920, '00000001101'], [1984, '000000010010'], [2048, '000000010011'],
  [2112, '000000010100'], [2176, '000000010101'], [2240, '000000010110'], [2304, '000000010111'], [2368, '000000011100'],
  [2432, '000000011101'], [2496, '000000011110'], [2560, '000000011111'],
];

// Sleutel van een code: een 1 vooraan, dan de bits (zo is de lengte ook vastgelegd).
const sleutel = (bits) => parseInt(`1${bits}`, 2);
const maakTabel = (...lijsten) => new Map(lijsten.flat().map(([run, bits]) => [sleutel(bits), run]));
const WIT = maakTabel(WIT_EINDE, WIT_MAKEUP, UITGEBREID);
const ZWART = maakTabel(ZWART_EINDE, ZWART_MAKEUP, UITGEBREID);

// Modecodes: P = pass, H = horizontal, anders de verschuiving van een vertical-code.
const MODES = new Map([
  [sleutel('0001'), 'P'], [sleutel('001'), 'H'], [sleutel('1'), 0], [sleutel('011'), 1], [sleutel('000011'), 2],
  [sleutel('0000011'), 3], [sleutel('010'), -1], [sleutel('000010'), -2], [sleutel('0000010'), -3],
]);

export function decodeerG4(bytes, breedte, hoogte) {
  // Zoals de norm (T.6): 1 voor een pixel uit een zwarte run, 0 voor wit. Bij een gewone scan is de inkt zwart gecodeerd.
  const uit = new Uint8Array(breedte * hoogte);
  const totaalBits = bytes.length * 8;
  let plek = 0;
  const leesCode = (tabel, maxLengte) => {
    let waarde = 1;
    for (let lengte = 1; lengte <= maxLengte; lengte += 1) {
      if (plek >= totaalBits) return undefined;
      waarde = (waarde << 1) | ((bytes[plek >> 3] >> (7 - (plek & 7))) & 1);
      plek += 1;
      const gevonden = tabel.get(waarde);
      if (gevonden !== undefined) return gevonden;
    }
    return undefined;
  };
  // Een run: makeupcodes optellen tot een terminating code (kleiner dan 64). -1 bij een fout.
  const leesRun = (zwart) => {
    let totaal = 0;
    for (;;) {
      const run = leesCode(zwart ? ZWART : WIT, 13);
      if (run === undefined) return -1;
      totaal += run;
      if (run < 64) return totaal;
    }
  };

  let referentie = [breedte, breedte, breedte, breedte];
  for (let y = 0; y < hoogte; y += 1) {
    const wijzigingen = [];
    let a0 = -1;
    let kleur = 0;
    let bi = 0;
    let fout = false;
    while (a0 < breedte) {
      while (bi > 0 && referentie[bi - 1] > a0) bi -= 1;
      while (bi < referentie.length && referentie[bi] <= a0 && referentie[bi] < breedte) bi += 1;
      if ((bi & 1) !== kleur) bi += 1;
      const b1 = referentie[bi] ?? breedte;
      const b2 = referentie[bi + 1] ?? breedte;
      const mode = leesCode(MODES, 7);
      if (mode === undefined) { fout = true; break; }
      const start = Math.max(a0, 0);
      if (mode === 'P') {
        a0 = b2;
      } else if (mode === 'H') {
        const eerste = leesRun(kleur === 1);
        const tweede = leesRun(kleur === 0);
        if (eerste < 0 || tweede < 0) { fout = true; break; }
        const a1 = Math.min(breedte, start + eerste);
        const a2 = Math.min(breedte, a1 + tweede);
        wijzigingen.push(a1, a2);
        a0 = a2;
      } else {
        const a1 = Math.min(breedte, Math.max(start, b1 + mode));
        wijzigingen.push(a1);
        a0 = a1;
        kleur = 1 - kleur;
      }
    }
    if (fout && wijzigingen.length === 0) break;
    for (let i = 0; i < wijzigingen.length; i += 2) {
      const van = wijzigingen[i];
      const tot = i + 1 < wijzigingen.length ? wijzigingen[i + 1] : breedte;
      uit.fill(1, y * breedte + van, y * breedte + Math.max(van, tot));
    }
    if (fout) break;
    referentie = [...wijzigingen, breedte, breedte, breedte, breedte];
  }
  return uit;
}
