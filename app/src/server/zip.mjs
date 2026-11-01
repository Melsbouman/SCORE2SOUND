import { inflateRawSync } from 'node:zlib';

const FOUT = 'Dit is geen geldig zip-bestand.';

export function leesZip(buffer) {
  try {
    let einde = -1;
    for (let positie = buffer.length - 22; positie >= 0; positie -= 1) {
      if (buffer.readUInt32LE(positie) === 0x06054b50) {
        einde = positie;
        break;
      }
    }

    if (einde < 0) throw new Error(FOUT);

    const aantal = buffer.readUInt16LE(einde + 10);
    let positie = buffer.readUInt32LE(einde + 16);
    const bestanden = new Map();

    for (let index = 0; index < aantal; index += 1) {
      if (positie + 46 > buffer.length) throw new Error(FOUT);
      if (buffer.readUInt32LE(positie) !== 0x02014b50) throw new Error(FOUT);

      const methode = buffer.readUInt16LE(positie + 10);
      const grootte = buffer.readUInt32LE(positie + 20);
      const naamLengte = buffer.readUInt16LE(positie + 28);
      const extraLengte = buffer.readUInt16LE(positie + 30);
      const commentaarLengte = buffer.readUInt16LE(positie + 32);
      const lokaal = buffer.readUInt32LE(positie + 42);
      const volgende = positie + 46 + naamLengte + extraLengte + commentaarLengte;
      if (volgende > buffer.length || lokaal + 30 > buffer.length) throw new Error(FOUT);
      const naam = buffer.subarray(positie + 46, positie + 46 + naamLengte).toString('utf8');

      if (buffer.readUInt32LE(lokaal) !== 0x04034b50) throw new Error(FOUT);

      const lokaleNaamLengte = buffer.readUInt16LE(lokaal + 26);
      const lokaleExtraLengte = buffer.readUInt16LE(lokaal + 28);
      const begin = lokaal + 30 + lokaleNaamLengte + lokaleExtraLengte;
      if (begin + grootte > buffer.length) throw new Error(FOUT);
      const gegevens = buffer.subarray(begin, begin + grootte);

      if (!naam.endsWith('/')) {
        if (methode === 0) bestanden.set(naam, Buffer.from(gegevens));
        else if (methode === 8) bestanden.set(naam, inflateRawSync(gegevens));
        else throw new Error(FOUT);
      }

      positie = volgende;
    }

    return bestanden;
  } catch {
    throw new Error(FOUT);
  }
}
