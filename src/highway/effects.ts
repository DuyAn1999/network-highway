import { Container, Graphics } from "pixi.js";
import gsap from "gsap";

// ─── Explosion particles (for crashed/errored requests) ───

export function spawnExplosion(
  container: Container,
  x: number,
  y: number,
  color: number
): void {
  const particleCount = 14;
  const particles: Graphics[] = [];

  for (let i = 0; i < particleCount; i++) {
    const p = new Graphics();
    const radius = 2 + Math.random() * 4;
    p.circle(0, 0, radius);
    p.fill({ color, alpha: 1 });
    p.position.set(x, y);
    container.addChild(p);
    particles.push(p);
  }

  // Flash ring at center
  const ring = new Graphics();
  ring.circle(0, 0, 5);
  ring.setStrokeStyle({ width: 2, color, alpha: 0.8 });
  ring.position.set(x, y);
  container.addChild(ring);

  // Animate ring expansion
  gsap.to(ring, {
    width: 60,
    height: 60,
    alpha: 0,
    duration: 0.5,
    ease: "power2.out",
    onComplete: () => ring.destroy(),
  });

  // Animate particles outward in all directions
  particles.forEach((p, i) => {
    const angle = (Math.PI * 2 / particleCount) * i + (Math.random() - 0.5) * 0.3;
    const distance = 25 + Math.random() * 45;

    gsap.to(p, {
      x: x + Math.cos(angle) * distance,
      y: y + Math.sin(angle) * distance,
      alpha: 0,
      duration: 0.5 + Math.random() * 0.3,
      ease: "power2.out",
      onComplete: () => {
        if (!p.destroyed) p.destroy();
      },
    });
  });
}

// ─── Neon glow helper ───
// Draws a shape twice: once large + low alpha (glow), once small + full alpha (core)

export function drawNeonGlow(
  graphics: Graphics,
  drawFn: (g: Graphics) => void,
  color: number,
  glowAlpha: number = 0.15,
  coreAlpha: number = 0.9
): void {
  // Glow layer
  graphics.save();
  graphics.scale.set(1.3);
  drawFn(graphics);
  graphics.fill({ color, alpha: glowAlpha });
  graphics.restore();

  // Core layer
  drawFn(graphics);
  graphics.fill({ color, alpha: coreAlpha });
}
