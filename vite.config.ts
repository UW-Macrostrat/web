import revisionInfo from "@macrostrat/revision-info-webpack";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import { defineConfig } from "vite";
import path from "node:path";
import { readFileSync } from "node:fs";
import { cp } from "node:fs/promises";
import textToolchain from "./packages/text-toolchain/src";
import { cjsInterop } from "vite-plugin-cjs-interop";
import hyperStyles from "@macrostrat/vite-plugin-hyperstyles";
import cesium from "vite-plugin-cesium";

const cesiumPath = import.meta.resolve("cesium").replace("file://", "");

const cesiumRoot = cesiumPath.replace("/Source/Cesium.js", "/Build");
const cesiumBuildPath = path.join(cesiumRoot, "Cesium");

const pkg = getPackageJSONContents("package.json");

setupVersionEnvironmentVariables(pkg);

const macrostratPackages = Object.keys(pkg.dependencies).filter(
  (name: string) => name.startsWith("@macrostrat/")
);

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve("./src"),
      "#": path.resolve("./pages"),
    },
    dedupe: ["react", "react-dom", ...macrostratPackages],
  },
  plugins: [
    vike(),
    react(),
    hyperStyles(),
    // patchCssModules(),
    // Fix broken imports in non-ESM packages. We should endeavor to move away from these
    // dependencies if they are unmaintained.
    cjsInterop({
      dependencies: ["mapbox-gl"],
    }),
    // This should maybe be integrated directly into the server-side rendering code
    textToolchain({
      contentDir: path.resolve(__dirname, "content"),
      wikiPrefix: "/docs",
    }),
    cesiumPlugin({
      cesiumBuildPath,
      cesiumBuildRootPath: cesiumRoot,
    }),
  ],
  ssr: {
    noExternal: [...macrostratPackages, "jotai"],
  },
  define: {
    // Cesium base URL
    CESIUM_BASE_URL: JSON.stringify("/cesium"),
    // If not building for server context
  },
  server: {
    allowedHosts: ["localhost", "dev.macrostrat.local"],
    hmr: {
      // Basic setup for hot module reloading that bypasses local reverse proxy
      protocol: "ws", // Use 'wss' for secure connections over HTTPS
      host: "localhost", // The hostname your client connects to
      port: 5173, // The WebSocket port
      path: "__hmr", // Customizes the URL path suffix
    },
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: "modern-compiler",
      } as any,
    },
  },
});

/** `vite-plugin-cesium` copies Cesium's runtime assets to `build.outDir` as it was
 * defined when its `config` hook ran, which is the default `dist` – Vike only sets
 * the per-environment output directories (`dist/client`, `dist/server`) later on.
 * The production server serves static files from `dist/client`, so `/cesium/*` ends
 * up 404ing there even though the dev server (which serves Cesium from a middleware)
 * works fine. Redo the copy against the actual client output directory instead.
 */
function cesiumPlugin(options) {
  const plugin = cesium(options);
  const { cesiumBuildPath } = options;

  let clientOutDir = path.resolve(__dirname, "dist/client");

  return {
    ...plugin,
    configResolved(config) {
      const env = config.environments?.client ?? config;
      clientOutDir = path.resolve(config.root ?? __dirname, env.build.outDir);
    },
    async closeBundle() {
      // Only the client build ships static assets
      if (this.environment != null && this.environment.name !== "client")
        return;
      const dest = path.join(clientOutDir, "cesium");
      for (const dir of ["Assets", "ThirdParty", "Workers", "Widgets"]) {
        await cp(path.join(cesiumBuildPath, dir), path.join(dest, dir), {
          recursive: true,
        });
      }
      await cp(
        path.join(cesiumBuildPath, "Cesium.js"),
        path.join(dest, "Cesium.js")
      );
    },
  };
}

function getPackageJSONContents(packageJSONPath: string) {
  return JSON.parse(
    readFileSync(path.resolve(__dirname, packageJSONPath), "utf-8")
  );
}

function setupVersionEnvironmentVariables(pkg) {
  const gitEnv = revisionInfo(pkg, "https://github.com/UW-Macrostrat/web");
  // prefix with VITE_ to make available to client
  for (const [key, value] of Object.entries(gitEnv)) {
    process.env["VITE_" + key] = value;
  }
}
