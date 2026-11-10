'use client';

import type { CustomizerPrintZone } from '@ecommerce/shared';
import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

import type { CustomDesignElement } from '../../lib/customizer-types';

type EditorElement = CustomDesignElement & { id: string };

interface Shirt3DViewerProps {
  modelUrl?: string | null;
  rotationY?: number;
  color: string;
  zone: CustomizerPrintZone | null;
  elements: EditorElement[];
  imageMap: Record<string, HTMLImageElement>;
  stageWidth: number;
  stageHeight: number;
}

function renderZoneTexture({
  zone,
  elements,
  imageMap,
  stageWidth,
  stageHeight,
}: {
  zone: CustomizerPrintZone | null;
  elements: EditorElement[];
  imageMap: Record<string, HTMLImageElement>;
  stageWidth: number;
  stageHeight: number;
}) {
  if (!zone || stageWidth <= 0 || stageHeight <= 0) {
    return { canvas: document.createElement('canvas'), aspect: 1 };
  }

  const zoneWidth = zone.width * stageWidth;
  const zoneHeight = zone.height * stageHeight;
  const aspect = zoneWidth / Math.max(1, zoneHeight);
  const width = 1024;
  const height = Math.max(256, Math.min(1536, Math.round(width / aspect)));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { canvas, aspect };

  ctx.clearRect(0, 0, width, height);
  const zoneElements = elements.filter(
    (element) => (element.printAreaKey || 'front') === zone.key,
  );

  for (const element of zoneElements) {
    const u = (element.positionX - zone.x * stageWidth) / Math.max(1, zoneWidth);
    const v = (element.positionY - zone.y * stageHeight) / Math.max(1, zoneHeight);
    const x = u * width;
    const y = v * height;
    const scale = element.scale ?? 1;
    const rotation = ((element.rotation ?? 0) * Math.PI) / 180;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rotation);

    if (element.type === 'TEXT') {
      const fontSize = Math.max(8, ((element.fontSize ?? 32) / Math.max(1, zoneHeight)) * height * scale);
      ctx.fillStyle = element.fill || '#0d0d0d';
      ctx.font = `${element.fontWeight && element.fontWeight >= 600 ? '700' : '500'} ${fontSize}px ${element.fontFamily || 'Inter, sans-serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const lines = (element.textContent ?? '').split('\n');
      lines.forEach((line, index) => {
        ctx.fillText(line, 0, index * fontSize * 1.1);
      });
    } else if (element.type === 'UPLOADED_IMAGE' && element.assetUrl) {
      const image = imageMap[element.assetUrl];
      if (image) {
        const imageWidth = (element.width ?? image.width * 0.5) * scale * (width / Math.max(1, zoneWidth));
        const imageHeight = (element.height ?? image.height * 0.5) * scale * (height / Math.max(1, zoneHeight));
        ctx.drawImage(image, -imageWidth / 2, -imageHeight / 2, imageWidth, imageHeight);
      }
    } else if (element.type === 'CLIPART' && element.textContent === 'star') {
      const outer = Math.max(10, 30 * scale * (height / Math.max(1, zoneHeight)));
      ctx.fillStyle = element.fill || '#0d0d0d';
      ctx.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const radius = point % 2 === 0 ? outer : outer * 0.45;
        const angle = (Math.PI / 5) * point - Math.PI / 2;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
    } else if (element.type === 'CLIPART' && element.textContent === 'heart') {
      const size = Math.max(10, 36 * scale * (height / Math.max(1, zoneHeight)));
      ctx.fillStyle = element.fill || '#0d0d0d';
      ctx.font = `${size}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('❤', 0, 0);
    }

    ctx.restore();
  }

  return { canvas, aspect };
}

export function Shirt3DViewer({
  modelUrl,
  rotationY = 180,
  color,
  zone,
  elements,
  imageMap,
  stageWidth,
  stageHeight,
}: Shirt3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const modelRef = useRef<THREE.Object3D | null>(null);
  const planeRef = useRef<THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial> | null>(null);
  const boxRef = useRef<THREE.Box3 | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [modelVersion, setModelVersion] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f6f3f2');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    rendererRef.current = renderer;
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight('#ffffff', 1.65);
    const key = new THREE.DirectionalLight('#ffffff', 2.1);
    key.position.set(3, 5, 5);
    const fill = new THREE.DirectionalLight('#ffffff', 0.85);
    fill.position.set(-4, 2, -3);
    scene.add(ambient, key, fill);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.65;
    controls.minPolarAngle = Math.PI * 0.22;
    controls.maxPolarAngle = Math.PI * 0.78;
    controlsRef.current = controls;

    const resize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();

    const loader = new GLTFLoader();
    setLoading(true);
    setError(false);
    loader.load(
      modelUrl || '/models/tee-base.glb',
      (gltf) => {
        const model = gltf.scene;
        model.rotation.y = (rotationY * Math.PI) / 180;
        const initialBox = new THREE.Box3().setFromObject(model);
        const initialSize = initialBox.getSize(new THREE.Vector3());
        const scale = 2.2 / Math.max(0.001, initialSize.y);
        model.scale.setScalar(scale);
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        model.position.sub(center);
        model.updateMatrixWorld(true);
        const centeredBox = new THREE.Box3().setFromObject(model);
        boxRef.current = centeredBox;

        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh)) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          const next = materials.map((material) => {
            const cloned = material.clone();
            if (cloned instanceof THREE.MeshStandardMaterial || cloned instanceof THREE.MeshPhongMaterial) {
              cloned.color.set(color);
            }
            return cloned;
          });
          child.material = Array.isArray(child.material) ? next : next[0];
        });

        scene.add(model);
        modelRef.current = model;

        const size = centeredBox.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        camera.position.set(0.25, 0.1, maxDim * 1.9);
        controls.target.set(0, 0, 0);
        controls.minDistance = maxDim * 0.8;
        controls.maxDistance = maxDim * 4;
        controls.update();
        setLoading(false);
        setModelVersion((value) => value + 1);
      },
      undefined,
      () => {
        setError(true);
        setLoading(false);
      },
    );

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      controls.dispose();
      renderer.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry?.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => {
            if (material instanceof THREE.MeshBasicMaterial && material.map) material.map.dispose();
            material.dispose();
          });
        }
      });
      renderer.domElement.remove();
      sceneRef.current = null;
      rendererRef.current = null;
      modelRef.current = null;
      planeRef.current = null;
      boxRef.current = null;
    };
  }, [modelUrl, rotationY]);

  // Color de la prenda, sin recargar el GLB.
  useEffect(() => {
    const model = modelRef.current;
    if (!model) return;
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) {
        if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshPhongMaterial) {
          material.color.set(color);
          material.needsUpdate = true;
        }
      }
    });
  }, [color, modelVersion]);

  // Preset de cámara según la zona activa: frente, espalda o mangas.
  useEffect(() => {
    const controls = controlsRef.current;
    const camera = cameraRef.current;
    const box = boxRef.current;
    if (!controls || !camera || !box || !zone) return;

    const size = box.getSize(new THREE.Vector3());
    const distance = Math.max(size.x, size.y, size.z) * 1.9;
    if (zone.key === 'back') {
      camera.position.set(0, 0.1, -distance);
    } else if (zone.key === 'leftSleeve') {
      camera.position.set(-distance, 0.1, 0);
    } else if (zone.key === 'rightSleeve') {
      camera.position.set(distance, 0.1, 0);
    } else {
      camera.position.set(0, 0.1, distance);
    }
    controls.target.set(0, 0.05, 0);
    controls.update();
  }, [zone?.key, modelVersion]);

  // Textura de preview de la zona activa sobre una superficie plana ligeramente separada.
  useEffect(() => {
    const scene = sceneRef.current;
    const model = modelRef.current;
    const box = boxRef.current;
    if (!scene || !model || !box) return;

    if (planeRef.current) {
      scene.remove(planeRef.current);
      planeRef.current.geometry.dispose();
      planeRef.current.material.map?.dispose();
      planeRef.current.material.dispose();
      planeRef.current = null;
    }

    const { canvas, aspect } = renderZoneTexture({
      zone,
      elements,
      imageMap,
      stageWidth,
      stageHeight,
    });
    if (!zone || elements.length === 0) return;

    const size = box.getSize(new THREE.Vector3());
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.flipY = false;
    texture.needsUpdate = true;

    const isSleeve = zone.key === 'leftSleeve' || zone.key === 'rightSleeve';
    let planeWidth = isSleeve ? size.z * 0.82 : size.x * 0.46;
    let planeHeight = planeWidth / Math.max(0.1, aspect);
    const maxHeight = isSleeve ? size.y * 0.3 : size.y * 0.62;
    if (planeHeight > maxHeight) {
      planeHeight = maxHeight;
      planeWidth = planeHeight * aspect;
    }

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.FrontSide,
      toneMapped: false,
    });
    const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);
    const plane = new THREE.Mesh(geometry, material);

    if (zone.key === 'back') {
      plane.position.set(0, size.y * 0.05, box.min.z - 0.015);
      plane.rotation.y = Math.PI;
    } else if (zone.key === 'leftSleeve') {
      plane.position.set(box.min.x + size.x * 0.2, size.y * 0.12, 0);
      plane.rotation.y = -Math.PI / 2;
    } else if (zone.key === 'rightSleeve') {
      plane.position.set(box.max.x - size.x * 0.2, size.y * 0.12, 0);
      plane.rotation.y = Math.PI / 2;
    } else {
      plane.position.set(0, size.y * 0.05, box.max.z + 0.015);
      plane.scale.x = -1;
    }

    plane.renderOrder = 2;
    scene.add(plane);
    planeRef.current = plane;
  }, [zone, elements, imageMap, stageWidth, stageHeight, modelVersion]);

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 640,
        overflow: 'hidden',
        borderRadius: 12,
        border: '1px solid rgba(13,13,13,0.16)',
        backgroundColor: '#f6f3f2',
      }}
    >
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
      {loading ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(246,243,242,0.85)' }}>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Cargando prenda 3D…</span>
        </div>
      ) : null}
      {error ? (
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#f6f3f2', padding: '0 24px', textAlign: 'center' }}>
          <span className="font-label-md text-label-md text-on-surface">No se pudo cargar el modelo 3D</span>
          <span className="max-w-sm font-body-sm text-body-sm text-on-surface-variant">
            Revisá la URL del GLB en el admin o volvé a la vista 2D.
          </span>
        </div>
      ) : null}
      <div style={{ pointerEvents: 'none', position: 'absolute', left: 0, right: 0, bottom: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'linear-gradient(to top, rgba(0,0,0,0.45), transparent)', padding: '12px 16px', fontSize: 10, color: 'rgba(255,255,255,0.82)' }}>
        <span>Arrastrá para girar · scroll para acercar</span>
        <span>
          {modelUrl && !modelUrl.includes('/models/tee-base.glb')
            ? 'Modelo configurado por la tienda'
            : 'T-shirt por Poly by Google · CC BY 3.0 · Poly Pizza'}
        </span>
      </div>
    </div>
  );
}
