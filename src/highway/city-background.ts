import { Container, Graphics, Sprite, Texture } from "pixi.js";
import {
  createRoadGeometry,
  lerpPoint,
  type Point2D,
  type RoadGeometry,
} from "./road-model";

const SKY_STOPS: [number, string][] = [
  [0, "#02030a"],
  [0.34, "#040616"],
  [0.62, "#060817"],
  [0.82, "#05040d"],
  [1, "#020208"],
];

const NEON_COLORS = [0x00e5ff, 0xff007a, 0x6a18ff, 0xcaff33, 0x1df7a0];

interface BuildingStyle {
  minWidth: number;
  maxWidth: number;
  minHeight: number;
  maxHeight: number;
  frontColor: number;
  sideColor: number;
  topColor: number;
  depthScale: number;
  fillAlpha: number;
  outlineAlpha: number;
  windowAlpha: number;
  windowDensity: number;
}

interface TowerSpec {
  base: Point2D;
  width: number;
  height: number;
  style: BuildingStyle;
  accentColor: number;
}

const FAR_STYLE: BuildingStyle = {
  minWidth: 26,
  maxWidth: 62,
  minHeight: 72,
  maxHeight: 260,
  frontColor: 0x04060f,
  sideColor: 0x03050d,
  topColor: 0x070a16,
  depthScale: 0.48,
  fillAlpha: 0.78,
  outlineAlpha: 0.14,
  windowAlpha: 0.24,
  windowDensity: 0.2,
};

const MID_STYLE: BuildingStyle = {
  minWidth: 34,
  maxWidth: 78,
  minHeight: 96,
  maxHeight: 300,
  frontColor: 0x050711,
  sideColor: 0x040713,
  topColor: 0x0a0d1d,
  depthScale: 0.54,
  fillAlpha: 0.84,
  outlineAlpha: 0.24,
  windowAlpha: 0.36,
  windowDensity: 0.27,
};

const NEAR_STYLE: BuildingStyle = {
  minWidth: 42,
  maxWidth: 94,
  minHeight: 105,
  maxHeight: 330,
  frontColor: 0x060813,
  sideColor: 0x050712,
  topColor: 0x0c1021,
  depthScale: 0.6,
  fillAlpha: 0.9,
  outlineAlpha: 0.34,
  windowAlpha: 0.48,
  windowDensity: 0.32,
};

export class CityBackground {
  private particles: { graphic: Graphics; speed: number; wrapY: number }[] = [];
  private flickers: { graphic: Graphics; baseAlpha: number; flickerRate: number }[] = [];
  private particleContainer = new Container();
  private flickerContainer = new Container();
  private frameCount = 0;
  private seed = 1;

  build(container: Container, width: number, height: number) {
    this.reset(width, height);

    const road = createRoadGeometry(width, height, 3);
    const skyTexture = this.createGradientTexture(width, height);
    const skySprite = new Sprite(skyTexture);
    container.addChild(skySprite);

    const floor = new Graphics();
    this.drawDataFloor(floor, width, height, road);
    container.addChild(floor);

    this.createDataParticles(this.particleContainer, width, height);
    container.addChild(this.particleContainer);

    const farCity = new Graphics();
    this.drawDistantDistrict(farCity, width, height);
    container.addChild(farCity);

    const upperCity = new Graphics();
    this.drawRoadsideDistrict(upperCity, road, "upper", MID_STYLE, 24, 0.02, 0.98);
    container.addChild(upperCity);

    const lowerCity = new Graphics();
    this.drawRoadsideDistrict(lowerCity, road, "lower", NEAR_STYLE, 18, 0.04, 0.9);
    container.addChild(lowerCity);

    const haze = new Graphics();
    this.drawHorizonHaze(haze, width, height);
    container.addChild(haze);

    container.addChild(this.flickerContainer);
  }

  update(dt: number) {
    this.frameCount++;

    for (const particle of this.particles) {
      particle.graphic.y += particle.speed * dt;
      if (particle.graphic.y > particle.wrapY) {
        particle.graphic.y = -8;
      }
    }

    if (this.frameCount % 5 !== 0) return;

    for (const flicker of this.flickers) {
      if (this.rand() < flicker.flickerRate) {
        flicker.graphic.alpha = flicker.baseAlpha * (0.48 + this.rand() * 0.52);
      }
    }
  }

  private reset(width: number, height: number) {
    this.particles = [];
    this.flickers = [];
    this.particleContainer.removeChildren();
    this.flickerContainer.removeChildren();
    this.frameCount = 0;
    this.seed = (Math.floor(width) * 73856093) ^ (Math.floor(height) * 19349663) ^ 0x9e3779b9;
    this.seed >>>= 0;
  }

  private createGradientTexture(width: number, height: number): Texture {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.floor(width));
    canvas.height = Math.max(1, Math.floor(height));
    const ctx = canvas.getContext("2d")!;

    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    for (const [offset, color] of SKY_STOPS) {
      gradient.addColorStop(offset, color);
    }
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const sideGlow = ctx.createRadialGradient(
      canvas.width * 0.85,
      canvas.height * 0.48,
      0,
      canvas.width * 0.85,
      canvas.height * 0.48,
      canvas.width * 0.62
    );
    sideGlow.addColorStop(0, "rgba(0, 229, 255, 0.08)");
    sideGlow.addColorStop(0.38, "rgba(255, 0, 122, 0.035)");
    sideGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = sideGlow;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    return Texture.from(canvas);
  }

  private drawDataFloor(gfx: Graphics, width: number, height: number, road: RoadGeometry) {
    const horizonY = height * 0.28;

    for (let y = horizonY; y < height * 1.08; y += 54) {
      gfx.moveTo(-width * 0.08, y);
      gfx.lineTo(width * 1.08, y - height * 0.22);
      gfx.stroke({ color: 0x09253a, alpha: 0.12, width: 1 });
    }

    for (let offset = -width * 0.55; offset < width * 1.2; offset += 92) {
      const start = {
        x: offset,
        y: height * 1.04,
      };
      const end = {
        x: offset + width * 0.46,
        y: horizonY,
      };
      gfx.moveTo(start.x, start.y);
      gfx.lineTo(end.x, end.y);
      gfx.stroke({ color: 0x2e0f4f, alpha: 0.1, width: 1 });
    }

    const upperA = lerpPoint(road.upperStart, road.upperEnd, 0.03);
    const upperB = lerpPoint(road.upperStart, road.upperEnd, 0.98);
    gfx.moveTo(upperA.x, upperA.y - 70);
    gfx.lineTo(upperB.x, upperB.y - 48);
    gfx.stroke({ color: 0x00e5ff, alpha: 0.08, width: 7 });
  }

  private createDataParticles(container: Container, width: number, height: number) {
    const count = Math.max(28, Math.floor(width / 28));

    for (let i = 0; i < count; i++) {
      const particle = new Graphics();
      const color = this.rand() < 0.62 ? 0x00e5ff : 0xff007a;
      const size = 0.7 + this.rand() * 1.6;
      particle.circle(0, 0, size);
      particle.fill({ color, alpha: 0.16 + this.rand() * 0.2 });
      particle.position.set(this.rand() * width, this.rand() * height * 0.72);
      container.addChild(particle);
      this.particles.push({
        graphic: particle,
        speed: 0.018 + this.rand() * 0.04,
        wrapY: height * 0.74,
      });
    }
  }

  private drawDistantDistrict(gfx: Graphics, width: number, height: number) {
    const specs: TowerSpec[] = [];
    const rows = [
      { count: Math.max(9, Math.floor(width / 150)), baseY: height * 0.52, style: FAR_STYLE },
      { count: Math.max(11, Math.floor(width / 125)), baseY: height * 0.64, style: MID_STYLE },
    ];

    for (const row of rows) {
      for (let i = 0; i < row.count; i++) {
        const t = row.count === 1 ? 0.5 : i / (row.count - 1);
        const x = width * (-0.02 + t * 1.08) + this.between(-30, 30);
        const baseY = row.baseY + this.between(-34, 36);
        const scale = row.baseY < height * 0.56 ? 0.72 : 0.9;
        specs.push(this.createTowerSpec({ x, y: baseY }, row.style, scale));
      }
    }

    specs.sort((a, b) => a.base.y - b.base.y);
    for (const spec of specs) {
      this.drawTower(gfx, spec);
    }
  }

  private drawRoadsideDistrict(
    gfx: Graphics,
    road: RoadGeometry,
    side: "upper" | "lower",
    style: BuildingStyle,
    count: number,
    progressStart: number,
    progressEnd: number
  ) {
    const specs: TowerSpec[] = [];
    const edgeStart = side === "upper" ? road.upperStart : road.lowerStart;
    const edgeEnd = side === "upper" ? road.upperEnd : road.lowerEnd;
    const sideSign = side === "upper" ? -1 : 1;

    for (let i = 0; i < count; i++) {
      const tBase = count === 1 ? 0.5 : i / (count - 1);
      const progress = progressStart + (progressEnd - progressStart) * tBase + this.between(-0.025, 0.025);
      const edge = lerpPoint(edgeStart, edgeEnd, progress);
      const nearScale = 1.18 - progress * 0.48;
      const districtDepth = side === "upper" ? this.between(70, 275) : this.between(54, 170);
      const base = {
        x: edge.x + road.normal.x * sideSign * districtDepth + this.between(-18, 18),
        y: edge.y + road.normal.y * sideSign * districtDepth + this.between(-16, 18),
      };

      specs.push(this.createTowerSpec(base, style, nearScale));

      if (this.rand() < 0.38) {
        const secondBase = {
          x: base.x + road.normal.x * sideSign * this.between(42, 96) + this.between(-12, 12),
          y: base.y + road.normal.y * sideSign * this.between(42, 96) + this.between(-12, 12),
        };
        specs.push(this.createTowerSpec(secondBase, side === "upper" ? FAR_STYLE : MID_STYLE, nearScale * 0.78));
      }
    }

    specs.sort((a, b) => a.base.y - b.base.y);
    for (const spec of specs) {
      this.drawTower(gfx, spec);
    }
  }

  private createTowerSpec(base: Point2D, style: BuildingStyle, scale: number): TowerSpec {
    const width = this.between(style.minWidth, style.maxWidth) * scale;
    const height = this.between(style.minHeight, style.maxHeight) * scale;

    return {
      base,
      width,
      height,
      style,
      accentColor: NEON_COLORS[Math.floor(this.rand() * NEON_COLORS.length)],
    };
  }

  private drawTower(gfx: Graphics, spec: TowerSpec) {
    const { base, width, height, style, accentColor } = spec;
    const x = base.x - width * 0.5;
    const y = base.y - height;
    const depthX = width * style.depthScale;
    const depthY = -width * style.depthScale * 0.46;

    gfx.rect(x, y, width, height);
    gfx.fill({ color: style.frontColor, alpha: style.fillAlpha });

    gfx.moveTo(x + width, y);
    gfx.lineTo(x + width + depthX, y + depthY);
    gfx.lineTo(x + width + depthX, y + height + depthY);
    gfx.lineTo(x + width, y + height);
    gfx.closePath();
    gfx.fill({ color: style.sideColor, alpha: style.fillAlpha * 0.92 });

    gfx.moveTo(x, y);
    gfx.lineTo(x + depthX, y + depthY);
    gfx.lineTo(x + width + depthX, y + depthY);
    gfx.lineTo(x + width, y);
    gfx.closePath();
    gfx.fill({ color: style.topColor, alpha: style.fillAlpha });

    this.drawTowerOutline(gfx, x, y, width, height, depthX, depthY, accentColor, style.outlineAlpha);
    this.drawTowerWindows(gfx, x, y, width, height, style, accentColor);
    this.drawTowerDetails(gfx, x, y, width, height, depthX, depthY, style, accentColor);
  }

  private drawTowerOutline(
    gfx: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    depthX: number,
    depthY: number,
    color: number,
    alpha: number
  ) {
    gfx.moveTo(x, y);
    gfx.lineTo(x + depthX, y + depthY);
    gfx.lineTo(x + width + depthX, y + depthY);
    gfx.lineTo(x + width + depthX, y + height + depthY);
    gfx.lineTo(x + width, y + height);
    gfx.lineTo(x, y + height);
    gfx.lineTo(x, y);
    gfx.lineTo(x + width, y);
    gfx.lineTo(x + width + depthX, y + depthY);
    gfx.moveTo(x + width, y);
    gfx.lineTo(x + width, y + height);
    gfx.stroke({ color, alpha, width: 1 });

    gfx.moveTo(x + 1, y + height);
    gfx.lineTo(x + width + 1, y + height);
    gfx.stroke({ color, alpha: alpha * 0.45, width: 2 });
  }

  private drawTowerWindows(
    gfx: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    style: BuildingStyle,
    accentColor: number
  ) {
    const windowW = Math.max(2, Math.min(4, width * 0.075));
    const windowH = Math.max(3, Math.min(7, height * 0.035));
    const gapX = Math.max(8, width * 0.2);
    const gapY = Math.max(12, height * 0.085);
    const padX = Math.max(6, width * 0.12);
    const padY = Math.max(8, height * 0.08);

    for (let wy = y + padY; wy < y + height - padY; wy += gapY) {
      for (let wx = x + padX; wx < x + width - padX; wx += gapX) {
        if (this.rand() > style.windowDensity) continue;

        const color = this.rand() < 0.7 ? accentColor : 0x00e5ff;
        const alpha = style.windowAlpha * (0.48 + this.rand() * 0.52);
        gfx.rect(wx, wy, windowW, windowH);
        gfx.fill({ color, alpha });

        if (this.rand() < 0.045) {
          this.addFlicker(wx, wy, windowW, windowH, color, alpha);
        }
      }
    }
  }

  private drawTowerDetails(
    gfx: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    depthX: number,
    depthY: number,
    style: BuildingStyle,
    accentColor: number
  ) {
    if (height > style.maxHeight * 0.62 && this.rand() < 0.7) {
      const antennaX = x + width * (0.48 + this.between(-0.12, 0.12)) + depthX * 0.35;
      const antennaY = y + depthY * 0.55;
      gfx.moveTo(antennaX, antennaY);
      gfx.lineTo(antennaX, antennaY - this.between(10, 22));
      gfx.stroke({ color: accentColor, alpha: style.outlineAlpha * 0.75, width: 1 });
      gfx.circle(antennaX, antennaY - 1, 2);
      gfx.fill({ color: 0xff2a5f, alpha: 0.48 });
    }

    if (this.rand() < 0.24) {
      const signY = y + this.between(height * 0.18, height * 0.58);
      gfx.rect(x + 2, signY, width - 4, 2);
      gfx.fill({ color: accentColor, alpha: style.windowAlpha * 0.65 });
      gfx.rect(x + 2, signY - 2, width - 4, 6);
      gfx.fill({ color: accentColor, alpha: style.windowAlpha * 0.09 });
    }
  }

  private drawHorizonHaze(gfx: Graphics, width: number, height: number) {
    const y = height * 0.59;
    gfx.rect(0, y - 2, width, 4);
    gfx.fill({ color: 0x00e5ff, alpha: 0.06 });
    gfx.rect(0, y + 2, width, 2);
    gfx.fill({ color: 0xff007a, alpha: 0.035 });
  }

  private addFlicker(x: number, y: number, width: number, height: number, color: number, alpha: number) {
    const light = new Graphics();
    light.rect(x, y, width, height);
    light.fill({ color, alpha });
    this.flickerContainer.addChild(light);
    this.flickers.push({
      graphic: light,
      baseAlpha: alpha,
      flickerRate: 0.025 + this.rand() * 0.045,
    });
  }

  private between(min: number, max: number): number {
    return min + (max - min) * this.rand();
  }

  private rand(): number {
    this.seed += 0x6d2b79f5;
    let t = this.seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
}
