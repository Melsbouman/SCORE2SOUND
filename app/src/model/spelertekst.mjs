export function partijTekstVoorSpeler(partituur) {
  const partijen = partituur?.partijen ?? [];
  if (partijen.length === 0) return '';
  if (partijen.length === 1) return partijen[0].naam ?? '';
  return `${partijen.length} partijen`;
}
