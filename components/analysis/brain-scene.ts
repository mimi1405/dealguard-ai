import {
  generateBrainPoints,
  generateActivationSeeds,
  packSeedsToUniforms,
  MAX_SEEDS,
} from './brain-geometry';

const VERTEX_SHADER = /* glsl */ `
  attribute float aBaseAlpha;
  attribute float aSurfaceFactor;
  attribute vec3 aOriginalPos;

  varying float vAlpha;
  varying float vActivation;
  varying float vDepth;

  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uProgress;
  uniform int uSeedCount;
  uniform vec3 uSeedPositions[${MAX_SEEDS}];
  uniform vec3 uSeedParams[${MAX_SEEDS}];

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
      + i.y + vec4(0.0, i1.y, i2.y, 1.0))
      + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
  }

  void main() {
    float drift = 0.03;
    vec3 offset = vec3(
      snoise(aOriginalPos * 2.0 + uTime * 0.12) * drift,
      snoise(aOriginalPos * 2.0 + uTime * 0.12 + 100.0) * drift,
      snoise(aOriginalPos * 2.0 + uTime * 0.12 + 200.0) * drift
    );

    vec3 pos = aOriginalPos + offset;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    float size = (0.8 + aBaseAlpha * 0.5) * uPixelRatio;
    float perspective = 60.0 / -mvPosition.z;
    gl_PointSize = clamp(size * perspective, 1.0, 2.8);

    float r = length(aOriginalPos * vec3(1.0, 1.33, 1.18));
    float coreWeight = smoothstep(1.0, 0.3, r);
    float edgeFade = smoothstep(1.1, 0.88, r);

    float alpha = aBaseAlpha * 0.76 * mix(0.44, 1.0, coreWeight) * edgeFade;

    float centerR = length(aOriginalPos);
    float centerBias = smoothstep(0.9, 0.2, centerR);
    alpha *= mix(0.9, 1.3, centerBias);

    // --- Stage-based progress modulation ---
    // Stage 0 (0-0.2): sparse silhouette — only near-surface points visible
    // Stage 1 (0.2-0.6): full silhouette fills in
    // Stage 2 (0.6-0.9): activation pulses grow strong
    // Stage 3 (0.9-1.0): final crisp glow

    float surfaceThreshold = mix(0.4, 1.0, smoothstep(0.0, 0.25, uProgress));
    float surfaceGate = step(aSurfaceFactor, surfaceThreshold);
    alpha *= surfaceGate;

    float baseRamp = smoothstep(0.0, 0.5, uProgress);
    alpha *= mix(0.15, 1.0, baseRamp);

    // --- GPU-side activation computation ---
    float activationStrength = smoothstep(0.2, 0.9, uProgress);
    float maxAct = 0.0;

    for (int i = 0; i < ${MAX_SEEDS}; i++) {
      if (i >= uSeedCount) break;
      vec3 seedPos = uSeedPositions[i];
      vec3 params = uSeedParams[i];
      float phase = params.x;
      float speed = params.y;
      float rad = params.z;

      vec3 diff = aOriginalPos - seedPos;
      float dist2 = dot(diff, diff);
      float rad2 = rad * rad;

      if (dist2 > rad2) continue;

      float falloff = 1.0 - dist2 / rad2;
      float pulse = sin(uTime * speed + phase) * 0.5 + 0.5;
      float act = falloff * falloff * pulse;
      maxAct = max(maxAct, act);
    }

    float activation = maxAct * activationStrength;
    alpha += activation * 0.4;

    // Stage 3: finishing glow
    float glowPulse = smoothstep(0.88, 1.0, uProgress);
    alpha *= 1.0 + glowPulse * 0.35;

    vAlpha = alpha;
    vActivation = activation;

    float viewZ = -mvPosition.z;
    vDepth = clamp((viewZ - 2.5) / 1.8, 0.0, 1.0);

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying float vAlpha;
  varying float vActivation;
  varying float vDepth;

  uniform vec3 uBaseColor;
  uniform vec3 uActiveColor;
  uniform vec3 uWarmColor;
  uniform float uProgress;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float strength = 1.0 - smoothstep(0.0, 0.5, dist);
    strength = pow(strength, 2.0);

    float actCurve = pow(vActivation, 0.6);
    vec3 color = mix(uBaseColor, uActiveColor, smoothstep(0.0, 0.4, actCurve));
    color = mix(color, uWarmColor, smoothstep(0.6, 1.0, actCurve) * 0.25);

    float glowBright = smoothstep(0.88, 1.0, uProgress);
    color += vec3(0.06, 0.05, 0.04) * glowBright;

    float depthDim = mix(1.0, 0.35, vDepth);
    float alpha = strength * vAlpha * depthDim * 1.25;

    gl_FragColor = vec4(color, alpha);
  }
`;

export interface BrainScene {
  mount: (container: HTMLElement) => Promise<void>;
  unmount: () => void;
  setReducedMotion: (reduced: boolean) => void;
  setProgress: (p: number) => void;
}

export function createBrainScene(particleCount: number = 20000): BrainScene {
  let renderer: any = null;
  let scene: any = null;
  let camera: any = null;
  let animationId: number | null = null;
  let particles: any = null;
  let reducedMotion = false;
  let clock: any = null;
  let resizeHandler: (() => void) | null = null;
  let progress = 0;

  async function mount(container: HTMLElement) {
    const THREE = await import('three');

    const width = container.clientWidth;
    const height = container.clientHeight;

    clock = new THREE.Clock();

    renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(new THREE.Color('#0b0d10'), 1);
    container.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 0.1, 3.2);
    camera.lookAt(0, 0, 0);

    const geo = generateBrainPoints(particleCount);
    const seeds = generateActivationSeeds(18);
    const packed = packSeedsToUniforms(seeds);

    const seedPosVectors: any[] = [];
    const seedParamVectors: any[] = [];
    for (let i = 0; i < MAX_SEEDS; i++) {
      seedPosVectors.push(
        new THREE.Vector3(
          packed.seedPositions[i * 3],
          packed.seedPositions[i * 3 + 1],
          packed.seedPositions[i * 3 + 2]
        )
      );
      seedParamVectors.push(
        new THREE.Vector3(
          packed.seedParams[i * 3],
          packed.seedParams[i * 3 + 1],
          packed.seedParams[i * 3 + 2]
        )
      );
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(geo.positions.slice(), 3)
    );
    geometry.setAttribute(
      'aOriginalPos',
      new THREE.BufferAttribute(geo.positions, 3)
    );
    geometry.setAttribute(
      'aBaseAlpha',
      new THREE.BufferAttribute(geo.baseAlphas, 1)
    );
    geometry.setAttribute(
      'aSurfaceFactor',
      new THREE.BufferAttribute(geo.surfaceFactors, 1)
    );

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uProgress: { value: 0 },
        uSeedCount: { value: seeds.length },
        uSeedPositions: { value: seedPosVectors },
        uSeedParams: { value: seedParamVectors },
        uBaseColor: { value: new THREE.Color('#b8bcc0') },
        uActiveColor: { value: new THREE.Color('#d0d4d8') },
        uWarmColor: { value: new THREE.Color('#c8c4be') },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      depthTest: true,
    });

    particles = new THREE.Points(geometry, material);
    scene.add(particles);

    resizeHandler = () => {
      if (!renderer || !camera) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', resizeHandler);

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      if (!renderer || !scene || !camera || !particles) return;

      const elapsed = clock.getElapsedTime();
      const uniforms = particles.material.uniforms;

      uniforms.uTime.value = elapsed;
      uniforms.uProgress.value = progress;

      if (!reducedMotion) {
        camera.position.x = Math.sin(elapsed * 0.05) * 0.03;
        camera.position.y = 0.1 + Math.cos(elapsed * 0.04) * 0.02;
        camera.lookAt(0, 0, 0);
        particles.rotation.y = Math.sin(elapsed * 0.02) * 0.03;
      }

      renderer.render(scene, camera);
    };

    animate();
  }

  function unmount() {
    if (animationId !== null) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
    if (resizeHandler) {
      window.removeEventListener('resize', resizeHandler);
      resizeHandler = null;
    }
    if (renderer) {
      renderer.domElement.remove();
      renderer.dispose();
      renderer = null;
    }
    if (particles) {
      particles.geometry.dispose();
      particles.material.dispose();
      particles = null;
    }
    scene = null;
    camera = null;
    clock = null;
  }

  function setReducedMotion(reduced: boolean) {
    reducedMotion = reduced;
  }

  function setProgress(p: number) {
    progress = Math.max(0, Math.min(1, p));
  }

  return { mount, unmount, setReducedMotion, setProgress };
}
