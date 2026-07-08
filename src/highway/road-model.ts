import type { LanePath } from "../shared/types";

export interface Point2D {
  x: number;
  y: number;
}

export interface RoadGeometry {
  upperStart: Point2D;
  upperEnd: Point2D;
  lowerStart: Point2D;
  lowerEnd: Point2D;
  deckShadowOffset: Point2D;
  direction: Point2D;
  normal: Point2D;
  length: number;
  laneCount: number;
  lanePaths: LanePath[];
}

export function createRoadGeometry(
  width: number,
  height: number,
  laneCount: number
): RoadGeometry {
  const upperStart = { x: width * 0.1, y: height * 0.82 };
  const upperEnd = { x: width * 0.985, y: height * 0.43 };
  const lowerStart = { x: width * -0.025, y: height * 1.02 };
  const lowerEnd = { x: width * 0.93, y: height * 0.59 };
  const direction = normalize({
    x: upperEnd.x - upperStart.x,
    y: upperEnd.y - upperStart.y,
  });
  const normal = normalize({
    x: lowerStart.x - upperStart.x,
    y: lowerStart.y - upperStart.y,
  });
  const length = Math.hypot(upperEnd.x - upperStart.x, upperEnd.y - upperStart.y);

  const lanePaths: LanePath[] = [];
  for (let index = 0; index < laneCount; index++) {
    const laneFraction = (index + 0.5) / laneCount;
    const laneNear = interpolateAcrossRoad(
      upperStart,
      lowerStart,
      laneFraction
    );
    const laneFar = interpolateAcrossRoad(upperEnd, lowerEnd, laneFraction);
    lanePaths.push({
      startX: laneFar.x + direction.x * 120,
      startY: laneFar.y + direction.y * 120,
      endX: laneNear.x - direction.x * 180,
      endY: laneNear.y - direction.y * 180,
    });
  }

  return {
    upperStart,
    upperEnd,
    lowerStart,
    lowerEnd,
    deckShadowOffset: { x: -18, y: 24 },
    direction,
    normal,
    length,
    laneCount,
    lanePaths,
  };
}

export function interpolateRoadPoint(
  road: RoadGeometry,
  laneFraction: number,
  roadProgress: number
): Point2D {
  const near = interpolateAcrossRoad(
    road.upperStart,
    road.lowerStart,
    laneFraction
  );
  const far = interpolateAcrossRoad(road.upperEnd, road.lowerEnd, laneFraction);
  return lerpPoint(near, far, roadProgress);
}

export function lerpPoint(a: Point2D, b: Point2D, t: number): Point2D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}

function interpolateAcrossRoad(
  upper: Point2D,
  lower: Point2D,
  laneFraction: number
): Point2D {
  return lerpPoint(upper, lower, laneFraction);
}

function normalize(point: Point2D): Point2D {
  const length = Math.hypot(point.x, point.y) || 1;
  return {
    x: point.x / length,
    y: point.y / length,
  };
}
