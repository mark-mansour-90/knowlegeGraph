 export const normalize = (s: string) =>
    s
      .toLowerCase()
      .replace(/\s+/g, " ") // collapse spaces
      .trim();

  const compact = (s: string) =>
    normalize(s).replace(/\s+/g, ""); // remove spaces for length calc

  // Returns similarity in [0..1] using your rule
  export const similarityScore = (a: string, b: string) => {
    const A = compact(a);
    const B = compact(b);

    if (!A || !B) return 0;

    // identical (after removing spaces & case)
    if (A === B) return 1;

    const longer = A.length >= B.length ? A : B;
    const shorter = A.length >= B.length ? B : A;

    // If one contains the other => matched letters = shorter length
    if (longer.includes(shorter)) {
      return shorter.length / longer.length;
    }

    // Otherwise: longest common prefix (simple + cheap)
    let i = 0;
    while (i < shorter.length && shorter[i] === longer[i]) i++;
    return i / longer.length;
  };