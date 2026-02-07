// Generates points distributed within a brain-like volume using
// superellipsoid shaping with hemisphere asymmetry. Points are
// rejection-sampled from a bounding box and kept only if they
// fall inside the implicit brain surface.
export function generateBrainPoints(count: number): Float32Array {
  const positions = new Float32Array(count * 3);
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

    // Superellipsoid test — exponent 2.4 gives slightly boxy organic shape
    const d = Math.pow(Math.abs(nx), 2.4)
            + Math.pow(Math.abs(ny), 2.4)
            + Math.pow(Math.abs(nz), 2.4);

    if (d > 1.0) continue;

    // Carve the longitudinal fissure (central groove on top)
    const fissureDepth = 0.08;
    const fissureWidth = 0.06;
    if (Math.abs(x) < fissureWidth && y > 0.1) {
      const groove = fissureDepth * Math.exp(-Math.pow((y - 0.4) / 0.3, 2));
      if (Math.abs(x) < groove) continue;
    }

    // Flatten bottom slightly (brain stem area)
    if (y < -0.55 && Math.random() > 0.3) continue;

    // Slight forward tilt bias — frontal lobe is slightly larger
    const frontBias = z > 0 ? 1.0 : 0.95;
    if (Math.random() > frontBias) continue;

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;
    idx++;
  }

  return positions;
}

// Plain 3D vector — avoids importing Three.js in this pure-math module.
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

// Creates activation seed points scattered throughout the brain volume.
// Each seed has a position, phase offset, and speed for independent timing.
export interface ActivationSeed {
  position: Vec3;
  phase: number;
  speed: number;
  radius: number;
}

export function generateActivationSeeds(count: number): ActivationSeed[] {
  const seeds: ActivationSeed[] = [];
  for (let i = 0; i < count; i++) {
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
