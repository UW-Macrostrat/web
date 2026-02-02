import revisionInfo from "@macrostrat/revision-info-webpack";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import { defineConfig } from "vite";
import path from "node:path";
import { readFileSync } from "node:fs";
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
    cesium({
      cesiumBuildPath,
      cesiumBuildRootPath: cesiumRoot,
    }),
  ],
  ssr: {
    noExternal: macrostratPackages,
  },
  define: {
    // Cesium base URL
    CESIUM_BASE_URL: JSON.stringify("/cesium"),
    // If not building for server context
  },
  server: {
    allowedHosts: ["localhost", "dev.macrostrat.local"],
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: "modern-compiler",
      } as any,
    },
  },
});

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
