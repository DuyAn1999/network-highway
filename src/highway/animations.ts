import gsap from "gsap";
import { Car } from "./car";
import { spawnExplosion } from "./effects";

// ─── Car enter: drive onto the road from the left ───

export function animateCarEnter(
  car: Car,
  targetX: number,
  targetY: number,
  duration: number
): gsap.core.Tween {
  return gsap.to(car, {
    x: targetX,
    y: targetY,
    alpha: 1,
    duration: Math.max(0.5, duration),
    ease: "power2.out",
  });
}

// ─── Car exit: drive off the right side and fade ───

export function animateCarExit(car: Car, exitX: number, exitY: number): void {
  gsap.to(car, {
    x: exitX + 100,
    y: exitY - 36,
    alpha: 0,
    duration: 2.0,
    ease: "power1.in",
    onComplete: () => {
      if (!car.destroyed) {
        car.destroy();
      }
    },
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
