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

export function generateBrainPoints(count: number): BrainGeometryData {
  const positions = new Float32Array(count * 3);
  const baseAlphas = new Float32Array(count);
  const surfaceFactors = new Float32Array(count);
  let idx = 0;

  const scaleX = 1.0;
  const scaleY = 0.75;
  const scaleZ = 0.85;

  while (idx < count) {
    const x = (Math.random() - 0.5) * 2.2;
    const y = (Math.random() - 0.5) * 2.2;
    const z = (Math.random() - 0.5) * 2.2;

    const nx = x / scaleX;
    const ny = y / scaleY;
    const nz = z / scaleZ;

    const d =
      Math.pow(Math.abs(nx), 2.4) +
      Math.pow(Math.abs(ny), 2.4) +
      Math.pow(Math.abs(nz), 2.4);

    if (d > 1.0) continue;

    const fissureDepth = 0.08;
    const fissureWidth = 0.06;
    if (Math.abs(x) < fissureWidth && y > 0.1) {
      const groove = fissureDepth * Math.exp(-Math.pow((y - 0.4) / 0.3, 2));
      if (Math.abs(x) < groove) continue;
    }

    if (y < -0.55 && Math.random() > 0.3) continue;

    const frontBias = z > 0 ? 1.0 : 0.95;
    if (Math.random() > frontBias) continue;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    baseAlphas[idx] = 0.2 + Math.random() * 0.8;
    surfaceFactors[idx] = d;

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
