import type { TrackedRequest, NetworkRequest, MessageType } from "../shared/types";

// ─── Side Panel: open on action click ───

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

// ─── Port management: long-lived connections from side panel ───
// The side panel connects via chrome.runtime.connect() and we
// push request events through the port as they happen.

const panelPorts: chrome.runtime.Port[] = [];

chrome.runtime.onConnect.addListener((port) => {
  if (port.name === "network-highway-panel") {
    panelPorts.push(port);

    port.onDisconnect.addListener(() => {
      const idx = panelPorts.indexOf(port);
      if (idx >= 0) panelPorts.splice(idx, 1);
    });
  }
});

function broadcastToPanels(data: MessageType) {
  for (const port of panelPorts) {
    try {
      port.postMessage(data);
    } catch {
      // Port disconnected — will be cleaned up by onDisconnect
    }
  }
}

// ─── Request tracking: correlate onBeforeRequest with onCompleted/onError ───

const pendingRequests = new Map<string, TrackedRequest>();

// Cleanup: remove stale requests older than 60 seconds
const STALE_MS = 60_000;
setInterval(() => {
  const now = Date.now();
  for (const [id, req] of pendingRequests) {
    if (now - req.startTime > STALE_MS) {
      pendingRequests.delete(id);
    }
  }
}, 10_000);

// ─── webRequest listeners ───

chrome.webRequest.onBeforeRequest.addListener(
  (details) => {
    if (details.tabId < 0) return;

    const tracked: TrackedRequest = {
      requestId: details.requestId,
      url: details.url,
      method: details.method,
      tabId: details.tabId,
      type: details.type,
      startTime: details.timeStamp,
    };

    pendingRequests.set(details.requestId, tracked);
  },
  { urls: ["<all_urls>"] }
);

chrome.webRequest.onCompleted.addListener(
  (details) => {
    const tracked = pendingRequests.get(details.requestId);
    if (!tracked) return;

    const duration = details.timeStamp - tracked.startTime;
    const responseSize = details.responseHeaders
      ? parseContentLength(details.responseHeaders)
      : 0;

    const payload: NetworkRequest = {
      requestId: details.requestId,
      url: tracked.url,
      method: tracked.method,
      statusCode: details.statusCode,
      responseSize,
      duration,
      startTime: tracked.startTime,
      tabId: tracked.tabId,
      type: tracked.type,
      fromCache: details.fromCache,
    };

    broadcastToPanels({
      type: "REQUEST_COMPLETED",
      payload,
    });

    pendingRequests.delete(details.requestId);
  },
  { urls: ["<all_urls>"] },
  ["responseHeaders"]
);

chrome.webRequest.onErrorOccurred.addListener(
  (details) => {
    const tracked = pendingRequests.get(details.requestId);
    if (!tracked) return;

    const duration = details.timeStamp - tracked.startTime;

    const payload: NetworkRequest = {
      requestId: details.requestId,
      url: tracked.url,
      method: tracked.method,
      statusCode: 0,
      responseSize: 0,
      duration,
      startTime: tracked.startTime,
      tabId: tracked.tabId,
      type: tracked.type,
      error: details.error,
    };

    broadcastToPanels({
      type: "REQUEST_ERROR",
      payload,
    });

    pendingRequests.delete(details.requestId);
  },
  { urls: ["<all_urls>"] }
);

// ─── Helpers ───

function parseContentLength(headers: chrome.webRequest.HttpHeader[]): number {
  const cl = headers.find(
    (h) => h.name.toLowerCase() === "content-length"
  );
  return cl ? parseInt(cl.value || "0", 10) : 0;
}
