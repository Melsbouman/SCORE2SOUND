const VERBODEN_TEKENS = /[\u0000-\u001f\u007f:?*"<>|/\\]/g;

export function veiligeNaam(tekst, reserve = 'partituur') {
  const naam = String(tekst ?? '')
    .replace(VERBODEN_TEKENS, '-')
    .replace(/[ .]+$/g, '')
    .slice(0, 80)
    .replace(/[ .]+$/g, '');

  return naam || reserve;
}
