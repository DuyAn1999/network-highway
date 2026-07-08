import { Container, Graphics } from "pixi.js";
import {
  createRoadGeometry,
  interpolateRoadPoint,
  type RoadGeometry,
} from "./road-model";

// ─── Colors ───

const ROAD_COLOR = 0x050711;
const ROAD_INNER_COLOR = 0x090d19;
const ROAD_SIDE_COLOR = 0x03040b;
const CYAN_EDGE = 0x00e5ff;
const MAGENTA_EDGE = 0xff007a;
const LANE_LINE_COLOR = 0x5a6c86;
const SCAN_LINE_COLOR = 0x13d7ff;
const DATA_AMBER = 0xe5ff33;

export class HighwayRoad {
  private scanLines: Graphics | null = null;
  private scrollOffset = 0;
  private road: RoadGeometry | null = null;
  private laneCount = 3;

  build(
    container: Container,
    canvasWidth: number,
    canvasHeight: number,
    roadTopRatio: number,
    roadHeightRatio: number,
    laneCount: number
  ) {
    this.laneCount = laneCount;
    this.scrollOffset = 0;
    this.road = createRoadGeometry(canvasWidth, canvasHeight, laneCount);

    const shadow = new Graphics();
    this.drawDeckShadow(shadow);
    container.addChild(shadow);

    // Raised underside and shadow make the roadway feel like a 3D slab.
    const underside = new Graphics();
    this.drawRoadUnderside(underside);
    container.addChild(underside);

    // Main dark isometric road deck.
    const surface = new Graphics();
    this.drawRoadPolygon(surface, 0, ROAD_COLOR, 1);
    this.drawInsetDeck(surface);
    this.drawRoadTexture(surface);
    this.drawRoadBevels(surface);
    container.addChild(surface);

    // Faint lane dividers and packet trails.
    for (let i = 1; i < laneCount; i++) {
      const fraction = i / laneCount;
      this.drawDashedDiagonalLine(container, fraction, LANE_LINE_COLOR, 0.26);
    }
    this.drawDataLane(container, 0.58, DATA_AMBER, 0.08, 12);

    // Bright cyan and magenta edge rails.
    this.drawSolidDiagonalLine(container, 0, CYAN_EDGE, 0.98, 3);
    this.drawSolidDiagonalLine(container, 1, MAGENTA_EDGE, 0.92, 3);
    this.drawEdgePosts(container, 0, CYAN_EDGE);
    this.drawEdgePosts(container, 1, MAGENTA_EDGE);

    // Short moving scan ticks along the edges sell the "data highway" motion.
    this.scanLines = new Graphics();
    container.addChild(this.scanLines);
    this.drawScanLines();
  }

  update(dt: number) {
    this.scrollOffset += dt * 4.2;
    if (this.scrollOffset > 88) {
      this.scrollOffset -= 88;
    }
    this.drawScanLines();
  }

  // ─── Road geometry ───

  private drawRoadPolygon(gfx: Graphics, yOffset: number, color: number, alpha: number) {
    if (!this.road) return;

    gfx.moveTo(this.road.upperStart.x, this.road.upperStart.y + yOffset);
    gfx.lineTo(this.road.upperEnd.x, this.road.upperEnd.y + yOffset);
    gfx.lineTo(this.road.lowerEnd.x, this.road.lowerEnd.y + yOffset);
    gfx.lineTo(this.road.lowerStart.x, this.road.lowerStart.y + yOffset);
    gfx.closePath();
    gfx.fill({ color, alpha });
  }

  private drawDeckShadow(gfx: Graphics) {
    if (!this.road) return;

    const offset = this.road.deckShadowOffset;
    gfx.moveTo(this.road.upperStart.x - 28, this.road.upperStart.y + 20);
    gfx.lineTo(this.road.upperEnd.x + 36, this.road.upperEnd.y + 18);
    gfx.lineTo(this.road.lowerEnd.x + offset.x + 48, this.road.lowerEnd.y + offset.y + 26);
    gfx.lineTo(this.road.lowerStart.x + offset.x - 48, this.road.lowerStart.y + offset.y + 30);
    gfx.closePath();
    gfx.fill({ color: 0x000000, alpha: 0.45 });
  }

  private drawRoadUnderside(gfx: Graphics) {
    if (!this.road) return;

    const depthX = this.road.deckShadowOffset.x;
    const depthY = this.road.deckShadowOffset.y;

    gfx.moveTo(this.road.upperEnd.x, this.road.upperEnd.y);
    gfx.lineTo(this.road.lowerEnd.x, this.road.lowerEnd.y);
    gfx.lineTo(this.road.lowerEnd.x + depthX, this.road.lowerEnd.y + depthY);
    gfx.lineTo(this.road.upperEnd.x + depthX, this.road.upperEnd.y + depthY);
    gfx.closePath();
    gfx.fill({ color: 0x02040a, alpha: 0.86 });

    gfx.moveTo(this.road.lowerStart.x, this.road.lowerStart.y);
    gfx.lineTo(this.road.lowerEnd.x, this.road.lowerEnd.y);
    gfx.lineTo(this.road.lowerEnd.x + depthX, this.road.lowerEnd.y + depthY);
    gfx.lineTo(this.road.lowerStart.x + depthX, this.road.lowerStart.y + depthY);
    gfx.closePath();
    gfx.fill({ color: ROAD_SIDE_COLOR, alpha: 0.98 });

    gfx.moveTo(this.road.upperStart.x, this.road.upperStart.y);
    gfx.lineTo(this.road.lowerStart.x, this.road.lowerStart.y);
    gfx.lineTo(this.road.lowerStart.x + depthX, this.road.lowerStart.y + depthY);
    gfx.lineTo(this.road.upperStart.x + depthX, this.road.upperStart.y + depthY);
    gfx.closePath();
    gfx.fill({ color: 0x03040c, alpha: 0.72 });
  }

  private drawInsetDeck(gfx: Graphics) {
    if (!this.road) return;

    const upperInset = 8;
    const lowerInset = 10;
    const a = interpolateRoadPoint(this.road, 0.08, 0.02);
    const b = interpolateRoadPoint(this.road, 0.08, 0.98);
    const c = interpolateRoadPoint(this.road, 0.92, 0.98);
    const d = interpolateRoadPoint(this.road, 0.92, 0.02);

    gfx.moveTo(a.x, a.y + upperInset);
    gfx.lineTo(b.x, b.y + upperInset);
    gfx.lineTo(c.x, c.y - lowerInset);
    gfx.lineTo(d.x, d.y - lowerInset);
    gfx.closePath();
    gfx.fill({ color: ROAD_INNER_COLOR, alpha: 0.78 });
  }

  private drawRoadTexture(gfx: Graphics) {
    if (!this.road) return;

    for (let progress = 0.06; progress < 0.98; progress += 0.075) {
      const top = interpolateRoadPoint(this.road, 0.12, progress);
      const bottom = interpolateRoadPoint(this.road, 0.88, progress);
      gfx.moveTo(top.x, top.y);
      gfx.lineTo(bottom.x, bottom.y);
      gfx.stroke({ color: 0x142036, alpha: 0.16, width: 1 });
    }
  }

  private drawRoadBevels(gfx: Graphics) {
    if (!this.road) return;

    const upperA = interpolateRoadPoint(this.road, 0.05, 0);
    const upperB = interpolateRoadPoint(this.road, 0.05, 1);
    const lowerA = interpolateRoadPoint(this.road, 0.95, 0);
    const lowerB = interpolateRoadPoint(this.road, 0.95, 1);

    gfx.moveTo(upperA.x, upperA.y + 7);
    gfx.lineTo(upperB.x, upperB.y + 7);
    gfx.stroke({ color: 0x1f6f8a, alpha: 0.42, width: 1 });

    gfx.moveTo(lowerA.x, lowerA.y - 8);
    gfx.lineTo(lowerB.x, lowerB.y - 8);
    gfx.stroke({ color: 0x42103a, alpha: 0.58, width: 1 });
  }

  private drawSolidDiagonalLine(
    container: Container,
    laneFraction: number,
    color: number,
    alpha: number,
    thickness: number
  ) {
    const gfx = new Graphics();
    const glow = new Graphics();
    if (!this.road) return;
    const near = interpolateRoadPoint(this.road, laneFraction, 0);
    const far = interpolateRoadPoint(this.road, laneFraction, 1);

    glow.moveTo(near.x, near.y);
    glow.lineTo(far.x, far.y);
    glow.stroke({ color, alpha: alpha * 0.22, width: thickness + 8 });
    container.addChild(glow);

    gfx.moveTo(near.x, near.y);
    gfx.lineTo(far.x, far.y);
    gfx.stroke({ color, alpha, width: thickness });
    container.addChild(gfx);
  }

  private drawDataLane(
    container: Container,
    laneFraction: number,
    color: number,
    alpha: number,
    width: number
  ) {
    const glow = new Graphics();
    if (!this.road) return;
    const near = interpolateRoadPoint(this.road, laneFraction, 0.02);
    const far = interpolateRoadPoint(this.road, laneFraction, 0.96);

    glow.moveTo(near.x, near.y);
    glow.lineTo(far.x, far.y);
    glow.stroke({ color, alpha, width });
    container.addChild(glow);
  }

  private drawEdgePosts(container: Container, laneFraction: number, color: number) {
    const gfx = new Graphics();
    if (!this.road) return;
    const spacing = 0.075;

    for (let progress = 0.04; progress < 0.98; progress += spacing) {
      const point = interpolateRoadPoint(this.road, laneFraction, progress);
      const normalSign = laneFraction === 0 ? -1 : 1;
      const x1 = point.x + this.road.normal.x * normalSign * 4;
      const y1 = point.y + this.road.normal.y * normalSign * 4;
      const x2 = point.x + this.road.normal.x * normalSign * 12;
      const y2 = point.y + this.road.normal.y * normalSign * 12;

      gfx.moveTo(x1, y1);
      gfx.lineTo(x2, y2);
      gfx.stroke({ color, alpha: 0.24, width: 1 });
      gfx.circle(x1, y1, 1.2);
      gfx.fill({ color, alpha: 0.42 });
    }

    container.addChild(gfx);
  }

  // ─── Dashed perspective lane dividers ───

  private drawDashedDiagonalLine(
    container: Container,
    laneFraction: number,
    color: number,
    alpha: number
  ) {
    const dashLength = 26;
    const gapLength = 42;
    const gfx = new Graphics();
    const glow = new Graphics();
    if (!this.road) return;
    const near = interpolateRoadPoint(this.road, laneFraction, 0);
    const far = interpolateRoadPoint(this.road, laneFraction, 1);
    const roadDx = far.x - near.x;
    const roadDy = far.y - near.y;
    const roadLength = Math.hypot(roadDx, roadDy);
    const ux = roadDx / roadLength;
    const uy = roadDy / roadLength;
    let d = 18;

    while (d < roadLength - 18) {
      const sx = near.x + ux * d;
      const sy = near.y + uy * d;
      const ex = near.x + ux * Math.min(d + dashLength, roadLength);
      const ey = near.y + uy * Math.min(d + dashLength, roadLength);

      glow.moveTo(sx, sy);
      glow.lineTo(ex, ey);
      glow.stroke({ color, alpha: alpha * 0.1, width: 6 });

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
    if (!this.road) return;

    this.scanLines.clear();

    const spacing = 72;
    const offset = this.scrollOffset;
    const edgeFractions = [0, 0.33, 0.66, 1];

    for (const edgeFraction of edgeFractions) {
      const near = interpolateRoadPoint(this.road, edgeFraction, 0);
      const far = interpolateRoadPoint(this.road, edgeFraction, 1);
      const roadDx = far.x - near.x;
      const roadDy = far.y - near.y;
      const roadLength = Math.hypot(roadDx, roadDy);
      const ux = roadDx / roadLength;
      const uy = roadDy / roadLength;

      for (let d = -spacing + offset; d < roadLength + spacing; d += spacing) {
        const x = near.x + ux * d;
        const y = near.y + uy * d;
        const tickLength = edgeFraction === 0 || edgeFraction === 1 ? 18 : 11;
        this.scanLines.moveTo(x, y);
        this.scanLines.lineTo(x + ux * tickLength, y + uy * tickLength);
        this.scanLines.stroke({
          color:
            edgeFraction === 0
              ? SCAN_LINE_COLOR
              : edgeFraction === 1
                ? MAGENTA_EDGE
                : LANE_LINE_COLOR,
          alpha: edgeFraction === 0 || edgeFraction === 1 ? 0.55 : 0.2,
          width: edgeFraction === 0 || edgeFraction === 1 ? 2 : 1,
        });
      }
    }
  }
}
