export function miniatuurSvg(zaad) {
  let hash = 7;
  for (const teken of zaad) {
    hash = (hash * 31 + teken.charCodeAt(0)) >>> 0;
  }
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  hash = Math.imul(hash ^ (hash >>> 16), 0x45d9f3b) >>> 0;
  hash = (hash ^ (hash >>> 16)) >>> 0;

  const lijnen = Array.from(
    { length: 5 },
    (_, i) => `<line x1="6" y1="${14 + i * 3.6}" x2="122" y2="${14 + i * 3.6}" stroke="#0d150b" stroke-width="0.6" />`,
  ).join('');
  const noten = Array.from({ length: 9 }, (_, i) => {
    const stap = (hash + i * 3 + i * i) % 8;
    return `<ellipse cx="${16 + i * 11.5}" cy="${14 + stap * 1.8}" rx="2.6" ry="1.9" fill="#0d150b" />`;
  }).join('');

  return `<svg viewBox="0 0 128 46" width="128" height="46" aria-hidden="true">${lijnen}${noten}</svg>`;
}
