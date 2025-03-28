import revisionInfo from "@macrostrat/revision-info-webpack";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import path from "path";
import ssr from "vike/plugin";
import { defineConfig, Plugin } from "vite";
import cesium from "vite-plugin-cesium";
import pkg from "./package.json";
import { cjsInterop } from "vite-plugin-cjs-interop";
import { patchCssModules } from "vite-css-modules";

// Non-transpiled typescript can't be imported as a standalone package
import textToolchain from "./packages/text-toolchain/src";

const gitEnv = revisionInfo(pkg, "https://github.com/UW-Macrostrat/web");
// prefix with VITE_ to make available to client
for (const [key, value] of Object.entries(gitEnv)) {
  process.env["VITE_" + key] = value;
}

const cesiumRoot = require.resolve("cesium").replace("/index.cjs", "/Build");
const cesiumBuildPath = path.resolve(cesiumRoot, "Cesium");

// Check if we are building for server context

const cssModuleMatcher = /\.module\.(css|scss|sass|styl)$/;

function hyperStyles(): Plugin {
  return {
    name: "hyper-styles",
    enforce: "post",
    // Post-process the output to add the hyperStyled import
    transform(code, id) {
      const code1 = code.replace("export default", "const styles =");
      if (cssModuleMatcher.test(id)) {
        //const code2 = code1 + "\nexport default styles\n";
        const code3 = `import hyper from "@macrostrat/hyper";
        ${code1}
        let h = hyper.styled(styles);
        // Keep backwards compatibility with the existing default style object.
        Object.assign(h, styles);
        export default h;`;
        return code3;
      }
    },
  };
}

// Exclude local development dependencies from optimization
let exclude = [];
for (const [key, value] of Object.entries(
  pkg.resolutions as Record<string, string>
)) {
  if (
    value.startsWith("link:") ||
    value.startsWith("file:") ||
    value.startsWith("portal:")
  ) {
    exclude.push(key);
  }
}

export default defineConfig({
  //root: path.resolve("./src"),
  resolve: {
    conditions: ["source"],
    alias: {
      "~": path.resolve("./src"),
      "#": path.resolve("./pages"),
    },
    dedupe: ["react", "react-dom", "@macrostrat/column-components"],
  },
  plugins: [
    react(),
    patchCssModules(),
    // Fix broken imports in non-ESM packages. We should endeavor to move away from these
    // dependencies if they are unmaintained.
    cjsInterop({
      dependencies: ["react-images", "labella", "react-color", "mapbox-gl"],
    }),
    textToolchain({
      contentDir: path.resolve(__dirname, "content"),
      wikiPrefix: "/dev/docs",
    }),
    /* Fix error with single-page app reloading where paths
    with dots (e.g., locations) are not rewritten to index
    to allow for client-side routing */
    //rewriteAll(),
    cesium({
      cesiumBuildPath,
      cesiumBuildRootPath: cesiumRoot,
    }),
    hyperStyles(),
    ssr(),
  ],
  envDir: path.resolve(__dirname),
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
    sourcemap: true,
  },
  define: {
    // Cesium base URL
    CESIUM_BASE_URL: JSON.stringify("/cesium"),
    // If not building for server context
  },
  ssr: {
    noExternal: [
      /** All dependencies that cannot be bundled on the server (e.g., due to CSS imports)
       * should be listed here.
       */
      "@macrostrat/form-components",
      "@macrostrat/ui-components",
      "@macrostrat/column-components",
      "@macrostrat/column-views",
      "@macrostrat/data-components",
      "@macrostrat/svg-map-components",
      "@macrostrat/map-interface",
      "@macrostrat/feedback-components",
      "@macrostrat/timescale",
    ],
    resolve: {
      conditions: ["source"],
    },
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: "modern-compiler",
      },
    },
  },
  optimizeDeps: {
    exclude,
  },
});
