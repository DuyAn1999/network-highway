import { HighwayScene } from "../highway/scene";
import type { MessageType } from "../shared/types";

const container = document.getElementById("canvas-container")!;
const debugLog = document.getElementById("debug-log")!;

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
    }
  });

  port.onDisconnect.addListener(() => {
    debugLogMsg("⚠️ Disconnected from background");
  });

  debugLogMsg("Listening for requests... Browse a page!");
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
