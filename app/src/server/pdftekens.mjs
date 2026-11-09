// De tekens uit een digitale pdf lezen gebeurt in src/pdf/tekens.mjs, dat ook in de browser draait. De server gebruikt
// dezelfde module, zodat er één versie is. Let op: leesPdfTekens is async.
export { leesPdfTekens } from '../pdf/tekens.mjs';
