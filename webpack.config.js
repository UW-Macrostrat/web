const path = require("path");
const { EnvironmentPlugin, DefinePlugin } = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
//UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const CopyPlugin = require("copy-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const revisionInfo = require("@macrostrat/revision-info-webpack");
const pkg = require("./package.json");

// Read dotenv file in directory
const dotenv = require("dotenv");
dotenv.config();

const mode = process.env.NODE_ENV || "development";

let publicURL = process.env.PUBLIC_URL || "/";

const packageSrc = (name) =>
  path.resolve(__dirname, "deps", "web-components", "packages", name, "src");

const localPackageSrc = (name) =>
  path.resolve(__dirname, "packages", name, "src");

const cesiumSource = "node_modules/cesium/Source";
const cesiumWorkers = "node_modules/cesium/Build/Cesium/Workers";

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
      localIdentName: "[local]-[hash:base64:6]",
    },
  },
};

const plugins = [
  new HtmlWebpackPlugin({
    title: "Macrostrat",
    template: "./template.html",
  }),
  new CopyPlugin({
    patterns: [
      { from: cesiumWorkers, to: "Workers" },
      { from: path.join(cesiumSource, "Assets"), to: "Assets" },
      { from: path.join(cesiumSource, "Widgets"), to: "Widgets" },
    ],
  }),
  new DefinePlugin({
    // Define relative base path in cesium for loading assets
    CESIUM_BASE_URL: JSON.stringify(publicURL),
    // Git revision information
  }),
  new EnvironmentPlugin({
    ...gitEnv,
    MAPBOX_API_TOKEN: "<your-mapbox-api-token>",
    MACROSTRAT_TILESERVER_DOMAIN: "https://tiles.macrostrat.org",
    MACROSTRAT_API_DOMAIN: "https://macrostrat.org",
    PUBLIC_URL: "/",
  }),
];

const devMode = mode == "development";

/* Use style-loader in development so we can get hot-reloading,
  but use MiniCssExtractPlugin in production for small bundle sizes */
let finalStyleLoader = "style-loader";
if (!devMode) {
  plugins.push(new MiniCssExtractPlugin());
  finalStyleLoader = MiniCssExtractPlugin.loader;
}

const styleLoaders = [finalStyleLoader, cssModuleLoader];

module.exports = {
  mode,
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
        exclude: [/node_modules/, /\/packages\/maplibre-gl-js\/dist/],
      },
      {
        test: /\.styl$/,
        use: [...styleLoaders, "stylus-loader"],
        exclude: /node_modules/,
      },
      {
        test: /\.(sass|scss)$/,
        use: [...styleLoaders, "sass-loader"],
      },
      // {
      //   test: /\.css$/,
      //   use: styleLoaders,
      //   exclude: /node_modules/,
      // },
      { test: /\.css$/, use: [finalStyleLoader, "css-loader"] },
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
      // https://github.com/CesiumGS/cesium/issues/9790#issuecomment-943773870
      {
        test: /.js$/,
        include: path.resolve(__dirname, "node_modules/cesium/Source"),
        use: { loader: require.resolve("@open-wc/webpack-import-meta-loader") },
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
      cesium: path.resolve(__dirname, "node_modules/cesium"),
      resium: path.resolve(__dirname, "node_modules/resium"),
      cesiumSource: path.resolve(__dirname, cesiumSource),
      "maplibre-gl": path.resolve(__dirname, "packages/maplibre-gl-js"),
      "~": path.resolve(__dirname, "src"),
      "@macrostrat/cesium-viewer": localPackageSrc("cesium-viewer"),
      "@macrostrat/column-components": packageSrc("column-components"),
      "@macrostrat/ui-components": packageSrc("ui-components"),
      "@macrostrat/mapbox-styles": packageSrc("mapbox-styles"),
      "@macrostrat/mapbox-utils": packageSrc("mapbox-utils"),
      "@macrostrat/mapbox-react": packageSrc("mapbox-react"),
    },
    // We need fallbacks for cesium source files
    fallback: {
      http: require.resolve("stream-http"),
      https: require.resolve("https-browserify"),
      zlib: require.resolve("browserify-zlib"),
      stream: require.resolve("stream-browserify"),
      path: require.resolve("path-browserify"),
    }

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
  devtool: "source-map",
  amd: {
    // Enable webpack-friendly use of require in Cesium
    toUrlUndefined: true,
  },
  optimization: {
    splitChunks: { chunks: "all" },
    usedExports: true,
  },
  plugins,
};
