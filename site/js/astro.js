/*
 * astro.js — position du Soleil et de la Lune, phase lunaire.
 * Jean Meeus, « Astronomical Algorithms » (2e éd.) :
 *   ch. 22 (nutation, version courte), ch. 25 (Soleil), ch. 47 (Lune, séries complètes),
 *   ch. 48 (angle de phase et fraction illuminée).
 * Les dates des phases sont trouvées en résolvant l'élongation écliptique sur ce même modèle.
 * Module sans dépendance, utilisable dans le navigateur comme dans Node.
 */

const RAD = Math.PI / 180;
const AU_KM = 149597870.7;
export const SYNODIC_MONTH = 29.53058867;

const norm360 = (d) => ((d % 360) + 360) % 360;
const wrap180 = (d) => norm360(d + 180) - 180;
const sin = (d) => Math.sin(d * RAD);
const cos = (d) => Math.cos(d * RAD);

export const julianDay = (date) => date.getTime() / 86400000 + 2440587.5;
export const dateFromJulianDay = (jd) => new Date((jd - 2440587.5) * 86400000);

/* ΔT = TT − UT en secondes (polynômes d'Espenak & Meeus). */
function deltaT(year) {
  const t = year - 2000;
  if (year >= 2050 && year < 2150) return -20 + 32 * ((year - 1820) / 100) ** 2 - 0.5628 * (2150 - year);
  if (year >= 2005 && year < 2050) return 62.92 + 0.32217 * t + 0.005589 * t * t;
  if (year >= 1986 && year < 2005)
    return 63.86 + 0.3345 * t - 0.060374 * t ** 2 + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5;
  if (year >= 1961 && year < 1986) { const u = year - 1975; return 45.45 + 1.067 * u - u * u / 260 - u ** 3 / 718; }
  if (year >= 1941 && year < 1961) { const u = year - 1950; return 29.07 + 0.407 * u - u * u / 233 + u ** 3 / 2547; }
  const u = (year - 1820) / 100;
  return -20 + 32 * u * u;
}

/* Siècles juliens depuis J2000.0, en temps terrestre. */
function centuriesTT(jdUT) {
  const year = 2000 + (jdUT - 2451545) / 365.25;
  return (jdUT + deltaT(year) / 86400 - 2451545) / 36525;
}

/* Ch. 22 — nutation en longitude (précision ~0,5″), en degrés. */
function nutationLongitude(T) {
  const omega = 125.04452 - 1934.136261 * T;
  const Ls = 280.4665 + 36000.7698 * T;
  const Lm = 218.3165 + 481267.8813 * T;
  return (-17.2 * sin(omega) - 1.32 * sin(2 * Ls) - 0.23 * sin(2 * Lm) + 0.21 * sin(2 * omega)) / 3600;
}

/* Ch. 25 — Soleil, longitude apparente (°) et distance (km). */
export function sunPosition(T) {
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
          + (0.019993 - 0.000101 * T) * sin(2 * M)
          + 0.000289 * sin(3 * M);
  const trueLon = L0 + C;
  const nu = M + C;
  const R = (1.000001018 * (1 - e * e)) / (1 + e * cos(nu));
  const omega = 125.04 - 1934.136 * T;
  return { lon: norm360(trueLon - 0.00569 - 0.00478 * sin(omega)), lat: 0, dist: R * AU_KM };
}

/* Ch. 47 — tableaux 47.A (longitude, distance) et 47.B (latitude) : D, M, M', F, coefficients. */
const LR = [
  [0,0,1,0,6288774,-20905355],[2,0,-1,0,1274027,-3699111],[2,0,0,0,658314,-2955968],[0,0,2,0,213618,-569925],
  [0,1,0,0,-185116,48888],[0,0,0,2,-114332,-3149],[2,0,-2,0,58793,246158],[2,-1,-1,0,57066,-152138],
  [2,0,1,0,53322,-170733],[2,-1,0,0,45758,-204586],[0,1,-1,0,-40923,-129620],[1,0,0,0,-34720,108743],
  [0,1,1,0,-30383,104755],[2,0,0,-2,15327,10321],[0,0,1,2,-12528,0],[0,0,1,-2,10980,79661],
  [4,0,-1,0,10675,-34782],[0,0,3,0,10034,-23210],[4,0,-2,0,8548,-21636],[2,1,-1,0,-7888,24208],
  [2,1,0,0,-6766,30824],[1,0,-1,0,-5163,-8379],[1,1,0,0,4987,-16675],[2,-1,1,0,4036,-12831],
  [2,0,2,0,3994,-10445],[4,0,0,0,3861,-11650],[2,0,-3,0,3665,14403],[0,1,-2,0,-2689,-7003],
  [2,0,-1,2,-2602,0],[2,-1,-2,0,2390,10056],[1,0,1,0,-2348,6322],[2,-2,0,0,2236,-9884],
  [0,1,2,0,-2120,5751],[0,2,0,0,-2069,0],[2,-2,-1,0,2048,-4950],[2,0,1,-2,-1773,4130],
  [2,0,0,2,-1595,0],[4,-1,-1,0,1215,-3958],[0,0,2,2,-1110,0],[3,0,-1,0,-892,3258],
  [2,1,1,0,-810,2616],[4,-1,-2,0,759,-1897],[0,2,-1,0,-713,-2117],[2,2,-1,0,-700,2354],
  [2,1,-2,0,691,0],[2,-1,0,-2,596,0],[4,0,1,0,549,-1423],[0,0,4,0,537,-1117],
  [4,-1,0,0,520,-1571],[1,0,-2,0,-487,-1739],[2,1,0,-2,-399,0],[0,0,2,-2,-381,-4421],
  [1,1,1,0,351,0],[3,0,-2,0,-340,0],[4,0,-3,0,330,0],[2,-1,2,0,327,0],
  [0,2,1,0,-323,1165],[1,1,-1,0,299,0],[2,0,3,0,294,0],[2,0,-1,-2,0,8752],
];
const B = [
  [0,0,0,1,5128122],[0,0,1,1,280602],[0,0,1,-1,277693],[2,0,0,-1,173237],[2,0,-1,1,55413],
  [2,0,-1,-1,46271],[2,0,0,1,32573],[0,0,2,1,17198],[2,0,1,-1,9266],[0,0,2,-1,8822],
  [2,-1,0,-1,8216],[2,0,-2,-1,4324],[2,0,1,1,4200],[2,1,0,-1,-3359],[2,-1,-1,1,2463],
  [2,-1,0,1,2211],[2,-1,-1,-1,2065],[0,1,-1,-1,-1870],[4,0,-1,-1,1828],[0,1,0,1,-1794],
  [0,0,0,3,-1749],[0,1,-1,1,-1565],[1,0,0,1,-1491],[0,1,1,1,-1475],[0,1,1,-1,-1410],
  [0,1,0,-1,-1344],[1,0,0,-1,-1335],[0,0,3,1,1107],[4,0,0,-1,1021],[4,0,-1,1,833],
  [0,0,1,-3,777],[4,0,-2,1,671],[2,0,0,-3,607],[2,0,2,-1,596],[2,-1,1,-1,491],
  [2,0,-2,1,-451],[0,0,3,-1,439],[2,0,2,1,422],[2,0,-3,-1,421],[2,1,-1,1,-366],
  [2,1,0,1,-351],[4,0,0,1,331],[2,-1,1,1,315],[2,-2,0,-1,302],[0,0,1,3,-283],
  [2,1,1,-1,-229],[1,1,0,-1,223],[1,1,0,1,223],[0,1,-2,-1,-220],[2,1,-1,-1,-220],
  [1,0,1,1,-185],[2,-1,-2,-1,181],[0,1,2,1,-177],[4,0,-2,-1,176],[4,-1,-1,-1,166],
  [1,0,1,-1,-164],[4,0,1,-1,132],[1,0,-1,-1,-119],[4,-1,0,-1,115],[2,-2,0,1,107],
];

/* Ch. 47 — Lune, longitude et latitude géocentriques (°) rapportées à l'équinoxe moyen, distance (km). */
export function moonPosition(T) {
  const T2 = T * T, T3 = T2 * T, T4 = T3 * T;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T2 + T3 / 24490000;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.29 * T;
  const A3 = 313.45 + 481266.484 * T;
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const eFactor = (m) => (m === 0 ? 1 : Math.abs(m) === 1 ? E : E * E);

  let sl = 0, sr = 0, sb = 0;
  for (const [d, m, mp, f, l, r] of LR) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const k = eFactor(m);
    sl += l * k * sin(arg);
    sr += r * k * cos(arg);
  }
  for (const [d, m, mp, f, b] of B) {
    sb += b * eFactor(m) * sin(d * D + m * M + mp * Mp + f * F);
  }
  sl += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
  sb += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F)
      + 127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);

  return { lon: norm360(Lp + sl / 1e6), lat: sb / 1e6, dist: 385000.56 + sr / 1000 };
}

/* Seuils identiques à MoonPhaseCalculator.get_phase_name() du Python. */
export const PHASES = [
  { id: "new", from: 28.5, to: 1 },
  { id: "waxingCrescent", from: 1, to: 6.4 },
  { id: "firstQuarter", from: 6.4, to: 8.4 },
  { id: "waxingGibbous", from: 8.4, to: 13.8 },
  { id: "full", from: 13.8, to: 15.8 },
  { id: "waningGibbous", from: 15.8, to: 21.1 },
  { id: "lastQuarter", from: 21.1, to: 23.1 },
  { id: "waningCrescent", from: 23.1, to: 28.5 },
];

export function phaseId(age) {
  if (age < 1 || age >= 28.5) return "new";
  if (age < 6.4) return "waxingCrescent";
  if (age < 8.4) return "firstQuarter";
  if (age < 13.8) return "waxingGibbous";
  if (age < 15.8) return "full";
  if (age < 21.1) return "waningGibbous";
  if (age < 23.1) return "lastQuarter";
  return "waningCrescent";
}

/* Écart de longitude écliptique apparente Lune − Soleil, 0–360°. */
function eclipticElongation(jdUT) {
  const T = centuriesTT(jdUT);
  return norm360(moonPosition(T).lon + nutationLongitude(T) - sunPosition(T).lon);
}

/* Données complètes de phase pour un instant donné (objet Date). */
export function moonPhase(date) {
  const T = centuriesTT(julianDay(date));
  const sun = sunPosition(T);
  const moon = moonPosition(T);
  const moonLon = moon.lon + nutationLongitude(T);

  // Ch. 48 : élongation géocentrique ψ, puis angle de phase i.
  const cosPsi = cos(moon.lat) * cos(moonLon - sun.lon);
  const psi = Math.acos(Math.max(-1, Math.min(1, cosPsi)));
  const i = Math.atan2(sun.dist * Math.sin(psi), moon.dist - sun.dist * Math.cos(psi)) / RAD;

  const diff = norm360(moonLon - sun.lon);
  const age = (diff / 360) * SYNODIC_MONTH;
  return {
    phaseAngle: i,
    illumination: ((1 + cos(i)) / 2) * 100,
    elongation: psi / RAD,
    longitudeDiff: diff,
    age,
    waxing: diff < 180,
    phase: phaseId(age),
    distanceKm: moon.dist,
  };
}

/*
 * Prochain instant (après `date`) où l'écart de longitude Lune − Soleil vaut `target` degrés :
 * 0 = nouvelle lune, 90 = premier quartier, 180 = pleine lune, 270 = dernier quartier.
 */
export function nextPrincipalPhase(date, target) {
  const MEAN_RATE = 360 / SYNODIC_MONTH;
  const jd0 = julianDay(date);
  let jd = jd0 + norm360(target - eclipticElongation(jd0)) / MEAN_RATE;
  for (let k = 0; k < 8; k++) {
    const step = wrap180(target - eclipticElongation(jd)) / MEAN_RATE;
    jd += step;
    if (Math.abs(step) < 1e-6) break;
  }
  if (jd <= jd0) jd = nextPrincipalPhase(dateFromJulianDay(jd0 + 1), target).getTime() / 86400000 + 2440587.5;
  return dateFromJulianDay(jd);
}
