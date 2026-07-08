import gsap from "gsap";
import { Car } from "./car";
import { spawnExplosion } from "./effects";

// ─── Car enter: drive onto the road ───

export function animateCarEnter(
  car: Car,
  targetX: number,
  targetY: number,
  duration: number
): gsap.core.Tween {
  const effects = startDriveEffects(car);
  const travelDuration = Math.max(0.5, duration);
  const startScale = car.alpha > 0 ? car.scale.x : car.baseScale * 0.82;

  gsap.set(car.scale, {
    x: startScale,
    y: startScale,
  });

  gsap.to(car, {
    alpha: 1,
    duration: Math.min(0.22, travelDuration * 0.18),
    ease: "power1.out",
  });

  gsap.to(car.scale, {
    x: car.baseScale * 1.08,
    y: car.baseScale * 1.08,
    duration: travelDuration,
    ease: "none",
  });

  return gsap.to(car, {
    x: targetX,
    y: targetY,
    duration: travelDuration,
    ease: "none",
    onComplete: () => {
      stopDriveEffects(effects, car);
    },
  });
}

// ─── Car exit: continue off the road and fade ───

export function animateCarExit(car: Car, exitX: number, exitY: number): void {
  const exitOffsetX = exitX < car.x ? -100 : 100;
  const exitOffsetY = exitY < car.y ? -36 : 36;
  const effects = startDriveEffects(car);

  gsap.to(car, {
    x: exitX + exitOffsetX,
    y: exitY + exitOffsetY,
    alpha: 0,
    duration: 2.0,
    ease: "none",
    onComplete: () => {
      stopDriveEffects(effects, car);
      if (!car.destroyed) {
        car.destroy();
      }
    },
  });

  gsap.to(car.scale, {
    x: car.baseScale * 1.16,
    y: car.baseScale * 1.16,
    duration: 2.0,
    ease: "none",
  });
}

// ─── Car lane change: smooth y-shift ───

export function animateCarLaneChange(car: Car, targetY: number): gsap.core.Tween {
  return gsap.to(car, {
    y: targetY,
    duration: 0.6,
    ease: "power2.inOut",
  });
}

// ─── Car crash: error/timeout → flash, spin, explode ───

export function animateCrash(car: Car, effectsContainer: any): void {
  const tl = gsap.timeline();

  // Flash the car body
  tl.to(car.body, {
    alpha: 0,
    duration: 0.05,
    yoyo: true,
    repeat: 5,
  });

  // Spawn explosion particles at the car's position
  tl.call(() => {
    spawnExplosion(effectsContainer, car.x, car.y, classifyCrashColor(car.statusCode));
  });

  // Spin and shrink
  tl.to(
    car,
    {
      rotation: Math.PI * 2,
      scale: 0,
      alpha: 0,
      duration: 0.8,
      ease: "power2.in",
      onComplete: () => {
        if (!car.destroyed) {
          car.destroy();
        }
      },
    },
    "-=0.2"
  );
}

// ─── Helpers ───

function classifyCrashColor(statusCode: number): number {
  if (statusCode >= 400) return 0xff0044; // red for server/client errors
  return 0xff6600; // orange for network errors
}

function startDriveEffects(car: Car): gsap.core.Tween[] {
  return [
    gsap.to(car.wheelLayer.children, {
      rotation: "-=6.283",
      duration: 0.22,
      ease: "none",
      repeat: -1,
    }),
    gsap.to(car.body, {
      y: -0.55,
      duration: 0.24,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    }),
    gsap.to(car.glow, {
      alpha: 0.82,
      duration: 0.3,
      yoyo: true,
      repeat: -1,
      ease: "sine.inOut",
    }),
  ];
}

function stopDriveEffects(effects: gsap.core.Tween[], car: Car) {
  for (const effect of effects) {
    effect.kill();
  }
  gsap.set(car.body, { y: 0 });
  gsap.set(car.glow, { alpha: 1 });
}
