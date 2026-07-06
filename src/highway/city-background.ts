import { Container, Graphics, Texture, Sprite } from "pixi.js";

// ─── Synthwave color palette ───

const SKY_STOPS: [number, string][] = [
  [0.0, "#03030b"],
  [0.35, "#050718"],
  [0.58, "#080a1f"],
  [0.78, "#130820"],
  [1.0, "#05040c"],
];

const NEON_COLORS = [0xff007a, 0x00e5ff, 0x7b1cff, 0xcaff33];

// ─── Building layer configs ───

interface BuildingLayerConfig {
  yStartRatio: number; // where buildings start (fraction of height)
  yEndRatio: number; // where buildings end
  minBuildings: number;
  maxBuildings: number;
  minBuildingHeight: number;
  maxBuildingHeight: number;
  minBuildingWidth: number;
  maxBuildingWidth: number;
  frontColor: number;
  topColor: number;
  sideColor: number;
  windowAlpha: number; // brightness of windows
  windowDensity: number; // probability a window slot is lit
  depthScale: number; // isometric depth offset multiplier
}

const LAYER_CONFIGS: BuildingLayerConfig[] = [
  {
    // Far layer — small, dark silhouettes
    yStartRatio: 0.30,
    yEndRatio: 0.50,
    minBuildings: 12,
    maxBuildings: 18,
    minBuildingHeight: 30,
    maxBuildingHeight: 80,
    minBuildingWidth: 20,
    maxBuildingWidth: 50,
    frontColor: 0x050711,
    topColor: 0x080b18,
    sideColor: 0x060816,
    windowAlpha: 0.22,
    windowDensity: 0.2,
    depthScale: 0.3,
  },
  {
    // Mid layer — medium, some neon
    yStartRatio: 0.35,
    yEndRatio: 0.55,
    minBuildings: 8,
    maxBuildings: 14,
    minBuildingHeight: 50,
    maxBuildingHeight: 120,
    minBuildingWidth: 30,
    maxBuildingWidth: 70,
    frontColor: 0x060816,
    topColor: 0x0b1022,
    sideColor: 0x080c1d,
    windowAlpha: 0.45,
    windowDensity: 0.35,
    depthScale: 0.5,
  },
  {
    // Near layer — tall, bright neon
    yStartRatio: 0.38,
    yEndRatio: 0.60,
    minBuildings: 6,
    maxBuildings: 10,
    minBuildingHeight: 80,
    maxBuildingHeight: 180,
    minBuildingWidth: 40,
    maxBuildingWidth: 90,
    frontColor: 0x070a18,
    topColor: 0x0d1228,
    sideColor: 0x0a0f22,
    windowAlpha: 0.7,
    windowDensity: 0.45,
    depthScale: 0.7,
  },
];

export class CityBackground {
  private stars: { graphic: Graphics; baseAlpha: number; speed: number }[] = [];
  private windows: { graphic: Graphics; baseAlpha: number; flickerRate: number }[] = [];
  private starContainer = new Container();
  private windowContainer = new Container();
  private frameCount = 0;

  build(container: Container, width: number, height: number) {
    // 1. Sky gradient
    const skyTexture = this.createGradientTexture(width, height * 0.62);
    const skySprite = new Sprite(skyTexture);
    skySprite.position.set(0, 0);
    container.addChild(skySprite);

    // 2. Star field
    this.createStars(this.starContainer, width, height);
    container.addChild(this.starContainer);

    // 3. Building layers (far → near)
    for (const config of LAYER_CONFIGS) {
      const layerGfx = new Graphics();
      this.drawBuildingLayer(layerGfx, width, height, config);
      container.addChild(layerGfx);
    }

    // 4. Neon sign strip at horizon
    const horizonY = height * 0.58;
    const horizonGlow = new Graphics();
    horizonGlow.rect(0, horizonY - 3, width, 6);
    horizonGlow.fill({ color: 0x00e5ff, alpha: 0.18 });
    container.addChild(horizonGlow);

    horizonGlow.rect(0, horizonY - 1, width, 2);
    horizonGlow.fill({ color: 0x00e5ff, alpha: 0.55 });
    container.addChild(horizonGlow);

    // 5. Twinkling windows (on top of everything)
    container.addChild(this.windowContainer);
  }

  update(dt: number) {
    this.frameCount++;

    // Twinkle windows every 4th frame
    if (this.frameCount % 4 === 0) {
      for (const w of this.windows) {
        if (Math.random() < w.flickerRate) {
          w.graphic.alpha = w.baseAlpha * (0.5 + Math.random() * 0.5);
        }
      }
    }

    // Drift stars slowly
    for (const star of this.stars) {
      star.graphic.y += star.speed * dt;
      if (star.graphic.y > 400) {
        star.graphic.y = 0;
        star.graphic.x = Math.random() * 2000;
      }
    }
  }

  // ─── Sky gradient (offscreen canvas → Texture) ───

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

    return Texture.from(canvas);
  }

  // ─── Star field ───

  private createStars(container: Container, width: number, height: number) {
    const starCount = 60;
    const starGfx = new Graphics();

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height * 0.5;
      const radius = 0.5 + Math.random() * 1.5;
      const alpha = 0.3 + Math.random() * 0.7;

      starGfx.circle(x, y, radius);
      starGfx.fill({ color: 0xffffff, alpha });

      this.stars.push({
        graphic: starGfx,
        baseAlpha: alpha,
        speed: 0.02 + Math.random() * 0.05,
      });
    }

    container.addChild(starGfx);
  }

  // ─── Procedural isometric buildings ───

  private drawBuildingLayer(
    gfx: Graphics,
    canvasWidth: number,
    canvasHeight: number,
    config: BuildingLayerConfig
  ) {
    const yStart = canvasHeight * config.yStartRatio;
    const yEnd = canvasHeight * config.yEndRatio;

    const buildingCount =
      config.minBuildings +
      Math.floor(
        Math.random() * (config.maxBuildings - config.minBuildings + 1)
      );

    // Distribute buildings across the width
    const gapMin = 2;
    const gapMax = 8;
    const totalGap = gapMin * (buildingCount + 1);
    const availableWidth = canvasWidth - totalGap;
    let xCursor = gapMin;

    for (let i = 0; i < buildingCount; i++) {
      const bWidth =
        config.minBuildingWidth +
        Math.random() * (config.maxBuildingWidth - config.minBuildingWidth);
      const bHeight =
        config.minBuildingHeight +
        Math.random() * (config.maxBuildingHeight - config.minBuildingHeight);

      // Buildings sit on the ground line (yEnd), extending upward
      const bX = xCursor;
      const bY = yEnd - bHeight;

      this.drawIsometricBuilding(gfx, bX, bY, bWidth, bHeight, config);

      // Random gap between buildings
      const gap = gapMin + Math.random() * (gapMax - gapMin);
      xCursor += bWidth + gap;

      // If we've gone past the width, wrap or stop
      if (xCursor > canvasWidth + 50) break;
    }
  }

  private drawIsometricBuilding(
    gfx: Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    config: BuildingLayerConfig
  ) {
    const depth = width * config.depthScale;
    const topOffset = depth * 0.5;
    const rightOffset = depth * 0.7;

    // Front face (darkest)
    gfx.rect(x, y, width, height);
    gfx.fill({ color: config.frontColor });

    // Top face (parallelogram, lighter)
    gfx.moveTo(x, y);
    gfx.lineTo(x + rightOffset, y - topOffset);
    gfx.lineTo(x + width + rightOffset, y - topOffset);
    gfx.lineTo(x + width, y);
    gfx.closePath();
    gfx.fill({ color: config.topColor });

    // Right side face (medium)
    gfx.moveTo(x + width, y);
    gfx.lineTo(x + width + rightOffset, y - topOffset);
    gfx.lineTo(x + width + rightOffset, y + height - topOffset);
    gfx.lineTo(x + width, y + height);
    gfx.closePath();
    gfx.fill({ color: config.sideColor });

    const outlineColor =
      NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
    const outlineAlpha = 0.18 + config.windowAlpha * 0.22;

    gfx.moveTo(x, y);
    gfx.lineTo(x + rightOffset, y - topOffset);
    gfx.lineTo(x + width + rightOffset, y - topOffset);
    gfx.lineTo(x + width + rightOffset, y + height - topOffset);
    gfx.lineTo(x + width, y + height);
    gfx.lineTo(x, y + height);
    gfx.lineTo(x, y);
    gfx.lineTo(x + width, y);
    gfx.lineTo(x + width + rightOffset, y - topOffset);
    gfx.moveTo(x + width, y);
    gfx.lineTo(x + width, y + height);
    gfx.stroke({ color: outlineColor, alpha: outlineAlpha, width: 1 });

    // Neon windows on the front face
    const windowWidth = 5;
    const windowHeight = 7;
    const hSpacing = 11;
    const vSpacing = 13;
    const padding = 6;

    for (let wy = y + padding; wy < y + height - padding; wy += vSpacing) {
      for (let wx = x + padding; wx < x + width - padding; wx += hSpacing) {
        if (Math.random() < config.windowDensity) {
          const neonColor =
            NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
          const alpha = config.windowAlpha * (0.6 + Math.random() * 0.4);

          gfx.rect(wx, wy, windowWidth, windowHeight);
          gfx.fill({ color: neonColor, alpha });

          // Track for twinkling
          this.windows.push({
            graphic: gfx,
            baseAlpha: alpha,
            flickerRate: 0.01 + Math.random() * 0.03,
          });
        }
      }
    }

    // Occasional neon sign strip on near buildings
    if (config.depthScale > 0.5 && Math.random() < 0.3) {
      const signColor =
        NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
      const signY = y + Math.random() * (height * 0.4);
      const signHeight = 3;

      // Glow layer
      gfx.rect(x - 1, signY - 2, width + 2, signHeight + 4);
      gfx.fill({ color: signColor, alpha: 0.15 });
      // Bright layer
      gfx.rect(x, signY, width, signHeight);
      gfx.fill({ color: signColor, alpha: 0.7 });
    }
  }
}
