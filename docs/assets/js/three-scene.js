// SmoothBoost - Interactive 3D Kinetic Compositor Engine
// High-performance Three.js visualizer with pointer parallax, profile reactivity,
// low GPU overhead, and graceful reduced-motion / WebGL fallbacks.

(function () {
  'use strict';

  const PROFILE_COLORS = {
    auto: { core: 0x06b6d4, ring: 0x38bdf8, glow: '#06b6d4', speed: 1.0 },
    ultra: { core: 0x10b981, ring: 0x34d399, glow: '#10b981', speed: 1.6 },
    balanced: { core: 0x3b82f6, ring: 0x60a5fa, glow: '#3b82f6', speed: 0.8 },
    battery: { core: 0xf59e0b, ring: 0xfbbf24, glow: '#f59e0b', speed: 0.4 },
    custom: { core: 0x8b5cf6, ring: 0xa78bfa, glow: '#8b5cf6', speed: 1.1 }
  };

  let scene, camera, renderer, animationFrameId;
  let coreMesh, outerRing, innerRing, particles;
  let targetRotationX = 0;
  let targetRotationY = 0;
  let currentRotationX = 0;
  let currentRotationY = 0;
  let currentSpeed = 1.0;
  let targetColorCore = PROFILE_COLORS.auto.core;
  let targetColorRing = PROFILE_COLORS.auto.ring;
  let isVisible = true;
  let prefersReducedMotion = false;

  const canvasContainer = document.getElementById('hero-3d-container');
  const canvas = document.getElementById('hero-3d-canvas');

  function checkReducedMotion() {
    prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function initThree() {
    if (!canvasContainer || !canvas) return false;
    if (typeof THREE === 'undefined') return false;

    checkReducedMotion();

    const width = canvasContainer.clientWidth || 480;
    const height = canvasContainer.clientHeight || 480;

    // 1. Scene & Camera
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.z = 7;

    // 2. WebGL Renderer with performance caps
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'low-power'
      });
      renderer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    } catch (_e) {
      return false;
    }

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x38bdf8, 2.2, 50);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const secondaryLight = new THREE.PointLight(0x06b6d4, 1.8, 50);
    secondaryLight.position.set(-5, -5, -3);
    scene.add(secondaryLight);

    // 4. Central Crystalline Core (Faceted Icosahedron)
    const coreGeo = new THREE.IcosahedronGeometry(1.4, 0);
    const coreMat = new THREE.MeshPhysicalMaterial({
      color: PROFILE_COLORS.auto.core,
      metalness: 0.2,
      roughness: 0.15,
      transmission: 0.6,
      thickness: 1.2,
      reflectivity: 0.9,
      wireframe: false,
      transparent: true,
      opacity: 0.92
    });
    coreMesh = new THREE.Mesh(coreGeo, coreMat);
    scene.add(coreMesh);

    // Wireframe Cage for the Core
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      wireframe: true,
      transparent: true,
      opacity: 0.25
    });
    const wireMesh = new THREE.Mesh(coreGeo, wireMat);
    coreMesh.add(wireMesh);

    // 5. Outer Kinetic Gimbal Ring (Torus)
    const outerRingGeo = new THREE.TorusGeometry(2.3, 0.04, 16, 100);
    const outerRingMat = new THREE.MeshStandardMaterial({
      color: PROFILE_COLORS.auto.ring,
      metalness: 0.8,
      roughness: 0.2,
      wireframe: false
    });
    outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
    outerRing.rotation.x = Math.PI / 3;
    scene.add(outerRing);

    // 6. Inner Gimbal Ring
    const innerRingGeo = new THREE.TorusGeometry(1.85, 0.035, 16, 80);
    const innerRingMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      metalness: 0.9,
      roughness: 0.2,
      transparent: true,
      opacity: 0.6
    });
    innerRing = new THREE.Mesh(innerRingGeo, innerRingMat);
    innerRing.rotation.y = Math.PI / 4;
    scene.add(innerRing);

    // 7. Ambient Orbiting Data Nodes
    const particleCount = 48;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      const radius = 2.4 + Math.random() * 0.9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const particleMat = new THREE.PointsMaterial({
      color: 0x38bdf8,
      size: 0.08,
      transparent: true,
      opacity: 0.8
    });
    particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);

    // 8. Pointer / Touch Parallax
    setupParallax();

    // 9. Visibility Observer (Zero CPU when scrolled away)
    setupVisibilityObserver();

    // 10. Start Render Loop
    if (!prefersReducedMotion) {
      animate(0);
    } else {
      renderer.render(scene, camera);
    }

    window.addEventListener('resize', onWindowResize, { passive: true });
    return true;
  }

  function setupParallax() {
    function handlePointer(clientX, clientY) {
      if (prefersReducedMotion) return;
      const rect = canvasContainer.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((clientY - rect.top) / rect.height) * 2 - 1);
      targetRotationY = x * 0.75;
      targetRotationX = -y * 0.75;
    }

    window.addEventListener('mousemove', (e) => {
      handlePointer(e.clientX, e.clientY);
    }, { passive: true });

    canvasContainer.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        handlePointer(e.touches[0].clientX, e.touches[0].clientY);
      }
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      targetRotationX = 0;
      targetRotationY = 0;
    });
  }

  function setupVisibilityObserver() {
    if (typeof IntersectionObserver !== 'function') return;
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        isVisible = entry.isIntersecting;
        if (isVisible && !animationFrameId && !prefersReducedMotion) {
          animate(performance.now());
        }
      }
    }, { threshold: 0.05 });
    observer.observe(canvasContainer);
  }

  function onWindowResize() {
    if (!canvasContainer || !camera || !renderer) return;
    const width = canvasContainer.clientWidth;
    const height = canvasContainer.clientHeight;
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
  }

  function animate(timestamp) {
    if (!isVisible || prefersReducedMotion) {
      animationFrameId = null;
      return;
    }

    animationFrameId = requestAnimationFrame(animate);

    const delta = 0.012 * currentSpeed;

    // Smooth Parallax Damping
    currentRotationX += (targetRotationX - currentRotationX) * 0.06;
    currentRotationY += (targetRotationY - currentRotationY) * 0.06;

    // Base Rotations
    if (coreMesh) {
      coreMesh.rotation.y += delta * 0.8;
      coreMesh.rotation.x += delta * 0.4;
      coreMesh.position.x = currentRotationY * 0.4;
      coreMesh.position.y = currentRotationX * 0.4;
    }

    if (outerRing) {
      outerRing.rotation.z += delta * 1.2;
      outerRing.rotation.x = (Math.PI / 3) + currentRotationX * 0.6;
      outerRing.rotation.y = currentRotationY * 0.6;
    }

    if (innerRing) {
      innerRing.rotation.z -= delta * 1.4;
      innerRing.rotation.y = (Math.PI / 4) + currentRotationY * 0.8;
      innerRing.rotation.x = currentRotationX * 0.8;
    }

    if (particles) {
      particles.rotation.y += delta * 0.3;
      particles.rotation.x += delta * 0.2;
    }

    // Color Lerping
    if (coreMesh?.material && outerRing?.material) {
      coreMesh.material.color.lerp(new THREE.Color(targetColorCore), 0.05);
      outerRing.material.color.lerp(new THREE.Color(targetColorRing), 0.05);
    }

    renderer.render(scene, camera);
  }

  // Fallback 2D Procedural Orbital Ring (Runs if Three.js or WebGL is not available)
  function init2DFallback() {
    if (!canvas || !canvasContainer) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = canvasContainer.clientWidth || 400);
    let height = (canvas.height = canvasContainer.clientHeight || 400);
    let angle = 0;

    function render2D() {
      if (!isVisible || prefersReducedMotion) return;
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.32;

      // Glow circle
      ctx.save();
      const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, r * 1.2);
      grad.addColorStop(0, 'rgba(6, 182, 212, 0.45)');
      grad.addColorStop(0.7, 'rgba(6, 182, 212, 0.1)');
      grad.addColorStop(1, 'transparent');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Outer Ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r, r * 0.45, angle, 0, Math.PI * 2);
      ctx.stroke();

      // Inner Ring
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 0.75, r * 0.35, -angle * 1.3, 0, Math.PI * 2);
      ctx.stroke();

      // Core Node
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();

      angle += 0.015 * currentSpeed;
      requestAnimationFrame(render2D);
    }

    render2D();
  }

  function setProfile(profileKey) {
    const p = PROFILE_COLORS[profileKey] || PROFILE_COLORS.auto;
    targetColorCore = p.core;
    targetColorRing = p.ring;
    currentSpeed = p.speed;

    // Update canvas glow container style if present
    if (canvasContainer) {
      canvasContainer.style.setProperty('--core-glow', p.glow);
    }
  }

  function init() {
    const success = initThree();
    if (!success) {
      init2DFallback();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.SmoothBoost3D = {
    setProfile
  };
})();
