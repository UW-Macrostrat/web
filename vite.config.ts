import revisionInfo from "@macrostrat/revision-info-webpack";
import react from "@vitejs/plugin-react";
import vike from "vike/plugin";
import { defineConfig, Plugin } from "vite";
import path from "node:path";
import { readFileSync } from "node:fs";
import textToolchain from "./packages/text-toolchain/src";
import cesium from "vite-plugin-cesium";

const cesiumPath = import.meta.resolve("cesium").replace("file://", "");

const cesiumRoot = cesiumPath.replace("/Source/Cesium.js", "/Build");
const cesiumBuildPath = path.join(cesiumRoot, "Cesium");

const pkg = getPackageJSONContents("package.json");

setupVersionEnvironmentVariables(pkg);

export default defineConfig({
  resolve: {
    alias: {
      "~": path.resolve(__dirname, "src"),
      "#": path.resolve("./pages"),
    },
    conditions: ["source", "browser"],
  },
  plugins: [
    vike(),
    react(),
    hyperStyles(),
    textToolchain({
      contentDir: path.resolve(__dirname, "content"),
      wikiPrefix: "/docs",
    }),
    cesium({
      cesiumBuildPath,
      cesiumBuildRootPath: cesiumRoot,
    }),
  ],
  optimizeDeps: {
    exclude: getDependenciesToExcludeFromOptimization(pkg),
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
      "@macrostrat/mapbox-react",
      "@uiw/react-color-swatch",
      "@uiw/color-convert",
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
  server: {
    allowedHosts: ["localhost", "dev.macrostrat.local"],
  },
});

function getPackageJSONContents(packageJSONPath: string) {
  return JSON.parse(
    readFileSync(path.resolve(__dirname, packageJSONPath), "utf-8")
  );
}

function getDependenciesToExcludeFromOptimization(pkg: any) {
  /** If we have locally linked dependencies, we want to exclude them from
   * optimization.
   */
  const excludePrefixes = ["file:", "link:", "workspace:", "portal:"];

  const allPackages = Object.entries(pkg.dependencies)
    .concat(Object.entries(pkg.devDependencies || {}))
    .concat(Object.entries(pkg.peerDependencies || {}))
    .concat(Object.entries(pkg.resolutions || {})) as [string, string][];

  let excludeSet = new Set<string>();
  for (const [dep, version] of allPackages) {
    if (excludePrefixes.some((prefix) => version.startsWith(prefix))) {
      excludeSet.add(dep);
    }
  }
  return Array.from(excludeSet);
}

function setupVersionEnvironmentVariables(pkg) {
  const gitEnv = revisionInfo(pkg, "https://github.com/UW-Macrostrat/web");
  // prefix with VITE_ to make available to client
  for (const [key, value] of Object.entries(gitEnv)) {
    process.env["VITE_" + key] = value;
  }
}

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
