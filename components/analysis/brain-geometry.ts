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

  // Hauptskalen (Gehirn ist nicht kugelig)
  const scaleX = 1.15;
  const scaleY = 0.82;
  const scaleZ = 0.95;

  // Hemisphären-Einstellung
  const hemiSeparation = 0.10; // Abstand/Grenze in der Mitte (mehr = klarer Split)
  const midGap = 0.035;        // harte "No-Points" Zone in der Mitte

  // Cerebellum / Brainstem
  const cerebZ = -0.65;
  const cerebY = -0.35;
  const cerebScale = { x: 0.55, y: 0.45, z: 0.45 };

  const stemZ = -0.20;
  const stemY = -0.85;
  const stemScale = { x: 0.16, y: 0.35, z: 0.16 };

  // Helper: “Fold noise” ohne Perlin – simpel aber effektiv für Punkt-Verteilung
  const fold = (x: number, y: number, z: number) => {
    // Mehr Falten im Cortex (oben/außen) als unten
    const a = Math.sin(x * 10 + z * 6) * 0.06;
    const b = Math.sin(y * 14 + x * 4) * 0.05;
    const c = Math.sin(z * 12 + y * 5) * 0.05;
    return a + b + c;
  };

  while (idx < count) {
    // 70% Cortex, 20% Cerebellum, 10% Brainstem
    const r = Math.random();

    let x = 0, y = 0, z = 0;

    if (r < 0.70) {
      // ---- Cortex (Hemisphären) ----
      x = (Math.random() - 0.5) * 2.4;
      y = (Math.random() - 0.5) * 2.2;
      z = (Math.random() - 0.5) * 2.3;

      // leichte Asymmetrie + "Front" mehr Volumen
      z *= z > 0 ? 1.05 : 0.95;
      x *= 1.0 + (z > 0 ? 0.03 : -0.02);

      // Hemisphären: verschiebe Punkte weg von der Mitte
      const side = x >= 0 ? 1 : -1;
      x += side * hemiSeparation;

      // harte Mittellinie ausdünnen (sonst wirkt’s wie “Ball mit Linie”)
      if (Math.abs(x) < midGap && y > -0.2) continue;

      // Super-ellipsoid (Form) + “Falten”-Gate
      const nx = x / scaleX;
      const ny = y / scaleY;
      const nz = z / scaleZ;

      // Grundform
      let d =
        Math.pow(Math.abs(nx), 2.2) +
        Math.pow(Math.abs(ny), 2.35) +
        Math.pow(Math.abs(nz), 2.2);

      // Cortex-Falten: wir machen es so, dass gewisse Bereiche “ausgeschnitten” werden
      // -> dadurch entstehen Sulci-ähnliche Rillen in der Punktwolke
      const f = fold(nx, ny, nz);
      const cortexBias = 0.55 + 0.45 * Math.max(0, ny); // oben mehr Struktur
      d += f * cortexBias;

      if (d > 1.0) continue;

      // Unterseite flacher: Gehirn ist unten nicht rund wie ein Ball
      if (y < -0.58 && Math.random() > 0.12) continue;

      // Seitliche “Kerben” für Temporallappen/Einzüge
      if (y < -0.15 && Math.abs(x) > 0.9 && z > -0.2 && Math.random() > 0.55) continue;
    } else if (r < 0.90) {
      // ---- Cerebellum (unten hinten, kleiner, “körniger”) ----
      x = (Math.random() - 0.5) * 2.0 * cerebScale.x;
      y = (Math.random() - 0.5) * 2.0 * cerebScale.y;
      z = (Math.random() - 0.5) * 2.0 * cerebScale.z;

      // positionieren
      x *= 1.05;
      y = y + cerebY;
      z = z + cerebZ;

      // ellipsoid
      const nx = x / cerebScale.x;
      const ny = (y - cerebY) / cerebScale.y;
      const nz = (z - cerebZ) / cerebScale.z;

      let d = nx * nx + ny * ny + nz * nz;

      // “Kleinhirn-Furchen”: stärker gerillt (kleine, häufige Falten)
      const g = Math.sin(nx * 18 + nz * 16) * 0.05 + Math.sin(ny * 22) * 0.03;
      d += g;

      if (d > 1.0) continue;
    } else {
      // ---- Brainstem (kleiner Stiel) ----
      x = (Math.random() - 0.5) * 2.0 * stemScale.x;
      y = (Math.random() - 0.5) * 2.0 * stemScale.y;
      z = (Math.random() - 0.5) * 2.0 * stemScale.z;

      // positionieren (leicht nach hinten)
      y = y + stemY;
      z = z + stemZ;

      const nx = x / stemScale.x;
      const ny = (y - stemY) / stemScale.y;
      const nz = (z - stemZ) / stemScale.z;

      const d = nx * nx + ny * ny + nz * nz;
      if (d > 1.0) continue;
    }

    positions[idx * 3] = x;
    positions[idx * 3 + 1] = y;
    positions[idx * 3 + 2] = z;

    // Alpha: außen heller
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
