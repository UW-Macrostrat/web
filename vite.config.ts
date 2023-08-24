import { UserConfig } from "vite";
import path from "path";
import mdx from "@mdx-js/rollup";

const config: UserConfig = {
  cacheDir: ".vite",
  root: "./src",
  resolve: {
    conditions: ["typescript"],
    alias: {
      "~": path.resolve("./src"),
    },
  },
  plugins: [mdx()],
  envDir: path.resolve(__dirname),
};

export default config;
