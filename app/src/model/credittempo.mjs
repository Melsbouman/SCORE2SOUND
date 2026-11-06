export function creditTempos(creditGegevens) {
  return creditGegevens.flatMap(({ tekst, pagina, x, y }) => {
    const gevonden = tekst.trim().match(/^(?:J|♩|q)(\.)?\s*=\s*(\d+)$/u);
    if (!gevonden) return [];

    const bpm = Number(gevonden[2]);
    if (bpm < 30 || bpm > 300) return [];

    return [{ pagina, x, y, bpm, genoemd: gevonden[1] ? 'gepunt' : null }];
  });
}
