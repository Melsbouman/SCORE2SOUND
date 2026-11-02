export function telPdfPaginas(buffer) {
  const tekst = Buffer.from(buffer).toString('latin1');
  return (tekst.match(/\/Type ?\/Page(?![A-Za-z])/g) ?? []).length;
}
