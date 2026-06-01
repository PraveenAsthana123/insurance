// seed.js — deterministic pseudo-random helpers so stub-fills render the same
// numbers every time for a given department. Client-side only.

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

// mulberry32 — small deterministic PRNG seeded from an integer.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRng(key) {
  return mulberry32(hashString(key));
}

export function randInt(rng, min, max) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

export function randFloat(rng, min, max, decimals = 1) {
  const v = rng() * (max - min) + min;
  const p = 10 ** decimals;
  return Math.round(v * p) / p;
}

export function pick(rng, arr) {
  return arr[Math.floor(rng() * arr.length)];
}

// Generate a tiny sparkline series (n values between min..max) for Area/LineChart.
export function sparkline(rng, n = 12, min = 20, max = 80) {
  return Array.from({ length: n }, (_, i) => ({
    i,
    v: randFloat(rng, min, max, 1),
  }));
}
