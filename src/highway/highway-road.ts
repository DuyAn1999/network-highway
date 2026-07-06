import { Container, Graphics } from "pixi.js";

// ─── Colors ───

const ROAD_COLOR = 0x070814;
const ROAD_SIDE_COLOR = 0x050612;
const CYAN_EDGE = 0x00e5ff;
const MAGENTA_EDGE = 0xff007a;
const LANE_LINE_COLOR = 0x536277;
const SCAN_LINE_COLOR = 0x13d7ff;

export class HighwayRoad {
  private scanLines: Graphics | null = null;
  private scrollOffset = 0;
  private canvasWidth = 0;
  private canvasHeight = 0;
  private startX = 0;
  private endX = 0;
  private topStartY = 0;
  private topEndY = 0;
  private roadWidth = 0;
  private laneCount = 3;

  build(
    container: Container,
    canvasWidth: number,
    canvasHeight: number,
    roadTopRatio: number,
    roadHeightRatio: number,
    laneCount: number
  ) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.startX = -canvasWidth * 0.14;
    this.endX = canvasWidth + canvasWidth * 0.1;
    this.topStartY = canvasHeight * (roadTopRatio + roadHeightRatio * 0.8);
    this.topEndY = canvasHeight * (roadTopRatio - roadHeightRatio * 0.35);
    this.roadWidth = canvasHeight * roadHeightRatio;
    this.laneCount = laneCount;
    this.scrollOffset = 0;

    // Road shadow/depth, offset downward like the raised roadway in the reference.
    const depth = new Graphics();
    this.drawRoadPolygon(depth, 20, ROAD_SIDE_COLOR, 0.95);
    container.addChild(depth);

    // Main dark isometric road deck.
    const surface = new Graphics();
    this.drawRoadPolygon(surface, 0, ROAD_COLOR, 1);
    container.addChild(surface);

    // Faint lane dividers.
    for (let i = 1; i < laneCount; i++) {
      const offset = (this.roadWidth / laneCount) * i;
      this.drawDashedDiagonalLine(container, offset, LANE_LINE_COLOR, 0.42);
    }

    // Bright cyan and magenta edge rails.
    this.drawSolidDiagonalLine(container, 0, CYAN_EDGE, 1, 3);
    this.drawSolidDiagonalLine(container, this.roadWidth, MAGENTA_EDGE, 0.9, 3);

    // Short moving scan ticks along the edges sell the "data highway" motion.
    this.scanLines = new Graphics();
    container.addChild(this.scanLines);
    this.drawScanLines();
  }

  update(dt: number) {
    this.scrollOffset += dt * 3;
    if (this.scrollOffset > 72) {
      this.scrollOffset -= 72;
    }
    this.drawScanLines();
  }

  // ─── Road geometry ───

  private drawRoadPolygon(gfx: Graphics, yOffset: number, color: number, alpha: number) {
    gfx.moveTo(this.startX, this.topStartY + yOffset);
    gfx.lineTo(this.endX, this.topEndY + yOffset);
    gfx.lineTo(this.endX, this.topEndY + this.roadWidth + yOffset);
    gfx.lineTo(this.startX, this.topStartY + this.roadWidth + yOffset);
    gfx.closePath();
    gfx.fill({ color, alpha });
  }

  private drawSolidDiagonalLine(
    container: Container,
    laneOffset: number,
    color: number,
    alpha: number,
    thickness: number
  ) {
    const gfx = new Graphics();
    const glow = new Graphics();
    const y1 = this.topStartY + laneOffset;
    const y2 = this.topEndY + laneOffset;

    glow.moveTo(this.startX, y1);
    glow.lineTo(this.endX, y2);
    glow.stroke({ color, alpha: alpha * 0.22, width: thickness + 8 });
    container.addChild(glow);

    gfx.moveTo(this.startX, y1);
    gfx.lineTo(this.endX, y2);
    gfx.stroke({ color, alpha, width: thickness });
    container.addChild(gfx);
  }

  // ─── Dashed perspective lane dividers ───

  private drawDashedDiagonalLine(
    container: Container,
    laneOffset: number,
    color: number,
    alpha: number
  ) {
    const dashLength = 30;
    const gapLength = 28;
    const gfx = new Graphics();
    const glow = new Graphics();
    const roadDx = this.endX - this.startX;
    const roadDy = this.topEndY - this.topStartY;
    const roadLength = Math.hypot(roadDx, roadDy);
    const ux = roadDx / roadLength;
    const uy = roadDy / roadLength;
    let d = 18;

    while (d < roadLength - 18) {
      const sx = this.startX + ux * d;
      const sy = this.topStartY + laneOffset + uy * d;
      const ex = this.startX + ux * Math.min(d + dashLength, roadLength);
      const ey = this.topStartY + laneOffset + uy * Math.min(d + dashLength, roadLength);

      glow.moveTo(sx, sy);
      glow.lineTo(ex, ey);
      glow.stroke({ color, alpha: alpha * 0.14, width: 6 });

      gfx.moveTo(sx, sy);
      gfx.lineTo(ex, ey);
      gfx.stroke({ color, alpha, width: 1 });

      d += dashLength + gapLength;
    }

    container.addChild(glow);
    container.addChild(gfx);
  }

  // ─── Scrolling scan ticks ───

  private drawScanLines() {
    if (!this.scanLines) return;

    this.scanLines.clear();

    const spacing = 72;
    const offset = this.scrollOffset;
    const roadDx = this.endX - this.startX;
    const roadDy = this.topEndY - this.topStartY;
    const roadLength = Math.hypot(roadDx, roadDy);
    const ux = roadDx / roadLength;
    const uy = roadDy / roadLength;

    for (let d = -spacing + offset; d < roadLength + spacing; d += spacing) {
      const edgeOffsets = [0, this.roadWidth];
      for (const laneOffset of edgeOffsets) {
        const x = this.startX + ux * d;
        const y = this.topStartY + laneOffset + uy * d;
        const tickLength = 18;
        this.scanLines.moveTo(x, y);
        this.scanLines.lineTo(x + ux * tickLength, y + uy * tickLength);
        this.scanLines.stroke({
          color: laneOffset === 0 ? SCAN_LINE_COLOR : MAGENTA_EDGE,
          alpha: 0.55,
          width: 2,
        });
      }
    }
  }
}
