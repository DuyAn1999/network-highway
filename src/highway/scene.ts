import { Application, Container, Ticker } from "pixi.js";
import type { NetworkRequest } from "../shared/types";
import { CityBackground } from "./city-background";
import { HighwayRoad } from "./highway-road";
import { createCarFromRequest } from "./car-factory";
import 'pixi.js/unsafe-eval';
import { animateCarEnter, animateCrash, animateCarExit } from "./animations";

// ─── Layout constants ───

const ROAD_TOP_RATIO = 0.58; // road starts at 58% of viewport height
const ROAD_HEIGHT_RATIO = 0.30; // road occupies 30% of viewport height
const LANE_COUNT = 3;

export class HighwayScene {
  private app!: Application;
  private cityLayer = new Container();
  private roadLayer = new Container();
  private carLayer = new Container();
  private effectsLayer = new Container();

  private city!: CityBackground;
  private road!: HighwayRoad;

  private laneYPositions: number[] = [];
  private canvasWidth = 0;
  private canvasHeight = 0;

  async init(container: HTMLElement) {
    this.app = new Application();
    await this.app.init({
      resizeTo: container,
      backgroundColor: 0x0a0015,
      antialias: true,
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
    });
    container.appendChild(this.app.canvas as HTMLCanvasElement);

    // Layer order: city (back) → road → cars → effects (front)
    this.app.stage.addChild(this.cityLayer);
    this.app.stage.addChild(this.roadLayer);
    this.app.stage.addChild(this.carLayer);
    this.app.stage.addChild(this.effectsLayer);

    // Calculate dimensions
    this.canvasWidth = container.clientWidth;
    this.canvasHeight = container.clientHeight;
    this.calculateLanes();

    // Build scene elements
    this.city = new CityBackground();
    this.city.build(this.cityLayer, this.canvasWidth, this.canvasHeight);

    this.road = new HighwayRoad();
    this.road.build(
      this.roadLayer,
      this.canvasWidth,
      this.canvasHeight,
      ROAD_TOP_RATIO,
      ROAD_HEIGHT_RATIO,
      LANE_COUNT
    );

    // Start update loop
    this.app.ticker.add(this.update, this);

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        this.canvasWidth = entry.contentRect.width;
        this.canvasHeight = entry.contentRect.height;
        this.calculateLanes();
        this.rebuildScene();
      }
    });
    resizeObserver.observe(container);
  }

  addRequest(request: NetworkRequest) {
    if (this.laneYPositions.length === 0) return;

    const car = createCarFromRequest(request, this.laneYPositions);
    this.carLayer.addChild(car);

    if (request.error || request.statusCode === 0) {
      // Crash animation for errors
      const crashX = this.canvasWidth * (0.3 + Math.random() * 0.4);
      const enterAnim = animateCarEnter(car, crashX, 1.5);
      enterAnim.then(() => {
        animateCrash(car, this.effectsLayer);
      });
    } else {
      // Normal drive-through
      const exitX = this.canvasWidth + 80;
      const duration = this.durationForCar(request.duration);
      animateCarEnter(car, exitX, duration).then(() => {
        animateCarExit(car, exitX);
      });
    }
  }

  private update(ticker: Ticker) {
    const dt = ticker.deltaTime;
    this.city.update(dt);
    this.road.update(dt);
  }

  private calculateLanes() {
    const roadTop = this.canvasHeight * ROAD_TOP_RATIO;
    const roadHeight = this.canvasHeight * ROAD_HEIGHT_RATIO;
    const laneHeight = roadHeight / LANE_COUNT;

    this.laneYPositions = [];
    for (let i = 0; i < LANE_COUNT; i++) {
      // Center each lane vertically
      this.laneYPositions.push(roadTop + laneHeight * i + laneHeight / 2);
    }
  }

  private durationForCar(requestDuration: number): number {
    // Map network latency to animation duration
    // Fast requests (<100ms) → 3s animation, slow (>500ms) → 1.5s
    const clamped = Math.min(Math.max(requestDuration, 50), 2000);
    return 3 - (clamped / 2000) * 1.5;
  }

  private rebuildScene() {
    this.cityLayer.removeChildren();
    this.roadLayer.removeChildren();

    this.city.build(this.cityLayer, this.canvasWidth, this.canvasHeight);
    this.road.build(
      this.roadLayer,
      this.canvasWidth,
      this.canvasHeight,
      ROAD_TOP_RATIO,
      ROAD_HEIGHT_RATIO,
      LANE_COUNT
    );
  }
}
