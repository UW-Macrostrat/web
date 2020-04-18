const path = require('path')
const {DefinePlugin} = require("webpack")
const BrowserSyncPlugin = require('browser-sync-webpack-plugin')
//UglifyJsPlugin = require('uglifyjs-webpack-plugin')
const historyApiFallback = require('connect-history-api-fallback')
const CopyPlugin = require('copy-webpack-plugin')

let mode = 'development'

let browserSync = new BrowserSyncPlugin({
  server: { baseDir: './' },
  middleware: [ historyApiFallback() ]
})

const cesiumSource = 'node_modules/cesium/Source';
const cesiumWorkers = '../Build/Cesium/Workers';

//uglify = new UglifyJsPlugin()

let babelLoader = {
  loader: 'babel-loader',
  options: {
    presets: ['@babel/preset-env','@babel/preset-react'],
    sourceMap: mode == 'development'
  }
}

let exclude = /node_modules/

let coffeeLoader = {
  loader: 'coffee-loader',
  options: {sourceMap: mode == 'development'}
}

module.exports = {
  mode: mode,
  module: {
    unknownContextCritical: false,
    rules: [
      {test: /\.coffee$/, use: [babelLoader, coffeeLoader], exclude},
      {test: /\.(js|jsx)$/, use: [babelLoader], exclude},
      {test: /\.styl$/, use: ["style-loader","css-loader", "stylus-loader"]},
      {test: /\.css$/, use: ["style-loader", "css-loader"]},
      {
        test: /\.(eot|svg|ttf|woff|woff2)$/,
        use: [
          {
            loader: 'file-loader',
            options: {}
          }
        ]
      },
      {
        test: /\.(png|svg)$/,
        use: [
          {
            loader: 'file-loader',
            options: {
              useRelativePath: true,
              outputPath: 'sections/assets/',
              name: '[name].[ext]'
            }
          }
        ]
      },
    ]
  },
  resolve: {
    extensions: [".coffee", ".js"],
    alias: {
        // CesiumJS module name
        cesium: path.resolve(__dirname, cesiumSource)
    }
  },
  entry: {
    'js/bundle': "./src/js/index.js"
  },
  node: {
    fs: 'empty'
  },
  output: {
    path: path.join(__dirname,'/dist/'),
    filename: "[name].js",
    sourcePrefix: ''
  },
  amd: {
      // Enable webpack-friendly use of require in Cesium
      toUrlUndefined: true
  },
  plugins: [
    browserSync,
    new CopyPlugin([ { from: path.join(cesiumSource, cesiumWorkers), to: 'Workers' } ]),
    new CopyPlugin([ { from: path.join(cesiumSource, 'Assets'), to: 'Assets' } ]),
    new CopyPlugin([ { from: path.join(cesiumSource, 'Widgets'), to: 'Widgets' } ]),
    new DefinePlugin({
        // Define relative base path in cesium for loading assets
        CESIUM_BASE_URL: JSON.stringify("/dist/")
    })
  ]
}
