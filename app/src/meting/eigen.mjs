// De eigen herkenning voor de scanmeting: pdf of afbeelding in, { partituur } uit; bij een fout { partituur: null, reden }.
import { grijzeBladen } from '../herkenning/bladen.mjs';
import { herkenPartituur } from '../herkenning/keten.mjs';

export async function herkenEigen(bytes, { paginas = '' } = {}) {
  try {
    const bladen = await grijzeBladen(bytes, { bladen: paginas });
    return { partituur: herkenPartituur(bladen).partituur };
  } catch (fout) {
    return { partituur: null, reden: fout.code ?? fout.message };
  }
}
