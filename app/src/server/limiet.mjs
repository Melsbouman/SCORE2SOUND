export function maakLimiet({ max, venster, nu = Date.now }) {
  const tellers = new Map();

  function ruimOudeSleutelsOp(tijd) {
    for (const [sleutel, teller] of tellers) {
      if (tijd - teller.vanaf >= venster) {
        tellers.delete(sleutel);
      }
    }
  }

  function toegestaan(sleutel) {
    const tijd = nu();
    ruimOudeSleutelsOp(tijd);

    const teller = tellers.get(sleutel);
    if (!teller) {
      tellers.set(sleutel, { vanaf: tijd, aantal: 1 });
      return true;
    }

    if (teller.aantal >= max) {
      return false;
    }

    teller.aantal += 1;
    return true;
  }

  toegestaan.aantalSleutels = () => tellers.size;
  return toegestaan;
}
