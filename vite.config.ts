import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  cacheDir: ".vite",
  root: "src",
  resolve: {
    conditions: ["typescript"],
    alias: {
      "~": path.resolve("./src"),
    },
  },
});
