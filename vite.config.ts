import revisionInfo from "@macrostrat/revision-info-webpack";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import path from "path";
import ssr from "vike/plugin";
import { UserConfig } from "vite";
import cesium from "vite-plugin-cesium";

import pkg from "./package.json";

const aliasedModules = [
  "ui-components",
  "column-components",
  "api-types",
  "api-views",
  "column-views",
  "timescale",
  "map-interface",
  "mapbox-utils",
  "mapbox-react",
  "mapbox-styles",
  "cesium-viewer",
];

const gitEnv = revisionInfo(pkg, "https://github.com/UW-Macrostrat/web");
// prefix with VITE_ to make available to client
for (const [key, value] of Object.entries(gitEnv)) {
  process.env["VITE_" + key] = value;
}

const cesiumRoot = require.resolve("cesium").replace("/index.cjs", "/Build");
const cesiumBuildPath = path.resolve(cesiumRoot, "Cesium");

const config: UserConfig = {
  cacheDir: ".vite",
  root: "./src",
  resolve: {
    conditions: ["typescript"],
    alias: {
      "~": path.resolve("./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      "mapbox-gl",
      ...aliasedModules.map((d) => "@macrostrat/" + d),
    ],
  },
  plugins: [
    react(),
    mdx(),
    /* Fix error with single-page app reloading where paths
    with dots (e.g., locations) are not rewritten to index
    to allow for client-side routing */
    //rewriteAll(),
    ssr(),
    cesium({
      cesiumBuildPath: cesiumBuildPath,
      cesiumBuildRootPath: cesiumRoot,
    }),
  ],
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
  define: {
    "process.env": {
      NODE_DEBUG: false,
    },
  },
  ssr: {
    noExternal: ["labella"],
  },
};

export default config;
