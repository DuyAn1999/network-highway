import { Container, Graphics } from "pixi.js";
import type { CarConfig, VehicleType } from "../shared/types";

const ROAD_ANGLE = -0.39;
const CAB_BLUE = 0x123a59;
const CAB_SIDE = 0x07192a;
const WINDOW_CYAN = 0x7bfaff;
const HEADLIGHT = 0xbfffff;
const TAILLIGHT = 0xff2a73;

export class Car extends Container {
  public requestId: string;
  public method: string;
  public statusCode: number;
  public lane: number;
  public body: Graphics;
  public glow: Graphics;
  public wheelLayer: Container;
  public baseScale: number;
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
    this.wheelLayer = new Container();

    this.drawVehicle(config.vehicleType, config.color, config.scale);
    this.baseScale = this.scale.x;
    this.position.set(config.startX, config.startY);
    this.rotation = ROAD_ANGLE;
    this.alpha = 0;

    this.addChild(this.glow);
    this.addChild(this.body);
    this.addChild(this.wheelLayer);
  }

  private drawVehicle(type: VehicleType, color: number, scale: number) {
    this.scale.set(scale * 0.76);

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

  private drawSedan(color: number) {
    const accent = this.vehicleAccent(color);
    this.drawUnderglow(accent, 48, 16);
    this.drawLowCar(-25, 0, 50, 13, accent, color === 0xff0044 ? 0xff2a73 : 0x53f3ff);
  }

  private drawSportsCar(color: number) {
    const accent = color === 0xff0044 ? 0xff2a73 : this.vehicleAccent(color);
    this.drawUnderglow(accent, 54, 14);
    this.drawLowCar(-28, 0, 56, 12, accent, 0xff2a73);

    const g = this.body;
    g.moveTo(7, -18);
    g.lineTo(24, -11);
    g.lineTo(-2, -8);
    g.closePath();
    g.fill({ color: 0xff2a73, alpha: 0.2 });
  }

  private drawTruck(color: number) {
    const cargo = this.vehicleAccent(color);

    this.drawUnderglow(cargo, 90, 25);
    this.drawCab(-43, 0, 25, 17, color === 0xff0044 ? 0x3a1638 : CAB_BLUE);
    this.drawBox(this.body, -18, 0, 60, 24, 8, cargo, this.darken(cargo, 0.36), this.darken(cargo, 0.24));

    const g = this.body;
    g.rect(-8, -12, 40, 4);
    g.fill({ color: 0xf5ff70, alpha: 0.58 });
    g.rect(-7, -5, 37, 3);
    g.fill({ color: 0xffffff, alpha: 0.18 });
    g.rect(34, -16, 4, 11);
    g.fill({ color: 0x0a1a12, alpha: 0.38 });

    this.drawWheels([-36, -18, 8, 32], 1, 4);
    this.drawLights(-45, -8, 43, -9);
  }

  private drawBus(color: number) {
    const busColor = this.vehicleAccent(color);

    this.drawUnderglow(busColor, 86, 24);
    this.drawBox(this.body, -42, 0, 84, 23, 8, busColor, this.darken(busColor, 0.34), this.darken(busColor, 0.24));

    const g = this.body;
    for (let wx = -31; wx <= 15; wx += 10) {
      g.rect(wx, -17, 6, 6);
      g.fill({ color: WINDOW_CYAN, alpha: 0.55 });
    }
    g.rect(27, -16, 9, 8);
    g.fill({ color: WINDOW_CYAN, alpha: 0.72 });
    g.rect(-30, -6, 52, 3);
    g.fill({ color: 0xffffff, alpha: 0.18 });

    this.drawWheels([-30, 4, 31], 1, 4);
    this.drawLights(-43, -8, 43, -9);
  }

  private drawLowCar(x: number, y: number, width: number, height: number, color: number, roofColor: number) {
    const g = this.body;

    this.drawBox(g, x, y, width, height, 6, color, this.darken(color, 0.35), 0x07101d);
    this.drawBox(g, x + width * 0.34, y - height + 1, width * 0.32, 9, 4, 0x12172a, 0x090d1a, 0x070b16);

    g.rect(x + width * 0.39, y - height - 4, width * 0.18, 4);
    g.fill({ color: WINDOW_CYAN, alpha: 0.66 });
    g.rect(x + width * 0.12, y - 6, width * 0.56, 2);
    g.fill({ color: 0xffffff, alpha: 0.22 });
    g.rect(x + width * 0.08, y - height - 1, width * 0.26, 3);
    g.fill({ color: roofColor, alpha: 0.72 });

    this.drawWheels([x + width * 0.2, x + width * 0.78], y + 1, 3.5);
    this.drawLights(x - 1, y - 6, x + width + 1, y - 7);
  }

  private drawCab(x: number, y: number, width: number, height: number, color: number) {
    const g = this.body;

    this.drawBox(g, x, y, width, height, 6, color, CAB_SIDE, 0x071422);
    g.rect(x + 6, y - height + 4, 9, 7);
    g.fill({ color: WINDOW_CYAN, alpha: 0.72 });
    g.rect(x + width - 8, y - height + 6, 5, 8);
    g.fill({ color: 0x040b14, alpha: 0.55 });
    g.rect(x + 5, y - 5, width - 10, 2);
    g.fill({ color: 0x5ff6ff, alpha: 0.28 });
  }

  private drawBox(
    g: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    depth: number,
    sideColor: number,
    shadeColor: number,
    endColor: number
  ) {
    const roofLift = depth * 0.7;

    g.rect(x, y - height, width, height);
    g.fill({ color: sideColor });

    g.moveTo(x, y - height);
    g.lineTo(x + depth, y - height - roofLift);
    g.lineTo(x + width + depth, y - height - roofLift);
    g.lineTo(x + width, y - height);
    g.closePath();
    g.fill({ color: this.lighten(sideColor, 1.18), alpha: 0.92 });

    g.moveTo(x + width, y - height);
    g.lineTo(x + width + depth, y - height - roofLift);
    g.lineTo(x + width + depth, y - roofLift);
    g.lineTo(x + width, y);
    g.closePath();
    g.fill({ color: endColor, alpha: 0.92 });

    g.moveTo(x, y - height);
    g.lineTo(x + depth, y - height - roofLift);
    g.lineTo(x + width + depth, y - height - roofLift);
    g.lineTo(x + width + depth, y - roofLift);
    g.lineTo(x + width, y);
    g.lineTo(x, y);
    g.closePath();
    g.stroke({ color: 0xb6ffff, alpha: 0.23, width: 1 });

    g.rect(x + 2, y - 2, width - 4, 2);
    g.fill({ color: shadeColor, alpha: 0.68 });
  }

  private drawWheels(xs: number[], y: number, radius: number) {
    const g = this.body;

    for (const x of xs) {
      g.circle(x, y + 1, radius + 2);
      g.fill({ color: 0x00e5ff, alpha: 0.13 });
      g.circle(x, y, radius);
      g.fill({ color: 0x02040a, alpha: 0.96 });
      g.circle(x, y, radius * 0.48);
      g.fill({ color: 0x6ff7ff, alpha: 0.95 });
    }
  }

  private drawLights(frontX: number, frontY: number, rearX: number, rearY: number) {
    const g = this.body;

    g.circle(frontX, frontY, 1.8);
    g.circle(frontX, frontY + 4.5, 1.8);
    g.fill({ color: HEADLIGHT, alpha: 0.96 });
    g.circle(frontX - 2, frontY + 2, 5);
    g.fill({ color: 0x00e5ff, alpha: 0.12 });

    g.circle(rearX, rearY, 1.8);
    g.fill({ color: TAILLIGHT, alpha: 0.88 });
  }

  private drawUnderglow(color: number, width: number, height: number) {
    const g = this.glow;

    g.ellipse(0, height * 0.2, width * 0.5, 7);
    g.fill({ color: 0x000000, alpha: 0.34 });
    g.ellipse(0, height * 0.08, width * 0.55, 9);
    g.fill({ color, alpha: 0.13 });
    g.ellipse(0, height * 0.12, width * 0.34, 4);
    g.fill({ color, alpha: 0.24 });
  }

  private vehicleAccent(color: number): number {
    if (color === 0xff0044) return 0xff2a73;
    if (color === 0xffcc00) return 0xeaff45;
    if (color === 0x222222) return 0x35bfff;
    return 0xcaff33;
  }

  private darken(color: number, factor: number): number {
    const r = ((color >> 16) & 0xff) * factor;
    const g = ((color >> 8) & 0xff) * factor;
    const b = (color & 0xff) * factor;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }

  private lighten(color: number, factor: number): number {
    const r = Math.min(255, ((color >> 16) & 0xff) * factor);
    const g = Math.min(255, ((color >> 8) & 0xff) * factor);
    const b = Math.min(255, (color & 0xff) * factor);
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }
}
