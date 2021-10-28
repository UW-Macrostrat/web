const path = require("path");
const { DefinePlugin } = require("webpack");
const BrowserSyncPlugin = require("browser-sync-webpack-plugin");
//UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const historyApiFallback = require("connect-history-api-fallback");
const CopyPlugin = require("copy-webpack-plugin");
const DotenvPlugin = require("dotenv-webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

let mode = "development";

let publicURL = process.env.PUBLIC_URL || "/";

const packageSrc = (name) => path.resolve(__dirname, "packages", name, "src");

let browserSync = new BrowserSyncPlugin({
  server: { baseDir: "./dist" },
  middleware: [historyApiFallback()],
});

//const cesiumSource = "node_modules/cesium/Source";
//const cesiumWorkers = "../Build/Cesium/Workers";

//uglify = new UglifyJsPlugin()

let babelLoader = {
  loader: "babel-loader",
  options: {
    sourceMap: mode == "development",
  },
};

const cssModuleLoader = {
  loader: "css-loader",
  options: {
    modules: {
      mode: "local",
      localIdentName: "[path][name]__[local]--[hash:base64:5]",
    },
  },
};

module.exports = {
  mode: mode,
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: [babelLoader],
        exclude: /node_modules/,
      },
      {
        test: /\.styl$/,
        use: ["style-loader", cssModuleLoader, "stylus-loader"],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", cssModuleLoader],
        exclude: /node_modules/,
      },
      { test: /\.css$/, use: ["style-loader", "css-loader"] },
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        use: [
          {
            loader: "file-loader",
            options: {},
          },
        ],
      },
      {
        test: /\.(png|svg)$/,
        use: [
          {
            loader: "file-loader",
            options: {
              useRelativePath: true,
              outputPath: "sections/assets/",
              name: "[name].[ext]",
            },
          },
        ],
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx"],
    alias: {
      // CesiumJS module name,
      //cesiumSource: path.resolve(__dirname, cesiumSource),
      "~": path.resolve(__dirname, "src"),
      //"@macrostrat/cesium-viewer": packageSrc("cesium-viewer"),
      "@macrostrat/column-components": packageSrc("column-components"),
      "@macrostrat/ui-components": packageSrc("ui-components"),
    },
  },
  entry: {
    "js/bundle": "./src/index.ts",
  },
  node: {
    fs: "empty",
  },
  output: {
    path: path.join(__dirname, "/dist/"),
    publicPath: publicURL,
    filename: "[name].js",
    devtoolModuleFilenameTemplate: "file:///[absolute-resource-path]",
  },
  devtool: mode == "development" ? "source-map" : false,
  amd: {
    // Enable webpack-friendly use of require in Cesium
    toUrlUndefined: true,
  },
  optimization: {
    splitChunks: { chunks: "all" },
  },
  plugins: [
    browserSync,
    new HtmlWebpackPlugin({
      title: "Macrostrat Web – Experimental",
      template: "./template.html",
    }),
    new DotenvPlugin(),
    /*
    new CopyPlugin([
      { from: path.join(cesiumSource, cesiumWorkers), to: "Workers" }
    ]),
    new CopyPlugin([{ from: path.join(cesiumSource, "Assets"), to: "Assets" }]),
    new CopyPlugin([
      { from: path.join(cesiumSource, "Widgets"), to: "Widgets" }
    ]),
    */
    new DefinePlugin({
      MACROSTRAT_BASE_URL: JSON.stringify(publicURL),
      // Define relative base path in cesium for loading assets
      CESIUM_BASE_URL: JSON.stringify(publicURL),
    }),
  ],
};
