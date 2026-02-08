// components/analysis/brain-geometry.ts
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface ActivationSeed {
  position: Vec3;
  phase: number;
  speed: number;
  radius: number;
}

export const MAX_SEEDS = 24;

export interface BrainGeometryData {
  positions: Float32Array;
  baseAlphas: Float32Array;
  surfaceFactors: Float32Array;
  nearestSeedIndex: Int32Array;
}

/**
 * Option A: "Analytical field"
 * - Neutral, non-organic point volume (slightly flattened on Y)
 * - surfaceFactors encodes "relevance" (center = high, edge = low)
 * - baseAlphas gives subtle variety but stays controlled
 *
 * This avoids any recognizable "brain", "broccoli", or "ball with a seam".
 */
export function generateBrainPoints(count: number): BrainGeometryData {
  const positions = new Float32Array(count * 3);
  const baseAlphas = new Float32Array(count);
  const surfaceFactors = new Float32Array(count);
  const nearestSeedIndex = new Int32Array(count);

  let idx = 0;

  // Flattened ellipsoid (analysis "slab") – NOT spherical, NOT brain-like.
  const scaleX = 1.0;
  const scaleY = 0.62; // flatter = more "computational field"
  const scaleZ = 1.0;

  // Rejection sampling inside ellipsoid:
  // (x/scaleX)^2 + (y/scaleY)^2 + (z/scaleZ)^2 <= 1
  while (idx < count) {
    const x = (Math.random() - 0.5) * 2.0 * scaleX;
    const y = (Math.random() - 0.5) * 2.0 * scaleY;
    const z = (Math.random() - 0.5) * 2.0 * scaleZ;

    const nx = x / scaleX;
    const ny = y / scaleY;
    const nz = z / scaleZ;

    const d = nx * nx + ny * ny + nz * nz;
    if (d > 1.0) continue;

    // Optional: gentle density shaping – slightly denser towards center.
    // This keeps the field readable and prevents "shell-only" look.
    // probCenter in [0..1], higher near center.
    const probCenter = 1.0 - Math.min(1.0, Math.sqrt(d));
    // Keep it subtle so it doesn't form an obvious core.
    if (Math.random() > 0.72 + probCenter * 0.28) continue;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // baseAlpha: controlled variation (avoid sparkly chaos)
    // Center slightly brighter to read as "signal".
    const centerBoost = 0.15 * probCenter;
    baseAlphas[idx] = clamp01(0.28 + Math.random() * 0.62 + centerBoost);

    // surfaceFactors: interpret as "relevance"
    // 1 = very relevant (center), 0 = less relevant (outer edge)
    surfaceFactors[idx] = clamp01(probCenter);

    // Placeholder (you can use later if you want CPU-side seed assignment)
    nearestSeedIndex[idx] = -1;

    idx++;
  }

  return { positions, baseAlphas, surfaceFactors, nearestSeedIndex };
}

export function generateActivationSeeds(count: number): ActivationSeed[] {
  const clamped = Math.min(count, MAX_SEEDS);
  const seeds: ActivationSeed[] = [];

  // Keep seeds biased towards center so activations look like "checks"
  // rather than random fireworks on the boundary.
  for (let i = 0; i < clamped; i++) {
    // Random direction
    const theta = Math.random() * Math.PI * 2;
    const u = Math.random() * 2 - 1; // cos(phi)
    const phi = Math.acos(u);

    // Bias radius towards center (r^k with k>1 makes more center points)
    const r = Math.pow(Math.random(), 1.7) * 0.8;

    seeds.push({
      position: {
        x: r * Math.sin(phi) * Math.cos(theta),
        // slight flatten to match geometry scale
        y: r * u * 0.62,
        z: r * Math.sin(phi) * Math.sin(theta),
      },
      phase: Math.random() * Math.PI * 2,
      // slower, calmer pulses (more "computation")
      speed: 0.22 + Math.random() * 0.35,
      // moderate radius so it reads as local checks
      radius: 0.14 + Math.random() * 0.16,
    });
  }

  return seeds;
}

export function packSeedsToUniforms(seeds: ActivationSeed[]): {
  seedPositions: Float32Array;
  seedParams: Float32Array;
} {
  const seedPositions = new Float32Array(MAX_SEEDS * 3);
  const seedParams = new Float32Array(MAX_SEEDS * 3);

  for (let i = 0; i < seeds.length; i++) {
    const s = seeds[i];

    seedPositions[i * 3] = s.position.x;
    seedPositions[i * 3 + 1] = s.position.y;
    seedPositions[i * 3 + 2] = s.position.z;

    seedParams[i * 3] = s.phase;
    seedParams[i * 3 + 1] = s.speed;
    seedParams[i * 3 + 2] = s.radius;
  }

  return { seedPositions, seedParams };
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v));
}
