import revisionInfo from "@macrostrat/revision-info-webpack";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import { defineConfig, loadEnv } from "vite";
import path from "node:path";
import { existsSync, readFileSync } from "node:fs";
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

const devProxy = buildDevProxy();

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
      contentDir: requireDocsContent(path.resolve(__dirname, "content")),
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
    proxy: devProxy,
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

/** The /docs content tree is assembled from the documentation vault by
 * scripts/assemble-docs.sh and is not tracked in this repository. */
function requireDocsContent(contentDir: string): string {
  if (!existsSync(contentDir)) {
    throw new Error(
      `Documentation content not found at ${contentDir}. Run 'yarn docs:assemble' first.`
    );
  }
  return contentDir;
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

function buildDevProxy() {
  /** Mirror the container stack's `/api/*` and `/tiles/*` routes onto the dev
   * server's own origin.
   *
   * The app is normally served from `https://dev.macrostrat.local`, where Caddy
   * routes those paths for us. Loading it directly from `http://localhost:3000`
   * skips Caddy, so the client would have to call the `.local` hosts
   * cross-origin — which anything that can't resolve OrbStack's mDNS names
   * (notably the Claude desktop app's browser pane) cannot do. With this proxy,
   * a page served from localhost talks only to localhost.
   *
   * `macrostrat.local` is the target for both because it already serves the API
   * routes *and* `/tiles/*` (to the same tileserver as `tiles.macrostrat.local`).
   * `pages/+onCreatePageContext.server.ts` is the other half: it points the
   * client at these paths when the request came in on localhost.
   *
   * Dev-only by construction — `server.proxy` is ignored by `vike build`. */
  const target = loadEnvVar("MACROSTRAT_API_DOMAIN");
  if (target == null) return undefined;

  // `secure: false` because the stack uses OrbStack's local CA, and
  // `changeOrigin` because Caddy routes on the Host header.
  const opts = { target, changeOrigin: true, secure: false };
  return { "/api": opts, "/tiles": opts };
}

function loadEnvVar(name: string): string | null {
  // Yarn loads `.env.yarn` into the process environment before Vite starts, so
  // prefer that; fall back to the `.env` files Vite itself reads.
  const key = "VITE_" + name;
  return (
    process.env[key] ??
    loadEnv("development", process.cwd(), "VITE_")[key] ??
    null
  );
}
