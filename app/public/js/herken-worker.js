// Herkennen in de browser, in een eigen draad (Web Worker), zodat de pagina blijft reageren. Krijgt { bytes, naam, bladen } en
// stuurt { soort: 'voortgang', procent, tekst }, en aan het eind { soort: 'klaar', partituur, meldingen, bladenZonderBalken }
// of { soort: 'fout', tekst, code }. De bladzijden gaan één voor één: lezen, herkennen, en dan pas de volgende (zo staat er
// niet een hele pdf aan beelden tegelijk in het geheugen).
import { bladenStroom, MAX_BREEDTE } from '/src/herkenning/bladen.mjs';
import { herkenPagina, bouwUitPaginas } from '/src/herkenning/keten.mjs';
import { naarGrijs } from '/src/herkenning/beeld.mjs';

// Een JPEG of PNG naar grijs, met de beeldontcijferaar van de browser. Te grote beelden meteen verkleind (een canvas mag op een
// iPhone of iPad niet veel groter zijn dan 16 miljoen pixels). Een losse foto staat zoals de camera hem bedoelde; een beeld in
// een pdf zoals de pdf hem plaatst.
async function ontcijfer(bytes, type, { foto = false } = {}) {
  const blob = new Blob([bytes], { type });
  const draaiing = foto ? 'from-image' : 'none';
  let bitmap = await createImageBitmap(blob, { imageOrientation: draaiing });
  const factor = Math.max(1, bitmap.width / MAX_BREEDTE, Math.sqrt((bitmap.width * bitmap.height) / 16e6));
  if (factor > 1) {
    const kleiner = await createImageBitmap(blob, {
      imageOrientation: draaiing, resizeWidth: Math.floor(bitmap.width / factor), resizeHeight: Math.floor(bitmap.height / factor), resizeQuality: 'high',
    });
    bitmap.close?.();
    bitmap = kleiner;
  }
  const doek = new OffscreenCanvas(bitmap.width, bitmap.height);
  const tekenaar = doek.getContext('2d', { willReadFrequently: true });
  if (!tekenaar) throw new Error('Het beeld is te groot om te lezen.');
  tekenaar.drawImage(bitmap, 0, 0);
  const { data } = tekenaar.getImageData(0, 0, bitmap.width, bitmap.height);
  bitmap.close?.();
  return naarGrijs(data, doek.width, doek.height);
}

const meld = (procent, tekst) => postMessage({ soort: 'voortgang', procent: Math.round(procent), tekst });

self.addEventListener('message', async ({ data }) => {
  try {
    meld(2, 'De bladzijden worden gelezen…');
    const paginas = [];
    const overgeslagen = [];
    let aantal = 1;
    const stroom = bladenStroom(new Uint8Array(data.bytes), {
      bladen: data.bladen,
      ontcijfer,
      voortgang: (plek, van, blad) => {
        aantal = van;
        meld(2 + (88 * (plek - 1)) / van, `Bladzijde ${blad} (${plek} van ${van}) wordt gelezen en herkend…`);
      },
      overslaan: (blad, reden) => overgeslagen.push({ blad, reden }),
    });
    for await (const blad of stroom) {
      try {
        paginas.push({ ...herkenPagina(blad), blad: blad.blad });
      } catch {
        overgeslagen.push({ blad: blad.blad, reden: 'fout' });
      }
    }
    meld(92, aantal > 1 ? 'De partituur wordt opgebouwd en nagekeken…' : 'De partituur wordt nagekeken…');
    const titel = String(data.naam ?? '').replace(/\.[^.]+$/, '');
    const { partituur, meldingen, bladenZonderBalken } = bouwUitPaginas(paginas, { titel, overgeslagen });
    postMessage({ soort: 'klaar', partituur, meldingen, bladenZonderBalken });
  } catch (fout) {
    postMessage({ soort: 'fout', tekst: fout?.message ?? String(fout), code: fout?.code ?? null });
  }
});
