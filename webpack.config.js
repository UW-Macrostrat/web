const path = require("path");
const { DefinePlugin, EnvironmentPlugin } = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
//UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin");
const DotenvPlugin = require("dotenv-webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const revisionInfo = require("@macrostrat/revision-info-webpack");
const pkg = require("./package.json");

const mode = process.env.NODE_ENV || "development";

let publicURL = process.env.PUBLIC_URL || "/";

const packageSrc = (name) => path.resolve(__dirname, "packages", name, "src");

//const cesiumSource = "node_modules/cesium/Source";
//const cesiumWorkers = "../Build/Cesium/Workers";

//uglify = new UglifyJsPlugin()

const gitEnv = revisionInfo(pkg, "https://github.com/UW-Macrostrat/web");

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
  devServer: {
    compress: true,
    port: 3000,
    hot: true,
    open: true,
    historyApiFallback: true,
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: [babelLoader],
        exclude: /node_modules/,
      },
      {
        test: /\.styl$/,
        use: [MiniCssExtractPlugin.loader, cssModuleLoader, "stylus-loader"],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, cssModuleLoader],
        exclude: /node_modules/,
      },
      { test: /\.css$/, use: [MiniCssExtractPlugin.loader, "css-loader"] },
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
      {
        test: /\.mdx?$/,
        use: [babelLoader, "@mdx-js/loader"],
        exclude: /node_modules/,
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
    main: "./src/index.ts",
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
    new HtmlWebpackPlugin({
      title: "Macrostrat",
      template: "./template.html",
    }),
    new MiniCssExtractPlugin(),
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
      // Git revision information
    }),
    new EnvironmentPlugin({
      ...gitEnv,
    }),
  ],
};
