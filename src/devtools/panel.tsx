import { HighwayScene } from "../highway/scene";
import type { MessageType, NetworkRequest } from "../shared/types";

const container = document.getElementById("canvas-container")!;
const debugLog = document.getElementById("debug-log")!;

// Dashboard elements
const dashboardToggle = document.getElementById("dashboard-toggle")! as HTMLButtonElement;
const requestDashboard = document.getElementById("request-dashboard")!;
const requestList = document.getElementById("request-list")!;
const statTotal = document.getElementById("stat-total")!;
const statSuccess = document.getElementById("stat-success")!;
const statErrors = document.getElementById("stat-errors")!;

// Drawer state
let isDrawerOpen = false;
let isStandalonePreview = false;

// Statistics
let totalRequests = 0;
let successRequests = 0;
let errorRequests = 0;

function debugLogMsg(msg: string) {
  console.log("[Network Highway] " + msg);
  debugLog.textContent += "\n" + msg;
}

debugLogMsg("Panel script loaded");

async function main() {
  // Wait for the container to have a real size
  // (Side panel might start with 0 dimensions before layout completes)
  await waitForSize(container);
  debugLogMsg(`Container size: ${container.clientWidth}x${container.clientHeight}`);

  const scene = new HighwayScene();
  debugLogMsg("Initializing PixiJS scene...");

  await scene.init(container);
  debugLogMsg("Scene initialized OK ✅");

  // Hide debug overlay after a short delay
  setTimeout(() => debugLog.classList.add("hidden"), 2000);

  if (!globalThis.chrome?.runtime?.connect) {
    debugLogMsg("Standalone preview mode: using sample request traffic");
    isStandalonePreview = true;
    startPreviewTraffic(scene);
    setupToggle();
    return;
  }

  // Connect to background service worker via long-lived port
  const port = chrome.runtime.connect({ name: "network-highway-panel" });
  debugLogMsg("Connected to background service worker");

  port.onMessage.addListener((message: MessageType) => {
    if (
      message.type === "REQUEST_COMPLETED" ||
      message.type === "REQUEST_ERROR"
    ) {
      debugLogMsg(
        `→ ${message.payload.method} ${message.payload.statusCode} ${message.payload.duration.toFixed(0)}ms`
      );
      scene.addRequest(message.payload);
      updateDashboard(message.payload);
    }
  });

  port.onDisconnect.addListener(() => {
    debugLogMsg("⚠️ Disconnected from background");
  });

  debugLogMsg("Listening for requests... Browse a page!");

  // Setup drawer toggle
  setupToggle();
}

function startPreviewTraffic(scene: HighwayScene) {
  const samples: NetworkRequest[] = [
    makePreviewRequest("GET", 200, 72, 820, undefined, 0.78),
    makePreviewRequest("POST", 201, 230, 140000, undefined, 0.62),
    makePreviewRequest("PATCH", 302, 410, 76000, undefined, 0.48),
    makePreviewRequest("GET", 200, 130, 4200, undefined, 0.34),
    makePreviewRequest("POST", 201, 320, 220000, undefined, 0.18),
    makePreviewRequest("DELETE", 500, 640, 2400, "Preview failure", 0.56),
    makePreviewRequest("GET", 404, 180, 1200, undefined, 0.26),
  ];

  let index = 0;
  const spawn = () => {
    const request = { ...samples[index % samples.length], requestId: `preview-${Date.now()}-${index}` };
    scene.addRequest(request);
    updateDashboard(request);
    index++;
  };

  for (let i = 0; i < 16; i++) {
    setTimeout(spawn, i * 260);
  }
  setInterval(spawn, 520);
}

function makePreviewRequest(
  method: string,
  statusCode: number,
  duration: number,
  responseSize: number,
  error?: string,
  previewProgress?: number
): NetworkRequest {
  return {
    requestId: `preview-${method}-${statusCode}`,
    url: `https://preview.local/api/${method.toLowerCase()}`,
    method,
    statusCode,
    responseSize,
    duration,
    startTime: Date.now(),
    tabId: 0,
    type: "xmlhttprequest",
    error,
    previewProgress,
  };
}

// ─── Drawer Toggle ───

function setupToggle() {
  dashboardToggle.addEventListener("click", toggleDrawer);

  // Also close drawer when clicking outside
  document.addEventListener("click", (e) => {
    if (isDrawerOpen &&
        e.target !== dashboardToggle &&
        e.target !== requestDashboard &&
        !requestDashboard.contains(e.target as Node)) {
      closeDrawer();
    }
  });
}

function toggleDrawer() {
  isDrawerOpen = !isDrawerOpen;
  if (isDrawerOpen) {
    openDrawer();
  } else {
    closeDrawer();
  }
}

function openDrawer() {
  isDrawerOpen = true;
  dashboardToggle.classList.add("active");
  requestDashboard.classList.add("open");
}

function closeDrawer() {
  isDrawerOpen = false;
  dashboardToggle.classList.remove("active");
  requestDashboard.classList.remove("open");
}

// ─── Update Request Dashboard ───

function updateDashboard(request: NetworkRequest) {
  // Update statistics
  totalRequests++;
  if (request.error || request.statusCode === 0 || request.statusCode >= 400) {
    errorRequests++;
    // Auto-open drawer on errors
    if (!isDrawerOpen && !isStandalonePreview) {
      openDrawer();
    }
  } else {
    successRequests++;
  }

  updateStats();

  // Add request item to list
  const item = createRequestItem(request);
  requestList.insertBefore(item, requestList.firstChild);

  // Keep only last 50 items
  while (requestList.children.length > 50) {
    requestList.removeChild(requestList.lastChild!);
  }
}

function createRequestItem(request: NetworkRequest): HTMLElement {
  const div = document.createElement("div");
  const isError = request.error || request.statusCode === 0 || request.statusCode >= 400;

  div.className = `request-item ${isError ? 'error' : 'success'}`;

  // Process / route cell
  const process = document.createElement("span");
  process.className = "request-process";

  const method = document.createElement("span");
  method.className = "request-method";
  method.textContent = request.method;

  const name = document.createElement("span");
  name.className = "request-name";
  name.textContent = requestDisplayName(request);

  process.appendChild(method);
  process.appendChild(name);

  const conns = document.createElement("span");
  conns.className = "request-conns";
  conns.textContent = String(Math.max(1, Math.min(99, Math.round(request.duration / 80))));

  const speed = document.createElement("span");
  speed.className = "request-duration";
  speed.textContent = formatRate(request.responseSize, request.duration);

  const status = document.createElement("span");
  status.className = `request-status ${isError ? 'error' : 'success'}`;
  status.textContent = isError ? "[BLOCK]" : "[ALLOW]";

  div.title = request.url;
  div.appendChild(process);
  div.appendChild(conns);
  div.appendChild(speed);
  div.appendChild(status);

  return div;
}

function requestDisplayName(request: NetworkRequest): string {
  try {
    const url = new URL(request.url);
    const pathName = url.pathname.split("/").filter(Boolean).join("/");
    return pathName || url.hostname;
  } catch {
    return request.url;
  }
}

function formatRate(bytes: number, durationMs: number): string {
  const seconds = Math.max(durationMs / 1000, 0.05);
  const kbps = bytes / 1024 / seconds;
  if (kbps >= 1000) return `${(kbps / 1024).toFixed(1)} MB/s`;
  if (kbps >= 10) return `${kbps.toFixed(0)} KB/s`;
  return `${kbps.toFixed(1)} KB/s`;
}

function updateStats() {
  statTotal.textContent = totalRequests.toString();
  statSuccess.textContent = `${Math.max(1, successRequests * 7)}KB/s`;
  statErrors.textContent = `${Math.max(0, errorRequests * 143)}KB/s`;
}

main().catch((err) => {
  debugLogMsg("❌ ERROR: " + (err instanceof Error ? err.message : String(err)));
  console.error("[Network Highway] Failed to initialize:", err);
});

function waitForSize(el: HTMLElement, maxWait = 3000): Promise<void> {
  return new Promise((resolve) => {
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      resolve();
      return;
    }
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0 && entry.contentRect.height > 0) {
          observer.disconnect();
          resolve();
          return;
        }
      }
    });
    observer.observe(el);
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, maxWait);
  });
}
