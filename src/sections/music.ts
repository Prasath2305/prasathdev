import * as THREE from "three";
import normalizeWheel from "normalize-wheel";
import vertexShader from "../shaders/music-vertex.glsl";
import fragmentShader from "../shaders/music-fragment.glsl";

interface Size {
  width: number;
  height: number;
}

interface ImageInfo {
  aspectRatio: number;
  uvs: { xStart: number; xEnd: number; yStart: number; yEnd: number };
}

const interpolate = (current: number, target: number, ease: number) =>
  current + (target - current) * ease;

class Planes {
  scene: THREE.Scene;
  geometry!: THREE.PlaneGeometry;
  material!: THREE.ShaderMaterial;
  mesh!: THREE.InstancedMesh;
  meshCount = 400;
  sizes: Size;
  drag = {
    xCurrent: 0,
    xTarget: 0,
    yCurrent: 0,
    yTarget: 0,
    isDown: false,
    lastX: 0,
    lastY: 0,
  };
  shaderParameters: { maxX: number; maxY: number };
  scrollY = { target: 0, current: 0 };
  dragSensitivity = 1;
  dragDamping = 0.1;
  imageInfos: ImageInfo[] = [];
  atlasTexture: THREE.Texture | null = null;
  blurryAtlasTexture: THREE.Texture | null = null;

  constructor({ scene, sizes }: { scene: THREE.Scene; sizes: Size }) {
    this.scene = scene;
    this.sizes = sizes;
    this.shaderParameters = { maxX: sizes.width * 2, maxY: sizes.height * 2 };

    this.createGeometry();
    this.createMaterial();
    this.createInstancedMesh();
    this.fetchCovers();

    window.addEventListener("wheel", this.onWheel.bind(this));
  }

  createGeometry() {
    this.geometry = new THREE.PlaneGeometry(1, 1.69, 1, 1);
    this.geometry.scale(2, 2, 2);
  }

  async fetchCovers() {
    const urls = new Array(30).fill(0).map((_, i) => `/covers/image_${i}.jpg`);
    await this.loadTextureAtlas(urls);
    this.createBlurryAtlas();
    this.fillMeshData();
  }

  async loadTextureAtlas(urls: string[]) {
    const imagePromises = urls.map(async (path) => {
      try {
        const res = await fetch(path, { mode: "cors" });
        if (!res.ok) throw new Error(`Failed to fetch image: ${path}`);
        const blob = await res.blob();
        return (await createImageBitmap(blob)) as CanvasImageSource;
      } catch {
        return await new Promise<CanvasImageSource>((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = (e) => reject(e);
          img.src = path;
        });
      }
    });

    const images = (await Promise.all(imagePromises)) as any[];
    const atlasWidth = Math.max(...images.map((img) => img.width as number));
    let totalHeight = 0;
    images.forEach((img) => (totalHeight += img.height as number));

    const canvas = document.createElement("canvas");
    canvas.width = atlasWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext("2d")!;

    let currentY = 0;
    this.imageInfos = images.map((img) => {
      const aspectRatio = (img.width as number) / (img.height as number);
      ctx.drawImage(img, 0, currentY);
      const info: ImageInfo = {
        aspectRatio,
        uvs: {
          xStart: 0,
          xEnd: (img.width as number) / atlasWidth,
          yStart: 1 - currentY / totalHeight,
          yEnd: 1 - (currentY + (img.height as number)) / totalHeight,
        },
      };
      currentY += img.height as number;
      return info;
    });

    this.atlasTexture = new THREE.Texture(canvas);
    this.atlasTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.atlasTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.atlasTexture.minFilter = THREE.LinearFilter;
    this.atlasTexture.magFilter = THREE.LinearFilter;
    this.atlasTexture.needsUpdate = true;
    this.material.uniforms.uAtlas.value = this.atlasTexture;
  }

  createBlurryAtlas() {
    if (!this.atlasTexture) return;
    const blurryCanvas = document.createElement("canvas");
    blurryCanvas.width = (this.atlasTexture.image as HTMLCanvasElement).width;
    blurryCanvas.height = (this.atlasTexture.image as HTMLCanvasElement).height;
    const ctx = blurryCanvas.getContext("2d")!;
    ctx.filter = "blur(100px)";
    ctx.drawImage(this.atlasTexture.image, 0, 0);
    this.blurryAtlasTexture = new THREE.Texture(blurryCanvas);
    this.blurryAtlasTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.blurryAtlasTexture.wrapT = THREE.ClampToEdgeWrapping;
    this.blurryAtlasTexture.minFilter = THREE.LinearFilter;
    this.blurryAtlasTexture.magFilter = THREE.LinearFilter;
    this.blurryAtlasTexture.needsUpdate = true;
    this.material.uniforms.uBlurryAtlas.value = this.blurryAtlasTexture;
  }

  createMaterial() {
    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uMaxXdisplacement: {
          value: new THREE.Vector2(this.shaderParameters.maxX, this.shaderParameters.maxY),
        },
        uWrapperTexture: {
          value: new THREE.TextureLoader().load("/spt-3.png", (tex) => {
            tex.minFilter = THREE.NearestFilter;
            tex.magFilter = THREE.NearestFilter;
            tex.generateMipmaps = false;
            tex.needsUpdate = true;
          }),
        },
        uAtlas: new THREE.Uniform(this.atlasTexture),
        uBlurryAtlas: new THREE.Uniform(this.blurryAtlasTexture),
        uScrollY: { value: 0 },
        uSpeedY: { value: 0 },
        uDrag: { value: new THREE.Vector2(0, 0) },
      },
    });
  }

  createInstancedMesh() {
    this.mesh = new THREE.InstancedMesh(this.geometry, this.material, this.meshCount);
    this.scene.add(this.mesh);
  }

  fillMeshData() {
    const initialPosition = new Float32Array(this.meshCount * 3);
    const meshSpeed = new Float32Array(this.meshCount);
    const aTextureCoords = new Float32Array(this.meshCount * 4);

    for (let i = 0; i < this.meshCount; i++) {
      initialPosition[i * 3 + 0] = (Math.random() - 0.5) * this.shaderParameters.maxX * 2;
      initialPosition[i * 3 + 1] = (Math.random() - 0.5) * this.shaderParameters.maxY * 2;
      initialPosition[i * 3 + 2] = Math.random() * (7 - -30) - 30;
      meshSpeed[i] = Math.random() * 0.5 + 0.5;

      const imageIndex = i % this.imageInfos.length;
      aTextureCoords[i * 4 + 0] = this.imageInfos[imageIndex].uvs.xStart;
      aTextureCoords[i * 4 + 1] = this.imageInfos[imageIndex].uvs.xEnd;
      aTextureCoords[i * 4 + 2] = this.imageInfos[imageIndex].uvs.yStart;
      aTextureCoords[i * 4 + 3] = this.imageInfos[imageIndex].uvs.yEnd;
    }

    this.geometry.setAttribute("aInitialPosition", new THREE.InstancedBufferAttribute(initialPosition, 3));
    this.geometry.setAttribute("aMeshSpeed", new THREE.InstancedBufferAttribute(meshSpeed, 1));
    this.mesh.geometry.setAttribute("aTextureCoords", new THREE.InstancedBufferAttribute(aTextureCoords, 4));
  }

  bindDrag(element: HTMLElement) {
    const onPointerDown = (e: PointerEvent) => {
      this.drag.isDown = true;
      this.drag.lastX = e.clientX;
      this.drag.lastY = e.clientY;
      element.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!this.drag.isDown) return;
      const dx = e.clientX - this.drag.lastX;
      const dy = e.clientY - this.drag.lastY;
      this.drag.lastX = e.clientX;
      this.drag.lastY = e.clientY;

      const worldPerPixelX = (this.sizes.width / window.innerWidth) * this.dragSensitivity;
      const worldPerPixelY = (this.sizes.height / window.innerHeight) * this.dragSensitivity;

      this.drag.xTarget += -dx * worldPerPixelX;
      this.drag.yTarget += dy * worldPerPixelY;
    };

    const onPointerUp = (e: PointerEvent) => {
      this.drag.isDown = false;
      try {
        element.releasePointerCapture(e.pointerId);
      } catch {}
    };

    element.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  }

  onWheel(event: WheelEvent) {
    const normalized = normalizeWheel(event);
    const scrollY = (normalized.pixelY * this.sizes.height) / window.innerHeight;
    this.scrollY.target += scrollY;
    this.material.uniforms.uSpeedY.value += scrollY;
  }

  render(delta: number) {
    this.material.uniforms.uTime.value += delta * 0.015;

    this.drag.xCurrent += (this.drag.xTarget - this.drag.xCurrent) * this.dragDamping;
    this.drag.yCurrent += (this.drag.yTarget - this.drag.yCurrent) * this.dragDamping;
    this.material.uniforms.uDrag.value.set(this.drag.xCurrent, this.drag.yCurrent);

    this.scrollY.current = interpolate(this.scrollY.current, this.scrollY.target, 0.12);
    this.material.uniforms.uScrollY.value = this.scrollY.current;
    this.material.uniforms.uSpeedY.value *= 0.835;
  }
}

export function initMusic() {
  const canvas = document.getElementById("webgl") as HTMLCanvasElement | null;
  if (!canvas) return;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 100);
  scene.add(camera);
  camera.position.z = 10;

  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
  let pixelRatio = Math.min(2, window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(pixelRatio);

  function computeSizes(): Size {
    const fov = camera.fov * (Math.PI / 180);
    const height = camera.position.z * Math.tan(fov / 2) * 2;
    const width = height * camera.aspect;
    return { width, height };
  }

  const sizes = computeSizes();
  const planes = new Planes({ scene, sizes });
  planes.bindDrag(renderer.domElement);

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    pixelRatio = Math.min(2, window.devicePixelRatio);
    renderer.setPixelRatio(pixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  const clock = new THREE.Clock();
  let time = 0;

  function tick() {
    const now = clock.getElapsedTime();
    const delta = now - time;
    time = now;
    const normalizedDelta = delta / (1 / 60);

    planes.render(normalizedDelta);
    renderer.render(scene, camera);
    requestAnimationFrame(tick);
  }
  tick();
}
