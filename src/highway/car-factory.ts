import { Car } from "./car";
import type { LanePath, NetworkRequest, VehicleType } from "../shared/types";

// ─── Classifiers: map request properties → car visual properties ───

export function classifyVehicle(method: string): VehicleType {
  switch (method.toUpperCase()) {
    case "GET":
      return "sedan";
    case "POST":
      return "truck";
    case "DELETE":
      return "sports";
    case "PUT":
    case "PATCH":
      return "bus";
    default:
      return "sedan";
  }
}

export function classifyColor(statusCode: number): number {
  if (statusCode >= 200 && statusCode < 300) return 0x00ff88; // green = 2xx
  if (statusCode >= 300 && statusCode < 400) return 0xffcc00; // yellow = 3xx
  if (statusCode >= 400 && statusCode < 600) return 0xff0044; // red = 4xx/5xx
  return 0x222222; // dark = error/no status
}

export function classifyLane(method: string): number {
  // Lane 0/1 = small cars, Lane 2 = trucks and heavy traffic.
  switch (method.toUpperCase()) {
    case "POST":
    case "PUT":
    case "PATCH":
      return 2;
    case "DELETE":
      return 1;
    case "GET":
    default:
      return 0;
  }
}

export function classifyScale(responseSize: number): number {
  // Scale from 0.6 (tiny) to 1.4 (large)
  if (responseSize === 0) return 0.6;
  if (responseSize < 1024) return 0.7; // < 1KB
  if (responseSize < 10240) return 0.8; // < 10KB
  if (responseSize < 102400) return 1.0; // < 100KB
  if (responseSize < 1048576) return 1.2; // < 1MB
  return 1.4; // >= 1MB
}

// ─── Factory: create a Car from a network request ───

export function createCarFromRequest(
  request: NetworkRequest,
  lanePaths: LanePath[]
): Car {
  const vehicleType = classifyVehicle(request.method);
  const color = classifyColor(request.statusCode);
  const lane = classifyLane(request.method);
  const scale = classifyScale(request.responseSize);

  // Add slight y-offset within lane so concurrent requests do not perfectly overlap.
  const lanePath = lanePaths[lane] ?? lanePaths[0];
  const jitter = (Math.random() - 0.5) * 4;
  const laneXOffset = lane === 2 ? -8 : 0;
  const laneYOffset = lane === 2 ? 14 : lane === 1 ? -2 : -4;

  return new Car({
    requestId: request.requestId,
    method: request.method,
    statusCode: request.statusCode,
    vehicleType,
    color,
    lane,
    scale,
    startX: lanePath.startX + laneXOffset,
    startY: lanePath.startY + laneYOffset + jitter,
    endX: lanePath.endX + laneXOffset,
    endY: lanePath.endY + laneYOffset + jitter,
  });
}
