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
    if (!isDrawerOpen) {
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

  // Method badge
  const method = document.createElement("span");
  method.className = "request-method";
  method.textContent = request.method;

  // Status
  const status = document.createElement("span");
  status.className = `request-status ${isError ? 'error' : 'success'}`;
  status.textContent = isError ? "❌ FAILED" : "✅ SUCCESS";

  // Duration
  const duration = document.createElement("span");
  duration.className = "request-duration";
  duration.textContent = `${request.duration.toFixed(0)}ms`;

  // URL
  const url = document.createElement("span");
  url.className = "request-url";
  url.textContent = request.url;

  // Timestamp
  const timestamp = document.createElement("span");
  timestamp.className = "request-timestamp";
  const date = new Date(request.startTime);
  timestamp.textContent = date.toLocaleTimeString();

  div.appendChild(method);
  div.appendChild(status);
  div.appendChild(duration);
  div.appendChild(url);
  div.appendChild(timestamp);

  return div;
}

function updateStats() {
  statTotal.textContent = totalRequests.toString();
  statSuccess.textContent = successRequests.toString();
  statErrors.textContent = errorRequests.toString();
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
