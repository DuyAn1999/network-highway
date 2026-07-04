import { Container, Graphics } from "pixi.js";
import type { CarConfig, VehicleType } from "../shared/types";

// ─── Car sprite class ───
// Each car is a Container with a body Graphics and a glow Graphics.
// The vehicle type determines shape; color is applied to body + underglow.

export class Car extends Container {
  public requestId: string;
  public method: string;
  public statusCode: number;
  public lane: number;
  public body: Graphics;
  public glow: Graphics;

  constructor(config: CarConfig) {
    super();

    this.requestId = config.requestId;
    this.method = config.method;
    this.statusCode = config.statusCode;
    this.lane = config.lane;

    this.body = new Graphics();
    this.glow = new Graphics();

    this.drawVehicle(config.vehicleType, config.color, config.scale);
    this.position.set(config.startX, config.startY);
    this.alpha = 0; // start invisible for fade-in animation

    this.addChild(this.glow);
    this.addChild(this.body);
  }

  private drawVehicle(type: VehicleType, color: number, scale: number) {
    this.scale.set(scale);

    switch (type) {
      case "sedan":
        this.drawSedan(color);
        break;
      case "truck":
        this.drawTruck(color);
        break;
      case "sports":
        this.drawSportsCar(color);
        break;
      case "bus":
        this.drawBus(color);
        break;
    }
  }

  // ─── Sedan: low, sleek profile (GET requests) ───

  private drawSedan(color: number) {
    const g = this.body;

    // Main body
    g.roundRect(0, 0, 40, 14, 3);
    g.fill({ color });

    // Cabin (darker roof)
    g.roundRect(10, -8, 18, 10, 2);
    g.fill({ color: 0x1a0030 });

    // Windshield (front)
    g.rect(26, -6, 3, 6);
    g.fill({ color: 0x66ffff, alpha: 0.6 });

    // Rear window
    g.rect(10, -6, 3, 6);
    g.fill({ color: 0x66ffff, alpha: 0.4 });

    // Wheels
    g.circle(10, 14, 4);
    g.circle(30, 14, 4);
    g.fill({ color: 0x111111 });

    // Wheel rims
    g.circle(10, 14, 2);
    g.circle(30, 14, 2);
    g.fill({ color: 0x444444 });

    // Headlight
    g.circle(39, 5, 2);
    g.fill({ color: 0xffffcc, alpha: 0.9 });

    // Tail light
    g.circle(1, 5, 2);
    g.fill({ color: 0xff0000, alpha: 0.7 });

    // Neon underglow
    this.drawUnderglow(color);
  }

  // ─── Truck: big, boxy (POST requests) ───

  private drawTruck(color: number) {
    const g = this.body;

    // Cargo body
    g.roundRect(0, -2, 50, 18, 2);
    g.fill({ color: 0x1a0030 });

    // Cargo top highlight
    g.rect(2, -2, 46, 3);
    g.fill({ color, alpha: 0.5 });

    // Cab
    g.roundRect(50, -6, 16, 22, 2);
    g.fill({ color });

    // Windshield
    g.rect(56, -4, 8, 10);
    g.fill({ color: 0x66ffff, alpha: 0.5 });

    // Wheels (3 axles for truck)
    g.circle(12, 16, 4);
    g.circle(32, 16, 4);
    g.circle(58, 16, 4);
    g.fill({ color: 0x111111 });

    g.circle(12, 16, 2);
    g.circle(32, 16, 2);
    g.circle(58, 16, 2);
    g.fill({ color: 0x444444 });

    // Headlight
    g.circle(65, 6, 2);
    g.fill({ color: 0xffffcc, alpha: 0.9 });

    // Tail light
    g.circle(1, 6, 3);
    g.fill({ color: 0xff0000, alpha: 0.7 });

    this.drawUnderglow(color);
  }

  // ─── Sports car: low, wide, aggressive (DELETE requests) ───

  private drawSportsCar(color: number) {
    const g = this.body;

    // Main body — low and wide
    g.roundRect(0, 2, 44, 12, 4);
    g.fill({ color });

    // Front spoiler
    g.roundRect(38, 10, 6, 4, 1);
    g.fill({ color: 0x333333 });

    // Cabin (very low)
    g.roundRect(14, -4, 16, 8, 2);
    g.fill({ color: 0x1a0030 });

    // Windshield
    g.rect(28, -2, 3, 6);
    g.fill({ color: 0x66ffff, alpha: 0.6 });

    // Rear window
    g.rect(14, -2, 3, 6);
    g.fill({ color: 0x66ffff, alpha: 0.4 });

    // Side stripe (racing stripe)
    g.rect(4, 5, 36, 2);
    g.fill({ color: 0xffffff, alpha: 0.2 });

    // Wheels (larger, wider stance)
    g.circle(10, 14, 5);
    g.circle(34, 14, 5);
    g.fill({ color: 0x111111 });

    g.circle(10, 14, 3);
    g.circle(34, 14, 3);
    g.fill({ color: 0x666666 });

    // Headlights (pair)
    g.circle(43, 5, 2);
    g.circle(43, 9, 2);
    g.fill({ color: 0xffffcc, alpha: 0.9 });

    this.drawUnderglow(color);
  }

  // ─── Bus: long, tall (PUT/PATCH requests) ───

  private drawBus(color: number) {
    const g = this.body;

    // Main body
    g.roundRect(0, -6, 60, 22, 3);
    g.fill({ color });

    // Roof
    g.roundRect(2, -8, 56, 4, 1);
    g.fill({ color: 0x1a0030 });

    // Windows (row of them)
    for (let wx = 6; wx < 52; wx += 8) {
      g.rect(wx, -4, 5, 8);
      g.fill({ color: 0x66ffff, alpha: 0.4 });
    }

    // Windshield
    g.rect(52, -3, 6, 10);
    g.fill({ color: 0x66ffff, alpha: 0.5 });

    // Wheels
    g.circle(12, 16, 4);
    g.circle(48, 16, 4);
    g.fill({ color: 0x111111 });

    g.circle(12, 16, 2);
    g.circle(48, 16, 2);
    g.fill({ color: 0x444444 });

    // Headlights
    g.circle(59, 2, 2);
    g.circle(59, 8, 2);
    g.fill({ color: 0xffffcc, alpha: 0.9 });

    // Tail light
    g.circle(1, 4, 3);
    g.rect(0, 8, 3, 4);
    g.fill({ color: 0xff0000, alpha: 0.7 });

    this.drawUnderglow(color);
  }

  // ─── Neon underglow (synthwave aesthetic) ───

  private drawUnderglow(color: number) {
    const g = this.glow;

    // Wide glow underneath
    g.rect(-4, 13, 48, 6);
    g.fill({ color, alpha: 0.15 });

    // Tighter glow
    g.rect(-2, 14, 46, 3);
    g.fill({ color, alpha: 0.3 });
  }
}
