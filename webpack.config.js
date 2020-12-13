const path = require("path");
const { DefinePlugin } = require("webpack");
const BrowserSyncPlugin = require("browser-sync-webpack-plugin");
//UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const historyApiFallback = require("connect-history-api-fallback");
const CopyPlugin = require("copy-webpack-plugin");
const DotenvPlugin = require("dotenv-webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");

let mode = "development";

let browserSync = new BrowserSyncPlugin({
  server: { baseDir: "./dist" },
  middleware: [historyApiFallback()],
});

const cesiumSource = "node_modules/cesium/Source";
const cesiumWorkers = "../Build/Cesium/Workers";

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

let exclude = /node_modules/;

module.exports = {
  mode: mode,
  module: {
    unknownContextCritical: false,
    rules: [
      { test: /\.(js|jsx|ts|tsx)$/, use: [babelLoader], exclude },
      {
        test: /\.styl$/,
        use: ["style-loader", cssModuleLoader, "stylus-loader"],
        exclude,
      },
      { test: /\.css$/, use: ["style-loader", cssModuleLoader], exclude },
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
      // CesiumJS module name
      cesiumSource: path.resolve(__dirname, cesiumSource),
      "~": path.resolve(__dirname, "src"),
    },
    fallback: { path: require.resolve("path-browserify") },
  },
  entry: {
    "js/bundle": "./src/js/index.tsx",
  },
  output: {
    path: path.join(__dirname, "/dist/"),
    filename: "[name].js",
    sourcePrefix: "",
  },
  optimization: {
    splitChunks: {
      chunks: "all",
    },
  },
  amd: {
    // Enable webpack-friendly use of require in Cesium
    toUrlUndefined: true,
  },
  plugins: [
    browserSync,
    new HtmlWebpackPlugin({
      title: "Macrostrat Web – Experimental",
      template: "./index.html",
    }),
    new DotenvPlugin(),
    new CopyPlugin([
      { from: path.join(cesiumSource, cesiumWorkers), to: "Workers" },
    ]),
    new CopyPlugin([{ from: path.join(cesiumSource, "Assets"), to: "Assets" }]),
    new CopyPlugin([
      { from: path.join(cesiumSource, "../Build"), to: "Build" },
    ]),
    new CopyPlugin([
      { from: path.join(cesiumSource, "Widgets"), to: "Widgets" },
    ]),
    new DefinePlugin({
      // Define relative base path in cesium for loading assets
      CESIUM_BASE_URL: JSON.stringify("/"),
    }),
  ],
};
