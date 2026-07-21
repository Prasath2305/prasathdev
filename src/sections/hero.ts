import * as THREE from "three";

const vertexShader = `
  varying vec2 v_uv;

  void main() {
    v_uv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const fragmentShader = `
  precision highp float;

  uniform sampler2D u_texture;
  uniform vec2 u_mouse;
  uniform float u_time;
  uniform vec2 u_resolution;
  uniform float u_radius;
  uniform float u_speed;
  uniform float u_imageAspect;
  uniform float u_turbulenceIntensity;

  varying vec2 v_uv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  float turbulence(vec2 p) {
    float t = 0.0;
    float w = 0.5;
    for (int i = 0; i < 8; i++) {
      t += abs(noise(p)) * w;
      p *= 2.0;
      w *= 0.5;
    }
    return t;
  }

  void main() {
    vec2 uv = v_uv;
    float screenAspect = u_resolution.x / u_resolution.y;
    float ratio = u_imageAspect / screenAspect;

    vec2 texCoord = vec2(
      mix(0.5 - 0.5 / ratio, 0.5 + 0.5 / ratio, uv.x),
      uv.y
    );

    vec4 tex = texture2D(u_texture, texCoord);
    float gray = dot(tex.rgb, vec3(0.299, 0.587, 0.114));
    vec3 invertedGray = vec3(1.0 - gray);

    vec2 correctedUV = uv;
    correctedUV.x *= screenAspect;
    vec2 correctedMouse = u_mouse;
    correctedMouse.x *= screenAspect;

    float dist = distance(correctedUV, correctedMouse);
    float jaggedDist = dist + (turbulence(uv * 25.0 + u_time * u_speed) - 0.5) * u_turbulenceIntensity;
    float mask = step(jaggedDist, u_radius);

    vec3 finalColor = mix(invertedGray, tex.rgb, 1.0 - mask);
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

const config = {
  maskRadius: 0.15,
  maskSpeed: 0.75,
  lerpFactor: 0.05,
  radiusLerpSpeed: 0.1,
  turbulenceIntensity: 0.075,
};

export function initHero() {
  const container = document.querySelector<HTMLElement>(".hero-lens");
  const stage = document.querySelector<HTMLElement>(".hero-lens__stage");
  const img = stage?.querySelector<HTMLImageElement>("img");
  if (!container || !stage || !img) return;

  const targetMouse = new THREE.Vector2(0.5, 0.5);
  const lerpedMouse = new THREE.Vector2(0.5, 0.5);
  let targetRadius = 0;
  let lastMouseX = 0;
  let lastMouseY = 0;

  const updateCursorState = (x: number, y: number) => {
    lastMouseX = x;
    lastMouseY = y;

    const rect = container.getBoundingClientRect();
    const inside = x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

    if (inside) {
      targetMouse.x = (x - rect.left) / rect.width;
      targetMouse.y = 1 - (y - rect.top) / rect.height;
      targetRadius = config.maskRadius;
    } else {
      targetRadius = 0;
    }
  };

  const loader = new THREE.TextureLoader();
  loader.load(img.src, (texture) => {
    const imageAspect = texture.image.width / texture.image.height;
    texture.minFilter = THREE.LinearMipMapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const uniforms = {
      u_texture: { value: texture },
      u_mouse: { value: new THREE.Vector2(0.5, 0.5) },
      u_time: { value: 0 },
      u_resolution: { value: new THREE.Vector2(container.clientWidth, container.clientHeight) },
      u_radius: { value: 0 },
      u_speed: { value: config.maskSpeed },
      u_imageAspect: { value: imageAspect },
      u_turbulenceIntensity: { value: config.turbulenceIntensity },
    };

    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.ShaderMaterial({ uniforms, vertexShader, fragmentShader });
    scene.add(new THREE.Mesh(geometry, material));

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(container.clientWidth, container.clientHeight);
    stage.appendChild(renderer.domElement);

    document.addEventListener("mousemove", (e) => updateCursorState(e.clientX, e.clientY));
    window.addEventListener("scroll", () => updateCursorState(lastMouseX, lastMouseY));

    new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) targetRadius = 0;
        });
      },
      { threshold: 0.1 },
    ).observe(container);

    window.addEventListener("resize", () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      uniforms.u_resolution.value.set(width, height);
    });

    function animate() {
      requestAnimationFrame(animate);

      lerpedMouse.lerp(targetMouse, config.lerpFactor);
      uniforms.u_mouse.value.copy(lerpedMouse);
      uniforms.u_time.value += 0.01;
      uniforms.u_radius.value += (targetRadius - uniforms.u_radius.value) * config.radiusLerpSpeed;

      renderer.render(scene, camera);
    }
    animate();
  });
}
