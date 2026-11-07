const FOUT = 'Dit is geen geldig zip-bestand.';

export async function leesZipBrowser(buffer) {
  try {
    const data = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : buffer;
    const view = new DataView(data.buffer, data.byteOffset, data.byteLength);

    let einde = -1;
    for (let positie = data.length - 22; positie >= 0; positie -= 1) {
      if (view.getUint32(positie, true) === 0x06054b50) {
        einde = positie;
        break;
      }
    }

    if (einde < 0) throw new Error(FOUT);

    const aantal = view.getUint16(einde + 10, true);
    let positie = view.getUint32(einde + 16, true);
    const bestanden = new Map();

    for (let index = 0; index < aantal; index += 1) {
      if (positie + 46 > data.length) throw new Error(FOUT);
      if (view.getUint32(positie, true) !== 0x02014b50) throw new Error(FOUT);

      const methode = view.getUint16(positie + 10, true);
      const grootte = view.getUint32(positie + 20, true);
      const naamLengte = view.getUint16(positie + 28, true);
      const extraLengte = view.getUint16(positie + 30, true);
      const commentaarLengte = view.getUint16(positie + 32, true);
      const lokaal = view.getUint32(positie + 42, true);
      const volgende = positie + 46 + naamLengte + extraLengte + commentaarLengte;
      if (volgende > data.length || lokaal + 30 > data.length) throw new Error(FOUT);
      const naamBytes = data.subarray(positie + 46, positie + 46 + naamLengte);
      const decoder = new TextDecoder('utf-8');
      const naam = decoder.decode(naamBytes);

      if (view.getUint32(lokaal, true) !== 0x04034b50) throw new Error(FOUT);

      const lokaleNaamLengte = view.getUint16(lokaal + 26, true);
      const lokaleExtraLengte = view.getUint16(lokaal + 28, true);
      const begin = lokaal + 30 + lokaleNaamLengte + lokaleExtraLengte;
      if (begin + grootte > data.length) throw new Error(FOUT);
      const gegevens = data.subarray(begin, begin + grootte);

      if (!naam.endsWith('/')) {
        if (methode === 0) {
          bestanden.set(naam, gegevens);
        } else if (methode === 8) {
          const decompressStream = new DecompressionStream('deflate-raw');
          const reader = decompressStream.readable.getReader();
          
          const chunks = [];
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) chunks.push(value);
          }
          
          const decompressed = new Uint8Array(chunks.reduce((acc, chunk) => acc + chunk.length, 0));
          let offset = 0;
          for (const chunk of chunks) {
            decompressed.set(chunk, offset);
            offset += chunk.length;
          }
          bestanden.set(naam, decompressed);
        } else {
          throw new Error(FOUT);
        }
      }

      positie = volgende;
    }

    return bestanden;
  } catch (e) {
    if (e instanceof Error) throw e;
    throw new Error(FOUT);
  }
}