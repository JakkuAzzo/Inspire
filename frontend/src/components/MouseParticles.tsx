import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  xInit: number;
  yInit: number;
  mouseRad: number;
  vx: number;
  vy: number;
  hue: number;
  size: number;
}

interface MouseParticlesProps {
  particleCount?: number;
  repelDistance?: number;
  colors?: string[];
  particleSize?: number;
}

export default function MouseParticles({
  particleCount = 150,
  repelDistance = 250,
  colors = ['#ec4899', '#22d3ee', '#a855f7', '#8b5cf6', '#06b6d4'],
  particleSize = 3
}: MouseParticlesProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const pointerInsideRef = useRef(false);
  const rafRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      const wasInitialized = particlesRef.current.length > 0;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (!wasInitialized) {
        initParticles();
      }
    };

    // Initialize particles in a grid-like pattern across the viewport
    const initParticles = () => {
      particlesRef.current = [];
      const cols = Math.ceil(Math.sqrt(particleCount * (canvas.width / canvas.height)));
      const rows = Math.ceil(particleCount / cols);
      const spacingX = canvas.width / (cols + 1);
      const spacingY = canvas.height / (rows + 1);

      for (let i = 0; i < particleCount; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const xInit = spacingX * (col + 1) + (Math.random() - 0.5) * spacingX * 0.3;
        const yInit = spacingY * (row + 1) + (Math.random() - 0.5) * spacingY * 0.3;

        particlesRef.current.push({
          x: xInit,
          y: yInit,
          xInit,
          yInit,
          mouseRad: Math.random(),
          vx: 0,
          vy: 0,
          hue: (i / particleCount) * 360,
          size: particleSize * (0.5 + Math.random() * 0.5)
        });
      }
    };

    // Only react while pointer is inside the window.
    pointerInsideRef.current = false;
    mouseRef.current.x = -9999;
    mouseRef.current.y = -9999;

    // Mouse move handler
    const handleMouseMove = (e: MouseEvent | TouchEvent) => {
      pointerInsideRef.current = true;
      if (e instanceof MouseEvent) {
        mouseRef.current.x = e.clientX;
        mouseRef.current.y = e.clientY;
      } else {
        mouseRef.current.x = e.touches[0].clientX;
        mouseRef.current.y = e.touches[0].clientY;
      }
    };

    const handleWindowMouseOut = (e: MouseEvent) => {
      // When leaving the window, relatedTarget is null.
      if (e.relatedTarget === null) {
        pointerInsideRef.current = false;
        mouseRef.current.x = -9999;
        mouseRef.current.y = -9999;
      }
    };

    const handleWindowBlur = () => {
      pointerInsideRef.current = false;
      mouseRef.current.x = -9999;
      mouseRef.current.y = -9999;
    };

    // Animation loop
    const animate = () => {
      if (!ctx || !canvas) return;

      // Clear canvas completely
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle, i) => {
        if (pointerInsideRef.current) {
          // Calculate repulsion from current pointer position
          const dx = mouseRef.current.x - particle.x;
          const dy = mouseRef.current.y - particle.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx);

          // Apply repulsion force when pointer is near
          if (dist < repelDistance) {
            const force = (1 - dist / repelDistance) * 3;
            particle.vx -= Math.cos(angle) * force;
            particle.vy -= Math.sin(angle) * force;
          }
        }

        // Apply gentle return force to initial position
        const returnDx = particle.xInit - particle.x;
        const returnDy = particle.yInit - particle.y;
        particle.vx += returnDx * 0.001;
        particle.vy += returnDy * 0.001;

        // Apply friction
        particle.vx *= 0.95;
        particle.vy *= 0.95;

        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Draw particle
        const colorIndex = Math.floor((i / particleCount) * colors.length);
        ctx.fillStyle = colors[colorIndex];
        ctx.globalAlpha = 0.8;
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fill();

        // Draw connecting lines to nearby particles
        particlesRef.current.forEach((other, j) => {
          if (j <= i) return;
          const dx2 = particle.x - other.x;
          const dy2 = particle.y - other.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (dist2 < 100) {
            ctx.strokeStyle = colors[colorIndex];
            ctx.globalAlpha = (1 - dist2 / 100) * 0.2;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
          }
        });
      });

      rafRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('touchmove', handleMouseMove);
    window.addEventListener('mouseout', handleWindowMouseOut);
    window.addEventListener('blur', handleWindowBlur);

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleMouseMove);
      window.removeEventListener('mouseout', handleWindowMouseOut);
      window.removeEventListener('blur', handleWindowBlur);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [particleCount, repelDistance, colors, particleSize]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.6
      }}
    />
  );
}
