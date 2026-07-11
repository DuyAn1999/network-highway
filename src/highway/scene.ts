import { Application, Container, Ticker } from "pixi.js";
import type { LanePath, NetworkRequest } from "../shared/types";
import { CityBackground } from "./city-background";
import { HighwayRoad } from "./highway-road";
import { createRoadGeometry } from "./road-model";
import { classifyLane, createCarFromRequest } from "./car-factory";
import 'pixi.js/unsafe-eval';
import { animateCarEnter, animateCrash, animateCarExit } from "./animations";

// ─── Layout constants ───

const ROAD_TOP_RATIO = 0.58;
const ROAD_HEIGHT_RATIO = 0.22;
const LANE_COUNT = 3;
const MIN_SPAWN_GAP_MS = 360;

export class HighwayScene {
  private app!: Application;
  private cityLayer = new Container();
  private roadLayer = new Container();
  private carLayer = new Container();
  private effectsLayer = new Container();

  private city!: CityBackground;
  private road!: HighwayRoad;

  private lanePaths: LanePath[] = [];
  private nextLaneSpawnAt = Array.from({ length: LANE_COUNT }, () => 0);
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
    this.carLayer.sortableChildren = true;

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
    if (this.lanePaths.length === 0) return;

    const lane = this.laneForRequest(request);
    const now = performance.now();
    const spawnAt = Math.max(now, this.nextLaneSpawnAt[lane] ?? now);
    this.nextLaneSpawnAt[lane] = spawnAt + MIN_SPAWN_GAP_MS;

    window.setTimeout(() => {
      this.spawnRequestCar(request);
    }, spawnAt - now);
  }

  private spawnRequestCar(request: NetworkRequest) {
    if (this.lanePaths.length === 0) return;

    const car = createCarFromRequest(request, this.lanePaths);
    const previewProgress = request.previewProgress ?? 0;
    if (previewProgress > 0) {
      const lanePath = this.lanePaths[car.lane] ?? this.lanePaths[0];
      car.position.set(
        this.lerp(lanePath.startX, lanePath.endX, previewProgress),
        this.lerp(lanePath.startY, lanePath.endY, previewProgress)
      );
      car.alpha = 1;
      const progressScale =
        car.baseScale * (0.82 + (1.08 - 0.82) * previewProgress);
      car.scale.set(progressScale);
    }
    car.zIndex = car.y;
    this.carLayer.addChild(car);

    if (request.error || request.statusCode === 0) {
      // Crash animation for errors
      const progress = 0.35 + Math.random() * 0.35;
      const crashX = car.x + (car.endX - car.x) * progress;
      const crashY = car.y + (car.endY - car.y) * progress;
      const enterAnim = animateCarEnter(car, crashX, crashY, 1.5);
      enterAnim.then(() => {
        animateCrash(car, this.effectsLayer);
      });
    } else {
      // Normal drive-through
      const duration =
        this.durationForCar(request.duration) * (1 - previewProgress * 0.75);
      animateCarEnter(car, car.endX, car.endY, duration).then(() => {
        animateCarExit(car, car.endX, car.endY);
      });
    }
  }

  private update(ticker: Ticker) {
    const dt = ticker.deltaTime;
    this.city.update(dt);
    this.road.update(dt);
    for (const child of this.carLayer.children) {
      child.zIndex = child.y;
    }
  }

  private calculateLanes() {
    this.lanePaths = createRoadGeometry(
      this.canvasWidth,
      this.canvasHeight,
      LANE_COUNT
    ).lanePaths;
  }

  private laneForRequest(request: NetworkRequest): number {
    return classifyLane(request.method);
  }

  private lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
  }

  private durationForCar(requestDuration: number): number {
    // Map network latency to animation duration
    // Fast requests stay visible longer; slow requests still move through briskly.
    const clamped = Math.min(Math.max(requestDuration, 50), 2000);
    return 5 - (clamped / 2000) * 2;
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
