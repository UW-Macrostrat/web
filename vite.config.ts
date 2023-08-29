import { UserConfig } from "vite";
import path from "path";
import mdx from "@mdx-js/rollup";
import revisionInfo from "@macrostrat/revision-info-webpack";
import rewriteAll from "vite-plugin-rewrite-all";

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
];

const gitEnv = revisionInfo(pkg, "https://github.com/UW-Macrostrat/web");
// prefix with VITE_ to make available to client
for (const [key, value] of Object.entries(gitEnv)) {
  process.env["VITE_" + key] = value;
}

const config: UserConfig = {
  cacheDir: ".vite",
  base: process.env.PUBLIC_URL,
  root: "./src",
  resolve: {
    conditions: ["typescript"],
    alias: {
      "~": path.resolve("./src"),
    },
    dedupe: [
      "react",
      "react-dom",
      ...aliasedModules.map((d) => "@macrostrat/" + d),
    ],
  },
  plugins: [
    mdx(),
    /* Fix error with single-page app reloading where paths
    with dots (e.g., locations) are not rewritten to index
    to allow for client-side routing */
    rewriteAll(),
  ],
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
};

export default config;
