import { Container, Graphics } from "pixi.js";

// ─── Colors ───

const ROAD_COLOR = 0x08081a;
const LANE_LINE_COLOR = 0xff00ff; // magenta neon
const GRID_LINE_COLOR = 0xff0060; // hot pink
const SHOULDER_COLOR = 0x1a0030;

export class HighwayRoad {
  private gridLines: Graphics | null = null;
  private scrollOffset = 0;
  private canvasWidth = 0;
  private roadTop = 0;
  private roadHeight = 0;
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
    this.roadTop = canvasHeight * roadTopRatio;
    this.roadHeight = canvasHeight * roadHeightRatio;
    this.laneCount = laneCount;
    this.scrollOffset = 0;

    // 1. Road shoulder (dark gradient strip above and below road)
    const shoulder = new Graphics();
    shoulder.rect(0, this.roadTop - 4, canvasWidth, 4);
    shoulder.fill({ color: SHOULDER_COLOR, alpha: 0.6 });
    shoulder.rect(0, this.roadTop + this.roadHeight, canvasWidth, 4);
    shoulder.fill({ color: SHOULDER_COLOR, alpha: 0.6 });
    container.addChild(shoulder);

    // 2. Road surface
    const surface = new Graphics();
    surface.rect(0, this.roadTop, canvasWidth, this.roadHeight);
    surface.fill({ color: ROAD_COLOR });
    container.addChild(surface);

    // 3. Lane dividers (dashed neon lines)
    const laneHeight = this.roadHeight / laneCount;
    for (let i = 1; i < laneCount; i++) {
      const y = this.roadTop + laneHeight * i;
      this.drawDashedLine(container, y, LANE_LINE_COLOR, 0.5);
    }

    // 4. Top and bottom road edges (solid bright lines)
    const topEdge = new Graphics();
    topEdge.rect(0, this.roadTop, canvasWidth, 2);
    topEdge.fill({ color: 0xff88aa, alpha: 0.8 });
    container.addChild(topEdge);

    const bottomEdge = new Graphics();
    bottomEdge.rect(0, this.roadTop + this.roadHeight - 2, canvasWidth, 2);
    bottomEdge.fill({ color: 0xff88aa, alpha: 0.5 });
    container.addChild(bottomEdge);

    // 5. Scrolling grid lines (the classic outrun effect)
    this.gridLines = new Graphics();
    container.addChild(this.gridLines);
    this.drawGridLines();

    // 6. Neon sign strip at horizon (top of road)
    const horizon = new Graphics();
    horizon.rect(0, this.roadTop - 2, canvasWidth, 4);
    horizon.fill({ color: 0xff0060, alpha: 0.6 });
    container.addChild(horizon);

    horizon.rect(0, this.roadTop - 0.5, canvasWidth, 1);
    horizon.fill({ color: 0xff88cc, alpha: 1.0 });
    container.addChild(horizon);
  }

  update(dt: number) {
    this.scrollOffset += dt * 3;
    if (this.scrollOffset > 40) {
      this.scrollOffset -= 40;
    }
    this.drawGridLines();
  }

  // ─── Dashed neon lane dividers ───

  private drawDashedLine(
    container: Container,
    y: number,
    color: number,
    alpha: number
  ) {
    const dashLength = 20;
    const gapLength = 15;
    const gfx = new Graphics();

    // Glow layer
    const glowGfx = new Graphics();
    let x = 0;
    while (x < this.canvasWidth) {
      glowGfx.rect(x, y - 2, dashLength, 4);
      glowGfx.fill({ color, alpha: alpha * 0.2 });
      x += dashLength + gapLength;
    }
    container.addChild(glowGfx);

    // Bright layer
    x = 0;
    while (x < this.canvasWidth) {
      gfx.rect(x, y, dashLength, 1);
      gfx.fill({ color, alpha });
      x += dashLength + gapLength;
    }
    container.addChild(gfx);
  }

  // ─── Scrolling perspective grid (outrun effect) ───

  private drawGridLines() {
    if (!this.gridLines) return;

    this.gridLines.clear();

    const spacing = 40;
    const offset = this.scrollOffset;

    // Vertical grid lines (scrolling left to right to simulate forward motion)
    for (
      let x = -spacing + offset;
      x < this.canvasWidth + spacing;
      x += spacing
    ) {
      // Perspective: lines get closer together toward the top of the road
      const progressFromBottom = 1; // flat for now
      const lineAlpha = 0.2;

      // Glow
      this.gridLines.rect(x - 1, this.roadTop, 2, this.roadHeight);
      this.gridLines.fill({ color: GRID_LINE_COLOR, alpha: lineAlpha * 0.3 });

      // Bright
      this.gridLines.rect(x, this.roadTop, 1, this.roadHeight);
      this.gridLines.fill({ color: GRID_LINE_COLOR, alpha: lineAlpha });
    }

    // Horizontal grid lines (perspective: closer together near top, wider at bottom)
    const laneHeight = this.roadHeight / this.laneCount;
    const subDivisions = 4; // sub-lane grid lines for the outrun look

    for (let i = 0; i <= this.laneCount * subDivisions; i++) {
      const fraction = i / (this.laneCount * subDivisions);
      const y = this.roadTop + this.roadHeight * fraction;

      this.gridLines.rect(0, y, this.canvasWidth, 1);
      this.gridLines.fill({ color: GRID_LINE_COLOR, alpha: 0.1 + fraction * 0.15 });
    }
  }
}
