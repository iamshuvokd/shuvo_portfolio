import { useEffect, useRef } from 'react';
import * as THREE from 'three';

interface Scene3DProps {
  /** Portrait shown inside the ring. Changing it rebuilds the scene with the new image. */
  imageSrc: string;
}

const Scene3D = ({ imageSrc }: Scene3DProps) => {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0.2, 7);

    // WebGL can be unavailable (blocked, headless, exhausted contexts). Fail soft: the
    // gradient card behind the scene still renders instead of crashing the whole page.
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'high-performance' });
    } catch (error) {
      console.warn('Scene3D: WebGL unavailable, skipping 3D scene.', error);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);
    let portraitTexture: THREE.CanvasTexture | null = null;
    let portraitMaterial: THREE.SpriteMaterial | null = null;
    let disposed = false;

    const ambient = new THREE.AmbientLight(0xffffff, 1.6);
    const keyLight = new THREE.PointLight(0x46f4d1, 42, 18);
    keyLight.position.set(3, 3, 5);
    const rimLight = new THREE.PointLight(0xffb85c, 18, 14);
    rimLight.position.set(-4, -2, 4);
    scene.add(ambient, keyLight, rimLight);

    const coreMaterial = new THREE.MeshStandardMaterial({
      color: 0x0e1725,
      metalness: 0.8,
      roughness: 0.22,
      emissive: 0x10363c,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.78,
    });
    const core = new THREE.Mesh(new THREE.IcosahedronGeometry(1.15, 2), coreMaterial);
    core.position.set(0.25, -0.02, -0.45);
    core.scale.setScalar(1.05);
    group.add(core);

    const portraitGroup = new THREE.Group();
    portraitGroup.position.set(0, 0.28, 2.45);
    scene.add(portraitGroup);

    const portraitHalo = new THREE.Mesh(
      new THREE.CircleGeometry(1.12, 96),
      new THREE.MeshBasicMaterial({ color: 0x42e8cc, transparent: true, opacity: 0.06, depthWrite: false }),
    );
    portraitHalo.position.z = -0.08;
    portraitHalo.renderOrder = 8;
    portraitGroup.add(portraitHalo);

    const portraitBack = new THREE.Mesh(
      new THREE.CircleGeometry(0.94, 96),
      new THREE.MeshBasicMaterial({ color: 0x071116, transparent: true, opacity: 0.92, depthWrite: false }),
    );
    portraitBack.position.z = -0.05;
    portraitBack.renderOrder = 9;
    portraitGroup.add(portraitBack);

    const portraitRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.94, 0.024, 24, 160),
      new THREE.MeshStandardMaterial({
        color: 0x42e8cc,
        emissive: 0x1fd1b8,
        emissiveIntensity: 0.45,
        metalness: 0.45,
        roughness: 0.18,
      }),
    );
    portraitRing.renderOrder = 12;
    portraitGroup.add(portraitRing);

    const portraitInnerRing = new THREE.Mesh(
      new THREE.TorusGeometry(0.84, 0.008, 18, 140),
      new THREE.MeshBasicMaterial({ color: 0xb7fff5, transparent: true, opacity: 0.38, depthWrite: false }),
    );
    portraitInnerRing.position.z = 0.05;
    portraitInnerRing.renderOrder = 13;
    portraitGroup.add(portraitInnerRing);

    const portraitGlow = new THREE.Mesh(
      new THREE.TorusGeometry(1.04, 0.012, 18, 160),
      new THREE.MeshBasicMaterial({ color: 0x42e8cc, transparent: true, opacity: 0.18, depthWrite: false }),
    );
    portraitGlow.position.z = -0.04;
    portraitGlow.renderOrder = 10;
    portraitGroup.add(portraitGlow);

    const createPortraitTexture = (image: HTMLImageElement) => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) return null;

      context.clearRect(0, 0, size, size);
      context.save();
      context.beginPath();
      context.arc(size / 2, size / 2, size * 0.46, 0, Math.PI * 2);
      context.clip();

      const scale = Math.max(size / image.width, size / image.height);
      const width = image.width * scale;
      const height = image.height * scale;
      context.drawImage(image, (size - width) / 2, (size - height) / 2, width, height);
      context.restore();

      const gradient = context.createRadialGradient(size / 2, size / 2, size * 0.32, size / 2, size / 2, size * 0.51);
      gradient.addColorStop(0, 'rgba(66, 232, 204, 0)');
      gradient.addColorStop(0.78, 'rgba(66, 232, 204, 0.12)');
      gradient.addColorStop(1, 'rgba(66, 232, 204, 0.95)');
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(size / 2, size / 2, size * 0.49, 0, Math.PI * 2);
      context.fill();

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.needsUpdate = true;
      return texture;
    };

    const portraitImage = new Image();
    portraitImage.crossOrigin = 'anonymous';
    portraitImage.src = imageSrc;
    portraitImage.onload = () => {
      // The component may have unmounted while the image was loading.
      if (disposed) return;
      portraitTexture = createPortraitTexture(portraitImage);
      if (!portraitTexture) return;

      const makePortraitSprite = (scale: number, renderOrder: number) => {
        portraitMaterial = new THREE.SpriteMaterial({
          map: portraitTexture,
          transparent: true,
          depthTest: false,
          depthWrite: false,
        });
        const sprite = new THREE.Sprite(portraitMaterial);
        sprite.scale.set(scale, scale, 1);
        sprite.position.z = 0.1;
        sprite.renderOrder = renderOrder;
        return sprite;
      };

      const portrait = makePortraitSprite(1.76, 20);
      portraitGroup.add(portrait);
    };

    const particleGeometry = new THREE.BufferGeometry();
    const particleCount = 70;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 7;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 5;
    }
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particleGeometry,
      new THREE.PointsMaterial({ color: 0x8ef6e9, size: 0.018, transparent: true, opacity: 0.58 }),
    );
    scene.add(particles);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mouse = new THREE.Vector2(0, 0);
    const smoothMouse = new THREE.Vector2(0, 0);
    const handlePointerLeave = () => mouse.set(0, 0);
    const handlePointerMove = (event: PointerEvent) => {
      const rect = mount.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
      mouse.y = -((event.clientY - rect.top) / rect.height - 0.5) * 2;
    };

    const resize = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    mount.addEventListener('pointermove', handlePointerMove, { passive: true });
    mount.addEventListener('pointerleave', handlePointerLeave);
    // ResizeObserver also catches layout-driven size changes, not just window resizes.
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    let frame = 0;
    let isVisible = true;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const elapsed = reduceMotion.matches ? 0 : performance.now() * 0.001;

      // Ease toward the pointer so the tilt glides instead of snapping.
      smoothMouse.lerp(mouse, 0.06);

      group.rotation.y = elapsed * 0.22 + smoothMouse.x * 0.28;
      group.rotation.x = -0.12 + smoothMouse.y * 0.18;
      portraitGroup.position.y = 0.28 + smoothMouse.y * 0.04 + Math.sin(elapsed * 0.9) * 0.03;
      portraitGroup.position.x = smoothMouse.x * 0.05;
      core.rotation.y = elapsed * 0.35;
      core.rotation.z = elapsed * 0.16;
      portraitGroup.rotation.z = 0;
      portraitRing.rotation.z = elapsed * 0.05;
      portraitInnerRing.rotation.z = -elapsed * 0.04;
      portraitGlow.rotation.z = -elapsed * 0.03;
      particles.rotation.y = elapsed * 0.015;

      renderer.render(scene, camera);
    };
    const play = () => {
      if (!frame && isVisible && !document.hidden) animate();
    };
    const pause = () => {
      cancelAnimationFrame(frame);
      frame = 0;
    };
    // Only render while on screen and the tab is visible — saves GPU/battery.
    const intersection = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting;
      if (isVisible) play();
      else pause();
    });
    intersection.observe(mount);
    const onVisibility = () => (document.hidden ? pause() : play());
    document.addEventListener('visibilitychange', onVisibility);
    play();

    return () => {
      disposed = true;
      pause();
      intersection.disconnect();
      resizeObserver.disconnect();
      document.removeEventListener('visibilitychange', onVisibility);
      mount.removeEventListener('pointermove', handlePointerMove);
      mount.removeEventListener('pointerleave', handlePointerLeave);
      mount.removeChild(renderer.domElement);
      particleGeometry.dispose();
      core.geometry.dispose();
      portraitHalo.geometry.dispose();
      portraitBack.geometry.dispose();
      portraitRing.geometry.dispose();
      portraitInnerRing.geometry.dispose();
      portraitGlow.geometry.dispose();
      coreMaterial.dispose();
      portraitMaterial?.dispose();
      portraitTexture?.dispose();
      renderer.dispose();
    };
  }, [imageSrc]);

  return <div ref={mountRef} className="h-full w-full" aria-hidden="true" />;
};

export default Scene3D;
