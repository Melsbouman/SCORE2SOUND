export function schoonMeta({ map, labels }) {
  if (map !== undefined && map !== null && typeof map !== 'string') {
    throw new Error('Map moet tekst zijn.');
  }
  if (labels !== undefined && !Array.isArray(labels)) {
    throw new Error('Labels moeten een lijst zijn.');
  }

  const schoneMap = typeof map === 'string' ? map.trim().slice(0, 40) || null : null;
  const schoneLabels = [];
  for (const label of labels ?? []) {
    if (typeof label !== 'string') throw new Error('Label moet tekst zijn.');
    const schoonLabel = label.trim().slice(0, 24);
    if (schoonLabel && schoneLabels.length < 5 && !schoneLabels.includes(schoonLabel)) {
      schoneLabels.push(schoonLabel);
    }
  }
  return { map: schoneMap, labels: schoneLabels };
}
