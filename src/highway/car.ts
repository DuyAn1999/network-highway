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
  public endX: number;
  public endY: number;

  constructor(config: CarConfig) {
    super();

    this.requestId = config.requestId;
    this.method = config.method;
    this.statusCode = config.statusCode;
    this.lane = config.lane;
    this.endX = config.endX;
    this.endY = config.endY;

    this.body = new Graphics();
    this.glow = new Graphics();

    this.drawVehicle(config.vehicleType, config.color, config.scale);
    this.position.set(config.startX, config.startY);
    this.rotation = -0.34;
    this.alpha = 0; // start invisible for fade-in animation

    this.addChild(this.glow);
    this.addChild(this.body);
  }

  private drawVehicle(type: VehicleType, color: number, scale: number) {
    this.scale.set(scale * 1.45);

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
    this.drawUnderglow(color, 36, 13);
    this.drawLowVehicle(38, 14, 8, color, 0x111322);
  }

  // ─── Truck: big, boxy (POST requests) ───

  private drawTruck(color: number) {
    const g = this.body;
    const cargoColor = this.brightCargoColor(color);

    this.drawUnderglow(cargoColor, 66, 18);
    this.drawIsoBox(g, 0, -10, 48, 22, 9, cargoColor, 0x123525, 0x0a211e);
    this.drawIsoBox(g, 48, -5, 18, 17, 7, 0x0f2840, 0x09172a, 0x0a1f36);

    g.rect(8, -1, 32, 3);
    g.fill({ color: 0xcaff33, alpha: 0.45 });
    g.rect(52, -2, 8, 5);
    g.fill({ color: 0x64f8ff, alpha: 0.75 });
    this.drawWheels([12, 34, 56], 14);
    this.drawLights(66, 2);
  }

  // ─── Sports car: low, wide, aggressive (DELETE requests) ───

  private drawSportsCar(color: number) {
    this.drawUnderglow(color, 42, 12);
    this.drawLowVehicle(42, 12, 6, color, 0x120d22);
  }

  // ─── Bus: long, tall (PUT/PATCH requests) ───

  private drawBus(color: number) {
    const g = this.body;
    const busColor = this.brightCargoColor(color);

    this.drawUnderglow(busColor, 62, 18);
    this.drawIsoBox(g, 0, -9, 62, 20, 8, busColor, 0x15341e, 0x0b241b);

    for (let wx = 8; wx < 50; wx += 10) {
      g.rect(wx, -2, 6, 5);
      g.fill({ color: 0x63f8ff, alpha: 0.55 });
    }
    g.rect(52, -2, 7, 6);
    g.fill({ color: 0x63f8ff, alpha: 0.7 });
    this.drawWheels([12, 48, 58], 13);
    this.drawLights(62, 2);
  }

  // ─── Isometric neon vehicle helpers ───

  private drawLowVehicle(width: number, height: number, depth: number, color: number, cabinColor: number) {
    const g = this.body;
    this.drawIsoBox(g, 0, 0, width, height, depth, color, this.darken(color), 0x090a14);
    this.drawIsoBox(g, width * 0.34, -7, width * 0.34, 9, 4, cabinColor, 0x080b18, 0x090c19);

    g.rect(width * 0.38, -4, width * 0.18, 4);
    g.fill({ color: 0x65f8ff, alpha: 0.65 });
    g.rect(width * 0.12, 5, width * 0.65, 2);
    g.fill({ color: 0xffffff, alpha: 0.22 });

    this.drawWheels([width * 0.22, width * 0.78], height + 2);
    this.drawLights(width, 5);
  }

  private drawIsoBox(
    g: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number,
    topColor: number,
    sideColor: number,
    frontColor: number
  ) {
    g.moveTo(x + depth, y);
    g.lineTo(x + width, y);
    g.lineTo(x + width - depth, y + depth);
    g.lineTo(x, y + depth);
    g.closePath();
    g.fill({ color: topColor });

    g.moveTo(x, y + depth);
    g.lineTo(x + width - depth, y + depth);
    g.lineTo(x + width - depth, y + height);
    g.lineTo(x, y + height - depth);
    g.closePath();
    g.fill({ color: sideColor });

    g.moveTo(x + width - depth, y + depth);
    g.lineTo(x + width, y);
    g.lineTo(x + width, y + height - depth);
    g.lineTo(x + width - depth, y + height);
    g.closePath();
    g.fill({ color: frontColor });
  }

  private drawWheels(xs: number[], y: number) {
    const g = this.body;

    for (const x of xs) {
      g.circle(x, y, 4);
      g.fill({ color: 0x02030a });
      g.circle(x, y, 2);
      g.fill({ color: 0x31eaff, alpha: 0.95 });
      g.circle(x, y, 6);
      g.fill({ color: 0x00e5ff, alpha: 0.16 });
    }
  }

  private drawLights(frontX: number, y: number) {
    const g = this.body;

    g.circle(frontX, y, 2);
    g.circle(frontX, y + 5, 2);
    g.fill({ color: 0x9ffcff, alpha: 0.95 });

    g.circle(0, y + 3, 2);
    g.fill({ color: 0xff007a, alpha: 0.9 });
  }

  private drawUnderglow(color: number, width: number, height: number) {
    const g = this.glow;

    g.ellipse(width * 0.5, height + 1, width * 0.58, 9);
    g.fill({ color, alpha: 0.16 });

    g.ellipse(width * 0.5, height + 2, width * 0.4, 4);
    g.fill({ color, alpha: 0.28 });
  }

  private brightCargoColor(color: number): number {
    if (color === 0xff0044) return 0xff007a;
    if (color === 0xffcc00) return 0xe7ff29;
    if (color === 0x222222) return 0x18a7ff;
    return 0xa7f02a;
  }

  private darken(color: number): number {
    const r = ((color >> 16) & 0xff) * 0.35;
    const g = ((color >> 8) & 0xff) * 0.35;
    const b = (color & 0xff) * 0.35;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }
}
