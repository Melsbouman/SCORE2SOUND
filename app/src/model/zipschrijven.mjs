const tekstEncoder = new TextEncoder();

const crcTabel = (() => {
  const tabel = new Uint32Array(256);

  for (let getal = 0; getal < tabel.length; getal += 1) {
    let crc = getal;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    tabel[getal] = crc >>> 0;
  }

  return tabel;
})();

function berekenCrc32(bytes) {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTabel[(crc ^ byte) & 0xff];
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function alsBytes(inhoud) {
  return typeof inhoud === "string" ? tekstEncoder.encode(inhoud) : inhoud;
}

function voegSamen(delen) {
  const lengte = delen.reduce((totaal, deel) => totaal + deel.length, 0);
  const resultaat = new Uint8Array(lengte);
  let positie = 0;

  for (const deel of delen) {
    resultaat.set(deel, positie);
    positie += deel.length;
  }

  return resultaat;
}

export function maakZip(bestanden) {
  const lokaleDelen = [];
  const centraleDelen = [];
  let lokalePositie = 0;

  for (const bestand of bestanden) {
    const naam = tekstEncoder.encode(bestand.naam);
    const inhoud = alsBytes(bestand.inhoud);
    const crc32 = berekenCrc32(inhoud);

    const lokaleKop = new Uint8Array(30);
    const lokaleWaarden = new DataView(lokaleKop.buffer);
    lokaleWaarden.setUint32(0, 0x04034b50, true);
    lokaleWaarden.setUint16(4, 20, true);
    lokaleWaarden.setUint16(6, 0x0800, true);
    lokaleWaarden.setUint32(14, crc32, true);
    lokaleWaarden.setUint32(18, inhoud.length, true);
    lokaleWaarden.setUint32(22, inhoud.length, true);
    lokaleWaarden.setUint16(26, naam.length, true);
    lokaleDelen.push(lokaleKop, naam, inhoud);

    const centraleKop = new Uint8Array(46);
    const centraleWaarden = new DataView(centraleKop.buffer);
    centraleWaarden.setUint32(0, 0x02014b50, true);
    centraleWaarden.setUint16(4, 20, true);
    centraleWaarden.setUint16(6, 20, true);
    centraleWaarden.setUint16(8, 0x0800, true);
    centraleWaarden.setUint32(16, crc32, true);
    centraleWaarden.setUint32(20, inhoud.length, true);
    centraleWaarden.setUint32(24, inhoud.length, true);
    centraleWaarden.setUint16(28, naam.length, true);
    centraleWaarden.setUint32(42, lokalePositie, true);
    centraleDelen.push(centraleKop, naam);

    lokalePositie += lokaleKop.length + naam.length + inhoud.length;
  }

  const centraleMap = voegSamen(centraleDelen);
  const einde = new Uint8Array(22);
  const eindeWaarden = new DataView(einde.buffer);
  eindeWaarden.setUint32(0, 0x06054b50, true);
  eindeWaarden.setUint16(8, bestanden.length, true);
  eindeWaarden.setUint16(10, bestanden.length, true);
  eindeWaarden.setUint32(12, centraleMap.length, true);
  eindeWaarden.setUint32(16, lokalePositie, true);

  return voegSamen([...lokaleDelen, centraleMap, einde]);
}
