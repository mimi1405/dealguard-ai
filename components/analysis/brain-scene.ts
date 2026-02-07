import { generateBrainPoints, generateActivationSeeds, ActivationSeed } from './brain-geometry';

const VERTEX_SHADER = `
  attribute float aBaseAlpha;
  attribute float aActivation;
  attribute vec3 aOriginalPos;

  varying float vAlpha;
  varying float vActivation;

  uniform float uTime;
  uniform float uPixelRatio;

  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
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
    return 42.0 * dot(m*m, vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));

    varying float vDepth;
    vDepth = clamp((-mvPosition.z - 2.0) / 2.0, 0.0, 1.0);
  }

  void main() {
    float drift = 0.04;
    vec3 offset = vec3(
      snoise(aOriginalPos * 2.0 + uTime * 0.15) * drift,
      snoise(aOriginalPos * 2.0 + uTime * 0.15 + 100.0) * drift,
      snoise(aOriginalPos * 2.0 + uTime * 0.15 + 200.0) * drift
    );

    vec3 pos = aOriginalPos + offset;
    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

    float size = (0.7 + aBaseAlpha * 0.6) * uPixelRatio;
    float perspective = 60.0 / -mvPosition.z;
    gl_PointSize = clamp(size * perspective, 1.0, 2.6);

    vAlpha = aBaseAlpha * 0.18 + aActivation * 0.22;
    vActivation = aActivation;

    gl_Position = projectionMatrix * mvPosition;
  }
`;

const FRAGMENT_SHADER = `
  varying float vAlpha;
  varying float vActivation;

  uniform vec3 uBaseColor;
  uniform vec3 uActiveColor;
  uniform vec3 uWarmColor;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float strength = 1.0 - smoothstep(0.0, 0.5, dist);
    strength = pow(strength, 1.6);

    vec3 color = mix(uBaseColor, uActiveColor, smoothstep(0.0, 0.6, vActivation));
    color = mix(color, uWarmColor, smoothstep(0.6, 1.0, vActivation) * 0.3);

    float alpha = strength * vAlpha * 0.12;
    gl_FragColor = vec4(color, alpha);

    alpha *= mix(1.0, 0.35, vDepth);
  }
`;

export interface BrainScene {
  mount: (container: HTMLElement) => Promise<void>;
  unmount: () => void;
  setReducedMotion: (reduced: boolean) => void;
}

export function createBrainScene(particleCount: number = 20000): BrainScene {
  let renderer: any = null;
  let scene: any = null;
  let camera: any = null;
  let animationId: number | null = null;
  let particles: any = null;
  let activationAttr: any = null;
  let seeds: ActivationSeed[] = [];
  let positions: Float32Array | null = null;
  let reducedMotion = false;
  let clock: any = null;
  let resizeHandler: (() => void) | null = null;

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

    positions = generateBrainPoints(particleCount);
    seeds = generateActivationSeeds(18);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions.slice(), 3));
    geometry.setAttribute('aOriginalPos', new THREE.BufferAttribute(positions, 3));

    const baseAlphas = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      baseAlphas[i] = 0.2 + Math.random() * 0.8;
    }
    geometry.setAttribute('aBaseAlpha', new THREE.BufferAttribute(baseAlphas, 1));

    const activations = new Float32Array(particleCount);
    activationAttr = new THREE.BufferAttribute(activations, 1);
    geometry.setAttribute('aActivation', activationAttr);

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        // Darker muted base -- far from white so additive blending can't blow out
        uBaseColor: { value: new THREE.Color('#8a96a3') },
        // Subtle steel-blue activation highlight
        uActiveColor: { value: new THREE.Color('#4a86b8') },
        // Faint warm accent, only visible at peak activation
        uWarmColor: { value: new THREE.Color('#9b7a44') },
      },
      transparent: true,
      depthWrite: false,
      depthTest: true,
      // NormalBlending avoids additive brightness stacking that causes the white blob
      blending: THREE.NormalBlending,
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
      if (!renderer || !scene || !camera || !particles || !activationAttr || !positions) return;

      const elapsed = clock.getElapsedTime();
      particles.material.uniforms.uTime.value = elapsed;

      const actArr = activationAttr.array as Float32Array;
      for (let i = 0; i < particleCount; i++) {
        const px = positions[i * 3];
        const py = positions[i * 3 + 1];
        const pz = positions[i * 3 + 2];

        let maxAct = 0;
        for (let s = 0; s < seeds.length; s++) {
          const seed = seeds[s];
          const dx = px - seed.position.x;
          const dy = py - seed.position.y;
          const dz = pz - seed.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          const pulse = Math.sin(elapsed * seed.speed + seed.phase) * 0.5 + 0.5;
          const falloff = Math.max(0, 1 - dist / seed.radius);
          const activation = falloff * falloff * pulse;
          if (activation > maxAct) maxAct = activation;
        }

        actArr[i] += (maxAct - actArr[i]) * 0.08;
      }
      activationAttr.needsUpdate = true;

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
    activationAttr = null;
    positions = null;
    seeds = [];
    clock = null;
  }

  function setReducedMotion(reduced: boolean) {
    reducedMotion = reduced;
  }

  return { mount, unmount, setReducedMotion };
}
