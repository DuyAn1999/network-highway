import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import {
  copyFileSync,
  mkdirSync,
  writeFileSync,
  readFileSync,
  rmSync,
  rmDirSync,
} from "fs";

// Chrome extension build config — no CRXJS dependency.
// Vite bundles all entry points, then a post-build hook:
//   1. Flattens HTML files to dist root
//   2. Rewrites script/src paths in HTML to be relative
//   3. Copies icons
//   4. Writes the manifest

export default defineConfig({
  plugins: [
    react(),
    {
      name: "copy-extension-files",
      closeBundle() {
        const distDir = resolve(__dirname, "dist");

        // Copy icons
        const iconsDir = resolve(distDir, "icons");
        mkdirSync(iconsDir, { recursive: true });
        for (const size of [16, 48, 128]) {
          copyFileSync(
            resolve(__dirname, `public/icons/icon-${size}.png`),
            resolve(iconsDir, `icon-${size}.png`)
          );
        }

        // Flatten HTML files to dist root
        const htmlMoves: Array<{ from: string; to: string }> = [
          {
            from: resolve(distDir, "src/devtools/panel.html"),
            to: resolve(distDir, "panel.html"),
          },
          {
            from: resolve(distDir, "src/popup/popup.html"),
            to: resolve(distDir, "popup.html"),
          },
        ];

        for (const { from, to } of htmlMoves) {
          try {
            let html = readFileSync(from, "utf-8");
            // Rewrite absolute paths: /panel.js -> panel.js, /chunks/... -> chunks/...
            html = html.replace(/(src|href)="\/(.*?)"/g, '$1="$2"');
            writeFileSync(to, html);
            rmSync(from);
          } catch {
            // File may not exist
          }
        }

        // Write manifest with build-correct paths
        const manifest = {
          manifest_version: 3,
          name: "Network Highway",
          version: "1.0.0",
          description:
            "Visualize HTTP requests as cars on a synthwave highway with a retro city backdrop",

          background: {
            service_worker: "background.js",
            type: "module",
          },

          permissions: ["webRequest", "sidePanel"],

          host_permissions: ["<all_urls>"],

          side_panel: {
            default_path: "panel.html",
          },

          action: {
            default_title: "Open Network Highway",
            default_icon: {
              "16": "icons/icon-16.png",
              "48": "icons/icon-48.png",
              "128": "icons/icon-128.png",
            },
          },

          icons: {
            "16": "icons/icon-16.png",
            "48": "icons/icon-48.png",
            "128": "icons/icon-128.png",
          },
        };

        writeFileSync(
          resolve(distDir, "manifest.json"),
          JSON.stringify(manifest, null, 2)
        );
      },
    },
  ],

  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        background: resolve(__dirname, "src/background/service-worker.ts"),
        panel: resolve(__dirname, "src/devtools/panel.html"),
        popup: resolve(__dirname, "src/popup/popup.html"),
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
    target: "esnext",
  },
});
