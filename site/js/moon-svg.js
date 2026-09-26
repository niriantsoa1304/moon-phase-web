/*
 * moon-svg.js — tracé SVG d'une phase lunaire.
 * Disque de rayon 1 centré en (0, 0). Le croissant est éclairé à droite (hémisphère nord) ;
 * `south` inverse gauche/droite.
 */

/* Chemin de la partie éclairée pour une fraction illuminée k (0–1). */
export function litPath(k, waxing = true, south = false) {
  k = Math.max(0, Math.min(1, k));
  if (k < 0.002) return "";
  const rx = Math.abs(1 - 2 * k).toFixed(4);
  const litRight = waxing !== south;
  const gibbous = k > 0.5; // le terminateur bombe alors vers le côté sombre
  // Bord éclairé de haut en bas, puis terminateur (demi-ellipse) de bas en haut.
  const limbSweep = litRight ? 1 : 0;
  const termSweep = litRight === gibbous ? 1 : 0;
  return `M0 -1A1 1 0 0 ${limbSweep} 0 1A${rx} 1 0 0 ${termSweep} 0 -1Z`;
}

/* Chemin de la partie sombre (complément de la partie éclairée). */
export function darkPath(k, waxing = true, south = false) {
  return litPath(1 - k, !waxing, south);
}

/* SVG complet d'une petite lune (cartes des phases, logo). */
export function moonIcon(k, waxing, south, { lit = "var(--moon-lit)", dark = "var(--moon-dark)" } = {}) {
  return `<svg viewBox="-1 -1 2 2" aria-hidden="true" focusable="false">` +
    `<circle r="1" fill="${dark}"/><path d="${litPath(k, waxing, south)}" fill="${lit}"/></svg>`;
}
