// US customary display units. Math stays in meters; only labels convert.
export const M_PER_MI = 1609.344;
export const M_PER_FT = 0.3048;

export function miles(m: number, digits?: number) {
  const mi = m / M_PER_MI;
  return `${mi.toFixed(digits ?? (mi < 10 ? 1 : 0))} mi`;
}

/** Short distances in feet (under ~0.2 mi), otherwise miles. */
export function dist(m: number) {
  if (m < 0.2 * M_PER_MI) return `${Math.round(m / M_PER_FT / 10) * 10} ft`;
  return miles(m, m < 10 * M_PER_MI ? 2 : 0);
}
