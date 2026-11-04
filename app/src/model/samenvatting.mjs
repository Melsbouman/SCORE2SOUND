export function samenvattingHerkenning(partituur) {
  let onzekereNoten = 0;
  let aangenomenLetters = 0;
  let matenMetMaatrust = 0;

  for (const partij of partituur.partijen ?? []) {
    for (const maat of partij.maten ?? []) {
      if (maat.maatrust > 0) matenMetMaatrust += 1;

      for (const noot of maat.noten ?? []) {
        if (noot.zekerheid < 0.8) onzekereNoten += 1;
      }

      for (const aanwijzing of maat.aanwijzingen ?? []) {
        if (aanwijzing.type === 'letter' && aanwijzing.zekerheid < 0.8) {
          aangenomenLetters += 1;
        }
      }
    }
  }

  const delen = [];
  if (onzekereNoten > 0) delen.push(`${onzekereNoten} onzekere noten`);
  if (aangenomenLetters > 0) delen.push(`${aangenomenLetters} aangenomen letters`);
  if (matenMetMaatrust > 0) delen.push(`${matenMetMaatrust} maten met maatrust`);

  return delen.length > 0 ? delen.join(', ') : 'Alles lijkt zeker.';
}
