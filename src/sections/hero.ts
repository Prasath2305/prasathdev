import * as THREE from "three";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

const coverVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const coverFragmentShader = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uDissolve;
  uniform vec2 uCenter;
  uniform float uTime;
  uniform float uGrayscale;
  uniform float uEdgeIntensity;
  uniform float uEdgeBrightness;
  varying vec2 vUv;

  mat3 sobelX = mat3(-1.0, 0.0, 1.0, -2.0, 0.0, 2.0, -1.0, 0.0, 1.0);
  mat3 sobelY = mat3(-1.0, -2.0, -1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 1.0);

  float getLuminance(vec3 color) { return dot(color, vec3(0.299, 0.587, 0.114)); }

  float sobel(sampler2D tex, vec2 uv, vec2 texelSize) {
    float gx = 0.0;
    float gy = 0.0;
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec2 offset = vec2(float(i), float(j)) * texelSize;
        float lum = getLuminance(texture2D(tex, uv + offset).rgb);
        gx += lum * sobelX[i + 1][j + 1];
        gy += lum * sobelY[i + 1][j + 1];
      }
    }
    return sqrt(gx * gx + gy * gy);
  }

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise(p * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  }

  void main() {
    vec2 ratio = vec2(
      min((uResolution.x / uResolution.y) / (uImageResolution.x / uImageResolution.y), 1.0),
      min((uResolution.y / uResolution.x) / (uImageResolution.y / uImageResolution.x), 1.0)
    );
    vec2 uv = vec2(vUv.x * ratio.x + (1.0 - ratio.x) * 0.5, vUv.y * ratio.y + (1.0 - ratio.y) * 0.5);
    vec4 texColor = texture2D(uTexture, uv);
    float gray = getLuminance(texColor.rgb);
    vec3 grayscaleColor = vec3(gray);
    texColor.rgb = mix(texColor.rgb, grayscaleColor, uGrayscale);
    vec2 centeredUv = vUv - uCenter;
    float aspect = uResolution.x / uResolution.y;
    centeredUv.x *= aspect;
    float dist = length(centeredUv);
    float angle = atan(centeredUv.y, centeredUv.x);
    float noiseScale = 6.0;
    vec2 pixelatedUv = floor(vUv * uResolution / noiseScale) * noiseScale / uResolution;
    float blockNoise = fbm(pixelatedUv * 100.0) * 0.15;
    float angularNoise = fbm(vec2(angle * 5.0, 0.0)) * 0.15;
    float totalNoise = blockNoise + angularNoise;
    float noisyDist = dist + totalNoise;
    float maxDist = length(vec2(aspect * 0.5, 0.5));
    float normalizedDist = noisyDist / maxDist;
    float dissolveThreshold = uDissolve * 1.5;
    vec2 texelSize = 1.0 / uResolution;
    float edge = sobel(uTexture, uv, texelSize);
    edge = pow(edge, 0.7) * 2.0;
    edge = clamp(edge, 0.0, 1.0);
    float dissolveMask = smoothstep(dissolveThreshold - 0.03, dissolveThreshold, normalizedDist);
    vec3 edgeColor = vec3(1.0, 1.0, 1.0);
    vec3 baseColor = mix(texColor.rgb, vec3(0.0), uGrayscale);
    vec3 finalColor = baseColor;
    float edgeGlowIntensity = uEdgeIntensity * 2.0;
    float edgeGlow = edge * edgeGlowIntensity * (1.0 + uGrayscale * 3.0);
    finalColor += edgeColor * edgeGlow * uEdgeBrightness;
    float edgeZoneWidth = 0.15 * (1.0 - uDissolve) + 0.02;
    float edgeZone = smoothstep(dissolveThreshold - edgeZoneWidth, dissolveThreshold - edgeZoneWidth + 0.04, normalizedDist) * smoothstep(dissolveThreshold + 0.02, dissolveThreshold - 0.02, normalizedDist);
    float sparkle = hash(floor(vUv * uResolution / 4.0)) * edgeZone;
    float edgeBrightness = (1.0 - uDissolve) * uEdgeBrightness * (1.0 + uGrayscale * 2.0);
    finalColor += vec3(sparkle * 3.0 * edgeBrightness);
    float alpha = dissolveMask * texColor.a;
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const coverFragmentShaderReverse = `
  uniform sampler2D uTexture;
  uniform vec2 uResolution;
  uniform vec2 uImageResolution;
  uniform float uDissolve;
  uniform vec2 uCenter;
  uniform float uTime;
  uniform float uBrightness;
  uniform float uEdgeIntensity;
  uniform float uDarkness;
  uniform float uGrayscale;
  varying vec2 vUv;

  mat3 sobelX = mat3(-1.0, 0.0, 1.0, -2.0, 0.0, 2.0, -1.0, 0.0, 1.0);
  mat3 sobelY = mat3(-1.0, -2.0, -1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 1.0);

  float getLuminance(vec3 color) { return dot(color, vec3(0.299, 0.587, 0.114)); }

  float sobel(sampler2D tex, vec2 uv, vec2 texelSize) {
    float gx = 0.0;
    float gy = 0.0;
    for (int i = -1; i <= 1; i++) {
      for (int j = -1; j <= 1; j++) {
        vec2 offset = vec2(float(i), float(j)) * texelSize;
        float lum = getLuminance(texture2D(tex, uv + offset).rgb);
        gx += lum * sobelX[i + 1][j + 1];
        gy += lum * sobelY[i + 1][j + 1];
      }
    }
    return sqrt(gx * gx + gy * gy);
  }

  void main() {
    vec2 ratio = vec2(
      min((uResolution.x / uResolution.y) / (uImageResolution.x / uImageResolution.y), 1.0),
      min((uResolution.y / uResolution.x) / (uImageResolution.y / uImageResolution.x), 1.0)
    );
    vec2 uv = vec2(vUv.x * ratio.x + (1.0 - ratio.x) * 0.5, vUv.y * ratio.y + (1.0 - ratio.y) * 0.5);
    vec4 texColor = texture2D(uTexture, uv);
    float gray = getLuminance(texColor.rgb);
    vec3 grayscaleColor = vec3(gray);
    texColor.rgb = mix(texColor.rgb, grayscaleColor, uGrayscale);
    vec2 texelSize = 1.0 / uResolution;
    float edge = sobel(uTexture, uv, texelSize);
    edge = pow(edge, 0.7) * 2.0;
    edge = clamp(edge, 0.0, 1.0);
    vec3 edgeColor = vec3(1.0, 1.0, 1.0);
    vec3 darkBase = vec3(0.0);
    vec3 baseColor = mix(texColor.rgb, darkBase, uDarkness);
    float edgeGlow = edge * uEdgeIntensity * 2.0;
    baseColor += edgeColor * edgeGlow;
    vec3 finalColor = clamp(baseColor, 0.0, 1.0);
    gl_FragColor = vec4(finalColor, texColor.a);
  }
`;

export function initHero() {
  const section = document.getElementById("home");
  const container1 = document.querySelector<HTMLCanvasElement>(".hero-canvas--1");
  const container2 = document.querySelector<HTMLCanvasElement>(".hero-canvas--2");
  const dynamicText = document.querySelector<HTMLElement>(".hero-dynamic-text");
  if (!section || !container1 || !container2 || !dynamicText) return;

  const scene1 = new THREE.Scene();
  const camera1 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera1.position.z = 1;
  const renderer1 = new THREE.WebGLRenderer({ canvas: container1, antialias: true, alpha: true });
  renderer1.setSize(window.innerWidth, window.innerHeight);

  const scene2 = new THREE.Scene();
  const camera2 = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
  camera2.position.z = 1;
  const renderer2 = new THREE.WebGLRenderer({ canvas: container2, antialias: true, alpha: true });
  renderer2.setSize(window.innerWidth, window.innerHeight);

  const geometry = new THREE.PlaneGeometry(2, 2);
  const textureLoader = new THREE.TextureLoader();

  let material1: THREE.ShaderMaterial | undefined;
  let material2: THREE.ShaderMaterial | undefined;

  textureLoader.load("/img/art-1.png", (texture) => {
    material1 = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uImageResolution: { value: new THREE.Vector2(texture.image.width, texture.image.height) },
        uDissolve: { value: 0.0 },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0.0 },
        uGrayscale: { value: 0.0 },
        uEdgeIntensity: { value: 0.0 },
        uEdgeBrightness: { value: 1.0 },
      },
      vertexShader: coverVertexShader,
      fragmentShader: coverFragmentShader,
      transparent: true,
    });
    scene1.add(new THREE.Mesh(geometry, material1));
  });

  textureLoader.load("/img/art-2.jpg", (texture) => {
    material2 = new THREE.ShaderMaterial({
      uniforms: {
        uTexture: { value: texture },
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uImageResolution: { value: new THREE.Vector2(texture.image.width, texture.image.height) },
        uDissolve: { value: 0.0 },
        uCenter: { value: new THREE.Vector2(0.5, 0.5) },
        uTime: { value: 0.0 },
        uBrightness: { value: 0.0 },
        uEdgeIntensity: { value: 0.6 },
        uDarkness: { value: 1.0 },
        uGrayscale: { value: 1.0 },
      },
      vertexShader: coverVertexShader,
      fragmentShader: coverFragmentShaderReverse,
      transparent: true,
    });
    scene2.add(new THREE.Mesh(geometry, material2));
  });

  window.addEventListener("resize", () => {
    renderer1.setSize(window.innerWidth, window.innerHeight);
    renderer2.setSize(window.innerWidth, window.innerHeight);
    material1?.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
    material2?.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
  });

  let textState: "start" | "end" = "start";
  const textTimeline = gsap.timeline({ paused: true });
  textTimeline
    .to(dynamicText, { opacity: 0, filter: "blur(20px)", ease: "none" }, 0)
    .to(dynamicText, { opacity: 1, filter: "blur(0px)", ease: "none" }, 0.6);

  ScrollTrigger.create({
    trigger: section,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const progress = self.progress;

      if (material1) {
        material1.uniforms.uDissolve.value = progress;
        const grayscaleProgress = Math.min(1.0, progress / 0.4);
        material1.uniforms.uGrayscale.value = grayscaleProgress;
        material1.uniforms.uEdgeIntensity.value = progress * 0.5;
        material1.uniforms.uEdgeBrightness.value = 1.0 - progress;
      }

      if (material2) {
        const accelerated = Math.min(1.0, progress * 1.1);
        material2.uniforms.uEdgeIntensity.value = 0.6 * (1.0 - accelerated);
        material2.uniforms.uDarkness.value = 1.0 - accelerated;
        material2.uniforms.uGrayscale.value = 1.0 - accelerated;
      }

      if (progress < 0.5 && textState !== "start") {
        dynamicText.textContent = "PRASATH";
        textState = "start";
      } else if (progress >= 0.5 && textState !== "end") {
        dynamicText.textContent = "DEVELOPER";
        textState = "end";
      }

      textTimeline.progress(progress);
    },
  });

  function raf(time: number) {
    const timeInSeconds = time * 0.001;
    if (material1) material1.uniforms.uTime.value = timeInSeconds;
    if (material2) material2.uniforms.uTime.value = timeInSeconds;
    renderer1.render(scene1, camera1);
    renderer2.render(scene2, camera2);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}
