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
 * Generates a brain-ish point cloud:
 * - Two hemispheres with a soft midline (no harsh "cutter" line)
 * - Surface-biased sampling (cortex shell) so it doesn't look like a ball
 * - Adds a small cerebellum + brainstem to avoid pure sphere silhouette
 */
export function generateBrainPoints(count: number): BrainGeometryData {
  const positions = new Float32Array(count * 3);
  const baseAlphas = new Float32Array(count);
  const surfaceFactors = new Float32Array(count);

  let idx = 0;

  // Main brain proportions (not spherical)
  const scaleX = 1.18;
  const scaleY = 0.82;
  const scaleZ = 0.98;

  // Hemisphere shaping
  const hemiShift = 0.12; // pushes points left/right
  const midNoPoints = 0.03; // avoids "ball with a line"

  // Cerebellum / Brainstem params
  const cerebCenter = { x: 0.0, y: -0.30, z: -0.62 };
  const cerebScale = { x: 0.50, y: 0.32, z: 0.36 };


  const stemCenter = { x: 0.0, y: -0.74, z: -0.25 };
const stemScale = { x: 0.12, y: 0.18, z: 0.12 };

  // Simple "fold" function to create sulci-like gaps (cheap, no noise lib)
  const fold = (nx: number, ny: number, nz: number) => {
    const a = Math.sin(nx * 10 + nz * 6) * 0.055;
    const b = Math.sin(ny * 14 + nx * 4) * 0.045;
    const c = Math.sin(nz * 12 + ny * 5) * 0.045;
    return a + b + c;
  };

  while (idx < count) {
    const bucket = Math.random();

    let x = 0;
    let y = 0;
    let z = 0;

    // 90% cortex, 8% cerebellum, 2% brainstem
    if (bucket < 0.90) {
      // --- Cortex / hemispheres ---
      x = (Math.random() - 0.5) * 2.35;
      y = (Math.random() - 0.5) * 2.15;
      z = (Math.random() - 0.5) * 2.25;

      // Slight frontal bias (more volume towards front)
      z *= z > 0 ? 1.06 : 0.95;

      // Hemisphere push
      x += (x >= 0 ? 1 : -1) * hemiShift;

      // Avoid harsh midline "stroke"
      if (Math.abs(x) < midNoPoints && y > 0.0) continue;

      const nx = x / scaleX;
      const ny = y / scaleY;
      const nz = z / scaleZ;

      // Super-ellipsoid base shape
      let d =
        Math.pow(Math.abs(nx), 2.25) +
        Math.pow(Math.abs(ny), 2.35) +
        Math.pow(Math.abs(nz), 2.2);

      // Add folds -> removes some points in sulci-like pattern
      const f = fold(nx, ny, nz);
      const cortexBias = 0.55 + 0.45 * Math.max(0, ny); // more folds on top
      d += f * cortexBias;

      if (d > 1.0) continue;

      // --- Surface biased sampling (shell) ---
      // This makes it look like cortex rather than a solid ball.
      // d is smaller inside, ~1 near the surface.
      const shell = Math.pow(Math.random(), 2.2); // higher exponent => more surface points
      const minD = 0.55 + 0.35 * (1 - shell);
      if (d < minD) continue;

      // Flatten underside a bit (brains aren't spherical below)
      if (y < -0.60 && Math.random() > 0.15) continue;

      // Soft temporal indentation
      if (y < -0.15 && Math.abs(x) > 0.95 && z > -0.15 && Math.random() > 0.55) continue;

      // A softer longitudinal fissure (not a straight cut)
      if (y > 0.05) {
        const wobble = 0.015 * Math.sin(z * 8.0) + 0.01 * Math.sin(y * 10.0);
        const groove = 0.10 * Math.exp(-Math.pow((y - 0.35) / 0.28, 2)) + wobble;
        if (Math.abs(x) < 0.08 && Math.abs(x) < groove) continue;
      }
    } else if (bucket < 0.98) {
      // --- Cerebellum (small, back-lower) ---
      x = (Math.random() - 0.5) * 2.0 * cerebScale.x;
      y = (Math.random() - 0.5) * 2.0 * cerebScale.y;
      z = (Math.random() - 0.5) * 2.0 * cerebScale.z;

      x += cerebCenter.x;
      y += cerebCenter.y;
      z += cerebCenter.z;

      const nx = (x - cerebCenter.x) / cerebScale.x;
      const ny = (y - cerebCenter.y) / cerebScale.y;
      const nz = (z - cerebCenter.z) / cerebScale.z;

      let d = nx * nx + ny * ny + nz * nz;

      // cerebellum folds (tighter, more frequent)
      d += Math.sin(nx * 18 + nz * 16) * 0.05 + Math.sin(ny * 22) * 0.03;

      if (d > 1.0) continue;

      // also surface-biased here, but weaker
      if (d < 0.55 + 0.25 * Math.random()) continue;
    } else {
      // --- Brainstem (thin stalk) ---
      x = (Math.random() - 0.5) * 2.0 * stemScale.x;
      y = (Math.random() - 0.5) * 2.0 * stemScale.y;
      z = (Math.random() - 0.5) * 2.0 * stemScale.z;

      x += stemCenter.x;
      y += stemCenter.y;
      z += stemCenter.z;

      const nx = (x - stemCenter.x) / stemScale.x;
      const ny = (y - stemCenter.y) / stemScale.y;
      const nz = (z - stemCenter.z) / stemScale.z;

      const d = nx * nx + ny * ny + nz * nz;
      if (d > 1.0) continue;
    }

    // Write point
    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // "surface factor" used for gating/glow; keep it simple & stable
    const surf = Math.min(1, Math.abs(x) * 0.25 + Math.abs(y) * 0.35 + Math.abs(z) * 0.25);
    baseAlphas[idx] = 0.15 + Math.random() * 0.85;
    surfaceFactors[idx] = surf;

    idx++;
  }

  const nearestSeedIndex = new Int32Array(count);
  return { positions, baseAlphas, surfaceFactors, nearestSeedIndex };
}

export function generateActivationSeeds(count: number): ActivationSeed[] {
  const clamped = Math.min(count, MAX_SEEDS);
  const seeds: ActivationSeed[] = [];

  for (let i = 0; i < clamped; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.random() * 0.7;

    seeds.push({
      position: {
        x: r * Math.sin(phi) * Math.cos(theta),
        y: r * Math.cos(phi) * 0.75,
        z: r * Math.sin(phi) * Math.sin(theta) * 0.85,
      },
      phase: Math.random() * Math.PI * 2,
      speed: 0.3 + Math.random() * 0.6,
      radius: 0.15 + Math.random() * 0.2,
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
