import { Container, Graphics } from "pixi.js";
import type { CarConfig, VehicleType } from "../shared/types";

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
    this.rotation = Math.PI - 0.41;
    this.alpha = 0;

    this.addChild(this.glow);
    this.addChild(this.body);
    this.addChild(this.wheelLayer);
  }

  private drawVehicle(type: VehicleType, color: number, scale: number) {
    this.scale.set(scale * 0.9);

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
    this.drawUnderglow(color, 44, 16);
    this.drawLowVehicle(44, 15, 7, color, 0x121a2d);
  }

  private drawSportsCar(color: number) {
    this.drawUnderglow(color, 48, 14);
    this.drawLowVehicle(48, 13, 6, color, 0x171025);

    const g = this.body;
    g.moveTo(0, -13);
    g.lineTo(13, -6);
    g.lineTo(-9, -4);
    g.closePath();
    g.fill({ color: 0xff007a, alpha: 0.28 });
  }

  private drawTruck(color: number) {
    const g = this.body;
    const cargoColor = this.brightCargoColor(color);

    this.drawUnderglow(cargoColor, 82, 24);
    this.drawIsoBox(g, -41, -17, 58, 27, 11, cargoColor, this.darken(cargoColor, 0.34), 0x102318);
    this.drawIsoBox(g, 14, -10, 29, 21, 8, 0x163a5f, 0x0b2138, 0x091a2d);

    g.rect(-31, -3, 38, 4);
    g.fill({ color: 0xf2ff5a, alpha: 0.48 });
    g.rect(-29, 5, 35, 3);
    g.fill({ color: 0xffffff, alpha: 0.18 });
    g.rect(20, -7, 11, 7);
    g.fill({ color: 0x79faff, alpha: 0.7 });
    g.rect(31, -4, 7, 9);
    g.fill({ color: 0x031021, alpha: 0.75 });
    g.rect(17, 7, 20, 3);
    g.fill({ color: 0x00e5ff, alpha: 0.18 });

    this.drawWheels([-31, -7, 20, 36], 13, 5.4);
    this.drawLights(43, -3, -41);
  }

  private drawBus(color: number) {
    const g = this.body;
    const busColor = this.brightCargoColor(color);

    this.drawUnderglow(busColor, 78, 23);
    this.drawIsoBox(g, -39, -16, 78, 25, 10, busColor, this.darken(busColor, 0.36), 0x102518);

    for (let wx = -29; wx < 20; wx += 10) {
      g.rect(wx, -7, 6, 6);
      g.fill({ color: 0x75f8ff, alpha: 0.5 });
    }
    g.rect(25, -6, 8, 8);
    g.fill({ color: 0x75f8ff, alpha: 0.72 });
    g.rect(-30, 5, 48, 3);
    g.fill({ color: 0xffffff, alpha: 0.18 });

    this.drawWheels([-27, 7, 30], 12, 5.2);
    this.drawLights(39, -2, -39);
  }

  private drawLowVehicle(width: number, height: number, depth: number, color: number, cabinColor: number) {
    const g = this.body;
    const x = -width * 0.5;
    const y = -height * 0.5;
    const sideColor = this.darken(color, 0.36);

    this.drawIsoBox(g, x, y, width, height, depth, color, sideColor, 0x080b16);
    this.drawIsoBox(g, x + width * 0.34, y - 8, width * 0.33, 10, 4, cabinColor, 0x0a1021, 0x08101e);

    g.rect(x + width * 0.12, y + height - 5, width * 0.68, 3);
    g.fill({ color: this.darken(color, 0.24), alpha: 0.82 });
    g.rect(x + width * 0.4, y - 5, width * 0.18, 4);
    g.fill({ color: 0x72fbff, alpha: 0.66 });
    g.rect(x + width * 0.08, y + 4, width * 0.62, 2);
    g.fill({ color: 0xffffff, alpha: 0.24 });
    g.rect(x + width * 0.16, y + 8, width * 0.34, 2);
    g.fill({ color: 0x00e5ff, alpha: 0.22 });

    this.drawWheels([x + width * 0.2, x + width * 0.78], y + height + 2, 4.5);
    this.drawLights(x + width, y + 3, x);
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

    g.moveTo(x + depth, y);
    g.lineTo(x + width, y);
    g.lineTo(x + width, y + height - depth);
    g.lineTo(x + width - depth, y + height);
    g.lineTo(x, y + height - depth);
    g.lineTo(x, y + depth);
    g.closePath();
    g.stroke({ color: 0xb9ffff, alpha: 0.22, width: 1 });

    g.moveTo(x + depth + 3, y + 3);
    g.lineTo(x + width - 5, y + 3);
    g.stroke({ color: 0xffffff, alpha: 0.18, width: 1 });
  }

  private drawWheels(xs: number[], y: number, radius: number) {
    for (const x of xs) {
      const wheel = new Graphics();
      wheel.position.set(x, y);
      wheel.ellipse(0, 0, radius + 2.3, radius * 0.72);
      wheel.fill({ color: 0x00e5ff, alpha: 0.16 });
      wheel.ellipse(0, 0, radius, radius * 0.55);
      wheel.fill({ color: 0x02040a });
      wheel.circle(0, 0, radius * 0.45);
      wheel.fill({ color: 0x54efff, alpha: 0.95 });
      wheel.rect(-radius * 0.8, -0.5, radius * 1.6, 1);
      wheel.rect(-0.5, -radius * 0.8, 1, radius * 1.6);
      wheel.fill({ color: 0xdbffff, alpha: 0.62 });
      this.wheelLayer.addChild(wheel);
    }
  }

  private drawLights(frontX: number, y: number, tailX: number) {
    const g = this.body;

    g.circle(frontX, y, 2.2);
    g.circle(frontX, y + 5.8, 2.2);
    g.fill({ color: 0xb8ffff, alpha: 0.96 });
    g.circle(frontX + 2, y + 2.5, 6);
    g.fill({ color: 0x00e5ff, alpha: 0.14 });

    g.circle(tailX, y + 4, 2);
    g.fill({ color: 0xff007a, alpha: 0.88 });
  }

  private drawUnderglow(color: number, width: number, height: number) {
    const g = this.glow;

    g.ellipse(0, height * 0.48, width * 0.48, 7);
    g.fill({ color: 0x000000, alpha: 0.36 });
    g.ellipse(0, height * 0.38, width * 0.56, 10);
    g.fill({ color, alpha: 0.13 });
    g.ellipse(0, height * 0.42, width * 0.34, 4);
    g.fill({ color, alpha: 0.26 });
  }

  private brightCargoColor(color: number): number {
    if (color === 0xff0044) return 0xff1270;
    if (color === 0xffcc00) return 0xe7ff35;
    if (color === 0x222222) return 0x18a7ff;
    return 0xcaff33;
  }

  private darken(color: number, factor: number): number {
    const r = ((color >> 16) & 0xff) * factor;
    const g = ((color >> 8) & 0xff) * factor;
    const b = (color & 0xff) * factor;
    return (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
  }
}
