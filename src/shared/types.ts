// ─── Network Request (captured by background service worker) ───

export interface NetworkRequest {
  requestId: string;
  url: string;
  method: string;
  statusCode: number;
  responseSize: number; // bytes
  duration: number; // ms
  startTime: number; // timestamp
  tabId: number;
  type: string; // chrome.webRequest.ResourceType
  fromCache?: boolean;
  error?: string;
}

// ─── Message types (background ↔ devtools ↔ panel) ───

export interface InitMessage {
  type: "INIT";
  tabId: number;
}

export interface RequestCompletedMessage {
  type: "REQUEST_COMPLETED";
  payload: NetworkRequest;
}

export interface RequestErrorMessage {
  type: "REQUEST_ERROR";
  payload: NetworkRequest;
}

export type MessageType =
  | InitMessage
  | RequestCompletedMessage
  | RequestErrorMessage;

// ─── Car / Visualization types ───

export type VehicleType = "sedan" | "truck" | "sports" | "bus";

export interface CarConfig {
  requestId: string;
  method: string;
  statusCode: number;
  vehicleType: VehicleType;
  color: number; // hex
  lane: number; // 0=fast, 1=normal, 2=slow
  scale: number; // 0.6–1.4
  startX: number;
  startY: number;
}

// ─── Internal tracking (background only) ───

export interface TrackedRequest {
  requestId: string;
  url: string;
  method: string;
  tabId: number;
  type: string;
  startTime: number;
}
