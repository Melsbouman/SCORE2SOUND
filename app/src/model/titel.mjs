export function herstelTitel(titel) {
  if (typeof titel !== 'string' || titel.length === 0) return titel;
  if (titel !== titel.toUpperCase() || !/\p{L}/u.test(titel)) return titel;

  const tokens = titel.split(' ');
  for (let index = 1; index < tokens.length - 1; index += 1) {
    if (/^[DSTNGHKMRY]$/.test(tokens[index]) && /^\p{L}{2,}$/u.test(tokens[index - 1])) {
      tokens[index - 1] += tokens[index];
      tokens.splice(index, 1);
      index -= 1;
    }
  }
  return tokens.join(' ');
}
