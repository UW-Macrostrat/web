import revisionInfo from "@macrostrat/revision-info-webpack";
import mdx from "@mdx-js/rollup";
import react from "@vitejs/plugin-react";
import path from "path";
import ssr from "vike/plugin";
import { defineConfig, Plugin } from "vite";
import cesium from "vite-plugin-cesium";
import pkg from "./package.json";
import { cjsInterop } from "vite-plugin-cjs-interop";

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

export default defineConfig({
  //root: path.resolve("./src"),
  resolve: {
    conditions: ["source"],
    alias: {
      "~": path.resolve("./src"),
      "#": path.resolve("./pages"),
    },
    dedupe: [
      "react",
      "react-dom",
      "@macrostrat/mapbox-react",
      "@macrostrat/ui-components",
    ],
  },
  plugins: [
    react(),
    // Fix broken imports in non-ESM packages. We should endeavor to move away from these
    // dependencies if they are unmaintained.
    cjsInterop({
      dependencies: ["react-images", "labella", "react-color"],
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
    noExternal: ["@supabase/postgrest-js"],
  },
  css: {
    preprocessorOptions: {
      sass: {
        api: "modern-compiler",
      },
    },
  },
  optimizeDeps: {
    extensions: [".css"],
  },
});
